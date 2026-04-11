import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type RecurringBlock = {
  id: number;
  weekday: number;
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

type TabKey = "RECURRING" | "ONCE";
type ReasonKey = "Pause" | "Privat" | "Urlaub" | "Arzt";
type TimeTarget = "recurringStart" | "recurringEnd" | "onceStart" | "onceEnd" | null;

const WEEKDAYS = [
  { k: 0, name: "Sonntag" },
  { k: 1, name: "Montag" },
  { k: 2, name: "Dienstag" },
  { k: 3, name: "Mittwoch" },
  { k: 4, name: "Donnerstag" },
  { k: 5, name: "Freitag" },
  { k: 6, name: "Samstag" },
];

const REASONS: ReasonKey[] = ["Pause", "Privat", "Urlaub", "Arzt"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minToHHMM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function toIsoLocal(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseIsoDateLocal(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDateDE(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseIsoDateLocal(iso));
}

function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarDays(monthDate: Date) {
  const start = monthStart(monthDate);
  const end = monthEnd(monthDate);

  const startWeekday = start.getDay();
  const lead = startWeekday === 0 ? 6 : startWeekday - 1;
  const daysInMonth = end.getDate();

  const cells: Array<{ iso: string; day: number; inMonth: boolean }> = [];

  for (let i = lead; i > 0; i--) {
    const d = new Date(start);
    d.setDate(start.getDate() - i);
    cells.push({ iso: toIsoLocal(d), day: d.getDate(), inMonth: false });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), i);
    cells.push({ iso: toIsoLocal(d), day: i, inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const last = parseIsoDateLocal(cells[cells.length - 1].iso);
    last.setDate(last.getDate() + 1);
    cells.push({ iso: toIsoLocal(last), day: last.getDate(), inMonth: false });
  }

  return cells;
}

function buildHours() {
  return Array.from({ length: 24 }, (_, i) => i);
}

function buildMinutes(step = 5) {
  const out: number[] = [];
  for (let i = 0; i < 60; i += step) out.push(i);
  return out;
}

function minuteOfDay(hour: number, minute: number) {
  return hour * 60 + minute;
}

export default function BarberPausenScreen() {
  const { token, user } = useAuth();

  const today = toIsoLocal(new Date());
  const hours = useMemo(() => buildHours(), []);
  const minutes = useMemo(() => buildMinutes(5), []);

  const [tab, setTab] = useState<TabKey>("RECURRING");

  const [recurring, setRecurring] = useState<RecurringBlock[]>([]);
  const [oneDayBlocks, setOneDayBlocks] = useState<TimeBlock[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);

  const [loading, setLoading] = useState(true);
  const [savingRecurring, setSavingRecurring] = useState(false);
  const [savingDayBlock, setSavingDayBlock] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newWeekday, setNewWeekday] = useState(1);
  const [newStartHour, setNewStartHour] = useState(13);
  const [newStartMinute, setNewStartMinute] = useState(0);
  const [newEndHour, setNewEndHour] = useState(13);
  const [newEndMinute, setNewEndMinute] = useState(30);
  const [newReason, setNewReason] = useState<ReasonKey>("Pause");

  const [dayStartHour, setDayStartHour] = useState(12);
  const [dayStartMinute, setDayStartMinute] = useState(0);
  const [dayEndHour, setDayEndHour] = useState(12);
  const [dayEndMinute, setDayEndMinute] = useState(30);
  const [dayReason, setDayReason] = useState<ReasonKey>("Privat");

  const [showDateModal, setShowDateModal] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date>(parseIsoDateLocal(today));

  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeTarget, setTimeTarget] = useState<TimeTarget>(null);
  const [tempHour, setTempHour] = useState(12);
  const [tempMinute, setTempMinute] = useState(0);

  useEffect(() => {
    if (!token || !user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "BARBER") {
      router.replace("/");
      return;
    }

    loadAll();
  }, [token, user]);

  useEffect(() => {
    if (!token || !user || user.role !== "BARBER") return;
    loadDayBlocks(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    setPickerMonth(parseIsoDateLocal(selectedDate));
  }, [selectedDate]);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      await Promise.all([loadRecurring(), loadDayBlocks(selectedDate)]);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecurring() {
    try {
      const data = await api.get(`/admin/recurring-blocks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecurring(Array.isArray(data.data?.blocks) ? data.data.blocks : []);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Fehler");
      setRecurring([]);
    }
  }

  async function loadDayBlocks(d: string) {
    try {
      const data = await api.get(`/admin/time-blocks?date=${encodeURIComponent(d)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOneDayBlocks(Array.isArray(data.data?.blocks) ? data.data.blocks : []);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Fehler");
      setOneDayBlocks([]);
    }
  }

  async function createRecurring() {
    const startMin = minuteOfDay(newStartHour, newStartMinute);
    const endMin = minuteOfDay(newEndHour, newEndMinute);

    if (endMin <= startMin) {
      setError("Ende muss nach Start liegen.");
      return;
    }

    try {
      setSavingRecurring(true);
      setError("");
      setMessage("");

      const data = await api.post(
        `/admin/recurring-blocks`,
        {
          weekday: newWeekday,
          startMin,
          endMin,
          reason: newReason,
          enabled: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setRecurring((prev) =>
        [...prev, data.data.block].sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin)
      );
      setMessage("Wiederkehrende Pause gespeichert.");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Fehler");
    } finally {
      setSavingRecurring(false);
    }
  }

  async function createDayBlock() {
    const startMin = minuteOfDay(dayStartHour, dayStartMinute);
    const endMin = minuteOfDay(dayEndHour, dayEndMinute);

    if (endMin <= startMin) {
      setError("Ende muss nach Start liegen.");
      return;
    }

    try {
      setSavingDayBlock(true);
      setError("");
      setMessage("");

      await api.post(
        `/admin/time-blocks`,
        {
          date: selectedDate,
          startMin,
          endMin,
          reason: dayReason,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setMessage("Blockzeit gespeichert.");
      await loadDayBlocks(selectedDate);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Fehler");
    } finally {
      setSavingDayBlock(false);
    }
  }

  async function toggleRecurring(id: number, enabled: boolean) {
    try {
      setError("");
      setMessage("");

      await api.patch(
        `/admin/recurring-blocks/${id}`,
        { enabled },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setRecurring((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
      setMessage(enabled ? "Pause aktiviert." : "Pause deaktiviert.");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Fehler");
    }
  }

  async function deleteRecurring(id: number) {
    try {
      setError("");
      setMessage("");

      await api.delete(`/admin/recurring-blocks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRecurring((prev) => prev.filter((r) => r.id !== id));
      setMessage("Wiederkehrende Pause gelöscht.");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Fehler");
    }
  }

  async function deleteDayBlock(id: number) {
    try {
      setError("");
      setMessage("");

      await api.delete(`/admin/time-blocks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOneDayBlocks((prev) => prev.filter((b) => b.id !== id));
      setMessage("Blockzeit gelöscht.");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Fehler");
    }
  }

  function openTimeModal(target: TimeTarget) {
    setTimeTarget(target);

    if (target === "recurringStart") {
      setTempHour(newStartHour);
      setTempMinute(newStartMinute);
    } else if (target === "recurringEnd") {
      setTempHour(newEndHour);
      setTempMinute(newEndMinute);
    } else if (target === "onceStart") {
      setTempHour(dayStartHour);
      setTempMinute(dayStartMinute);
    } else if (target === "onceEnd") {
      setTempHour(dayEndHour);
      setTempMinute(dayEndMinute);
    }

    setShowTimeModal(true);
  }

  function applyTimeModal() {
    if (timeTarget === "recurringStart") {
      setNewStartHour(tempHour);
      setNewStartMinute(tempMinute);
    } else if (timeTarget === "recurringEnd") {
      setNewEndHour(tempHour);
      setNewEndMinute(tempMinute);
    } else if (timeTarget === "onceStart") {
      setDayStartHour(tempHour);
      setDayStartMinute(tempMinute);
    } else if (timeTarget === "onceEnd") {
      setDayEndHour(tempHour);
      setDayEndMinute(tempMinute);
    }

    setShowTimeModal(false);
    setTimeTarget(null);
  }

  const recurringByDay = useMemo(() => {
    const map = new Map<number, RecurringBlock[]>();
    for (const d of WEEKDAYS) map.set(d.k, []);
    for (const r of recurring) {
      const list = map.get(r.weekday) ?? [];
      list.push(r);
      map.set(r.weekday, list);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => a.startMin - b.startMin);
      map.set(k, list);
    }
    return map;
  }, [recurring]);

  const calendarCells = useMemo(() => getCalendarDays(pickerMonth), [pickerMonth]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f6f6f7" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f6f7" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 32, lineHeight: 36, fontWeight: "900", color: "#111" }}>
            Pausen & Blockzeiten
          </Text>
          <Text style={{ marginTop: 8, color: "#666", fontSize: 15, lineHeight: 22 }}>
            Verwalte wiederkehrende Pausen und einmalige Sperrzeiten ohne manuelle Eingabe.
          </Text>
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

        <View style={tabWrap}>
          <Pressable
            onPress={() => setTab("RECURRING")}
            style={[tabBtn, tab === "RECURRING" ? tabBtnActive : null]}
          >
            <Text style={[tabBtnText, tab === "RECURRING" ? tabBtnTextActive : null]}>
              Wiederkehrend
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTab("ONCE")}
            style={[tabBtn, tab === "ONCE" ? tabBtnActive : null]}
          >
            <Text style={[tabBtnText, tab === "ONCE" ? tabBtnTextActive : null]}>
              Einmalig
            </Text>
          </Pressable>
        </View>

        {tab === "RECURRING" ? (
          <>
            <View style={card}>
              <Text style={sectionTitle}>Neue Pause anlegen</Text>
              <Text style={sectionSub}>Wähle Wochentag, Zeiten und Grund.</Text>

              <View style={{ marginTop: 18, gap: 16 }}>
                <Field label="Wochentag">
                  <ChipGrid
                    items={WEEKDAYS.map((d) => ({ key: String(d.k), label: d.name, active: newWeekday === d.k }))}
                    onPress={(key) => setNewWeekday(Number(key))}
                  />
                </Field>

                <Field label="Startzeit">
                  <Pressable style={pickerField} onPress={() => openTimeModal("recurringStart")}>
                    <Text style={pickerFieldText}>{pad2(newStartHour)}:{pad2(newStartMinute)}</Text>
                  </Pressable>
                </Field>

                <Field label="Endzeit">
                  <Pressable style={pickerField} onPress={() => openTimeModal("recurringEnd")}>
                    <Text style={pickerFieldText}>{pad2(newEndHour)}:{pad2(newEndMinute)}</Text>
                  </Pressable>
                </Field>

                <Field label="Grund">
                  <ChipGrid
                    items={REASONS.map((r) => ({
                      key: r,
                      label: r,
                      active: newReason === r,
                    }))}
                    onPress={(key) => setNewReason(key as ReasonKey)}
                  />
                </Field>

                <Pressable
                  onPress={createRecurring}
                  disabled={savingRecurring}
                  style={[primaryBtn, savingRecurring ? disabledBtn : null]}
                >
                  <Text style={primaryBtnText}>
                    {savingRecurring ? "Speichert..." : "Pause hinzufügen"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={[card, { marginTop: 16 }]}>
              <Text style={sectionTitle}>Vorhandene Pausen</Text>
              <Text style={sectionSub}>Nur Tage mit Einträgen werden angezeigt.</Text>

              <View style={{ marginTop: 16, gap: 12 }}>
                {WEEKDAYS.map((d) => {
                  const list = recurringByDay.get(d.k) ?? [];
                  if (list.length === 0) return null;

                  return (
                    <View key={d.k} style={innerCard}>
                      <View style={rowBetween}>
                        <Text style={dayTitle}>{d.name}</Text>
                        <View style={countPill}>
                          <Text style={countPillText}>{list.length}</Text>
                        </View>
                      </View>

                      <View style={{ marginTop: 12, gap: 10 }}>
                        {list.map((r) => (
                          <View key={r.id} style={blockItem}>
                            <View style={rowBetween}>
                              <View style={{ flex: 1 }}>
                                <Text style={blockTime}>
                                  {minToHHMM(r.startMin)} – {minToHHMM(r.endMin)}
                                </Text>
                                <Text style={blockReason}>{r.reason?.trim() || "Ohne Bezeichnung"}</Text>
                              </View>

                              <View style={[statusPill, r.enabled ? statusPillActive : statusPillInactive]}>
                                <Text
                                  style={[
                                    statusPillText,
                                    r.enabled ? statusPillTextActive : statusPillTextInactive,
                                  ]}
                                >
                                  {r.enabled ? "Aktiv" : "Inaktiv"}
                                </Text>
                              </View>
                            </View>

                            <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
                              <Pressable
                                onPress={() => toggleRecurring(r.id, !r.enabled)}
                                style={[secondaryBtn, { flex: 1 }]}
                              >
                                <Text style={secondaryBtnText}>
                                  {r.enabled ? "Deaktivieren" : "Aktivieren"}
                                </Text>
                              </Pressable>

                              <Pressable
                                onPress={() => deleteRecurring(r.id)}
                                style={[dangerBtn, { flex: 1 }]}
                              >
                                <Text style={dangerBtnText}>Löschen</Text>
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}

                {recurring.length === 0 ? (
                  <View style={emptyCard}>
                    <Text style={emptyTitle}>Noch keine wiederkehrenden Pausen</Text>
                    <Text style={emptySub}>Lege oben eine Pause an.</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={card}>
              <Text style={sectionTitle}>Neue Blockzeit anlegen</Text>
              <Text style={sectionSub}>Wähle Datum, Zeiten und Grund.</Text>

              <View style={{ marginTop: 18, gap: 16 }}>
                <Field label="Datum">
                  <Pressable onPress={() => setShowDateModal(true)} style={pickerField}>
                    <Text style={pickerFieldText}>{formatDateDE(selectedDate)}</Text>
                  </Pressable>
                </Field>

                <Field label="Startzeit">
                  <Pressable style={pickerField} onPress={() => openTimeModal("onceStart")}>
                    <Text style={pickerFieldText}>{pad2(dayStartHour)}:{pad2(dayStartMinute)}</Text>
                  </Pressable>
                </Field>

                <Field label="Endzeit">
                  <Pressable style={pickerField} onPress={() => openTimeModal("onceEnd")}>
                    <Text style={pickerFieldText}>{pad2(dayEndHour)}:{pad2(dayEndMinute)}</Text>
                  </Pressable>
                </Field>

                <Field label="Grund">
                  <ChipGrid
                    items={REASONS.map((r) => ({
                      key: r,
                      label: r,
                      active: dayReason === r,
                    }))}
                    onPress={(key) => setDayReason(key as ReasonKey)}
                  />
                </Field>

                <Pressable
                  onPress={createDayBlock}
                  disabled={savingDayBlock}
                  style={[primaryBtn, savingDayBlock ? disabledBtn : null]}
                >
                  <Text style={primaryBtnText}>
                    {savingDayBlock ? "Speichert..." : "Blockzeit speichern"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={[card, { marginTop: 16 }]}>
              <Text style={sectionTitle}>Blockzeiten am gewählten Datum</Text>
              <Text style={sectionSub}>{formatDateDE(selectedDate)}</Text>

              <View style={{ marginTop: 16, gap: 10 }}>
                {oneDayBlocks.length === 0 ? (
                  <View style={emptyCard}>
                    <Text style={emptyTitle}>Keine Blockzeiten vorhanden</Text>
                    <Text style={emptySub}>Für dieses Datum ist noch nichts eingetragen.</Text>
                  </View>
                ) : (
                  oneDayBlocks
                    .slice()
                    .sort((a, b) => a.startMin - b.startMin)
                    .map((b) => (
                      <View key={b.id} style={blockItem}>
                        <Text style={blockTime}>
                          {minToHHMM(b.startMin)} – {minToHHMM(b.endMin)}
                        </Text>
                        <Text style={blockReason}>{b.reason?.trim() || "Ohne Bezeichnung"}</Text>

                        <View style={{ marginTop: 12 }}>
                          <Pressable onPress={() => deleteDayBlock(b.id)} style={dangerBtn}>
                            <Text style={dangerBtnText}>Löschen</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                )}
              </View>
            </View>
          </>
        )}

        <Modal visible={showDateModal} transparent animationType="slide">
          <View style={modalBackdrop}>
            <View style={modalCard}>
              <View style={rowBetween}>
                <Text style={modalTitle}>Datum auswählen</Text>
                <Pressable onPress={() => setShowDateModal(false)} style={closeBtn}>
                  <Text style={closeBtnText}>×</Text>
                </Pressable>
              </View>

              <View style={calendarHeader}>
                <Pressable onPress={() => setPickerMonth((m) => addMonths(m, -1))} style={calendarNavBtn}>
                  <Text style={calendarNavBtnText}>←</Text>
                </Pressable>

                <Text style={calendarMonthText}>{formatMonthYear(pickerMonth)}</Text>

                <Pressable onPress={() => setPickerMonth((m) => addMonths(m, 1))} style={calendarNavBtn}>
                  <Text style={calendarNavBtnText}>→</Text>
                </Pressable>
              </View>

              <View style={calendarWeekdays}>
                {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
                  <Text key={d} style={calendarWeekdayText}>
                    {d}
                  </Text>
                ))}
              </View>

              <View style={calendarGrid}>
                {calendarCells.map((cell) => {
                  const isSelected = cell.iso === selectedDate;
                  const isPast = cell.iso < today;

                  return (
                    <Pressable
                      key={cell.iso}
                      disabled={isPast}
                      onPress={() => {
                        setSelectedDate(cell.iso);
                        setShowDateModal(false);
                      }}
                      style={[
                        calendarDayBtn,
                        !cell.inMonth ? calendarDayBtnOutside : null,
                        isSelected ? calendarDayBtnActive : null,
                        isPast ? calendarDayBtnDisabled : null,
                      ]}
                    >
                      <Text
                        style={[
                          calendarDayText,
                          !cell.inMonth ? calendarDayTextOutside : null,
                          isSelected ? calendarDayTextActive : null,
                          isPast ? calendarDayTextDisabled : null,
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showTimeModal} transparent animationType="slide">
          <View style={modalBackdrop}>
            <View style={modalCard}>
              <View style={rowBetween}>
                <Text style={modalTitle}>Zeit auswählen</Text>
                <Pressable onPress={() => setShowTimeModal(false)} style={closeBtn}>
                  <Text style={closeBtnText}>×</Text>
                </Pressable>
              </View>

              <View style={{ marginTop: 18, flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={timePickerLabel}>Stunde</Text>
                  <View style={wheelBox}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <View style={{ gap: 8 }}>
                        {hours.map((h) => {
                          const active = tempHour === h;
                          return (
                            <Pressable
                              key={h}
                              onPress={() => setTempHour(h)}
                              style={[wheelItem, active ? wheelItemActive : null]}
                            >
                              <Text style={[wheelItemText, active ? wheelItemTextActive : null]}>
                                {pad2(h)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={timePickerLabel}>Minute</Text>
                  <View style={wheelBox}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <View style={{ gap: 8 }}>
                        {minutes.map((m) => {
                          const active = tempMinute === m;
                          return (
                            <Pressable
                              key={m}
                              onPress={() => setTempMinute(m)}
                              style={[wheelItem, active ? wheelItemActive : null]}
                            >
                              <Text style={[wheelItemText, active ? wheelItemTextActive : null]}>
                                {pad2(m)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              </View>

              <View style={{ marginTop: 16 }}>
                <Pressable onPress={applyTimeModal} style={primaryBtn}>
                  <Text style={primaryBtnText}>Übernehmen</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={{ fontSize: 13, fontWeight: "800", color: "#555", marginBottom: 8 }}>
        {props.label}
      </Text>
      {props.children}
    </View>
  );
}

function ChipGrid(props: {
  items: { key: string; label: string; active: boolean }[];
  onPress: (key: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {props.items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => props.onPress(item.key)}
          style={[chipBtn, item.active ? chipBtnActive : null]}
        >
          <Text style={[chipBtnText, item.active ? chipBtnTextActive : null]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const card = {
  borderWidth: 1,
  borderColor: "#e8e8eb",
  borderRadius: 24,
  backgroundColor: "#fff",
  padding: 18,
} as const;

const innerCard = {
  borderWidth: 1,
  borderColor: "#ededf0",
  borderRadius: 18,
  backgroundColor: "#fcfcfd",
  padding: 14,
} as const;

const blockItem = {
  borderWidth: 1,
  borderColor: "#e7e7ea",
  borderRadius: 16,
  backgroundColor: "#fff",
  padding: 12,
} as const;

const rowBetween = {
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  alignItems: "center" as const,
  gap: 10,
} as const;

const sectionTitle = {
  fontSize: 24,
  lineHeight: 28,
  fontWeight: "900" as const,
  color: "#111",
} as const;

const sectionSub = {
  marginTop: 6,
  color: "#666",
  fontSize: 15,
  lineHeight: 20,
} as const;

const tabWrap = {
  flexDirection: "row" as const,
  backgroundColor: "#ededf0",
  borderRadius: 18,
  padding: 5,
  gap: 5,
  marginBottom: 16,
} as const;

const tabBtn = {
  flex: 1,
  minHeight: 44,
  borderRadius: 14,
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const tabBtnActive = {
  backgroundColor: "#111",
} as const;

const tabBtnText = {
  color: "#111",
  fontWeight: "900" as const,
  fontSize: 15,
} as const;

const tabBtnTextActive = {
  color: "#fff",
} as const;

const chipBtn = {
  minHeight: 42,
  paddingHorizontal: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#ddd",
  backgroundColor: "#fff",
  justifyContent: "center" as const,
} as const;

const chipBtnActive = {
  borderColor: "#111",
  backgroundColor: "#111",
} as const;

const chipBtnText = {
  color: "#111",
  fontWeight: "800" as const,
  fontSize: 13,
} as const;

const chipBtnTextActive = {
  color: "#fff",
} as const;

const pickerField = {
  minHeight: 52,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#dedede",
  backgroundColor: "#fff",
  justifyContent: "center" as const,
  paddingHorizontal: 16,
} as const;

const pickerFieldText = {
  fontSize: 16,
  color: "#111",
  fontWeight: "700" as const,
} as const;

const primaryBtn = {
  minHeight: 52,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#111",
  backgroundColor: "#111",
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const primaryBtnText = {
  color: "#fff",
  fontWeight: "900" as const,
  fontSize: 15,
} as const;

const secondaryBtn = {
  minHeight: 40,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#d8d8d8",
  backgroundColor: "#fff",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: 14,
} as const;

const secondaryBtnText = {
  color: "#111",
  fontWeight: "800" as const,
  fontSize: 13,
} as const;

const dangerBtn = {
  minHeight: 40,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#e3c7c7",
  backgroundColor: "#fff",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: 14,
} as const;

const dangerBtnText = {
  color: "#8a1c1c",
  fontWeight: "900" as const,
  fontSize: 13,
} as const;

const blockTime = {
  fontWeight: "900" as const,
  fontSize: 16,
  color: "#111",
} as const;

const blockReason = {
  marginTop: 5,
  color: "#666",
  fontSize: 14,
} as const;

const dayTitle = {
  fontSize: 17,
  fontWeight: "900" as const,
  color: "#111",
} as const;

const countPill = {
  minWidth: 28,
  height: 28,
  borderRadius: 999,
  backgroundColor: "#f0f0f2",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: 8,
} as const;

const countPillText = {
  color: "#555",
  fontSize: 12,
  fontWeight: "900" as const,
} as const;

const statusPill = {
  paddingVertical: 5,
  paddingHorizontal: 9,
  borderRadius: 999,
} as const;

const statusPillActive = {
  backgroundColor: "#eef8f0",
} as const;

const statusPillInactive = {
  backgroundColor: "#f3f3f3",
} as const;

const statusPillText = {
  fontSize: 12,
  fontWeight: "900" as const,
} as const;

const statusPillTextActive = {
  color: "#17663a",
} as const;

const statusPillTextInactive = {
  color: "#666",
} as const;

const emptyCard = {
  borderWidth: 1,
  borderColor: "#ececef",
  borderRadius: 16,
  backgroundColor: "#fbfbfc",
  padding: 14,
} as const;

const emptyTitle = {
  fontSize: 15,
  fontWeight: "900" as const,
  color: "#111",
} as const;

const emptySub = {
  marginTop: 4,
  color: "#777",
  fontSize: 14,
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

const disabledBtn = {
  opacity: 0.7,
} as const;

const modalBackdrop = {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.35)",
  justifyContent: "flex-end" as const,
} as const;

const modalCard = {
  backgroundColor: "#fff",
  borderTopLeftRadius: 22,
  borderTopRightRadius: 22,
  padding: 18,
  maxHeight: "85%" as const,
} as const;

const modalTitle = {
  fontSize: 20,
  fontWeight: "900" as const,
  color: "#111",
} as const;

const closeBtn = {
  width: 36,
  height: 36,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#ddd",
  backgroundColor: "#fff",
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const closeBtnText = {
  fontSize: 22,
  lineHeight: 22,
  color: "#111",
} as const;

const calendarHeader = {
  marginTop: 14,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
} as const;

const calendarNavBtn = {
  width: 40,
  height: 40,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#ddd",
  backgroundColor: "#fff",
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const calendarNavBtnText = {
  fontSize: 18,
  fontWeight: "900" as const,
  color: "#111",
} as const;

const calendarMonthText = {
  fontSize: 16,
  fontWeight: "900" as const,
  color: "#111",
  textTransform: "capitalize" as const,
} as const;

const calendarWeekdays = {
  marginTop: 14,
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
} as const;

const calendarWeekdayText = {
  flex: 1,
  textAlign: "center" as const,
  fontSize: 12,
  color: "#666",
  fontWeight: "800" as const,
} as const;

const calendarGrid = {
  marginTop: 10,
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  gap: 6,
} as const;

const calendarDayBtn = {
  width: "13.2%",
  aspectRatio: 1,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#e1e1e4",
  backgroundColor: "#fff",
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const calendarDayBtnOutside = {
  opacity: 0.5,
} as const;

const calendarDayBtnActive = {
  borderColor: "#111",
  backgroundColor: "#111",
} as const;

const calendarDayBtnDisabled = {
  opacity: 0.35,
} as const;

const calendarDayText = {
  fontSize: 14,
  fontWeight: "800" as const,
  color: "#111",
} as const;

const calendarDayTextOutside = {
  color: "#777",
} as const;

const calendarDayTextActive = {
  color: "#fff",
} as const;

const calendarDayTextDisabled = {
  color: "#999",
} as const;

const timePickerLabel = {
  fontSize: 12,
  color: "#666",
  fontWeight: "800" as const,
  marginBottom: 8,
} as const;

const wheelBox = {
  borderWidth: 1,
  borderColor: "#e2e2e6",
  borderRadius: 16,
  backgroundColor: "#fafafa",
  height: 260,
  padding: 10,
} as const;

const wheelItem = {
  minHeight: 44,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#ddd",
  backgroundColor: "#fff",
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const wheelItemActive = {
  borderColor: "#111",
  backgroundColor: "#111",
} as const;

const wheelItemText = {
  color: "#111",
  fontWeight: "900" as const,
  fontSize: 16,
} as const;

const wheelItemTextActive = {
  color: "#fff",
} as const;