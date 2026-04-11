import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

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

export default function BarberDashboardScreen() {
  const { token, user } = useAuth();

  const [view, setView] = useState<ViewMode>("day");
  const [anchorDate, setAnchorDate] = useState<string>(todayIsoLocal());

  const [dayData, setDayData] = useState<DayData | null>(null);
  const [weekData, setWeekData] = useState<DayData[]>([]);

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const [selectedBooking, setSelectedBooking] = useState<ApiBooking | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [barberSlug, setBarberSlug] = useState("");

  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newServiceKey, setNewServiceKey] = useState("");
  const [newBookingDate, setNewBookingDate] = useState(anchorDate);
  const [newBookingNote, setNewBookingNote] = useState("");

  const [manualAvailableTimes, setManualAvailableTimes] = useState<string[]>([]);
  const [manualTimesLoading, setManualTimesLoading] = useState(false);
  const [newBookingTime, setNewBookingTime] = useState("");

  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
  async function init() {
    if (!token || !user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "BARBER") {
      router.replace("/");
      return;
    }

    const allowed = await checkSubscriptionAccess();
    if (!allowed) return;

    await loadInitialData();
  }

  init();
}, [token, user]);

  useEffect(() => {
  if (!token || !user || user.role !== "BARBER") return;
  if (checkingSubscription) return;
  loadCurrentView();
}, [anchorDate, view, checkingSubscription]);

  useEffect(() => {
    if (!showCreateModal) return;
    if (!newBookingDate || !newServiceKey || !barberSlug) return;
    loadManualAvailableTimes(newBookingDate, newServiceKey);
  }, [showCreateModal, newBookingDate, newServiceKey, barberSlug]);

  async function fetchDay(date: string): Promise<DayData> {
  const [bookingsRes, recurringBlocks, timeBlocks] = await Promise.all([
    api.get(`/admin/bookings?date=${encodeURIComponent(date)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetchRecurringBlocks(),
    fetchTimeBlocks(date),
  ]);

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
    bookings: Array.isArray(bookingsRes.data?.bookings) ? bookingsRes.data.bookings : [],
    blocks: [...recurringForDay, ...timeForDay].sort((a, b) => a.startMin - b.startMin),
  };
}

  async function fetchRecurringBlocks() {
  const res = await api.get("/admin/recurring-blocks", {
    headers: { Authorization: `Bearer ${token}` },
  });

  return Array.isArray(res.data?.blocks) ? res.data.blocks : [];
}

async function fetchTimeBlocks(date: string) {
  const res = await api.get(`/admin/time-blocks?date=${encodeURIComponent(date)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return Array.isArray(res.data?.blocks) ? res.data.blocks : [];
}

  async function fetchServices() {
    const res = await api.get("/admin/services", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const list = Array.isArray(res.data?.services) ? res.data.services : [];
    return list.map((s: any) => ({
      key: String(s.key),
      name: String(s.name),
      durationMin: Number(s.durationMin ?? 0),
    })) as ServiceOption[];
  }

  async function fetchBarberSlug() {
    const res = await api.get("/admin/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    return String(res.data?.barber?.slug ?? "");
  }

  async function checkSubscriptionAccess() {
  try {
    setCheckingSubscription(true);

    const res = await api.get("/admin/subscription-status", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const isPro = !!res.data?.subscription?.isPro;

    if (!isPro) {
      router.replace("/barber/subscription");
      return false;
    }

    return true;
  } catch (e: any) {
    console.log("SUBSCRIPTION CHECK ERROR:", e?.message);
    console.log("SUBSCRIPTION CHECK RESPONSE:", e?.response?.data);
    setError(e?.response?.data?.error || "Fehler beim Prüfen des Abos.");
    return false;
  } finally {
    setCheckingSubscription(false);
  }
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
      console.log("BARBER INIT ERROR:", e?.message);
      console.log("BARBER INIT RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrentView() {
    try {
      setLoading(true);
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
      console.log("LOAD VIEW ERROR:", e?.message);
      console.log("LOAD VIEW RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || "Fehler beim Laden.");
      setDayData(null);
      setWeekData([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(bookingId: number, status: BookingStatus) {
    try {
      setUpdatingId(bookingId);
      setError("");
      setMessage("");

      const res = await api.patch(
        `/admin/bookings/${bookingId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.data?.ok) {
        throw new Error("Status konnte nicht geändert werden.");
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
      console.log("UPDATE STATUS ERROR:", e?.message);
      console.log("UPDATE STATUS RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || "Fehler beim Aktualisieren.");
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

      const res = await api.get("/public/available-times", {
        params: {
          barberSlug,
          date,
          serviceKey,
        },
      });

      const times = Array.isArray(res.data?.timesHHMM) ? res.data.timesHHMM : [];
      setManualAvailableTimes(times);

      if (!times.includes(newBookingTime)) {
        setNewBookingTime(times[0] ?? "");
      }
    } catch (e) {
      console.log("MANUAL TIMES ERROR:", e);
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

      const res = await api.post(
        "/admin/manual-bookings",
        {
          customerName: newCustomerName.trim(),
          customerPhone: newCustomerPhone.trim() ? newCustomerPhone.trim() : null,
          serviceKey: newServiceKey,
          date: newBookingDate,
          startTime: newBookingTime,
          note: newBookingNote.trim() ? newBookingNote.trim() : null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.data?.ok) {
        throw new Error("Termin konnte nicht erstellt werden.");
      }

      setShowCreateModal(false);
      setMessage("✅ Termin erfolgreich hinzugefügt");

      if (view === "day" && newBookingDate !== anchorDate) {
        setAnchorDate(newBookingDate);
      } else {
        await loadCurrentView();
      }
    } catch (e: any) {
      console.log("CREATE BOOKING ERROR:", e?.message);
      console.log("CREATE BOOKING RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || "Fehler beim Erstellen des Termins.");
    } finally {
      setCreatingBooking(false);
    }
  }

  const dayBookings = useMemo(() => dayData?.bookings ?? [], [dayData]);

  const commonWindow = useMemo(() => {
  const bookingList =
    view === "day" ? dayData?.bookings ?? [] : weekData.flatMap((d) => d.bookings);

  const blockList =
    view === "day" ? dayData?.blocks ?? [] : weekData.flatMap((d) => d.blocks ?? []);

  const bookingRanges = bookingList
    .map((b) => parseStartEndFromTimeHHMM(b.timeHHMM))
    .filter((x): x is { startMin: number; endMin: number } => !!x);

  const blockRanges = blockList.map((b) => ({
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

  useEffect(() => {
    if (!scrollRef.current || view !== "day") return;

    const nowMin = getNowMinutes();
    const pxPerMin = 2.15;
    const offset = Math.max(0, (nowMin - commonWindow.start) * pxPerMin - 180);

    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: offset, animated: true });
    }, 150);
  }, [view, anchorDate, commonWindow.start]);

  if ((loading || checkingSubscription) && !dayData && weekData.length === 0) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f6f6f7" }}>
      <ActivityIndicator />
    </View>
  );
}

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f6f7" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 34 }}>
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 34, lineHeight: 38, fontWeight: "900", color: "#111" }}>Dashboard</Text>

          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <View style={miniChip}>
              <Text style={miniChipText}>
                {view === "day" ? "Tagesansicht" : "Wochenansicht"}
              </Text>
            </View>

            {view === "day" ? (
              <View style={miniChipSoft}>
                <Text style={miniChipSoftText}>
                  {daySummary.active} aktive Termine
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={controlCard}>
          <View style={segmentedWrap}>
            <Pressable
              onPress={() => setView("day")}
              style={[segmentBtn, view === "day" ? segmentBtnActive : null]}
            >
              <Text style={[segmentText, view === "day" ? segmentTextActive : null]}>Tag</Text>
            </Pressable>

            <Pressable
              onPress={() => setView("week")}
              style={[segmentBtn, view === "week" ? segmentBtnActive : null]}
            >
              <Text style={[segmentText, view === "week" ? segmentTextActive : null]}>Woche</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={goPrev} style={[topNavBtn, { flex: 1 }]}>
              <Text style={topNavBtnArrow}>←</Text>
            </Pressable>

            <Pressable onPress={goToday} style={[topNavBtn, topNavBtnCenter]}>
              <Text style={topNavBtnText}>Heute</Text>
            </Pressable>

            <Pressable onPress={goNext} style={[topNavBtn, { flex: 1 }]}>
              <Text style={topNavBtnArrow}>→</Text>
            </Pressable>

            <Pressable onPress={openCreateModal} style={plusBtn}>
              <Text style={plusBtnText}>＋</Text>
            </Pressable>
          </View>
        </View>

        {message ? (
          <View style={okBox}>
            <Text style={okText}>{message}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={errBox}>
            <Text style={errText}>{error}</Text>
          </View>
        ) : null}

        {view === "day" ? (
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
            onSwipePrev={goPrev}
            onSwipeNext={goNext}
          />
        ) : (
          <WeekCalendar
            days={weekData}
            onSelectBooking={(booking) => setSelectedBooking(booking)}
            weekLabel={formatWeekRange(anchorDate)}
          />
        )}

        <View style={hintBox}>
          <Text style={hintText}>
            In der Tagesansicht kannst du im Kalender nach links oder rechts wischen.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={!!selectedBooking} animationType="slide" transparent>
        <View style={modalBackdrop}>
          <View style={modalCard}>
            {selectedBooking ? (
              <>
                <View style={modalHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: "#666", fontWeight: "900" }}>
                      TERMIN #{selectedBooking.id}
                    </Text>
                    <Text style={{ marginTop: 6, fontSize: 24, lineHeight: 28, fontWeight: "900", color: "#111" }}>
                      {selectedBooking.customer?.name || "Ohne Namen"}
                    </Text>
                  </View>

                  <Pressable onPress={() => setSelectedBooking(null)} style={closeBtn}>
                    <Text style={{ fontSize: 22, fontWeight: "700", color: "#111" }}>×</Text>
                  </Pressable>
                </View>

                <View style={{ marginTop: 14 }}>
                  <View
                    style={{
                      alignSelf: "flex-start",
                      paddingVertical: 7,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: statusColors(selectedBooking.status).bg,
                    }}
                  >
                    <Text
                      style={{
                        color: statusColors(selectedBooking.status).text,
                        fontSize: 12,
                        fontWeight: "900",
                      }}
                    >
                      {statusLabel(selectedBooking.status)}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 18, gap: 10 }}>
                  <InfoCard label="Zeit" value={selectedBooking.timeHHMM || "—"} />
                  <InfoCard
                    label="Service"
                    value={`${selectedBooking.service?.name || selectedBooking.service?.key || "—"}${
                      selectedBooking.service?.durationMin ? ` (${selectedBooking.service.durationMin} min)` : ""
                    }`}
                  />
                  <InfoCard
                    label="Kunde"
                    value={selectedBooking.customer?.name || "—"}
                    sub={selectedBooking.customer?.phone || undefined}
                  />
                  {selectedBooking.note ? <InfoCard label="Notiz" value={selectedBooking.note} /> : null}
                </View>

                {selectedBooking.customer?.phone ? (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${selectedBooking.customer?.phone}`)}
                    style={callBtn}
                  >
                    <Text style={callBtnText}>Kunde anrufen</Text>
                  </Pressable>
                ) : null}

                <View style={{ marginTop: 18, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <StatusButton
                    label="Bestätigt"
                    active={selectedBooking.status === "CONFIRMED"}
                    disabled={updatingId === selectedBooking.id}
                    onPress={() => updateStatus(selectedBooking.id, "CONFIRMED")}
                  />
                  <StatusButton
                    label="Erledigt"
                    active={selectedBooking.status === "COMPLETED"}
                    disabled={updatingId === selectedBooking.id}
                    onPress={() => updateStatus(selectedBooking.id, "COMPLETED")}
                  />
                  <StatusButton
                    label="Nicht erschienen"
                    active={selectedBooking.status === "NO_SHOW"}
                    disabled={updatingId === selectedBooking.id}
                    onPress={() => updateStatus(selectedBooking.id, "NO_SHOW")}
                  />
                  <StatusButton
                    label="Storniert"
                    active={selectedBooking.status === "CANCELLED"}
                    disabled={updatingId === selectedBooking.id}
                    onPress={() => updateStatus(selectedBooking.id, "CANCELLED")}
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={modalBackdrop}>
          <ScrollView style={modalCardScroll} contentContainerStyle={{ padding: 18 }}>
            <View style={modalHead}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#666", fontWeight: "900" }}>
                  MANUELLER TERMIN
                </Text>
                <Text style={{ marginTop: 6, fontSize: 24, lineHeight: 28, fontWeight: "900", color: "#111" }}>
                  Termin hinzufügen
                </Text>
              </View>

              <Pressable onPress={() => setShowCreateModal(false)} disabled={creatingBooking} style={closeBtn}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: "#111" }}>×</Text>
              </Pressable>
            </View>

            <View style={{ marginTop: 18, gap: 12 }}>
              <Field label="Kundenname">
                <TextInput
                  value={newCustomerName}
                  onChangeText={setNewCustomerName}
                  placeholder="z.B. Max Mustermann"
                  style={fieldInputStyle}
                />
              </Field>

              <Field label="Telefonnummer (optional)">
                <TextInput
                  value={newCustomerPhone}
                  onChangeText={setNewCustomerPhone}
                  placeholder="z.B. 0176..."
                  keyboardType="phone-pad"
                  style={fieldInputStyle}
                />
              </Field>

              <Field label="Datum">
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                    const iso = addDays(anchorDate, offset);
                    const active = newBookingDate === iso;
                    return (
                      <Pressable
                        key={iso}
                        onPress={() => setNewBookingDate(iso)}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: active ? "#111" : "#ddd",
                          backgroundColor: active ? "#111" : "#fff",
                        }}
                      >
                        <Text style={{ color: active ? "#fff" : "#111", fontWeight: "900", fontSize: 12 }}>
                          {formatShortDay(iso)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              <Field label="Service">
                <View style={{ gap: 8 }}>
                  {services.map((s) => {
                    const active = newServiceKey === s.key;
                    return (
                      <Pressable
                        key={s.key}
                        onPress={() => {
                          setNewServiceKey(s.key);
                          setNewBookingTime("");
                        }}
                        style={{
                          minHeight: 48,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: active ? "#111" : "#ddd",
                          backgroundColor: active ? "#111" : "#fff",
                          justifyContent: "center",
                          paddingHorizontal: 14,
                        }}
                      >
                        <Text style={{ color: active ? "#fff" : "#111", fontWeight: "900" }}>
                          {s.name} ({s.durationMin} min)
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              <Field label="Freier Slot">
                <View style={slotBox}>
                  {manualTimesLoading ? (
                    <Text style={{ fontSize: 13, color: "#666", fontWeight: "700" }}>
                      Lade freie Zeiten...
                    </Text>
                  ) : manualAvailableTimes.length === 0 ? (
                    <Text style={{ fontSize: 13, color: "#888", fontWeight: "700" }}>
                      Keine freien Zeiten verfügbar
                    </Text>
                  ) : (
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      {manualAvailableTimes.map((time) => {
                        const active = newBookingTime === time;
                        return (
                          <Pressable
                            key={time}
                            onPress={() => setNewBookingTime(time)}
                            style={{
                              paddingVertical: 8,
                              paddingHorizontal: 10,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: active ? "#111" : "#ddd",
                              backgroundColor: active ? "#111" : "#fff",
                            }}
                          >
                            <Text style={{ color: active ? "#fff" : "#111", fontWeight: "900", fontSize: 13 }}>
                              {time}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              </Field>

              <Field label="Notiz (optional)">
                <TextInput
                  value={newBookingNote}
                  onChangeText={setNewBookingNote}
                  placeholder="z.B. telefonisch vereinbart"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{
                    ...fieldInputStyle,
                    minHeight: 110,
                    paddingTop: 14,
                  }}
                />
              </Field>
            </View>

            <View style={{ marginTop: 18, flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setShowCreateModal(false)}
                disabled={creatingBooking}
                style={[modalActionLight, creatingBooking ? { opacity: 0.7 } : null]}
              >
                <Text style={{ color: "#111", fontWeight: "900" }}>Abbrechen</Text>
              </Pressable>

              <Pressable
                onPress={createManualBooking}
                disabled={creatingBooking || !newBookingTime}
                style={[modalActionDark, creatingBooking || !newBookingTime ? { opacity: 0.7 } : null]}
              >
                <Text style={{ color: "#fff", fontWeight: "900" }}>
                  {creatingBooking ? "Speichere..." : "Termin speichern"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DayCalendar(props: {
  scrollRef: React.RefObject<ScrollView | null>;
  date: string;
  bookings: ApiBooking[];
  blocks: ApiBlock[];
  hours: number[];
  windowStart: number;
  windowEnd: number;
  selectedBookingId: number | null;
  onSelectBooking: (booking: ApiBooking) => void;
  showNowLine: boolean;
  onSwipePrev: () => void;
  onSwipeNext: () => void;
}) {
  const totalMin = props.windowEnd - props.windowStart;
  const pxPerMin = 2.15;
  const gridHeight = Math.max(720, totalMin * pxPerMin);

  const laidOut = layoutOverlappingBookings(props.bookings);
  const nowMin = getNowMinutes();
  const nowTop = (nowMin - props.windowStart) * pxPerMin;
  const shouldShowNowLine =
    props.showNowLine && nowMin >= props.windowStart && nowMin <= props.windowEnd;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx < -70) {
          props.onSwipeNext();
        } else if (gestureState.dx > 70) {
          props.onSwipePrev();
        }
      },
    })
  ).current;

  return (
    <View style={calendarCard} {...panResponder.panHandlers}>
      <View style={calendarTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={calendarDateText}>{formatDayHeadline(props.date)}</Text>
          <Text style={calendarSubText}>
            {props.bookings.length} {props.bookings.length === 1 ? "Termin" : "Termine"}
          </Text>
        </View>

        <View style={swipeHintChip}>
          <Text style={swipeHintText}>Swipe</Text>
        </View>
      </View>

      <ScrollView ref={props.scrollRef} showsVerticalScrollIndicator={false}>
        <View style={calendarGridWrap}>
          <View style={calendarTimeColumn}>
            <View style={calendarGridHeaderBlank} />
            {props.hours.map((h) => (
              <View key={h} style={calendarHourCell}>
                <Text style={calendarHourText}>{minToHHMM(h)}</Text>
              </View>
            ))}
          </View>

          <View style={{ flex: 1, minWidth: 0, backgroundColor: "#fff" }}>
            <View style={calendarGridHeader}>
              <Text style={calendarGridHeaderText}>Termine</Text>
            </View>

            <View style={{ position: "relative", height: gridHeight }}>
              {props.hours.slice(0, -1).map((h) => {
                const top = (h - props.windowStart) * pxPerMin;
                return <View key={h} style={[calendarGridLine, { top }]} />;
              })}

              {props.blocks.map((block) => {
  const top = (block.startMin - props.windowStart) * pxPerMin;
  const height = Math.max(28, (block.endMin - block.startMin) * pxPerMin);

  return (
    <View
      key={`${block.source}-${block.id}`}
      style={{
        position: "absolute",
        left: 6,
        right: 6,
        top,
        height,
        borderRadius: 16,
        backgroundColor: "#f2f2f4",
        borderWidth: 1,
        borderColor: "#d8d8dd",
        borderStyle: "dashed",
        paddingHorizontal: 10,
        justifyContent: "center",
        zIndex: 2,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 12,
          fontWeight: "800",
          color: "#666",
        }}
      >
        Pause / blockiert {block.reason ? `• ${block.reason}` : ""}
      </Text>
    </View>
  );
})}

              {shouldShowNowLine ? (
                <>
                  <View style={[nowLine, { top: nowTop }]} />
                  <View style={[nowDot, { top: nowTop - 6 }]} />
                </>
              ) : null}

              {laidOut.length === 0 ? (
                <View style={emptyCalendarState}>
                  <Text style={emptyCalendarStateText}>Keine Termine</Text>
                </View>
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
                  <Pressable
                    key={b.id}
                    onPress={() => props.onSelectBooking(b)}
                    style={{
                      position: "absolute",
                      left: left as any,
                      width: width as any,
                      right: right as any,
                      top,
                      height,
                      zIndex: selected ? 11 : 10,
                      borderRadius: 18,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? "#111" : colors.border,
                      backgroundColor: colors.soft,
                      overflow: "hidden",
                      flexDirection: "row",
                      shadowColor: "#000",
                      shadowOpacity: 0.04,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 1,
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        backgroundColor: colors.accent,
                      }}
                    />

                    <View
  style={{
    flex: 1,
    paddingVertical: ultraCompact ? 6 : compact ? 8 : 10,
    paddingHorizontal: ultraCompact ? 8 : compact ? 10 : 12,
    justifyContent: "center",
  }}
>
  <Text
    style={{
      fontWeight: "900",
      fontSize: ultraCompact ? 11 : compact ? 12 : 13,
      lineHeight: ultraCompact ? 13 : 16,
      color: "#111",
    }}
    numberOfLines={1}
  >
    {minToHHMM(b.startMin)} – {minToHHMM(b.endMin)}
  </Text>

  <Text
    style={{
      marginTop: ultraCompact ? 1 : 2,
      fontWeight: "900",
      fontSize: ultraCompact ? 11 : compact ? 12 : 14,
      lineHeight: ultraCompact ? 14 : 18,
      color: "#111",
    }}
    numberOfLines={1}
  >
    {b.customer?.name || "Ohne Name"}
  </Text>

  {!ultraCompact ? (
    <Text
      style={{
        marginTop: 3,
        fontSize: 12,
        color: "#5f5f64",
        lineHeight: 15,
      }}
      numberOfLines={1}
    >
      {b.service?.name || b.service?.key || "Service"}
    </Text>
  ) : null}
</View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function WeekCalendar(props: {
  days: DayData[];
  onSelectBooking: (booking: ApiBooking) => void;
  weekLabel: string;
}) {
  return (
    <View style={calendarCard}>
      <View style={calendarTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={calendarDateText}>{props.weekLabel}</Text>
          <Text style={calendarSubText}>Wochenübersicht</Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {props.days.map((day) => {
          const bookings = day.bookings
            .slice()
            .sort((a, b) => {
              const sa = parseStartEndFromTimeHHMM(a.timeHHMM)?.startMin ?? 0;
              const sb = parseStartEndFromTimeHHMM(b.timeHHMM)?.startMin ?? 0;
              return sa - sb;
            });

          return (
            <View key={day.date} style={weekDayCard}>
              <View style={weekDayHead}>
                <Text style={weekDayTitle}>{formatDayHeadline(day.date)}</Text>
                <Text style={weekDayCount}>
                  {bookings.length} {bookings.length === 1 ? "Termin" : "Termine"}
                </Text>
              </View>

              <View style={{ padding: 12, gap: 8 }}>
                {bookings.length === 0 ? (
                  <Text style={emptyCalendarStateText}>Keine Termine</Text>
                ) : (
                  bookings.map((b) => {
                    const colors = statusColors(b.status);
                    return (
                      <Pressable
                        key={b.id}
                        onPress={() => props.onSelectBooking(b)}
                        style={{
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 16,
                          backgroundColor: colors.soft,
                          overflow: "hidden",
                          flexDirection: "row",
                        }}
                      >
                        <View style={{ width: 6, backgroundColor: colors.accent }} />

                        <View style={{ flex: 1, padding: 12 }}>
                          <Text style={{ fontWeight: "900", fontSize: 13, color: "#111" }}>
                            {b.timeHHMM || "—"}
                          </Text>
                          <Text style={{ marginTop: 4, fontWeight: "900", color: "#111" }}>
                            {b.customer?.name || "Ohne Namen"}
                          </Text>
                          <Text style={{ marginTop: 3, fontSize: 12, color: "#555" }}>
                            {b.service?.name || b.service?.key || "Service"}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function InfoCard(props: { label: string; value: string; sub?: string }) {
  return (
    <View style={infoCard}>
      <Text style={{ fontSize: 12, color: "#666", fontWeight: "800" }}>{props.label}</Text>
      <Text style={{ marginTop: 4, fontWeight: "900", color: "#111" }}>{props.value}</Text>
      {props.sub ? <Text style={{ marginTop: 4, color: "#555" }}>{props.sub}</Text> : null}
    </View>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={{ fontSize: 12, color: "#666", fontWeight: "800", marginBottom: 6 }}>
        {props.label}
      </Text>
      {props.children}
    </View>
  );
}

function StatusButton(props: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={props.disabled}
      onPress={props.onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: props.active ? "#111" : "#ddd",
        backgroundColor: props.active ? "#111" : "#fff",
        opacity: props.disabled ? 0.75 : 1,
      }}
    >
      <Text style={{ color: props.active ? "#fff" : "#111", fontWeight: "900", fontSize: 12 }}>
        {props.label}
      </Text>
    </Pressable>
  );
}

const miniChip = {
  paddingVertical: 7,
  paddingHorizontal: 10,
  borderRadius: 999,
  backgroundColor: "#111",
} as const;

const miniChipText = {
  color: "#fff",
  fontSize: 12,
  fontWeight: "900" as const,
} as const;

const miniChipSoft = {
  paddingVertical: 7,
  paddingHorizontal: 10,
  borderRadius: 999,
  backgroundColor: "#ececef",
} as const;

const miniChipSoftText = {
  color: "#444",
  fontSize: 12,
  fontWeight: "800" as const,
} as const;

const controlCard = {
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#e6e6e8",
  borderRadius: 24,
  backgroundColor: "#ffffff",
  padding: 12,
  shadowColor: "#000",
  shadowOpacity: 0.03,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;

const segmentedWrap = {
  flexDirection: "row" as const,
  backgroundColor: "#f0f0f2",
  borderRadius: 18,
  padding: 5,
  gap: 5,
  marginBottom: 10,
} as const;

const segmentBtn = {
  flex: 1,
  minHeight: 44,
  borderRadius: 14,
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const segmentBtnActive = {
  backgroundColor: "#111",
} as const;

const segmentText = {
  color: "#111",
  fontWeight: "900" as const,
  fontSize: 15,
} as const;

const segmentTextActive = {
  color: "#fff",
} as const;

const topNavBtn = {
  minHeight: 44,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#dddddf",
  backgroundColor: "#fff",
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const topNavBtnCenter = {
  flex: 1.8,
} as const;

const topNavBtnText = {
  color: "#111",
  fontWeight: "900" as const,
  fontSize: 15,
} as const;

const topNavBtnArrow = {
  color: "#111",
  fontWeight: "900" as const,
  fontSize: 22,
  lineHeight: 22,
} as const;

const plusBtn = {
  width: 50,
  minHeight: 44,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#111",
  backgroundColor: "#111",
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const plusBtnText = {
  color: "#fff",
  fontWeight: "900" as const,
  fontSize: 20,
  lineHeight: 20,
} as const;

const fieldInputStyle = {
  width: "100%",
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#ddd",
  fontSize: 14,
  color: "#111",
  backgroundColor: "#fff",
} as const;

const okBox = {
  marginBottom: 16,
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#cfe7d1",
  backgroundColor: "#f4fbf4",
} as const;

const okText = {
  color: "#17663a",
  fontWeight: "700" as const,
} as const;

const errBox = {
  marginBottom: 16,
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#f1c7c7",
  backgroundColor: "#fff5f5",
} as const;

const errText = {
  color: "#b42318",
  fontWeight: "700" as const,
} as const;

const hintBox = {
  marginTop: 14,
  paddingVertical: 13,
  paddingHorizontal: 14,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#e7e7ea",
  backgroundColor: "#fbfbfc",
} as const;

const hintText = {
  color: "#666",
  fontSize: 13,
  lineHeight: 18,
} as const;

const modalBackdrop = {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.35)",
  justifyContent: "center" as const,
  padding: 12,
} as const;

const modalCard = {
  backgroundColor: "#fff",
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "#eee",
  padding: 18,
} as const;

const modalCardScroll = {
  backgroundColor: "#fff",
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "#eee",
  maxHeight: "88%" as const,
} as const;

const modalHead = {
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  alignItems: "flex-start" as const,
  gap: 12,
} as const;

const closeBtn = {
  width: 40,
  height: 40,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#ddd",
  backgroundColor: "#fff",
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const modalActionLight = {
  flex: 1,
  minHeight: 48,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#ddd",
  backgroundColor: "#fff",
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const modalActionDark = {
  flex: 1,
  minHeight: 48,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#111",
  backgroundColor: "#111",
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const callBtn = {
  marginTop: 14,
  minHeight: 48,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#111",
  backgroundColor: "#111",
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const callBtnText = {
  color: "#fff",
  fontWeight: "900" as const,
  fontSize: 15,
} as const;

const slotBox = {
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 12,
  padding: 10,
  backgroundColor: "#fff",
  minHeight: 48,
} as const;

const infoCard = {
  borderWidth: 1,
  borderColor: "#eee",
  borderRadius: 14,
  padding: 12,
  backgroundColor: "#fafafa",
} as const;

const calendarCard = {
  borderWidth: 1,
  borderColor: "#e6e6e8",
  borderRadius: 24,
  backgroundColor: "#ffffff",
  padding: 14,
  shadowColor: "#000",
  shadowOpacity: 0.03,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;

const calendarTopRow = {
  flexDirection: "row" as const,
  alignItems: "flex-start" as const,
  justifyContent: "space-between" as const,
  gap: 12,
  paddingHorizontal: 4,
  paddingBottom: 14,
} as const;

const calendarDateText = {
  fontSize: 22,
  lineHeight: 26,
  fontWeight: "900" as const,
  color: "#111",
  textTransform: "capitalize" as const,
} as const;

const calendarSubText = {
  marginTop: 5,
  fontSize: 13,
  color: "#6b6b70",
  fontWeight: "700" as const,
} as const;

const swipeHintChip = {
  paddingVertical: 7,
  paddingHorizontal: 10,
  borderRadius: 999,
  backgroundColor: "#f0f0f2",
} as const;

const swipeHintText = {
  fontSize: 12,
  color: "#444",
  fontWeight: "800" as const,
} as const;

const calendarGridWrap = {
  flexDirection: "row" as const,
  borderWidth: 1,
  borderColor: "#e8e8eb",
  borderRadius: 20,
  overflow: "hidden" as const,
  backgroundColor: "#fff",
} as const;

const calendarTimeColumn = {
  width: 56,
  backgroundColor: "#fafafb",
} as const;

const calendarGridHeaderBlank = {
  height: 42,
  borderBottomWidth: 1,
  borderBottomColor: "#ececef",
} as const;

const calendarHourCell = {
  height: 129,
  paddingTop: 10,
  paddingHorizontal: 8,
  borderBottomWidth: 1,
  borderBottomColor: "#f1f1f3",
} as const;

const calendarHourText = {
  fontSize: 12,
  color: "#6f6f75",
  fontWeight: "800" as const,
} as const;

const calendarGridHeader = {
  height: 42,
  borderBottomWidth: 1,
  borderBottomColor: "#ececef",
  justifyContent: "center" as const,
  paddingHorizontal: 14,
  backgroundColor: "#fcfcfd",
} as const;

const calendarGridHeaderText = {
  fontWeight: "900" as const,
  fontSize: 15,
  color: "#222",
} as const;

const calendarGridLine = {
  position: "absolute" as const,
  left: 0,
  right: 0,
  borderTopWidth: 1,
  borderTopColor: "#f0f0f2",
} as const;

const nowLine = {
  position: "absolute" as const,
  left: 0,
  right: 0,
  borderTopWidth: 2,
  borderTopColor: "#e11d48",
  zIndex: 20,
} as const;

const nowDot = {
  position: "absolute" as const,
  left: 8,
  width: 12,
  height: 12,
  borderRadius: 999,
  backgroundColor: "#e11d48",
  zIndex: 21,
} as const;

const emptyCalendarState = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: "center" as const,
  alignItems: "center" as const,
} as const;

const emptyCalendarStateText = {
  color: "#888",
  fontStyle: "italic" as const,
} as const;

const weekDayCard = {
  borderWidth: 1,
  borderColor: "#e8e8eb",
  borderRadius: 18,
  backgroundColor: "#fff",
  overflow: "hidden" as const,
} as const;

const weekDayHead = {
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderBottomWidth: 1,
  borderBottomColor: "#eee",
  backgroundColor: "#fcfcfd",
} as const;

const weekDayTitle = {
  fontWeight: "900" as const,
  fontSize: 16,
  color: "#111",
} as const;

const weekDayCount = {
  marginTop: 4,
  fontSize: 12,
  color: "#666",
  fontWeight: "700" as const,
} as const;