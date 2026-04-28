"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

type BookingStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
type ViewMode = "day" | "week";

type ApiBooking = {
  id: number;
  status: BookingStatus;
  customer: { id: number; name: string; phone: string } | null;
  service: { key: string; name: string; durationMin: number } | null;
  exactTime: number | null;
  timeHHMM: string | null;
  note: string | null;
  windowStart?: number | null;
  windowEnd?: number | null;
};

type ApiBlock = {
  id: number;
  startMin: number;
  endMin: number;
  reason?: string | null;
  source: "recurring" | "time";
};

type DayData = {
  date: string;
  bookings: ApiBooking[];
  blocks: ApiBlock[];
};

type PositionedBooking = ApiBooking & {
  startMin: number;
  endMin: number;
  lane: number;
  laneCount: number;
};

type ServiceOption = {
  key: string;
  name: string;
  durationMin: number;
};

type AvailableTimesResponse = {
  barber: { name: string; slug: string };
  date: string;
  isOpen: boolean;
  stepMin: number;
  activeWindow: { startMin: number; endMin: number };
  activeWindowHHMM: { start: string; end: string };
  service: { key: string; name: string; durationMin: number };
  times: number[];
  timesHHMM: string[];
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayIsoLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseIsoDateLocal(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toIsoLocal(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addDays(iso: string, amount: number) {
  const d = parseIsoDateLocal(iso);
  d.setDate(d.getDate() + amount);
  return toIsoLocal(d);
}

function startOfWeekMonday(iso: string) {
  const d = parseIsoDateLocal(iso);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toIsoLocal(d);
}

function getWeekDates(anchorIso: string) {
  const start = startOfWeekMonday(anchorIso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function minToHHMM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function parseStartEndFromTimeHHMM(timeHHMM: string | null) {
  if (!timeHHMM) return null;
  const parts = timeHHMM.split("-");
  if (parts.length !== 2) return null;

  const a = parts[0].trim();
  const b = parts[1].trim();

  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);

  if (![ah, am, bh, bm].every((x) => Number.isFinite(x))) return null;

  return { startMin: ah * 60 + am, endMin: bh * 60 + bm };
}

function statusLabel(s: BookingStatus) {
  if (s === "CONFIRMED") return "Bestätigt";
  if (s === "COMPLETED") return "Erledigt";
  if (s === "NO_SHOW") return "Nicht erschienen";
  return "Storniert";
}

function statusColors(s: BookingStatus) {
  if (s === "CONFIRMED") {
    return {
      bg: "#111111",
      text: "#ffffff",
      soft: "#f6f6f7",
      border: "#e6e6e8",
      accent: "#111111",
    };
  }

  if (s === "COMPLETED") {
    return {
      bg: "#116530",
      text: "#ffffff",
      soft: "#eef9f1",
      border: "#d7ecdd",
      accent: "#116530",
    };
  }

  if (s === "NO_SHOW") {
    return {
      bg: "#a86400",
      text: "#ffffff",
      soft: "#fff6e8",
      border: "#f0dfbd",
      accent: "#a86400",
    };
  }

  return {
    bg: "#b42318",
    text: "#ffffff",
    soft: "#fff1f1",
    border: "#f2d0d0",
    accent: "#b42318",
  };
}

function formatDayHeadline(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseIsoDateLocal(iso));
}

function formatShortDay(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(parseIsoDateLocal(iso));
}

function formatWeekRange(anchorIso: string) {
  const dates = getWeekDates(anchorIso);
  return `${formatShortDay(dates[0])} – ${formatShortDay(dates[6])}`;
}

function getNowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isSameLocalDate(iso: string) {
  return iso === todayIsoLocal();
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function layoutOverlappingBookings(bookings: ApiBooking[]): PositionedBooking[] {
  const parsed = bookings
    .map((b) => {
      const se = parseStartEndFromTimeHHMM(b.timeHHMM);
      if (!se) return null;
      return { ...b, startMin: se.startMin, endMin: se.endMin };
    })
    .filter((b): b is ApiBooking & { startMin: number; endMin: number } => !!b)
    .sort((a, b) => {
      if (a.startMin !== b.startMin) return a.startMin - b.startMin;
      if (a.endMin !== b.endMin) return a.endMin - b.endMin;
      return a.id - b.id;
    });

  const result: PositionedBooking[] = [];
  let group: Array<ApiBooking & { startMin: number; endMin: number }> = [];
  let groupEnd = -1;

  function flushGroup() {
    if (group.length === 0) return;

    const laneEndTimes: number[] = [];
    const temp: PositionedBooking[] = [];

    for (const b of group) {
      let lane = -1;

      for (let i = 0; i < laneEndTimes.length; i++) {
        if (b.startMin >= laneEndTimes[i]) {
          lane = i;
          laneEndTimes[i] = b.endMin;
          break;
        }
      }

      if (lane === -1) {
        lane = laneEndTimes.length;
        laneEndTimes.push(b.endMin);
      }

      temp.push({
        ...b,
        lane,
        laneCount: 0,
      });
    }

    const laneCount = laneEndTimes.length;
    for (const item of temp) {
      item.laneCount = laneCount;
      result.push(item);
    }

    group = [];
    groupEnd = -1;
  }

  for (const b of parsed) {
    if (group.length === 0) {
      group = [b];
      groupEnd = b.endMin;
      continue;
    }

    if (b.startMin < groupEnd) {
      group.push(b);
      groupEnd = Math.max(groupEnd, b.endMin);
    } else {
      flushGroup();
      group = [b];
      groupEnd = b.endMin;
    }
  }

  flushGroup();
  return result;
}

function getWindowFromRanges(bookings: ApiBooking[], blocks: ApiBlock[]) {
  const bookingRanges = bookings
    .map((b) => parseStartEndFromTimeHHMM(b.timeHHMM))
    .filter((x): x is { startMin: number; endMin: number } => !!x);

  const blockRanges = blocks.map((b) => ({
    startMin: b.startMin,
    endMin: b.endMin,
  }));

  const allRanges = [...bookingRanges, ...blockRanges];

  if (allRanges.length === 0) {
    return { start: 9 * 60, end: 18 * 60 };
  }

  const minStart = Math.min(...allRanges.map((x) => x.startMin));
  const maxEnd = Math.max(...allRanges.map((x) => x.endMin));

  const start = Math.max(6 * 60, Math.floor(minStart / 60) * 60);
  const end = Math.min(22 * 60, Math.ceil(maxEnd / 60) * 60);

  return {
    start,
    end: Math.max(end, start + 60),
  };
}

function TopButton(props: {
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        width: "100%",
        minHeight: 46,
        padding: "10px 14px",
        borderRadius: 14,
        border: props.active ? "1px solid #111" : "1px solid #ddd",
        background: props.active ? "#111" : "#fff",
        color: props.active ? "#fff" : "#111",
        fontWeight: 900,
        fontSize: 15,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.75 : 1,
      }}
    >
      {props.children}
    </button>
  );
}

function SmallNavButton(props: {
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={props.onClick}
      style={{
        minHeight: 42,
        padding: "9px 12px",
        borderRadius: 12,
        border: "1px solid #ddd",
        background: "#fff",
        color: "#111",
        fontWeight: 900,
        fontSize: 14,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {props.children}
    </button>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [view, setView] = useState<ViewMode>("day");
  const [anchorDate, setAnchorDate] = useState<string>(todayIsoLocal());
  const [isMobile, setIsMobile] = useState(false);

  const [dayData, setDayData] = useState<DayData | null>(null);
  const [weekData, setWeekData] = useState<DayData[]>([]);

  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedBooking, setSelectedBooking] = useState<ApiBooking | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [barberSlug, setBarberSlug] = useState("");

  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newServiceKey, setNewServiceKey] = useState("");
  const [newBookingDate, setNewBookingDate] = useState(anchorDate);
  const [newBookingNote, setNewBookingNote] = useState("");
  const [newBookingTime, setNewBookingTime] = useState("");

  const [manualAvailableTimes, setManualAvailableTimes] = useState<string[]>([]);
  const [manualTimesLoading, setManualTimesLoading] = useState(false);

  const swipeStartX = useRef<number | null>(null);

  useEffect(() => {
    function update() {
      setIsMobile(window.innerWidth <= 768);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    async function init() {
      const token = getToken();
      const userRaw = localStorage.getItem("user");

      if (!token || !userRaw) {
        router.replace("/login");
        return;
      }

      let user: any = null;
      try {
        user = JSON.parse(userRaw);
      } catch {
        user = null;
      }

      if (!user || user.role !== "BARBER") {
        router.replace("/");
        return;
      }

      const allowed = await checkSubscriptionAccess();
      if (!allowed) return;

      await loadInitialData();
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (checkingSubscription) return;
    loadCurrentView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorDate, view, checkingSubscription]);

  useEffect(() => {
    if (!showCreateModal) return;
    if (!newBookingDate || !newServiceKey || !barberSlug) return;
    loadManualAvailableTimes(newBookingDate, newServiceKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateModal, newBookingDate, newServiceKey, barberSlug]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedBooking(null);
        setShowCreateModal(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!scrollRef.current || view !== "day") return;

    const nowMin = getNowMinutes();
    const pxPerMin = 2.15;
    const offset = Math.max(0, (nowMin - commonWindow.start) * pxPerMin - 180);

    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: offset, behavior: "smooth" });
    }, 150);
  }, [view, anchorDate]); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkSubscriptionAccess() {
  try {
    setCheckingSubscription(true);

    const token = getToken();
    const res = await fetch(`${API_BASE}/admin/subscription-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const raw = await res.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      setError(data?.error || "Fehler beim Prüfen des Abos.");
      return false;
    }

    const isPro =
      !!data?.isPro || !!data?.subscription?.isPro;

    const isBasic =
      !!data?.isBasic || !!data?.subscription?.isBasic;

    const isActive =
      !!data?.isActive ||
      !!data?.subscription?.isActive ||
      isPro ||
      isBasic;

    if (!isActive) {
      router.replace("/barber/subscription");
      return false;
    }

    return true;
  } catch (e: any) {
    console.error(e);
    setError("Fehler beim Prüfen des Abos.");
    return false;
  } finally {
    setCheckingSubscription(false);
  }
}

  async function fetchRecurringBlocks() {
    const token = getToken();
    const res = await fetch(`${API_BASE}/admin/recurring-blocks`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const raw = await res.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      throw new Error(data?.error || `Fehler (Status ${res.status})`);
    }

    return Array.isArray(data?.blocks) ? data.blocks : [];
  }

  async function fetchTimeBlocks(date: string) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/admin/time-blocks?date=${encodeURIComponent(date)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const raw = await res.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      throw new Error(data?.error || `Fehler (Status ${res.status})`);
    }

    return Array.isArray(data?.blocks) ? data.blocks : [];
  }

  async function fetchDay(date: string): Promise<DayData> {
    const token = getToken();

    const [bookingsRes, recurringBlocks, timeBlocks] = await Promise.all([
      fetch(`${API_BASE}/admin/bookings?date=${encodeURIComponent(date)}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetchRecurringBlocks(),
      fetchTimeBlocks(date),
    ]);

    const bookingsRaw = await bookingsRes.text();
    let bookingsData: any = {};
    try {
      bookingsData = bookingsRaw ? JSON.parse(bookingsRaw) : {};
    } catch {
      bookingsData = { raw: bookingsRaw };
    }

    if (!bookingsRes.ok) {
      throw new Error(bookingsData?.error || `Fehler (Status ${bookingsRes.status})`);
    }

    const weekday = parseIsoDateLocal(date).getDay();

    const recurringForDay: ApiBlock[] = recurringBlocks
      .filter((b: any) => Number(b.weekday) === weekday && b.enabled !== false)
      .map((b: any) => ({
        id: Number(b.id),
        startMin: Number(b.startMin),
        endMin: Number(b.endMin),
        reason: b.reason ?? null,
        source: "recurring" as const,
      }));

    const timeForDay: ApiBlock[] = timeBlocks.map((b: any) => ({
      id: Number(b.id),
      startMin: Number(b.startMin),
      endMin: Number(b.endMin),
      reason: b.reason ?? null,
      source: "time" as const,
    }));

    return {
      date,
      bookings: Array.isArray(bookingsData?.bookings) ? bookingsData.bookings : [],
      blocks: [...recurringForDay, ...timeForDay].sort((a, b) => a.startMin - b.startMin),
    };
  }

  async function fetchServices() {
    const token = getToken();
    const res = await fetch(`${API_BASE}/admin/services`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const raw = await res.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      throw new Error(data?.error || `Fehler (Status ${res.status})`);
    }

    const list = Array.isArray(data?.services) ? data.services : [];
    return list.map((s: any) => ({
      key: String(s.key),
      name: String(s.name),
      durationMin: Number(s.durationMin ?? 0),
    })) as ServiceOption[];
  }

  async function fetchBarberSlug() {
    const token = getToken();
    const res = await fetch(`${API_BASE}/admin/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const raw = await res.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      throw new Error(data?.error || `Fehler (Status ${res.status})`);
    }

    return String(data?.barber?.slug ?? "");
  }

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [servicesList, slug] = await Promise.all([fetchServices(), fetchBarberSlug()]);
      setServices(servicesList);
      setBarberSlug(slug);

      if (servicesList.length > 0) {
        setNewServiceKey(servicesList[0].key);
      }

      await loadCurrentView();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrentView() {
    try {
      setCalendarLoading(true);
      setError("");
      setMessage("");

      if (view === "day") {
        const result = await fetchDay(anchorDate);
        setDayData(result);
        setWeekData([]);
      } else {
        const dates = getWeekDates(anchorDate);
        const results = await Promise.all(dates.map((d) => fetchDay(d)));
        setWeekData(results);
        setDayData(null);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Fehler beim Laden.");
      setDayData(null);
      setWeekData([]);
    } finally {
      setCalendarLoading(false);
    }
  }

  async function updateStatus(bookingId: number, status: BookingStatus) {
    try {
      setUpdatingId(bookingId);
      setError("");
      setMessage("");

      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Status konnte nicht geändert werden.");
      }

      setDayData((prev) =>
        prev
          ? {
              ...prev,
              bookings: prev.bookings.map((b) => (b.id === bookingId ? { ...b, status } : b)),
            }
          : prev
      );

      setWeekData((prev) =>
        prev.map((day) => ({
          ...day,
          bookings: day.bookings.map((b) => (b.id === bookingId ? { ...b, status } : b)),
        }))
      );

      setSelectedBooking((prev) => (prev && prev.id === bookingId ? { ...prev, status } : prev));
      setMessage("✅ Status aktualisiert");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Fehler beim Aktualisieren.");
    } finally {
      setUpdatingId(null);
    }
  }

  function goPrev() {
    setAnchorDate((prev) => addDays(prev, view === "day" ? -1 : -7));
  }

  function goNext() {
    setAnchorDate((prev) => addDays(prev, view === "day" ? 1 : 7));
  }

  function goToday() {
    setAnchorDate(todayIsoLocal());
  }

  function openCreateModal() {
    setError("");
    setMessage("");
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewBookingDate(anchorDate);
    setNewBookingTime("");
    setNewBookingNote("");
    setManualAvailableTimes([]);

    if (services.length > 0) {
      setNewServiceKey(services[0].key);
    }

    setShowCreateModal(true);
  }

  async function loadManualAvailableTimes(date: string, serviceKey: string) {
    try {
      setManualTimesLoading(true);

      const res = await fetch(
        `${API_BASE}/public/available-times?barberSlug=${encodeURIComponent(
          barberSlug
        )}&date=${encodeURIComponent(date)}&serviceKey=${encodeURIComponent(serviceKey)}`
      );

      const raw = await res.text();
      let data: AvailableTimesResponse | any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      const times = Array.isArray(data?.timesHHMM) ? data.timesHHMM : [];
      setManualAvailableTimes(times);

      if (!times.includes(newBookingTime)) {
        setNewBookingTime(times[0] ?? "");
      }
    } catch (e) {
      console.error(e);
      setManualAvailableTimes([]);
      setNewBookingTime("");
    } finally {
      setManualTimesLoading(false);
    }
  }

  async function createManualBooking() {
    try {
      setCreatingBooking(true);
      setError("");
      setMessage("");

      if (!newCustomerName.trim()) {
        setError("Bitte Kundennamen eingeben.");
        return;
      }

      if (!newServiceKey.trim()) {
        setError("Bitte einen Service auswählen.");
        return;
      }

      if (!newBookingDate.trim()) {
        setError("Bitte ein Datum wählen.");
        return;
      }

      if (!newBookingTime.trim()) {
        setError("Bitte einen freien Termin auswählen.");
        return;
      }

      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/manual-bookings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: newCustomerName.trim(),
          customerPhone: newCustomerPhone.trim() ? newCustomerPhone.trim() : null,
          serviceKey: newServiceKey,
          date: newBookingDate,
          startTime: newBookingTime,
          note: newBookingNote.trim() ? newBookingNote.trim() : null,
        }),
      });

      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Termin konnte nicht erstellt werden.");
      }

      setShowCreateModal(false);
      setMessage("✅ Termin erfolgreich hinzugefügt");

      if (view === "day" && newBookingDate !== anchorDate) {
        setAnchorDate(newBookingDate);
      } else {
        await loadCurrentView();
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Fehler beim Erstellen des Termins.");
    } finally {
      setCreatingBooking(false);
    }
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (view !== "day") return;
    swipeStartX.current = e.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (view !== "day") return;
    if (swipeStartX.current == null) return;

    const endX = e.changedTouches[0]?.clientX ?? 0;
    const diff = endX - swipeStartX.current;

    if (Math.abs(diff) > 70) {
      if (diff < 0) goNext();
      else goPrev();
    }

    swipeStartX.current = null;
  }

  const dayBookings = useMemo(() => dayData?.bookings ?? [], [dayData]);

  const commonWindow = useMemo(() => {
    const bookingList =
      view === "day" ? dayData?.bookings ?? [] : weekData.flatMap((d) => d.bookings);

    const blockList =
      view === "day" ? dayData?.blocks ?? [] : weekData.flatMap((d) => d.blocks ?? []);

    return getWindowFromRanges(bookingList, blockList);
  }, [view, dayData, weekData]);

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let m = commonWindow.start; m <= commonWindow.end; m += 60) arr.push(m);
    return arr;
  }, [commonWindow]);

  const daySummary = useMemo(() => {
    const bookings = dayData?.bookings ?? [];
    const active = bookings.filter((b) => b.status !== "CANCELLED").length;
    return {
      total: bookings.length,
      active,
    };
  }, [dayData]);

  if ((loading || checkingSubscription) && !dayData && weekData.length === 0) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontWeight: 800,
        }}
      >
        Lade Dashboard...
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 10 }}>
      <style jsx>{`
        .topGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .controlCard {
          margin-bottom: 16px;
          border: 1px solid #e6e6e8;
          border-radius: 24px;
          background: #fff;
          padding: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
        }

        .segmentedWrap {
          display: flex;
          background: #f0f0f2;
          border-radius: 18px;
          padding: 5px;
          gap: 5px;
          margin-bottom: 10px;
        }

        .segmentBtn {
          flex: 1;
          min-height: 44px;
          border-radius: 14px;
          border: none;
          background: transparent;
          color: #111;
          font-weight: 900;
          font-size: 15px;
          cursor: pointer;
        }

        .segmentBtnActive {
          background: #111;
          color: #fff;
        }

        .navRow {
          display: grid;
          grid-template-columns: 1fr 1.8fr 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .mobileHint {
          margin-top: 14px;
          padding: 13px 14px;
          border-radius: 16px;
          border: 1px solid #e7e7ea;
          background: #fbfbfc;
          color: #666;
          font-size: 13px;
          line-height: 18px;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          z-index: 220;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          box-sizing: border-box;
        }

        .modalCard {
          width: 100%;
          max-width: 560px;
          max-height: calc(100vh - 24px);
          overflow-y: auto;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
          border: 1px solid #eee;
          padding: 18px;
          box-sizing: border-box;
        }

        .modalHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .closeBtn {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
          font-size: 22px;
          font-weight: 700;
          cursor: pointer;
          line-height: 1;
          flex-shrink: 0;
        }

        .createActions {
          margin-top: 18px;
          display: flex;
          gap: 8px;
        }

        .serviceList {
          display: grid;
          gap: 8px;
        }

        .serviceBtn {
          min-height: 48px;
          border-radius: 12px;
          border: 1px solid #ddd;
          background: #fff;
          justify-content: center;
          padding: 0 14px;
          cursor: pointer;
          font-weight: 900;
          text-align: left;
          color: #111;
        }

        .serviceBtnActive {
          border-color: #111;
          background: #111;
          color: #fff;
        }

        .dateRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .dateChip {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
          cursor: pointer;
          font-weight: 900;
          font-size: 12px;
        }

        .dateChipActive {
          border-color: #111;
          background: #111;
          color: #fff;
        }

        .slotWrap {
          border: 1px solid #ddd;
          border-radius: 12px;
          padding: 10px;
          background: #fff;
          min-height: 48px;
        }

        .slotRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .slotChip {
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
        }

        .slotChipActive {
          border-color: #111;
          background: #111;
          color: #fff;
        }

        .fieldInput,
        .fieldTextarea {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #ddd;
          font-size: 14px;
          box-sizing: border-box;
          background: #fff;
          color: #111;
        }

        .fieldTextarea {
          min-height: 110px;
          padding-top: 14px;
          resize: vertical;
        }

        @media (max-width: 768px) {
          .navRow {
            grid-template-columns: 1fr 1.6fr 1fr auto;
          }
        }

        @media (max-width: 640px) {
          .navRow {
            grid-template-columns: 1fr;
          }

          .createActions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 900, color: "#111" }}>
          Dashboard
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              background: "#111",
              color: "#fff",
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {view === "day" ? "Tagesansicht" : "Wochenansicht"}
          </div>

          {view === "day" ? (
            <div
              style={{
                padding: "7px 10px",
                borderRadius: 999,
                background: "#ececef",
                color: "#444",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {daySummary.active} aktive Termine
            </div>
          ) : null}
        </div>
      </div>

      <div className="controlCard">
        <div className="segmentedWrap">
          <button
            type="button"
            onClick={() => setView("day")}
            className={`segmentBtn ${view === "day" ? "segmentBtnActive" : ""}`}
          >
            Tag
          </button>

          <button
            type="button"
            onClick={() => setView("week")}
            className={`segmentBtn ${view === "week" ? "segmentBtnActive" : ""}`}
          >
            Woche
          </button>
        </div>

        <div className="navRow">
          <SmallNavButton onClick={goPrev}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ChevronLeft size={16} />
            </span>
          </SmallNavButton>

          <TopButton onClick={goToday}>Heute</TopButton>

          <SmallNavButton onClick={goNext}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ChevronRight size={16} />
            </span>
          </SmallNavButton>

          <button
            type="button"
            onClick={openCreateModal}
            aria-label="Termin hinzufügen"
            title="Termin hinzufügen"
            style={{
              width: 50,
              minHeight: 44,
              borderRadius: 14,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {message ? (
        <div
          style={{
            marginBottom: 16,
            padding: "14px 16px",
            borderRadius: 16,
            border: "1px solid #cfe7d1",
            background: "#f4fbf4",
            color: "#17663a",
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: "14px 16px",
            borderRadius: 16,
            border: "1px solid #f1c7c7",
            background: "#fff5f5",
            color: "#b42318",
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          overflowX: view === "day" ? "hidden" : "auto",
          width: "100%",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {calendarLoading ? (
          <div
            style={{
              minHeight: 240,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#666",
              fontWeight: 800,
            }}
          >
            Lade Kalender...
          </div>
        ) : view === "day" ? (
          <DayCalendar
            scrollRef={scrollRef}
            date={anchorDate}
            bookings={dayBookings}
            blocks={dayData?.blocks ?? []}
            hours={hours}
            windowStart={commonWindow.start}
            windowEnd={commonWindow.end}
            selectedBookingId={selectedBooking?.id ?? null}
            onSelectBooking={(booking) => setSelectedBooking(booking)}
            showNowLine={isSameLocalDate(anchorDate)}
          />
        ) : (
          <WeekCalendar
            days={weekData}
            onSelectBooking={(booking) => setSelectedBooking(booking)}
            weekLabel={formatWeekRange(anchorDate)}
            isMobile={isMobile}
            hours={hours}
            windowStart={commonWindow.start}
            windowEnd={commonWindow.end}
          />
        )}
      </div>

      <div className="mobileHint">
        In der Tagesansicht kannst du im Kalender nach links oder rechts wischen.
      </div>

      {selectedBooking ? (
        <div className="modalOverlay" onClick={() => setSelectedBooking(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>
                  TERMIN #{selectedBooking.id}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 24,
                    lineHeight: 1.15,
                    fontWeight: 900,
                    color: "#111",
                  }}
                >
                  {selectedBooking.customer?.name || "Ohne Namen"}
                </div>
              </div>

              <button
                type="button"
                className="closeBtn"
                onClick={() => setSelectedBooking(null)}
                aria-label="Schließen"
              >
                ×
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  padding: "7px 12px",
                  borderRadius: 999,
                  background: statusColors(selectedBooking.status).bg,
                  color: statusColors(selectedBooking.status).text,
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {statusLabel(selectedBooking.status)}
              </div>
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
              <InfoCard label="Zeit" value={selectedBooking.timeHHMM || "—"} />
              <InfoCard
                label="Service"
                value={`${selectedBooking.service?.name || selectedBooking.service?.key || "—"}${
                  selectedBooking.service?.durationMin
                    ? ` (${selectedBooking.service.durationMin} min)`
                    : ""
                }`}
              />
              <InfoCard
                label="Kunde"
                value={selectedBooking.customer?.name || "—"}
                sub={selectedBooking.customer?.phone || undefined}
              />
              {selectedBooking.note ? <InfoCard label="Notiz" value={selectedBooking.note} /> : null}
            </div>

            {selectedBooking.customer?.phone ? (
              <a
                href={`tel:${selectedBooking.customer.phone}`}
                style={{
                  marginTop: 14,
                  minHeight: 48,
                  borderRadius: 12,
                  border: "1px solid #111",
                  background: "#111",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 15,
                  textDecoration: "none",
                }}
              >
                Kunde anrufen
              </a>
            ) : null}

            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <StatusButton
                label="Bestätigt"
                active={selectedBooking.status === "CONFIRMED"}
                disabled={updatingId === selectedBooking.id}
                onClick={() => updateStatus(selectedBooking.id, "CONFIRMED")}
              />
              <StatusButton
                label="Erledigt"
                active={selectedBooking.status === "COMPLETED"}
                disabled={updatingId === selectedBooking.id}
                onClick={() => updateStatus(selectedBooking.id, "COMPLETED")}
              />
              <StatusButton
                label="Nicht erschienen"
                active={selectedBooking.status === "NO_SHOW"}
                disabled={updatingId === selectedBooking.id}
                onClick={() => updateStatus(selectedBooking.id, "NO_SHOW")}
              />
              <StatusButton
                label="Storniert"
                active={selectedBooking.status === "CANCELLED"}
                disabled={updatingId === selectedBooking.id}
                onClick={() => updateStatus(selectedBooking.id, "CANCELLED")}
              />
            </div>
          </div>
        </div>
      ) : null}

      {showCreateModal ? (
        <div className="modalOverlay" onClick={() => !creatingBooking && setShowCreateModal(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>
                  MANUELLER TERMIN
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 24,
                    lineHeight: 1.15,
                    fontWeight: 900,
                    color: "#111",
                  }}
                >
                  Termin hinzufügen
                </div>
              </div>

              <button
                type="button"
                className="closeBtn"
                onClick={() => setShowCreateModal(false)}
                disabled={creatingBooking}
                aria-label="Schließen"
                style={{ opacity: creatingBooking ? 0.65 : 1 }}
              >
                ×
              </button>
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              <Field label="Kundenname">
                <input
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="z.B. Max Mustermann"
                  className="fieldInput"
                />
              </Field>

              <Field label="Telefonnummer (optional)">
                <input
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="z.B. 0176..."
                  className="fieldInput"
                />
              </Field>

              <Field label="Datum">
                <div className="dateRow">
                  {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                    const iso = addDays(anchorDate, offset);
                    const active = newBookingDate === iso;
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => setNewBookingDate(iso)}
                        className={`dateChip ${active ? "dateChipActive" : ""}`}
                      >
                        {formatShortDay(iso)}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Service">
                <div className="serviceList">
                  {services.map((s) => {
                    const active = newServiceKey === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => {
                          setNewServiceKey(s.key);
                          setNewBookingTime("");
                        }}
                        className={`serviceBtn ${active ? "serviceBtnActive" : ""}`}
                      >
                        {s.name} ({s.durationMin} min)
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Freier Slot">
                <div className="slotWrap">
                  {manualTimesLoading ? (
                    <div style={{ fontSize: 13, color: "#666", fontWeight: 700 }}>
                      Lade freie Zeiten...
                    </div>
                  ) : manualAvailableTimes.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#888", fontWeight: 700 }}>
                      Keine freien Zeiten verfügbar
                    </div>
                  ) : (
                    <div className="slotRow">
                      {manualAvailableTimes.map((time) => {
                        const active = newBookingTime === time;
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setNewBookingTime(time)}
                            className={`slotChip ${active ? "slotChipActive" : ""}`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Field>

              <Field label="Notiz (optional)">
                <textarea
                  value={newBookingNote}
                  onChange={(e) => setNewBookingNote(e.target.value)}
                  placeholder="z.B. telefonisch vereinbart"
                  className="fieldTextarea"
                />
              </Field>
            </div>

            <div className="createActions">
              <TopButton onClick={() => setShowCreateModal(false)} disabled={creatingBooking}>
                Abbrechen
              </TopButton>

              <TopButton
                onClick={createManualBooking}
                disabled={creatingBooking || !newBookingTime}
                active
              >
                {creatingBooking ? "Speichere..." : "Termin speichern"}
              </TopButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoCard(props: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 14,
        padding: 12,
        background: "#fafafa",
      }}
    >
      <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>{props.label}</div>
      <div style={{ marginTop: 4, fontWeight: 900, color: "#111" }}>{props.value}</div>
      {props.sub ? <div style={{ marginTop: 4, color: "#555" }}>{props.sub}</div> : null}
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#666", fontWeight: 800, marginBottom: 6 }}>
        {props.label}
      </div>
      {props.children}
    </div>
  );
}

function StatusButton(props: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={props.disabled}
      onClick={props.onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: props.active ? "1px solid #111" : "1px solid #ddd",
        background: props.active ? "#111" : "#fff",
        color: props.active ? "#fff" : "#111",
        cursor: props.disabled ? "not-allowed" : "pointer",
        fontWeight: 900,
        fontSize: 12,
        opacity: props.disabled ? 0.75 : 1,
      }}
    >
      {props.label}
    </button>
  );
}

function DayCalendar(props: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  date: string;
  bookings: ApiBooking[];
  blocks: ApiBlock[];
  hours: number[];
  windowStart: number;
  windowEnd: number;
  selectedBookingId: number | null;
  onSelectBooking: (booking: ApiBooking) => void;
  showNowLine: boolean;
}) {
  const totalMin = props.windowEnd - props.windowStart;
  const pxPerMin = 2.15;
  const gridHeight = Math.max(720, totalMin * pxPerMin);

  const laidOut = layoutOverlappingBookings(props.bookings);
  const nowMin = getNowMinutes();
  const nowTop = (nowMin - props.windowStart) * pxPerMin;
  const shouldShowNowLine =
    props.showNowLine && nowMin >= props.windowStart && nowMin <= props.windowEnd;

  return (
    <div
      style={{
        border: "1px solid #e6e6e8",
        borderRadius: 24,
        background: "#fff",
        padding: 14,
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          padding: "0 4px 14px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 22,
              lineHeight: 1.2,
              fontWeight: 900,
              color: "#111",
              textTransform: "capitalize",
            }}
          >
            {formatDayHeadline(props.date)}
          </div>
          <div
            style={{
              marginTop: 5,
              fontSize: 13,
              color: "#6b6b70",
              fontWeight: 700,
            }}
          >
            {props.bookings.length} {props.bookings.length === 1 ? "Termin" : "Termine"}
          </div>
        </div>

        <div
          style={{
            padding: "7px 10px",
            borderRadius: 999,
            background: "#f0f0f2",
            fontSize: 12,
            color: "#444",
            fontWeight: 800,
          }}
        >
          Swipe
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "56px minmax(0, 1fr)",
          border: "1px solid #e8e8eb",
          borderRadius: 20,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div style={{ background: "#fafafb" }}>
          <div style={{ height: 42, borderBottom: "1px solid #ececef" }} />
          {props.hours.map((h) => (
            <div
              key={h}
              style={{
                height: 129,
                paddingTop: 10,
                paddingLeft: 8,
                paddingRight: 8,
                borderBottom: "1px solid #f1f1f3",
                fontSize: 12,
                color: "#6f6f75",
                fontWeight: 800,
                boxSizing: "border-box",
              }}
            >
              {minToHHMM(h)}
            </div>
          ))}
        </div>

        <div style={{ minWidth: 0, background: "#fff" }}>
          <div
            style={{
              height: 42,
              borderBottom: "1px solid #ececef",
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              background: "#fcfcfd",
              fontWeight: 900,
              fontSize: 15,
              color: "#222",
            }}
          >
            Termine
          </div>

          <div
            ref={props.scrollRef}
            style={{
              position: "relative",
              height: Math.min(gridHeight, 980),
              overflowY: "auto",
              background: "#fff",
            }}
          >
            <div style={{ position: "relative", height: gridHeight }}>
              {props.hours.slice(0, -1).map((h) => {
                const top = (h - props.windowStart) * pxPerMin;
                return (
                  <div
                    key={h}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top,
                      borderTop: "1px solid #f0f0f2",
                    }}
                  />
                );
              })}

              {props.blocks.map((block) => {
                const top = (block.startMin - props.windowStart) * pxPerMin;
                const height = Math.max(28, (block.endMin - block.startMin) * pxPerMin);

                return (
                  <div
                    key={`${block.source}-${block.id}`}
                    style={{
                      position: "absolute",
                      left: 6,
                      right: 6,
                      top,
                      height,
                      borderRadius: 16,
                      background: "#f2f2f4",
                      border: "1px dashed #d8d8dd",
                      padding: "0 10px",
                      justifyContent: "center",
                      display: "flex",
                      zIndex: 2,
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#666",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        alignSelf: "center",
                      }}
                    >
                      Pause / blockiert {block.reason ? `• ${block.reason}` : ""}
                    </div>
                  </div>
                );
              })}

              {shouldShowNowLine ? (
                <>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: nowTop,
                      borderTop: "2px solid #e11d48",
                      zIndex: 20,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 8,
                      top: nowTop - 6,
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      background: "#e11d48",
                      zIndex: 21,
                    }}
                  />
                </>
              ) : null}

              {laidOut.length === 0 ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#888",
                    fontStyle: "italic",
                  }}
                >
                  Keine Termine
                </div>
              ) : null}

              {laidOut.map((b) => {
                const colors = statusColors(b.status);
                const top = (b.startMin - props.windowStart) * pxPerMin + 4;
                const rawHeight = (b.endMin - b.startMin) * pxPerMin - 8;
                const height = Math.max(52, rawHeight);
                const compact = height < 88;
                const ultraCompact = height < 66;
                const selected = props.selectedBookingId === b.id;

                let left: string | number = 6;
                let width: string | number = "auto";
                let right: string | number = 6;

                if (b.laneCount > 1) {
                  const gapPx = 4;
                  const colWidth = 100 / b.laneCount;
                  left = `calc(${b.lane * colWidth}% + ${gapPx / 2}px)`;
                  width = `calc(${colWidth}% - ${gapPx}px)`;
                  right = "auto";
                }

                return (
                  <button
                    key={b.id}
                    onClick={() => props.onSelectBooking(b)}
                    style={{
                      position: "absolute",
                      left: left as any,
                      width: width as any,
                      right: right as any,
                      top,
                      height,
                      zIndex: selected ? 11 : 10,
                      borderRadius: 18,
                      border: selected ? "2px solid #111" : `1px solid ${colors.border}`,
                      background: colors.soft,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "row",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        background: colors.accent,
                        flexShrink: 0,
                      }}
                    />

                    <div
                      style={{
                        flex: 1,
                        paddingTop: ultraCompact ? 6 : compact ? 8 : 10,
                        paddingBottom: ultraCompact ? 6 : compact ? 8 : 10,
                        paddingLeft: ultraCompact ? 8 : compact ? 10 : 12,
                        paddingRight: ultraCompact ? 8 : compact ? 10 : 12,
                        justifyContent: "center",
                        display: "flex",
                        flexDirection: "column",
                        boxSizing: "border-box",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: ultraCompact ? 11 : compact ? 12 : 13,
                          lineHeight: 1.15,
                          color: "#111",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {minToHHMM(b.startMin)} – {minToHHMM(b.endMin)}
                      </div>

                      <div
                        style={{
                          marginTop: ultraCompact ? 1 : 2,
                          fontWeight: 900,
                          fontSize: ultraCompact ? 11 : compact ? 12 : 14,
                          lineHeight: 1.15,
                          color: "#111",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {b.customer?.name || "Ohne Name"}
                      </div>

                      {!ultraCompact ? (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 12,
                            color: "#5f5f64",
                            lineHeight: 1.15,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {b.service?.name || b.service?.key || "Service"}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekCalendar(props: {
  days: DayData[];
  onSelectBooking: (booking: ApiBooking) => void;
  weekLabel: string;
  isMobile: boolean;
  hours: number[];
  windowStart: number;
  windowEnd: number;
}) {
  if (props.isMobile) {
    return (
      <div
        style={{
          border: "1px solid #e6e6e8",
          borderRadius: 24,
          background: "#fff",
          padding: 14,
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "0 4px 14px",
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 22,
                lineHeight: 1.2,
                fontWeight: 900,
                color: "#111",
              }}
            >
              {props.weekLabel}
            </div>
            <div
              style={{
                marginTop: 5,
                fontSize: 13,
                color: "#6b6b70",
                fontWeight: 700,
              }}
            >
              Wochenübersicht
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {props.days.map((day) => {
            const bookings = day.bookings
              .slice()
              .sort((a, b) => {
                const sa = parseStartEndFromTimeHHMM(a.timeHHMM)?.startMin ?? 0;
                const sb = parseStartEndFromTimeHHMM(b.timeHHMM)?.startMin ?? 0;
                return sa - sb;
              });

            return (
              <div
                key={day.date}
                style={{
                  border: "1px solid #e8e8eb",
                  borderRadius: 18,
                  background: "#fff",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid #eee",
                    background: "#fcfcfd",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 16,
                      color: "#111",
                    }}
                  >
                    {formatDayHeadline(day.date)}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: "#666",
                      fontWeight: 700,
                    }}
                  >
                    {bookings.length} {bookings.length === 1 ? "Termin" : "Termine"}
                  </div>
                </div>

                <div style={{ padding: 12, display: "grid", gap: 8 }}>
                  {day.blocks.map((block) => (
                    <div
                      key={`${block.source}-${block.id}`}
                      style={{
                        borderRadius: 12,
                        padding: "10px 12px",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#666",
                        background: "#f2f2f4",
                        border: "1px dashed #d8d8dd",
                      }}
                    >
                      {minToHHMM(block.startMin)} – {minToHHMM(block.endMin)} ·{" "}
                      {block.reason || "Pause / blockiert"}
                    </div>
                  ))}

                  {bookings.length === 0 && day.blocks.length === 0 ? (
                    <div style={{ color: "#888", fontStyle: "italic", padding: "6px 2px" }}>
                      Keine Termine
                    </div>
                  ) : null}

                  {bookings.map((b) => {
                    const colors = statusColors(b.status);
                    return (
                      <button
                        key={b.id}
                        onClick={() => props.onSelectBooking(b)}
                        style={{
                          border: `1px solid ${colors.border}`,
                          borderRadius: 16,
                          background: colors.soft,
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "row",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ width: 6, background: colors.accent, flexShrink: 0 }} />
                        <div style={{ flex: 1, padding: 12, minWidth: 0 }}>
                          <div style={{ fontWeight: 900, fontSize: 13, color: "#111" }}>
                            {b.timeHHMM || "—"}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              fontWeight: 900,
                              color: "#111",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {b.customer?.name || "Ohne Namen"}
                          </div>
                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 12,
                              color: "#555",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {b.service?.name || b.service?.key || "Service"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const totalMin = props.windowEnd - props.windowStart;
  const pxPerMin = 1.05;
  const gridHeight = Math.max(640, totalMin * pxPerMin);

  return (
    <div
      style={{
        border: "1px solid #e6e6e8",
        borderRadius: 24,
        background: "#fff",
        padding: 14,
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          padding: "0 4px 14px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 22,
              lineHeight: 1.2,
              fontWeight: 900,
              color: "#111",
            }}
          >
            {props.weekLabel}
          </div>
          <div
            style={{
              marginTop: 5,
              fontSize: 13,
              color: "#6b6b70",
              fontWeight: 700,
            }}
          >
            Wochenübersicht
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 1100 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "76px repeat(7, minmax(145px, 1fr))",
              border: "1px solid #e8e8eb",
              borderRadius: 20,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div style={{ background: "#fafafb" }}>
              <div style={{ height: 48, borderBottom: "1px solid #ececef" }} />
              {props.hours.map((h) => (
                <div
                  key={h}
                  style={{
                    height: 74,
                    padding: "8px 10px",
                    borderBottom: "1px solid #f1f1f3",
                    fontSize: 13,
                    color: "#6f6f75",
                    fontWeight: 800,
                    boxSizing: "border-box",
                  }}
                >
                  {minToHHMM(h)}
                </div>
              ))}
            </div>

            {props.days.map((day) => {
              const laidOut = layoutOverlappingBookings(day.bookings);

              return (
                <div key={day.date} style={{ position: "relative", borderLeft: "1px solid #f0f0f0" }}>
                  <div
                    style={{
                      height: 48,
                      borderBottom: "1px solid #ececef",
                      padding: 8,
                      textAlign: "center",
                      fontWeight: 900,
                      background: "#fcfcfd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                    }}
                  >
                    {formatShortDay(day.date)}
                  </div>

                  <div style={{ position: "relative", height: gridHeight }}>
                    {props.hours.slice(0, -1).map((h) => {
                      const top = (h - props.windowStart) * pxPerMin;
                      return (
                        <div
                          key={h}
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top,
                            borderTop: "1px solid #f0f0f2",
                          }}
                        />
                      );
                    })}

                    {day.blocks.map((block) => {
                      const top = (block.startMin - props.windowStart) * pxPerMin + 2;
                      const height = Math.max(12, (block.endMin - block.startMin) * pxPerMin - 4);

                      return (
                        <div
                          key={`${block.source}-${block.id}`}
                          title={block.reason || "Pause / blockiert"}
                          style={{
                            position: "absolute",
                            left: 4,
                            right: 4,
                            top,
                            height,
                            borderRadius: 8,
                            background: "#f2f2f4",
                            border: "1px dashed #d8d8dd",
                            zIndex: 4,
                          }}
                        />
                      );
                    })}

                    {laidOut.map((b) => {
                      const colors = statusColors(b.status);
                      const top = (b.startMin - props.windowStart) * pxPerMin + 4;
                      const rawHeight = (b.endMin - b.startMin) * pxPerMin - 4;
                      const height = Math.max(22, rawHeight);
                      const compact = height < 40;
                      const veryCompact = height < 28;

                      const gap = 4;
                      const colWidth = 100 / b.laneCount;
                      const left = `calc(${b.lane * colWidth}% + ${gap / 2}px)`;
                      const width = `calc(${colWidth}% - ${gap}px)`;

                      return (
                        <button
                          key={b.id}
                          onClick={() => props.onSelectBooking(b)}
                          title={`${b.customer?.name || "Ohne Name"} · ${b.timeHHMM || ""}`}
                          style={{
                            position: "absolute",
                            left,
                            width,
                            top,
                            height,
                            borderRadius: 10,
                            border: `1px solid ${colors.border}`,
                            background: colors.soft,
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "row",
                            textAlign: "left",
                            cursor: "pointer",
                            zIndex: 10,
                          }}
                        >
                          <div style={{ width: 4, background: colors.accent, flexShrink: 0 }} />
                          <div
                            style={{
                              flex: 1,
                              padding: compact ? "3px 5px" : "6px 8px",
                              minWidth: 0,
                              boxSizing: "border-box",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: compact ? 10 : 11,
                                lineHeight: 1.1,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                color: "#111",
                              }}
                            >
                              {b.customer?.name || "Ohne Name"}
                            </div>

                            {veryCompact ? null : (
                              <div
                                style={{
                                  marginTop: 2,
                                  color: "#555",
                                  fontSize: compact ? 9 : 10,
                                  lineHeight: 1.1,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {b.timeHHMM || ""}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}