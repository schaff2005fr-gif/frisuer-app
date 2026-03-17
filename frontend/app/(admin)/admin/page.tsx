"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

type DayData = {
  date: string;
  bookings: ApiBooking[];
};

type PositionedBooking = ApiBooking & {
  startMin: number;
  endMin: number;
  lane: number;
  laneCount: number;
};

type RecurringBlock = {
  id: number;
  weekday: number; // 0..6
  startMin: number;
  endMin: number;
  reason: string | null;
  enabled: boolean;
};

type TimeBlock = {
  id: number;
  date: string | Date;
  startMin: number;
  endMin: number;
  reason: string | null;
};

type CalendarPauseBlock = {
  id: string;
  date: string;
  startMin: number;
  endMin: number;
  reason: string | null;
  kind: "recurring" | "timeblock";
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

function getNowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isSameLocalDate(iso: string) {
  return iso === todayIsoLocal();
}

function getWeekdayFromIso(iso: string) {
  return parseIsoDateLocal(iso).getDay(); // 0..6
}

function normalizeDateLike(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return toIsoLocal(value);
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
  if (s === "NO_SHOW") return "No-Show";
  return "Storniert";
}

function statusColors(s: BookingStatus) {
  if (s === "CONFIRMED") return { bg: "#111", text: "#fff", soft: "#f5f5f5" };
  if (s === "COMPLETED") return { bg: "#0a7a2f", text: "#fff", soft: "#eef9f1" };
  if (s === "NO_SHOW") return { bg: "#b36b00", text: "#fff", soft: "#fff6e8" };
  return { bg: "#b00020", text: "#fff", soft: "#fff0f3" };
}

function GhostButtonStyle(active?: boolean): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 14,
    border: active ? "1px solid #111" : "1px solid #ddd",
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#111",
    fontWeight: 900,
    fontSize: 15,
    cursor: "pointer",
    whiteSpace: "nowrap",
    minHeight: 46,
  };
}

function PrimaryButtonStyle(disabled?: boolean): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 900,
    fontSize: 15,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.75 : 1,
    whiteSpace: "nowrap",
    minHeight: 46,
  };
}

function getToken() {
  return localStorage.getItem("token") || "";
}

function getDayWindow(bookings: ApiBooking[]) {
  const parsed = bookings
    .map((b) => parseStartEndFromTimeHHMM(b.timeHHMM))
    .filter((x): x is { startMin: number; endMin: number } => !!x);

  if (parsed.length === 0) {
    return { start: 9 * 60, end: 18 * 60 };
  }

  const minStart = Math.min(...parsed.map((x) => x.startMin));
  const maxEnd = Math.max(...parsed.map((x) => x.endMin));

  const start = Math.max(6 * 60, Math.floor(minStart / 60) * 60);
  const end = Math.min(22 * 60, Math.ceil(maxEnd / 60) * 60);

  return {
    start,
    end: Math.max(end, start + 60),
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

function StatCard(props: { title: string; value: string; sub: string }) {
  return (
    <div
      style={{
        border: "1px solid #ececec",
        borderRadius: 16,
        padding: 14,
        background: "#fff",
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: "#666",
          fontSize: 12,
          fontWeight: 800,
          lineHeight: 1.1,
        }}
      >
        {props.title}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 34,
          lineHeight: 1,
          fontWeight: 1000,
          color: "#111",
        }}
      >
        {props.value}
      </div>

      <div
        style={{
          marginTop: 8,
          color: "#777",
          fontSize: 12,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {props.sub}
      </div>
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
        borderRadius: 10,
        border: props.active ? "1px solid #111" : "1px solid #ddd",
        background: props.active ? "#111" : "#fff",
        color: props.active ? "#fff" : "#111",
        cursor: props.disabled ? "not-allowed" : "pointer",
        fontWeight: 900,
        fontSize: 12,
        opacity: props.disabled ? 0.75 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {props.label}
    </button>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [view, setView] = useState<ViewMode>("day");
  const [anchorDate, setAnchorDate] = useState<string>(todayIsoLocal());

  const [dayData, setDayData] = useState<DayData | null>(null);
  const [weekData, setWeekData] = useState<DayData[]>([]);

  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const swipeStartX = useRef<number | null>(null);
  const [recurringBlocks, setRecurringBlocks] = useState<RecurringBlock[]>([]);
const [timeBlocksByDate, setTimeBlocksByDate] = useState<Record<string, TimeBlock[]>>({});
  async function fetchDay(date: string): Promise<DayData> {
    const token = getToken();
    const res = await fetch(`${API_BASE}/admin/bookings?date=${encodeURIComponent(date)}`, {
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

    return {
      date,
      bookings: Array.isArray(data?.bookings) ? data.bookings : [],
    };
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

async function fetchTimeBlocksForDate(date: string) {
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

  async function loadCurrentView() {
  setCalendarLoading(true);
  setError("");
  setMessage("");

  try {
    const token = getToken();
    if (!token) {
      setError("Kein Token gefunden. Bitte als BARBER einloggen.");
      setDayData(null);
      setWeekData([]);
      setRecurringBlocks([]);
      setTimeBlocksByDate({});
      return;
    }

    const recurringPromise = fetchRecurringBlocks();

    if (view === "day") {
      const [result, recurring, timeBlocks] = await Promise.all([
        fetchDay(anchorDate),
        recurringPromise,
        fetchTimeBlocksForDate(anchorDate),
      ]);

      setDayData(result);
      setWeekData([]);
      setRecurringBlocks(recurring);
      setTimeBlocksByDate({ [anchorDate]: timeBlocks });

      setMessage(`✅ ${result.bookings.length} Termine geladen`);
    } else {
      const dates = getWeekDates(anchorDate);

      const [results, recurring, timeBlockLists] = await Promise.all([
        Promise.all(dates.map((d) => fetchDay(d))),
        recurringPromise,
        Promise.all(dates.map((d) => fetchTimeBlocksForDate(d))),
      ]);

      const tbMap: Record<string, TimeBlock[]> = {};
      dates.forEach((d, i) => {
        tbMap[d] = timeBlockLists[i];
      });

      setWeekData(results);
      setDayData(null);
      setRecurringBlocks(recurring);
      setTimeBlocksByDate(tbMap);

      const total = results.reduce((sum, d) => sum + d.bookings.length, 0);
      setMessage(`✅ ${total} Termine in der Woche geladen`);
    }
  } catch (e: any) {
    console.error(e);
    setError(e?.message || "Fehler beim Laden.");
    setDayData(null);
    setWeekData([]);
    setRecurringBlocks([]);
    setTimeBlocksByDate({});
  } finally {
    setCalendarLoading(false);
  }
}

  async function updateStatus(bookingId: number, status: BookingStatus) {
    const token = getToken();
    if (!token) {
      setError("Kein Token gefunden. Bitte als BARBER einloggen.");
      return;
    }

    setUpdatingId(bookingId);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Status konnte nicht geändert werden.");
        return;
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

      setMessage("✅ Status aktualisiert");
    } catch (e) {
      console.error(e);
      setError("Fehler beim Aktualisieren.");
    } finally {
      setUpdatingId(null);
    }
  }

  function closeBookingModal() {
  setSelectedBookingId(null);
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
  useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      setSelectedBookingId(null);
    }
  }

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
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
  }, [router]);

  useEffect(() => {
    loadCurrentView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorDate, view]);

  const selectedBooking = useMemo(() => {
    const all = [...(dayData?.bookings ?? []), ...weekData.flatMap((d) => d.bookings)];
    return all.find((b) => b.id === selectedBookingId) || null;
  }, [dayData, weekData, selectedBookingId]);

const pauseBlocksByDate = useMemo(() => {
  const result: Record<string, CalendarPauseBlock[]> = {};
  const dates = view === "day" ? [anchorDate] : getWeekDates(anchorDate);

  for (const date of dates) {
    const weekday = getWeekdayFromIso(date);

    const recurringForDate = recurringBlocks
      .filter((b) => b.enabled && b.weekday === weekday)
      .map((b) => ({
        id: `r-${date}-${b.id}`,
        date,
        startMin: b.startMin,
        endMin: b.endMin,
        reason: b.reason,
        kind: "recurring" as const,
      }));

    const oneTimeForDate = (timeBlocksByDate[date] ?? []).map((b) => ({
      id: `t-${date}-${b.id}`,
      date,
      startMin: b.startMin,
      endMin: b.endMin,
      reason: b.reason,
      kind: "timeblock" as const,
    }));

    result[date] = [...recurringForDate, ...oneTimeForDate].sort(
      (a, b) => a.startMin - b.startMin
    );
  }

  return result;
}, [view, anchorDate, recurringBlocks, timeBlocksByDate]);

  const stats = useMemo(() => {
    const allBookings = view === "day" ? dayData?.bookings ?? [] : weekData.flatMap((d) => d.bookings);

    const total = allBookings.length;
    const confirmed = allBookings.filter((b) => b.status === "CONFIRMED").length;
    const completed = allBookings.filter((b) => b.status === "COMPLETED").length;
    const noShow = allBookings.filter((b) => b.status === "NO_SHOW").length;
    const cancelled = allBookings.filter((b) => b.status === "CANCELLED").length;

    return { total, confirmed, completed, noShow, cancelled };
  }, [view, dayData, weekData]);

  const commonWindow = useMemo(() => {
  const bookingList =
    view === "day" ? dayData?.bookings ?? [] : weekData.flatMap((d) => d.bookings);

  const pauseList = Object.values(pauseBlocksByDate).flat();

  const bookingWindow = getDayWindow(bookingList);

  if (pauseList.length === 0) return bookingWindow;

  const pauseStart = Math.min(...pauseList.map((p) => p.startMin));
  const pauseEnd = Math.max(...pauseList.map((p) => p.endMin));

  return {
    start: Math.max(6 * 60, Math.min(bookingWindow.start, Math.floor(pauseStart / 60) * 60)),
    end: Math.min(22 * 60, Math.max(bookingWindow.end, Math.ceil(pauseEnd / 60) * 60)),
  };
}, [view, dayData, weekData, pauseBlocksByDate]);

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let m = commonWindow.start; m <= commonWindow.end; m += 60) arr.push(m);
    return arr;
  }, [commonWindow]);

  return (
    <div style={{ padding: 20, maxWidth: 1280, margin: "0 auto" }}>
      <div
  className="headTop"
  style={{
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "flex-end",
  }}
>
  <div>
    <h1
      style={{
        margin: 0,
        fontSize: 34,
        lineHeight: 1,
        fontWeight: 1000,
        color: "#111",
      }}
    >
      Dashboard
    </h1>

    <div
      style={{
        marginTop: 8,
        color: "#666",
        fontSize: 15,
        fontWeight: 500,
      }}
    >
      {view === "day"
        ? `Tagesansicht · ${formatDayHeadline(anchorDate)}`
        : `Wochenansicht · ab ${formatShortDay(startOfWeekMonday(anchorDate))}`}
    </div>
  </div>

  <div
    className="headActions"
    style={{
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
    }}
  >
    <button onClick={() => setView("day")} style={GhostButtonStyle(view === "day")}>
      Tag
    </button>
    <button onClick={() => setView("week")} style={GhostButtonStyle(view === "week")}>
      Woche
    </button>
    <button onClick={goToday} style={GhostButtonStyle(false)}>
      Heute
    </button>
    <button
      onClick={loadCurrentView}
      disabled={calendarLoading}
      style={PrimaryButtonStyle(calendarLoading)}
    >
      {calendarLoading ? "Lade..." : "Neu laden"}
    </button>
  </div>
</div>

      {message ? (
  <div
    style={{
      marginTop: 12,
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #d9f0dd",
      background: "#f3fbf4",
      color: "#187a2f",
      fontSize: 14,
      fontWeight: 800,
    }}
  >
    {message}
  </div>
) : null}

{error ? (
  <div
    style={{
      marginTop: 12,
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #f3d3da",
      background: "#fff5f7",
      color: "#b00020",
      fontSize: 14,
      fontWeight: 800,
    }}
  >
    {error}
  </div>
) : null}

      <div
  style={{
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  }}
>
  <StatCard title="Termine" value={String(stats.total)} sub={`${stats.confirmed} bestätigt`} />
  <StatCard title="Erledigt" value={String(stats.completed)} sub={`${stats.noShow} No-Show`} />
  <StatCard
    title="Storniert"
    value={String(stats.cancelled)}
    sub={view === "day" ? "Heute" : "Woche"}
  />
</div>

      <div
        style={{
          marginTop: 16,
          border: "1px solid #eee",
          borderRadius: 16,
          background: "#fff",
          padding: 12,
        }}
      >
        <div
          className="calendarTopBar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <button onClick={goPrev} style={GhostButtonStyle(false)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ChevronLeft size={16} />
              {view === "day" ? "Vorheriger Tag" : "Vorherige Woche"}
            </span>
          </button>

          <div style={{ fontWeight: 900, textAlign: "center" }}>
            {view === "day"
              ? formatDayHeadline(anchorDate)
              : `${formatShortDay(getWeekDates(anchorDate)[0])} – ${formatShortDay(
                  getWeekDates(anchorDate)[6]
                )}`}
          </div>

          <button onClick={goNext} style={GhostButtonStyle(false)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {view === "day" ? "Nächster Tag" : "Nächste Woche"}
              <ChevronRight size={16} />
            </span>
          </button>
        </div>

        <div
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
  style={{
    overflowX: view === "day" ? "hidden" : "auto",
    overflowY: "hidden",
    width: "100%",
    WebkitOverflowScrolling: "touch",
  }}
>
          {calendarLoading ? (
            <div style={{ padding: 30, color: "#666" }}>Lade Kalender...</div>
          ) : view === "day" ? (
            <DayCalendar
  date={anchorDate}
  bookings={dayData?.bookings ?? []}
  pauseBlocks={pauseBlocksByDate[anchorDate] ?? []}
  hours={hours}
  windowStart={commonWindow.start}
  windowEnd={commonWindow.end}
  selectedBookingId={selectedBookingId}
  onSelectBooking={(id) => setSelectedBookingId(id)}
  showNowLine={isSameLocalDate(anchorDate)}
/>
          ) : (
            <WeekCalendar
  days={weekData}
  pauseBlocksByDate={pauseBlocksByDate}
  hours={hours}
  windowStart={commonWindow.start}
  windowEnd={commonWindow.end}
  selectedBookingId={selectedBookingId}
  onSelectBooking={(id) => setSelectedBookingId(id)}
/>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14, color: "#666", fontSize: 12 }}>
        {view === "day"
          ? "Tipp: In der Tagesansicht kannst du auf dem Handy nach links oder rechts swipen."
          : "In der Wochenansicht kannst du horizontal durch den Kalender scrollen, ohne direkt die Woche zu wechseln."}
      </div>

      {selectedBooking ? (
  <div
    onClick={closeBookingModal}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      zIndex: 200,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: 520,
        maxHeight: "85vh",
        overflowY: "auto",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        border: "1px solid #eee",
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>
            TERMIN #{selectedBooking.id}
          </div>
          <h3 style={{ margin: "6px 0 0 0", fontSize: 24, lineHeight: 1.1 }}>
            {selectedBooking.customer?.name || "Ohne Namen"}
          </h3>
        </div>

        <button
          type="button"
          onClick={closeBookingModal}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: "1px solid #ddd",
            background: "#fff",
            color: "#111",
            fontSize: 22,
            fontWeight: 700,
            cursor: "pointer",
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-label="Schließen"
        >
          ×
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        <span
          style={{
            display: "inline-flex",
            padding: "7px 12px",
            borderRadius: 999,
            background: statusColors(selectedBooking.status).bg,
            color: statusColors(selectedBooking.status).text,
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          {statusLabel(selectedBooking.status)}
        </span>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gap: 10,
        }}
      >
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 12,
            background: "#fafafa",
          }}
        >
          <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Zeit</div>
          <div style={{ marginTop: 4, fontWeight: 900 }}>{selectedBooking.timeHHMM || "—"}</div>
        </div>

        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 12,
            background: "#fafafa",
          }}
        >
          <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Service</div>
          <div style={{ marginTop: 4, fontWeight: 900 }}>
            {selectedBooking.service?.name || selectedBooking.service?.key || "—"}
            {selectedBooking.service?.durationMin ? ` (${selectedBooking.service.durationMin} min)` : ""}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 12,
            background: "#fafafa",
          }}
        >
          <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Kunde</div>
          <div style={{ marginTop: 4, fontWeight: 900 }}>
            {selectedBooking.customer?.name || "—"}
          </div>
          {selectedBooking.customer?.phone ? (
            <div style={{ marginTop: 4, color: "#555" }}>{selectedBooking.customer.phone}</div>
          ) : null}
        </div>

        {selectedBooking.note ? (
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 12,
              background: "#fafafa",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Notiz</div>
            <div style={{ marginTop: 4, color: "#111" }}>{selectedBooking.note}</div>
          </div>
        ) : null}
      </div>

      <div
        className="statusRow"
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
          label="No-Show"
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

      <style jsx>{`
  @media (max-width: 760px) {
    .statusRow {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .headTop {
      align-items: stretch !important;
    }

    .headActions {
      width: 100%;
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px !important;
    }

    .calendarTopBar {
      flex-direction: column;
      align-items: stretch !important;
    }

    .calendarTopBar > :nth-child(2) {
      order: -1;
      text-align: center;
    }
  }
`}</style>
    </div>
  );
}

function DayCalendar(props: {
  date: string;
  bookings: ApiBooking[];
  pauseBlocks: CalendarPauseBlock[];
  hours: number[];
  windowStart: number;
  windowEnd: number;
  selectedBookingId: number | null;
  onSelectBooking: (id: number) => void;
  showNowLine: boolean;
}) {
  const totalMin = props.windowEnd - props.windowStart;
  const pxPerMin = 2.25;
  const gridHeight = Math.max(760, totalMin * pxPerMin);

  const laidOut = layoutOverlappingBookings(props.bookings);

  const nowMin = getNowMinutes();
  const nowTop = (nowMin - props.windowStart) * pxPerMin;
  const shouldShowNowLine =
    props.showNowLine && nowMin >= props.windowStart && nowMin <= props.windowEnd;

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "68px minmax(0, 1fr)",
          border: "1px solid #eee",
          borderRadius: 14,
          overflow: "hidden",
          background: "#fff",
          width: "100%",
        }}
      >
        <div style={{ background: "#fafafa" }}>
          <div style={{ height: 46, borderBottom: "1px solid #eee" }} />
          {props.hours.map((h) => (
            <div
              key={h}
              style={{
                height: 135,
                padding: "10px 8px",
                borderBottom: "1px solid #f0f0f0",
                fontSize: 13,
                color: "#666",
                fontWeight: 800,
                boxSizing: "border-box",
              }}
            >
              {minToHHMM(h)}
            </div>
          ))}
        </div>

        <div style={{ position: "relative", background: "#fff", minWidth: 0 }}>
          <div
            style={{
              height: 46,
              borderBottom: "1px solid #eee",
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              fontWeight: 800,
              fontSize: 14,
              color: "#444",
            }}
          >
            Termine
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
                    borderTop: "1px solid #f0f0f0",
                  }}
                />
              );
            })}

            {props.pauseBlocks.map((p) => {
              const top = (p.startMin - props.windowStart) * pxPerMin + 2;
              const height = Math.max(16, (p.endMin - p.startMin) * pxPerMin - 4);

              return (
                <div
                  key={p.id}
                  title={p.reason || "Blockiert"}
                  style={{
                    position: "absolute",
                    left: 6,
                    right: 6,
                    top,
                    height,
                    borderRadius: 12,
                    background:
                      p.kind === "recurring"
                        ? "repeating-linear-gradient(-45deg, #f4f4f5, #f4f4f5 8px, #ececef 8px, #ececef 16px)"
                        : "repeating-linear-gradient(-45deg, #f8f1f1, #f8f1f1 8px, #f1e4e4 8px, #f1e4e4 16px)",
                    border: "1px dashed #b8b8be",
                    zIndex: 4,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    padding: "6px 8px",
                    overflow: "hidden",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#555",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.reason || "Blockiert"}
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
                    boxShadow: "0 0 0 2px #fff",
                  }}
                />
              </>
            ) : null}

            {laidOut.length === 0 && props.pauseBlocks.length === 0 ? (
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
              const height = Math.max(40, rawHeight);
              const compact = height < 82;
              const selected = props.selectedBookingId === b.id;

              const gap = 6;
              const colWidth = 100 / b.laneCount;
              const left = `calc(${b.lane * colWidth}% + ${gap / 2}px)`;
              const width = `calc(${colWidth}% - ${gap}px)`;

              return (
                <button
                  key={b.id}
                  onClick={() => props.onSelectBooking(b.id)}
                  title={`${b.customer?.name || "Ohne Name"} · ${b.timeHHMM || ""}`}
                  style={{
                    position: "absolute",
                    left,
                    width,
                    top,
                    height,
                    zIndex: selected ? 11 : 10,
                    borderRadius: 14,
                    border: selected ? "2px solid #111" : "1px solid #e5e5e5",
                    background: colors.soft,
                    padding: compact ? "6px 8px" : "9px 11px",
                    textAlign: "left",
                    cursor: "pointer",
                    overflow: "hidden",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: compact ? 11 : 13,
                      lineHeight: 1.1,
                      color: "#111",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {minToHHMM(b.startMin)} – {minToHHMM(b.endMin)}
                  </div>

                  {compact ? (
                    <div
                      style={{
                        marginTop: 2,
                        fontWeight: 800,
                        fontSize: 11,
                        lineHeight: 1.1,
                        color: "#111",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {b.customer?.name || "Ohne Name"} · {b.service?.name || b.service?.key || "Service"}
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          marginTop: 2,
                          fontWeight: 800,
                          fontSize: 13,
                          lineHeight: 1.1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: "#111",
                        }}
                      >
                        {b.customer?.name || "Ohne Name"}
                      </div>

                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 11,
                          color: "#555",
                          lineHeight: 1.1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {b.service?.name || b.service?.key || "Service"}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
function WeekCalendar(props: {
  days: DayData[];
  pauseBlocksByDate: Record<string, CalendarPauseBlock[]>;
  hours: number[];
  windowStart: number;
  windowEnd: number;
  selectedBookingId: number | null;
  onSelectBooking: (id: number) => void;
}) {
  const totalMin = props.windowEnd - props.windowStart;
  const pxPerMin = 1.05;
  const gridHeight = Math.max(640, totalMin * pxPerMin);

  return (
    <div style={{ minWidth: 1100 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "76px repeat(7, minmax(145px, 1fr))",
          border: "1px solid #eee",
          borderRadius: 14,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div style={{ background: "#fafafa" }}>
          <div style={{ height: 56, borderBottom: "1px solid #eee" }} />
          {props.hours.map((h) => (
            <div
              key={h}
              style={{
                height: 74,
                padding: "8px 10px",
                borderBottom: "1px solid #f0f0f0",
                fontSize: 13,
                color: "#666",
                fontWeight: 800,
              }}
            >
              {minToHHMM(h)}
            </div>
          ))}
        </div>

        {props.days.map((day) => {
          const laidOut = layoutOverlappingBookings(day.bookings);
          const pauses = props.pauseBlocksByDate[day.date] ?? [];

          return (
            <div key={day.date} style={{ position: "relative", borderLeft: "1px solid #f0f0f0" }}>
              <div
                style={{
                  height: 56,
                  borderBottom: "1px solid #eee",
                  padding: 8,
                  textAlign: "center",
                  fontWeight: 900,
                  background: "#fafafa",
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
                        borderTop: "1px solid #f0f0f0",
                      }}
                    />
                  );
                })}

                {pauses.map((p) => {
                  const top = (p.startMin - props.windowStart) * pxPerMin + 2;
                  const height = Math.max(12, (p.endMin - p.startMin) * pxPerMin - 4);

                  return (
                    <div
                      key={p.id}
                      title={p.reason || "Blockiert"}
                      style={{
                        position: "absolute",
                        left: 4,
                        right: 4,
                        top,
                        height,
                        borderRadius: 8,
                        background:
                          p.kind === "recurring"
                            ? "repeating-linear-gradient(-45deg, #f4f4f5, #f4f4f5 8px, #ececef 8px, #ececef 16px)"
                            : "repeating-linear-gradient(-45deg, #f8f1f1, #f8f1f1 8px, #f1e4e4 8px, #f1e4e4 16px)",
                        border: "1px dashed #b8b8be",
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
                  const selected = props.selectedBookingId === b.id;

                  const gap = 4;
                  const colWidth = 100 / b.laneCount;
                  const left = `calc(${b.lane * colWidth}% + ${gap / 2}px)`;
                  const width = `calc(${colWidth}% - ${gap}px)`;

                  return (
                    <button
                      key={b.id}
                      onClick={() => props.onSelectBooking(b.id)}
                      title={`${b.customer?.name || "Ohne Name"} · ${b.timeHHMM || ""}`}
                      style={{
                        position: "absolute",
                        left,
                        width,
                        top,
                        height,
                        borderRadius: 10,
                        border: selected ? "2px solid #111" : "1px solid #e5e5e5",
                        background: colors.soft,
                        padding: compact ? "3px 5px" : "6px 8px",
                        textAlign: "left",
                        cursor: "pointer",
                        overflow: "hidden",
                        fontSize: 11,
                        zIndex: selected ? 11 : 10,
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