import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "./prisma.js";

/**
 * Default Settings (Fallback, falls DB leer ist)
 */
const DEFAULT_SETTINGS = {
  stepMin: 10,
  minDaysBetweenBookings: 0,
  // Arbeitszeiten pro Wochentag (0=So ... 6=Sa)
  workingHours: [
    { day: 0, isOpen: false, startMin: 12 * 60, endMin: 17 * 60 }, // So
    { day: 1, isOpen: true, startMin: 12 * 60, endMin: 17 * 60 }, // Mo
    { day: 2, isOpen: true, startMin: 12 * 60, endMin: 17 * 60 }, // Di
    { day: 3, isOpen: true, startMin: 12 * 60, endMin: 17 * 60 }, // Mi
    { day: 4, isOpen: true, startMin: 12 * 60, endMin: 17 * 60 }, // Do
    { day: 5, isOpen: true, startMin: 12 * 60, endMin: 17 * 60 }, // Fr
    { day: 6, isOpen: true, startMin: 12 * 60, endMin: 17 * 60 }, // Sa
  ],

  extendIfFirstHourFull: true,
  extendStepMin: 60,

  earliestLimitMin: 10 * 60,
};

const SETTINGS_KEY = "APP_SETTINGS_V1";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

type Role = "CUSTOMER" | "BARBER";
type JwtPayload = { userId: number; role: Role };

type WorkingHoursRow = { day: number; isOpen: boolean; startMin: number; endMin: number };
type AppSettings = {
  stepMin: number;
  workingHours: WorkingHoursRow[];
  extendIfFirstHourFull: boolean;
  extendStepMin: number;
  earliestLimitMin: number;
  minDaysBetweenBookings: number;
};

const app = express();
console.log("🔥 SERVER FILE IS EXECUTING 🔥");

/* ------------------------- middleware ------------------------- */
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: (origin, cb) => {
      // erlauben: Server-to-Server / Postman / curl (kein Origin-Header)
      if (!origin) return cb(null, true);

      const allowed = new Set([
        "http://localhost:3000",
        WEB_ORIGIN, // z.B. deine Vercel-URL
      ]);

      // zusätzlich: alle Vercel-Preview-Deployments erlauben (optional, aber praktisch)
      const isVercelPreview = /^https:\/\/.*\.vercel\.app$/.test(origin);

      if (allowed.has(origin) || isVercelPreview) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
  })
);
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

app.use(express.json());

/* ------------------------- helpers ------------------------- */

function isValidDateYYYYMMDD(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function toHHMM(min: number): string {
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function parseHHMMToMin(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value).trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}
function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}
function getBearerToken(req: express.Request): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
function requireRole(role: Role) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
function weekdayFromDateStr(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00.000`);
  return d.getDay();
}

/**
 * ✅ Wichtig für Datum-Problem in /my-bookings:
 * Wir formatieren immer in Europe/Berlin, damit 05.03 nicht als 04.03 erscheint.
 */
function formatDateBerlin(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(d);
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizePhone(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  // nur Ziffern behalten
  let digits = s.replace(/\D+/g, "");

  // 0049... -> 49...
  if (digits.startsWith("0049")) digits = digits.slice(2);

  // 49... -> 0...
  if (digits.startsWith("49")) digits = "0" + digits.slice(2);

  return digits;
}

/**
 * ✅ Telefon für Deutschland normalisieren/validieren:
 * - akzeptiert: 0176..., +49176..., 0049176..., mit Leerzeichen/Bindestrichen
 * - gibt zurück: +49XXXXXXXXXXX
 * - invalid => null
 */
function normalizeGermanPhone(raw: string): string | null {
  if (!raw) return null;

  let phone = String(raw).trim();

  // Leerzeichen + typische Trennzeichen raus
  phone = phone.replace(/\s+/g, "").replace(/[-/()]/g, "");

  // 00 → +
  if (phone.startsWith("00")) {
    phone = "+" + phone.slice(2);
  }

  // 0xxxx → +49xxxx
  if (phone.startsWith("0")) {
    phone = "+49" + phone.slice(1);
  }

  // Falls jemand "49..." ohne + eingibt, machen wir +49 draus
  if (phone.startsWith("49") && !phone.startsWith("+49")) {
    phone = "+49" + phone.slice(2);
  }

  // Nur + und Zahlen erlauben, Länge grob plausibel
  if (!/^\+?[0-9]{10,15}$/.test(phone)) {
    return null;
  }

  // muss für DE i.d.R. mit +49 starten
  if (!phone.startsWith("+49")) return null;

  return phone;
}

function berlinMidnight(dateStrYYYYMMDD: string) {
  // wir vergleichen nur Tage (00:00)
  return new Date(`${dateStrYYYYMMDD}T00:00:00.000`);
}

function diffDays(a: Date, b: Date) {
  // a - b in Tagen
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * ✅ Check: gleicher Kunde darf nur alle X Tage buchen (pro Barber)
 * Match über:
 * - customerId (wenn eingeloggt)
 * - sonst über normalisierte Telefonnummer (guest & customer)
 */
async function enforceMinDaysBetweenBookings(opts: {
  barberId: number;
  requestedDateStr: string; // YYYY-MM-DD
  minDays: number;
  customerId?: number | null;
  phoneNormalized?: string | null; // +49...
}) {
  const { barberId, requestedDateStr, minDays, customerId, phoneNormalized } = opts;
  if (!minDays || minDays <= 0) return; // keine Regel aktiv

  const reqDate = berlinMidnight(requestedDateStr);

  // 1) wenn customerId vorhanden -> direkt letzte Buchung dieses Customers bei dem Barber
  if (customerId) {
    const last = await prisma.booking.findFirst({
      where: {
        barberId,
        customerId,
        status: { not: "CANCELLED" as any },
      },
      orderBy: [{ date: "desc" }, { exactTime: "desc" }],
      select: { date: true },
    });

    if (last?.date) {
      const lastStr = formatDateBerlin(last.date);
      const lastDate = berlinMidnight(lastStr);
      const d = diffDays(reqDate, lastDate);
      if (d < minDays) {
        throw new Error(`Du kannst nur alle ${minDays} Tag(e) einen Termin buchen. Letzter Termin: ${lastStr}`);
      }
    }
    return;
  }

  // 2) Guest / Phone-Match (oder Customer ohne customerId)
  if (!phoneNormalized) return;

  // wir laden die letzten Buchungen dieses Barbers (kleiner Batch) und matchen per Normalisierung
  const recent = await prisma.booking.findMany({
    where: {
      barberId,
      status: { not: "CANCELLED" as any },
    },
    orderBy: [{ date: "desc" }, { exactTime: "desc" }, { createdAt: "desc" }],
    take: 80,
    include: {
      customer: { select: { phone: true } },
    },
  });

  const hit = recent.find((b) => {
    const guestNorm = normalizeGermanPhone(b.guestPhone ?? "") ?? null;
    const custNorm = normalizeGermanPhone(b.customer?.phone ?? "") ?? null;
    return guestNorm === phoneNormalized || custNorm === phoneNormalized;
  });

  if (hit?.date) {
    const lastStr = formatDateBerlin(hit.date);
    const lastDate = berlinMidnight(lastStr);
    const d = diffDays(reqDate, lastDate);
    if (d < minDays) {
      throw new Error(`Du kannst nur alle ${minDays} Tag(e) einen Termin buchen. Letzter Termin: ${lastStr}`);
    }
  }
}

async function uniqueSlug(base: string) {
  let s = slugify(base) || "barber";
  let i = 0;
  while (true) {
    const candidate = i === 0 ? s : `${s}-${i}`;
    const exists = await prisma.barber.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
    i++;
  }
}

/**
 * ✅ ROBUST: falls alter BARBER user keine barberId hat -> automatisch Barber-Profil erzeugen & verknüpfen
 */
async function getBarberIdFromUser(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, barberId: true, email: true },
  });

  if (!user) throw new Error("user not found");
  if (user.role !== "BARBER") throw new Error("not a barber account");

  if (user.barberId) return user.barberId;

  const base = (user.email?.split("@")[0] || "barber").trim();
  const slug = await uniqueSlug(base);

  const barber = await prisma.barber.create({
    data: { name: user.email ?? "Barber", slug, phone: null, isActive: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { barberId: barber.id },
  });

  // optional: default services seeden
  await prisma.service.createMany({
    data: [
      { barberId: barber.id, key: "haare", name: "Haare", durationMin: 30, isActive: true },
      { barberId: barber.id, key: "bart", name: "Bart", durationMin: 20, isActive: true },
      { barberId: barber.id, key: "haare-bart", name: "Haare + Bart", durationMin: 50, isActive: true },
    ],
    skipDuplicates: true,
  });

  return barber.id;
}

/* ------------------------- settings (DB, pro Barber) ------------------------- */
let settingsCache: Map<number, { value: AppSettings; ts: number }> = new Map();

function normalizeSettings(raw: any): AppSettings {
  const fb = DEFAULT_SETTINGS;
  const minDaysBetweenBookings = Number(raw?.minDaysBetweenBookings ?? fb.minDaysBetweenBookings);
  const stepMin = Number(raw?.stepMin ?? fb.stepMin);
  const extendIfFirstHourFull = Boolean(raw?.extendIfFirstHourFull ?? fb.extendIfFirstHourFull);
  const extendStepMin = Number(raw?.extendStepMin ?? fb.extendStepMin);
  const earliestLimitMin = Number(raw?.earliestLimitMin ?? fb.earliestLimitMin);

  const whRaw = Array.isArray(raw?.workingHours) ? raw.workingHours : fb.workingHours;

  const workingHours: WorkingHoursRow[] = whRaw
    .map((r: any) => ({
      day: Number(r?.day),
      isOpen: Boolean(r?.isOpen),
      startMin: Number(r?.startMin),
      endMin: Number(r?.endMin),
    }))
    .filter((r: WorkingHoursRow) => Number.isFinite(r.day) && r.day >= 0 && r.day <= 6)
    .map((r: WorkingHoursRow) => ({
      ...r,
      startMin: Math.max(0, Math.min(1439, r.startMin)),
      endMin: Math.max(0, Math.min(1440, r.endMin)),
    }))
    .sort((a: WorkingHoursRow, b: WorkingHoursRow) => a.day - b.day);

  const byDay = new Map<number, WorkingHoursRow>();
  for (const r of workingHours) byDay.set(r.day, r);

  const full: WorkingHoursRow[] = [];
  for (let d = 0; d <= 6; d++) {
    full.push(byDay.get(d) ?? { day: d, isOpen: false, startMin: 12 * 60, endMin: 17 * 60 });
  }

  return {
    stepMin: Number.isFinite(stepMin) && stepMin > 0 ? stepMin : fb.stepMin,
    extendIfFirstHourFull,
    extendStepMin: Number.isFinite(extendStepMin) && extendStepMin > 0 ? extendStepMin : fb.extendStepMin,
    earliestLimitMin: Number.isFinite(earliestLimitMin) ? earliestLimitMin : fb.earliestLimitMin,
    workingHours: full,
    minDaysBetweenBookings:
  Number.isFinite(minDaysBetweenBookings) && minDaysBetweenBookings >= 0
    ? Math.floor(minDaysBetweenBookings)
    : (fb as any).minDaysBetweenBookings ?? 0,
  };
}

async function getSettings(barberId: number): Promise<AppSettings> {
  const cached = settingsCache.get(barberId);
  if (cached && Date.now() - cached.ts < 5000) return cached.value;

  const row = await prisma.appSetting
    .findUnique({
      where: { barberId_key: { barberId, key: SETTINGS_KEY } },
    })
    .catch(() => null);

  if (!row) {
    const value = normalizeSettings(DEFAULT_SETTINGS);
    settingsCache.set(barberId, { value, ts: Date.now() });
    return value;
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(row.value);
  } catch {
    parsed = null;
  }

  const value = normalizeSettings(parsed ?? DEFAULT_SETTINGS);
  settingsCache.set(barberId, { value, ts: Date.now() });
  return value;
}

async function saveSettings(barberId: number, next: AppSettings) {
  const normalized = normalizeSettings(next);

  await prisma.appSetting.upsert({
    where: { barberId_key: { barberId, key: SETTINGS_KEY } },
    update: { value: JSON.stringify(normalized) },
    create: { barberId, key: SETTINGS_KEY, value: JSON.stringify(normalized) },
  });

  settingsCache.set(barberId, { value: normalized, ts: Date.now() });
}

/* ------------------------- bookings/time logic (pro Barber) ------------------------- */

async function getDayBookings(barberId: number, dateStr: string) {
  const dayStart = new Date(`${dateStr}T00:00:00.000`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999`);

  return prisma.booking.findMany({
    where: { barberId, date: { gte: dayStart, lte: dayEnd } },
    include: { customer: true, service: true, barber: true },
    orderBy: [{ exactTime: "asc" }, { createdAt: "asc" }],
  });
}

/**
 * ✅ Notifications (CustomerId/readAt) + bessere Inhalte
 */
async function createCustomerNotification(input: {
  customerId: number;
  type: "BOOKING_CANCELLED" | "BOOKING_STATUS_CHANGED";
  title: string;
  message: string;
  bookingId?: number | null;
}) {
  return prisma.notification.create({
    data: {
      customerId: input.customerId,
      type: input.type as any,
      title: input.title,
      message: input.message,
      bookingId: input.bookingId ?? null,
      readAt: null,
    },
  });
}

function buildBookingDetailsText(b: {
  date: Date;
  exactTime: number | null;
  durationMin: number;
  barber?: { name: string } | null;
  service?: { name: string } | null;
}) {
  const dateStr = formatDateBerlin(b.date);
  const time =
    b.exactTime != null ? `${toHHMM(b.exactTime)} - ${toHHMM(b.exactTime + b.durationMin)}` : "Uhrzeit offen";
  const barberName = b.barber?.name ?? "Friseur";
  const serviceName = b.service?.name ?? "Service";
  return `${barberName} • ${serviceName} • ${dateStr} • ${time}`;
}

async function getBlocksForDay(barberId: number, dateStr: string) {
  const wd = weekdayFromDateStr(dateStr);

  const rec = await prisma.recurringBlock.findMany({
    where: { barberId, weekday: wd, enabled: true },
    orderBy: [{ startMin: "asc" }],
  });

  const dayStart = new Date(`${dateStr}T00:00:00.000`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999`);

  const once = await prisma.timeBlock.findMany({
    where: { barberId, date: { gte: dayStart, lte: dayEnd } },
    orderBy: [{ startMin: "asc" }],
  });

  return {
    recurring: rec.map((x) => ({ start: x.startMin, end: x.endMin })),
    once: once.map((x) => ({ start: x.startMin, end: x.endMin })),
  };
}

/**
 * ✅ FIXED + LOOP EXTEND:
 * - erweitert solange zurück, bis in der ersten Stunde Slots existieren oder earliestLimitMin erreicht
 */
async function computeAvailableTimes(opts: { barberId: number; dateStr: string; serviceDurationMin: number }) {
  const { barberId, dateStr, serviceDurationMin } = opts;
  const settings = await getSettings(barberId);

  const wd = weekdayFromDateStr(dateStr);
  const dayCfg = settings.workingHours.find((x) => x.day === wd) ?? DEFAULT_SETTINGS.workingHours[wd];

  if (!dayCfg.isOpen) {
    return { isOpen: false, windowStartMin: dayCfg.startMin, windowEndMin: dayCfg.endMin, times: [] as number[] };
  }

  const baseStartMin = dayCfg.startMin;
  const baseEndMin = dayCfg.endMin;

  const bookings = await getDayBookings(barberId, dateStr);

  const busyBookings = bookings
    .filter((b) => b.exactTime != null && b.status !== "CANCELLED")
    .map((b) => {
      const start = b.exactTime as number;
      const dur = (b.durationMin ?? serviceDurationMin) as number;
      return { start, end: start + dur };
    });

  const blocks = await getBlocksForDay(barberId, dateStr);
  const busyBlocks = [...blocks.recurring, ...blocks.once];

  const busy = [...busyBookings, ...busyBlocks];

  let windowStartMin = baseStartMin;
  const windowEndMin = baseEndMin;

  const buildTimesForWindow = (startMin: number) => {
    const times: number[] = [];
    const lastStart = baseEndMin - serviceDurationMin;

    for (let t = startMin; t <= lastStart; t += settings.stepMin) {
      const tEnd = t + serviceDurationMin;

      if (t < startMin) continue;
      if (tEnd > baseEndMin) continue;

      const conflict = busy.some((b) => overlaps(t, tEnd, b.start, b.end));
      if (!conflict) times.push(t);
    }
    return times;
  };

  let times = buildTimesForWindow(windowStartMin);

  if (settings.extendIfFirstHourFull) {
    const limit = Math.max(settings.earliestLimitMin, 0);

    while (true) {
      const firstHourStart = windowStartMin;
      const firstHourEnd = windowStartMin + 60;

      const hasAnyInFirstHour = times.some((t) => t >= firstHourStart && t < firstHourEnd);
      if (hasAnyInFirstHour) break;

      const nextStart = windowStartMin - settings.extendStepMin;
      if (nextStart < limit) break;

      windowStartMin = nextStart;
      times = buildTimesForWindow(windowStartMin);
    }
  }

  return { isOpen: true, windowStartMin, windowEndMin, times };
}

/* ------------------------- routes ------------------------- */

app.get("/health", (_req, res) => res.json({ ok: true }));

/* ---------- PUBLIC: Barbers ---------- */

app.get("/barbers", async (_req, res) => {
  try {
    const barbers = await prisma.barber.findMany({
      where: { isActive: true },
      orderBy: [{ createdAt: "asc" }],
      select: { id: true, name: true, slug: true },
    });

    res.json({ count: barbers.length, barbers });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.get("/barbers/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug ?? "").trim().toLowerCase();

    const barber = await prisma.barber.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        isActive: true,

        // ✅ Profilfelder
        bio: true,
        street: true,
        postalCode: true,
        city: true,
        instagram: true,
        website: true,
      },
    });

    if (!barber || !barber.isActive) return res.status(404).json({ error: "Barber not found" });

    const services = await prisma.service.findMany({
      where: { barberId: barber.id, isActive: true },
      orderBy: [{ id: "asc" }],
      select: { key: true, name: true, durationMin: true },
    });

    const settings = await getSettings(barber.id);

    res.json({
      barber,
      services,
      settings: {
        workingHours: settings.workingHours,
        stepMin: settings.stepMin,
        earliestLimitMin: settings.earliestLimitMin,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.get("/public/available-times", async (req, res) => {
  try {
    const barberSlug = String(req.query.barberSlug ?? "").trim().toLowerCase();
    const dateStr = String(req.query.date ?? "").trim();
    const serviceKey = String(req.query.serviceKey ?? "").trim();

    if (!barberSlug || !dateStr || !serviceKey) {
      return res
        .status(400)
        .json({ error: "Use /public/available-times?barberSlug=...&date=YYYY-MM-DD&serviceKey=..." });
    }
    if (!isValidDateYYYYMMDD(dateStr)) return res.status(400).json({ error: "date must be YYYY-MM-DD" });

    const barber = await prisma.barber.findUnique({ where: { slug: barberSlug } });
    if (!barber || !barber.isActive) return res.status(404).json({ error: "Barber not found" });

    const service = await prisma.service.findUnique({
      where: { barberId_key: { barberId: barber.id, key: serviceKey } },
    });
    if (!service || !service.isActive) return res.status(404).json({ error: "Service not found" });

    const settings = await getSettings(barber.id);

    const { isOpen, windowStartMin, windowEndMin, times } = await computeAvailableTimes({
      barberId: barber.id,
      dateStr,
      serviceDurationMin: service.durationMin,
    });

    res.json({
      barber: { name: barber.name, slug: barber.slug },
      date: dateStr,
      isOpen,
      stepMin: settings.stepMin,
      activeWindow: { startMin: windowStartMin, endMin: windowEndMin },
      activeWindowHHMM: { start: toHHMM(windowStartMin), end: toHHMM(windowEndMin) },
      service: { key: service.key, name: service.name, durationMin: service.durationMin },
      times,
      timesHHMM: times.map(toHHMM),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.post("/public/bookings", async (req, res) => {
  try {
    return res.status(403).json({
  error: "Buchung nur mit Login möglich. Bitte einloggen oder registrieren.",
});
    const barberSlug = String(req.body?.barberSlug ?? "").trim().toLowerCase();
    const dateStr = String(req.body?.date ?? "").trim();
    const serviceKey = String(req.body?.serviceKey ?? "").trim();
    const exactTimeRaw = req.body?.exactTime;

    const customerName = String(req.body?.customerName ?? "").trim();
    const customerPhone = String(req.body?.customerPhone ?? "").trim();
    const phoneNormalized = normalizeGermanPhone(customerPhone);
if (!phoneNormalized) {
  return res.status(400).json({ error: "Ungültige Telefonnummer. Bitte eine echte Nummer angeben (z.B. 0176...)." });
}
    const note = req.body?.note != null ? String(req.body.note).trim() : null;

    if (!barberSlug || !dateStr || !serviceKey || exactTimeRaw == null || !customerName || !customerPhone) {
      return res
        .status(400)
        .json({ error: "barberSlug, date, serviceKey, exactTime, customerName, customerPhone required" });
    }
    if (!isValidDateYYYYMMDD(dateStr)) return res.status(400).json({ error: "date must be YYYY-MM-DD" });

    let exactTime: number | null = null;
    if (typeof exactTimeRaw === "number") exactTime = exactTimeRaw;
    if (typeof exactTimeRaw === "string") exactTime = parseHHMMToMin(exactTimeRaw);
    if (exactTime == null || exactTime < 0 || exactTime > 1439) {
      return res.status(400).json({ error: "exactTime must be HH:MM or 0..1439" });
    }

    const barber = await prisma.barber.findUnique({ where: { slug: barberSlug } });
    if (!barber || !barber.isActive) return res.status(404).json({ error: "Barber not found" });

    const service = await prisma.service.findUnique({
      where: { barberId_key: { barberId: barber.id, key: serviceKey } },
    });
    if (!service || !service.isActive) return res.status(404).json({ error: "Service not found" });

    const durationMin = service.durationMin;
    const requestedStart = exactTime;
    const requestedEnd = exactTime + durationMin;

    const settings = await getSettings(barber.id);
    const minDays = settings.minDaysBetweenBookings ?? 0;

try {
  await enforceMinDaysBetweenBookings({
    barberId: barber.id,
    requestedDateStr: dateStr,
    minDays,
    customerId: null,
    phoneNormalized,
  });
} catch (err: any) {
  return res.status(409).json({ error: err?.message ?? "Buchung nicht erlaubt." });
}
    const wd = weekdayFromDateStr(dateStr);
    const dayCfg = settings.workingHours.find((x) => x.day === wd) ?? DEFAULT_SETTINGS.workingHours[wd];
    if (!dayCfg.isOpen) return res.status(400).json({ error: "Barber is closed on this day" });

    const { windowStartMin, windowEndMin, times } = await computeAvailableTimes({
      barberId: barber.id,
      dateStr,
      serviceDurationMin: durationMin,
    });

    const earliestAllowed = Math.max(settings.earliestLimitMin, windowStartMin);

    if (requestedStart < earliestAllowed)
      return res.status(400).json({ error: `Too early. Earliest is ${toHHMM(earliestAllowed)}` });
    if (requestedEnd > windowEndMin)
      return res.status(400).json({ error: `Too late. Must end by ${toHHMM(windowEndMin)}` });

    if (!times.includes(requestedStart)) return res.status(409).json({ error: "Time is not available" });

    const existing = await getDayBookings(barber.id, dateStr);
    const conflict = existing.some((b) => {
      if (b.exactTime == null) return false;
      if (b.status === "CANCELLED") return false;
      const bStart = b.exactTime as number;
      const bEnd = bStart + b.durationMin;
      return overlaps(requestedStart, requestedEnd, bStart, bEnd);
    });
    if (conflict) return res.status(409).json({ error: "Time is already booked" });

    const bookingDate = new Date(`${dateStr}T00:00:00.000`);

    const created = await prisma.booking.create({
      data: {
        barberId: barber.id,
        date: bookingDate,
        windowStart: windowStartMin,
        windowEnd: windowEndMin,
        exactTime,
        durationMin,
        note: note || null,
        status: "CONFIRMED",
        guestName: customerName,
        guestPhone: customerPhone,
        serviceId: service.id,
      },
      include: { service: true },
    });

    const start = created.exactTime as number;
    const end = start + created.durationMin;

    res.status(201).json({
      ok: true,
      booking: {
        id: created.id,
        barber: { name: barber.name, slug: barber.slug },
        date: dateStr,
        status: created.status,
        service: { key: created.service.key, name: created.service.name, durationMin: created.durationMin },
        exactTime: created.exactTime,
        timeHHMM: `${toHHMM(start)} - ${toHHMM(end)}`,
        customer: { name: customerName, phone: customerPhone },
        note: created.note ?? null,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/* ---------- AUTH ---------- */

app.post("/auth/register", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const name = String(req.body?.name ?? "").trim();
    const phoneRaw = req.body?.phone != null ? String(req.body.phone).trim() : "";

    // ✅ Telefon Pflicht
    if (!email || !password || !name || !phoneRaw) {
      return res.status(400).json({ error: "email, password, name, phone are required" });
    }
    if (password.length < 6) return res.status(400).json({ error: "password must be at least 6 characters" });

    const phone = normalizeGermanPhone(phoneRaw);
    if (!phone) return res.status(400).json({ error: "Ungültige Telefonnummer. Bitte korrekt eingeben." });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "email already exists" });

    const customer = await prisma.customer.create({ data: { name, phone } });
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, passwordHash, role: "CUSTOMER", customerId: customer.id },
      include: { customer: true },
    });

    const token = signToken({ userId: user.id, role: "CUSTOMER" });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role, customer: user.customer },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.post("/auth/register-barber", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const name = String(req.body?.name ?? "").trim();
    const phone = req.body?.phone != null ? String(req.body.phone).trim() : null;

    if (!email || !password || !name) return res.status(400).json({ error: "email, password, name are required" });
    if (password.length < 6) return res.status(400).json({ error: "password must be at least 6 characters" });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const slug = await uniqueSlug(name);

    const barber = await prisma.barber.create({
      data: { name, slug, phone: phone || null, isActive: true },
    });

    const user = await prisma.user.create({
      data: { email, passwordHash, role: "BARBER", barberId: barber.id },
      include: { barber: true },
    });

    await prisma.service.createMany({
      data: [
        { barberId: barber.id, key: "haare", name: "Haare", durationMin: 30, isActive: true },
        { barberId: barber.id, key: "bart", name: "Bart", durationMin: 20, isActive: true },
        { barberId: barber.id, key: "haare-bart", name: "Haare + Bart", durationMin: 50, isActive: true },
      ],
      skipDuplicates: true,
    });

    const token = signToken({ userId: user.id, role: "BARBER" });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role, barber: user.barber, barberId: barber.id },
      publicLink: `/b/${barber.slug}`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const user = await prisma.user.findUnique({ where: { email }, include: { customer: true, barber: true } });
    if (!user) return res.status(401).json({ error: "invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    const token = signToken({ userId: user.id, role: user.role as any });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        barberId: user.barberId ?? null,
        customer: user.customer ? { id: user.customer.id, name: user.customer.name, phone: user.customer.phone } : null,
        barber: user.barber ? { id: user.barber.id, name: user.barber.name, slug: user.barber.slug, phone: user.barber.phone } : null,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/**
 * Me
 * GET /me
 */
app.get("/me", requireAuth, async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { customer: true, barber: true } });
    if (!user) return res.status(404).json({ error: "user not found" });

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      barberId: user.barberId ?? null,
      customer: user.customer ? { id: user.customer.id, name: user.customer.name, phone: user.customer.phone } : null,
      barber: user.barber ? { id: user.barber.id, name: user.barber.name, slug: user.barber.slug, phone: user.barber.phone } : null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/**
 * Update Me
 * PATCH /me
 * - CUSTOMER: update name/phone im Customer-Profil
 */
app.patch("/me", requireAuth, async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true, barber: true },
    });
    if (!user) return res.status(404).json({ error: "user not found" });

    // Wir bauen es sauber: erstmal nur CUSTOMER-Profil
    if (user.role !== "CUSTOMER") {
      return res.status(403).json({ error: "only CUSTOMER can update this profile for now" });
    }

    if (!user.customerId || !user.customer) {
      return res.status(400).json({ error: "Customer profile missing" });
    }

    const name = req.body?.name != null ? String(req.body.name).trim() : "";
    const phoneRaw = req.body?.phone != null ? String(req.body.phone).trim() : "";

    if (!name) return res.status(400).json({ error: "name is required" });

    // ✅ Telefon Pflicht + validieren
    if (!phoneRaw) return res.status(400).json({ error: "phone is required" });
    const phone = normalizeGermanPhone(phoneRaw);
    if (!phone) return res.status(400).json({ error: "Ungültige Telefonnummer. Bitte korrekt eingeben." });

    const updatedCustomer = await prisma.customer.update({
      where: { id: user.customerId },
      data: { name, phone },
    });

    // Antwort im gleichen Shape wie GET /me (damit Frontend einfach updaten kann)
    return res.json({
      ok: true,
      me: {
        id: user.id,
        email: user.email,
        role: user.role,
        barberId: user.barberId ?? null,
        customer: { id: updatedCustomer.id, name: updatedCustomer.name, phone: updatedCustomer.phone },
        barber: user.barber
          ? { id: user.barber.id, name: user.barber.name, slug: user.barber.slug, phone: user.barber.phone }
          : null,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/* ---------- CUSTOMER: Notifications (CustomerId/readAt) ---------- */

/**
 * GET /notifications/unread-count
 * CUSTOMER only
 */
app.get("/notifications/unread-count", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { customerId: true },
    });

    if (!user?.customerId) return res.json({ ok: true, count: 0 });

    const count = await prisma.notification.count({
      where: { customerId: user.customerId, readAt: null },
    });

    res.json({ ok: true, count });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/**
 * GET /notifications
 * CUSTOMER only
 * ✅ liefert Frontend-Shape: { id, type, title, body, link, isRead, createdAt }
 */
app.get("/notifications", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { customerId: true },
    });

    if (!user?.customerId) return res.json({ ok: true, notifications: [] });

    const notifications = await prisma.notification.findMany({
      where: { customerId: user.customerId },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
      include: {
        booking: {
          include: { service: true, barber: true },
        },
      },
    });

    const view = notifications.map((n) => {
      const booking = n.booking;

      const bookingDate = booking?.date ? formatDateBerlin(new Date(booking.date)) : null;

      const timeHHMM =
        booking?.exactTime != null && booking?.durationMin != null
          ? `${toHHMM(booking.exactTime)} - ${toHHMM(booking.exactTime + booking.durationMin)}`
          : null;

      const barberName = booking?.barber?.name ?? null;
      const serviceName = booking?.service?.name ?? null;

      // schöner Text (mehr Infos)
      const extra =
        bookingDate || timeHHMM || barberName || serviceName
          ? `\n\n${[
              barberName ? `Friseur: ${barberName}` : null,
              serviceName ? `Service: ${serviceName}` : null,
              bookingDate ? `Datum: ${bookingDate}` : null,
              timeHHMM ? `Zeit: ${timeHHMM}` : null,
            ]
              .filter(Boolean)
              .join(" • ")}`
          : "";

      return {
        id: n.id,
        type: n.type,
        title: n.title,
        body: `${n.message}${extra}`, // Frontend nutzt body
        link: "/my-bookings",
        isRead: n.readAt != null, // Frontend nutzt isRead
        createdAt: n.createdAt,
      };
    });

    res.json({ ok: true, notifications: view });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/**
 * ✅ FIX: Frontend nutzt PATCH /notifications/:id/read
 * Also muss Backend auch PATCH haben (nicht POST).
 */
app.patch("/notifications/:id/read", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { customerId: true },
    });
    if (!user?.customerId) return res.status(403).json({ error: "no customer profile" });

    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n || n.customerId !== user.customerId) return res.status(404).json({ error: "not found" });

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    res.json({ ok: true, notification: updated });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/**
 * POST /notifications/read-all
 * CUSTOMER only
 */
app.post("/notifications/read-all", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { customerId: true },
    });
    if (!user?.customerId) return res.json({ ok: true });

    await prisma.notification.updateMany({
      where: { customerId: user.customerId, readAt: null },
      data: { readAt: new Date() },
    });

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/* ---------- CUSTOMER booking (JWT) ---------- */

app.post("/bookings", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;

    const barberSlug = String(req.body?.barberSlug ?? "").trim().toLowerCase();
    const dateStr = String(req.body?.date ?? "").trim();
    const serviceKey = String(req.body?.serviceKey ?? "").trim();
    const exactTimeRaw = req.body?.exactTime;
    const note = req.body?.note != null ? String(req.body.note).trim() : null;

    if (!barberSlug || !dateStr || !serviceKey || exactTimeRaw == null) {
      return res.status(400).json({ error: "barberSlug, date, serviceKey, exactTime required" });
    }
    if (!isValidDateYYYYMMDD(dateStr)) return res.status(400).json({ error: "date must be YYYY-MM-DD" });

    const me = await prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true },
    });
    if (!me || !me.customer) return res.status(400).json({ error: "Customer profile missing" });

    // ✅ FIX: customerPhone gab es nicht -> darum hattest du den Fehler
    const customerName = (me.customer.name ?? "").trim();
    const customerPhoneRaw = (me.customer.phone ?? "").trim();
    const normalizedPhone = normalizeGermanPhone(customerPhoneRaw);

    if (!customerName) {
      return res.status(400).json({ error: "Bitte Name im Profil vervollständigen." });
    }
    if (!normalizedPhone) {
      return res.status(400).json({ error: "Ungültige Telefonnummer. Bitte im Profil korrigieren." });
    }

    let exactTime: number | null = null;
    if (typeof exactTimeRaw === "number") exactTime = exactTimeRaw;
    if (typeof exactTimeRaw === "string") exactTime = parseHHMMToMin(exactTimeRaw);
    if (exactTime == null || exactTime < 0 || exactTime > 1439) {
      return res.status(400).json({ error: "exactTime must be HH:MM or 0..1439" });
    }

    const barber = await prisma.barber.findUnique({ where: { slug: barberSlug } });
    if (!barber || !barber.isActive) return res.status(404).json({ error: "Barber not found" });

    const service = await prisma.service.findUnique({
      where: { barberId_key: { barberId: barber.id, key: serviceKey } },
    });
    if (!service || !service.isActive) return res.status(404).json({ error: "Service not found" });

    const durationMin = service.durationMin;
    const requestedStart = exactTime;
    const requestedEnd = exactTime + durationMin;

    const settings = await getSettings(barber.id);
    const minDays = settings.minDaysBetweenBookings ?? 0;

// customer phone normalisieren (du nutzt das eh schon)
const phoneNormalized = normalizeGermanPhone(me.customer.phone ?? "");
if (!phoneNormalized) {
  return res.status(400).json({ error: "Ungültige Telefonnummer. Bitte im Profil korrigieren." });
}

// ✅ Regel anwenden
try {
  await enforceMinDaysBetweenBookings({
    barberId: barber.id,
    requestedDateStr: dateStr,
    minDays,
    customerId: me.customer.id,
    phoneNormalized,
  });
} catch (err: any) {
  return res.status(409).json({ error: err?.message ?? "Buchung nicht erlaubt." });
}
    const wd = weekdayFromDateStr(dateStr);
    const dayCfg = settings.workingHours.find((x) => x.day === wd) ?? DEFAULT_SETTINGS.workingHours[wd];
    if (!dayCfg.isOpen) return res.status(400).json({ error: "Barber is closed on this day" });

    const { windowStartMin, windowEndMin, times } = await computeAvailableTimes({
      barberId: barber.id,
      dateStr,
      serviceDurationMin: durationMin,
    });

    const earliestAllowed = Math.max(settings.earliestLimitMin, windowStartMin);
    if (requestedStart < earliestAllowed)
      return res.status(400).json({ error: `Too early. Earliest is ${toHHMM(earliestAllowed)}` });
    if (requestedEnd > windowEndMin)
      return res.status(400).json({ error: `Too late. Must end by ${toHHMM(windowEndMin)}` });

    if (!times.includes(requestedStart)) return res.status(409).json({ error: "Time is not available" });

    const existing = await getDayBookings(barber.id, dateStr);
    const conflict = existing.some((b) => {
      if (b.exactTime == null) return false;
      if (b.status === "CANCELLED") return false;
      const bStart = b.exactTime as number;
      const bEnd = bStart + b.durationMin;
      return overlaps(requestedStart, requestedEnd, bStart, bEnd);
    });
    if (conflict) return res.status(409).json({ error: "Time is already booked" });

    const bookingDate = new Date(`${dateStr}T00:00:00.000`);

    const created = await prisma.booking.create({
      data: {
        barberId: barber.id,
        customerId: me.customer.id,
        date: bookingDate,
        windowStart: windowStartMin,
        windowEnd: windowEndMin,
        exactTime,
        durationMin,
        note: note || null,
        status: "CONFIRMED",
        serviceId: service.id,
      },
      include: { service: true, customer: true },
    });

    const start = created.exactTime as number;
    const end = start + created.durationMin;

    res.status(201).json({
      ok: true,
      booking: {
        id: created.id,
        barber: { name: barber.name, slug: barber.slug },
        date: dateStr,
        status: created.status,
        service: { key: created.service.key, name: created.service.name, durationMin: created.durationMin },
        exactTime: created.exactTime,
        timeHHMM: `${toHHMM(start)} - ${toHHMM(end)}`,
        // ✅ gib normalisierte Nummer zurück (konsistent)
        customer: { id: created.customer?.id, name: created.customer?.name, phone: normalizedPhone },
        note: created.note ?? null,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/* ---------- ADMIN (BARBER only) ---------- */

app.get("/admin/services", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const services = await prisma.service.findMany({
      where: { barberId },
      orderBy: [{ id: "asc" }],
    });

    res.json({ ok: true, services });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.get("/admin/bookings", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const dateStr = String(req.query.date ?? "");
    if (!dateStr) return res.status(400).json({ error: "Use /admin/bookings?date=YYYY-MM-DD" });
    if (!isValidDateYYYYMMDD(dateStr)) return res.status(400).json({ error: "date must be YYYY-MM-DD" });

    const bookings = await getDayBookings(barberId, dateStr);

    const view = bookings.map((b) => {
      const start = b.exactTime ?? null;
      const end = b.exactTime != null ? (b.exactTime as number) + b.durationMin : null;

      const customerName = b.customer?.name ?? b.guestName ?? null;
      const customerPhone = b.customer?.phone ?? b.guestPhone ?? null;

      return {
        id: b.id,
        status: b.status,
        customer: customerName ? { id: b.customer?.id ?? 0, name: customerName, phone: customerPhone ?? "" } : null,
        service: b.service ? { key: b.service.key, name: b.service.name, durationMin: b.durationMin } : null,
        windowStart: b.windowStart,
        windowEnd: b.windowEnd,
        exactTime: b.exactTime,
        timeHHMM: start != null && end != null ? `${toHHMM(start)} - ${toHHMM(end)}` : null,
        note: b.note ?? null,
        createdAt: b.createdAt,
      };
    });

    res.json({ date: dateStr, count: view.length, bookings: view });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.patch("/admin/bookings/:id/status", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const status = String(req.body?.status ?? "").trim().toUpperCase();
    const allowed = new Set(["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]);
    if (!allowed.has(status)) return res.status(400).json({ error: "invalid status" });

    const existing = await prisma.booking.findUnique({
      where: { id },
      include: { service: true, barber: true, customer: true },
    });
    if (!existing || existing.barberId !== barberId) return res.status(404).json({ error: "not found" });

    // ✅ Wenn Barber CANCELLED setzt -> Booking HARD DELETE
    if (status === "CANCELLED") {
      // 1) Direkt wenn registrierter Kunde
      let targetCustomerId: number | null = existing.customerId ?? null;

      // 2) Fallback: guestPhone match über Normalisierung
      if (!targetCustomerId) {
        const guestNorm = normalizePhone(existing.guestPhone);
        if (guestNorm) {
          const candidates = await prisma.customer.findMany({
            where: { phone: { not: null } },
            select: { id: true, phone: true },
          });

          const hit = candidates.find((c) => normalizePhone(c.phone) === guestNorm);
          if (hit) targetCustomerId = hit.id;
        }
      }

      // Notification
      if (targetCustomerId) {
        const when =
          existing.exactTime != null
            ? `${toHHMM(existing.exactTime)} - ${toHHMM(existing.exactTime + existing.durationMin)}`
            : "";

        const dateStr = formatDateBerlin(existing.date);

        const barberName = existing.barber?.name ?? "Friseur";
        const serviceName = existing.service?.name ?? "Service";

        await createCustomerNotification({
          customerId: targetCustomerId,
          type: "BOOKING_CANCELLED",
          title: "Termin storniert",
          message: `Dein Termin wurde storniert.\nFriseur: ${barberName}\nService: ${serviceName}\nDatum: ${dateStr}${
            when ? `\nZeit: ${when}` : ""
          }`,
          bookingId: null, // wichtig, da hard delete
        });
      } else {
        console.log("⚠️ CANCELLED: Kein customerId gefunden (guest + phone mismatch). bookingId=", existing.id);
      }

      await prisma.booking.delete({ where: { id } });
      return res.json({ ok: true, deleted: true, id });
    }

    // sonst normale Status-Änderung
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: status as any },
    });

    if (existing.customerId) {
      const details = buildBookingDetailsText({
        date: existing.date,
        exactTime: existing.exactTime,
        durationMin: existing.durationMin,
        barber: existing.barber ? { name: existing.barber.name } : null,
        service: existing.service ? { name: existing.service.name } : null,
      });

      await createCustomerNotification({
        customerId: existing.customerId,
        type: "BOOKING_STATUS_CHANGED",
        title: "Termin-Status geändert",
        message: `Neuer Status: ${status}\n${details}`,
        bookingId: existing.id,
      });
    }

    res.json({ ok: true, id: updated.id, status: updated.status });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.get("/admin/settings", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const settings = await getSettings(barberId);
    res.json({ ok: true, settings });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.put("/admin/settings", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const current = await getSettings(barberId);
    const merged = { ...current, ...(req.body ?? {}) };
    const normalized = normalizeSettings(merged);

    await saveSettings(barberId, normalized);
    res.json({ ok: true, settings: normalized });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/* ---------- ADMIN: profile (BARBER only) ---------- */

app.get("/admin/profile", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        bio: true,
        street: true,
        postalCode: true,
        city: true,
        instagram: true,
        website: true,
      },
    });

    res.json({ ok: true, barber });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.put("/admin/profile", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const phone = req.body?.phone != null ? String(req.body.phone).trim() : null;
    const bio = req.body?.bio != null ? String(req.body.bio).trim() : null;
    const street = req.body?.street != null ? String(req.body.street).trim() : null;
    const postalCode = req.body?.postalCode != null ? String(req.body.postalCode).trim() : null;
    const city = req.body?.city != null ? String(req.body.city).trim() : null;
    const instagram = req.body?.instagram != null ? String(req.body.instagram).trim() : null;
    const website = req.body?.website != null ? String(req.body.website).trim() : null;

    const updated = await prisma.barber.update({
      where: { id: barberId },
      data: {
        phone: phone || null,
        bio: bio || null,
        street: street || null,
        postalCode: postalCode || null,
        city: city || null,
        instagram: instagram || null,
        website: website || null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        bio: true,
        street: true,
        postalCode: true,
        city: true,
        instagram: true,
        website: true,
      },
    });

    res.json({ ok: true, barber: updated });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/* ---------- ADMIN: recurring-blocks & time-blocks ---------- */

function requireValidMinRange(startMin: number, endMin: number) {
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) return "startMin/endMin must be numbers";
  if (startMin < 0 || startMin > 1439) return "startMin out of range";
  if (endMin < 1 || endMin > 1440) return "endMin out of range";
  if (endMin <= startMin) return "endMin must be > startMin";
  return null;
}

app.get("/admin/recurring-blocks", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const blocks = await prisma.recurringBlock.findMany({
      where: { barberId },
      orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
    });

    res.json({ ok: true, blocks });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.post("/admin/recurring-blocks", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const weekday = Number(req.body?.weekday);
    const startMin = Number(req.body?.startMin);
    const endMin = Number(req.body?.endMin);
    const reason = req.body?.reason != null ? String(req.body.reason).trim() : null;
    const enabled = req.body?.enabled == null ? true : Boolean(req.body.enabled);

    if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6) {
      return res.status(400).json({ error: "weekday must be 0..6" });
    }

    const rangeErr = requireValidMinRange(startMin, endMin);
    if (rangeErr) return res.status(400).json({ error: rangeErr });

    const block = await prisma.recurringBlock.create({
      data: { barberId, weekday, startMin, endMin, reason, enabled },
    });

    res.status(201).json({ ok: true, block });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.patch("/admin/recurring-blocks/:id", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const enabled = Boolean(req.body?.enabled);

    const existing = await prisma.recurringBlock.findUnique({ where: { id } });
    if (!existing || existing.barberId !== barberId) return res.status(404).json({ error: "not found" });

    const updated = await prisma.recurringBlock.update({
      where: { id },
      data: { enabled },
    });

    res.json({ ok: true, block: updated });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.delete("/admin/recurring-blocks/:id", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const existing = await prisma.recurringBlock.findUnique({ where: { id } });
    if (!existing || existing.barberId !== barberId) return res.status(404).json({ error: "not found" });

    await prisma.recurringBlock.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.get("/admin/time-blocks", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const dateStr = String(req.query.date ?? "").trim();
    if (!isValidDateYYYYMMDD(dateStr)) return res.status(400).json({ error: "date must be YYYY-MM-DD" });

    const dayStart = new Date(`${dateStr}T00:00:00.000`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999`);

    const blocks = await prisma.timeBlock.findMany({
      where: { barberId, date: { gte: dayStart, lte: dayEnd } },
      orderBy: [{ startMin: "asc" }],
    });

    res.json({ ok: true, blocks });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.post("/admin/time-blocks", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const dateStr = String(req.body?.date ?? "").trim();
    const startMin = Number(req.body?.startMin);
    const endMin = Number(req.body?.endMin);
    const reason = req.body?.reason != null ? String(req.body.reason).trim() : null;

    if (!isValidDateYYYYMMDD(dateStr)) return res.status(400).json({ error: "date must be YYYY-MM-DD" });

    const rangeErr = requireValidMinRange(startMin, endMin);
    if (rangeErr) return res.status(400).json({ error: rangeErr });

    const block = await prisma.timeBlock.create({
      data: {
        barberId,
        date: new Date(`${dateStr}T00:00:00.000`),
        startMin,
        endMin,
        reason,
      },
    });

    res.status(201).json({ ok: true, block });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.delete("/admin/time-blocks/:id", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const existing = await prisma.timeBlock.findUnique({ where: { id } });
    if (!existing || existing.barberId !== barberId) return res.status(404).json({ error: "not found" });

    await prisma.timeBlock.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.get("/admin/blocks", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const dateStr = String(req.query.date ?? "").trim();
    if (!isValidDateYYYYMMDD(dateStr)) return res.status(400).json({ error: "date must be YYYY-MM-DD" });

    const blocks = await getBlocksForDay(barberId, dateStr);

    res.json({
      ok: true,
      date: dateStr,
      blocks: {
        recurring: blocks.recurring.map((b) => ({ startMin: b.start, endMin: b.end })),
        once: blocks.once.map((b) => ({ startMin: b.start, endMin: b.end })),
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/* ---------- ADMIN: services CRUD ---------- */

app.post("/admin/services", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const name = String(req.body?.name ?? "").trim();
    const durationMin = Number(req.body?.durationMin);
    const isActive = req.body?.isActive == null ? true : Boolean(req.body.isActive);
    const keyRaw = req.body?.key != null ? String(req.body.key).trim() : "";

    if (!name) return res.status(400).json({ error: "name is required" });
    if (!Number.isFinite(durationMin) || durationMin <= 0)
      return res.status(400).json({ error: "durationMin must be > 0" });

    const baseKey = keyRaw ? slugify(keyRaw) : slugify(name);
    if (!baseKey) return res.status(400).json({ error: "invalid key/name" });

    let key = baseKey;
    let i = 0;
    while (true) {
      const exists = await prisma.service.findUnique({ where: { barberId_key: { barberId, key } } });
      if (!exists) break;
      i++;
      key = `${baseKey}-${i}`;
    }

    const created = await prisma.service.create({
      data: { barberId, key, name, durationMin, isActive },
    });

    res.status(201).json({ ok: true, service: created });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.patch("/admin/services/:id", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing || existing.barberId !== barberId) return res.status(404).json({ error: "not found" });

    const patch: any = {};
    if (req.body?.name != null) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: "name cannot be empty" });
      patch.name = name;
    }
    if (req.body?.durationMin != null) {
      const durationMin = Number(req.body.durationMin);
      if (!Number.isFinite(durationMin) || durationMin <= 0)
        return res.status(400).json({ error: "durationMin must be > 0" });
      patch.durationMin = durationMin;
    }
    if (req.body?.isActive != null) {
      patch.isActive = Boolean(req.body.isActive);
    }

    const updated = await prisma.service.update({ where: { id }, data: patch });
    res.json({ ok: true, service: updated });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.delete("/admin/services/:id", requireAuth, requireRole("BARBER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;
    const barberId = await getBarberIdFromUser(userId);

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing || existing.barberId !== barberId) return res.status(404).json({ error: "not found" });

    await prisma.service.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/* ---------- CUSTOMER: my-bookings + cancel ---------- */

app.get("/my-bookings", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true },
    });

    if (!user || !user.customer) {
      return res.status(404).json({ error: "customer profile not found" });
    }

    const customerId = user.customer.id;
    const myPhone = (user.customer.phone ?? "").trim();

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [{ customerId }, ...(myPhone ? [{ guestPhone: myPhone }] : [])],
      },
      include: {
        service: true,
        barber: { select: { name: true, slug: true } },
      },
      orderBy: [{ date: "asc" }, { exactTime: "asc" }, { createdAt: "asc" }],
    });

    const view = bookings.map((b) => {
      // ✅ FIX: kein toISOString() mehr, sondern Berlin-Format
      const dateStr = formatDateBerlin(b.date);

      const start = b.exactTime ?? null;
      const end = start != null ? start + b.durationMin : null;

      return {
        id: b.id,
        date: dateStr,
        status: b.status,
        timeHHMM: start != null && end != null ? `${toHHMM(start)} - ${toHHMM(end)}` : null,
        note: b.note ?? null,
        durationMin: b.durationMin,
        barber: b.barber ? { name: b.barber.name, slug: b.barber.slug } : null,
        service: b.service ? { key: b.service.key, name: b.service.name, durationMin: b.service.durationMin } : null,
        isGuest: b.customerId == null,
        guestName: b.guestName ?? null,
        guestPhone: b.guestPhone ?? null,
      };
    });

    res.json({ ok: true, count: view.length, bookings: view });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

app.delete("/bookings/:id", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  try {
    const { userId } = (req as any).user as JwtPayload;

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true },
    });

    if (!user || !user.customerId) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    const existing = await prisma.booking.findUnique({ where: { id } });

    if (!existing || existing.customerId !== user.customerId) {
      return res.status(404).json({ error: "not found" });
    }

    if (existing.status === "CANCELLED") {
      return res.json({ ok: true, alreadyCancelled: true });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" as any },
    });

    res.json({ ok: true, id: updated.id, status: updated.status });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});