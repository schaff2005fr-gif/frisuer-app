"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minToHHMM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function hhmmToMin(hhmm: string) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm || "").trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function normalizeHHMM(value: string) {
  const raw = String(value || "").replace(/[^\d:]/g, "").trim();

  if (/^\d{1,2}$/.test(raw)) {
    const h = Number(raw);
    if (h >= 0 && h <= 23) return `${pad2(h)}:00`;
  }

  if (/^\d{3,4}$/.test(raw)) {
    const digits = raw.padStart(4, "0");
    const h = Number(digits.slice(0, 2));
    const m = Number(digits.slice(2, 4));
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return `${pad2(h)}:${pad2(m)}`;
  }

  const parsed = hhmmToMin(raw);
  if (parsed == null) return value;
  return minToHHMM(parsed);
}

function normalizeISODate(value: string) {
  const raw = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const de = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(raw);
  if (de) {
    const day = Number(de[1]);
    const month = Number(de[2]);
    const year = Number(de[3]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  const compact = /^(\d{2})(\d{2})(\d{4})$/.exec(raw);
  if (compact) {
    const day = Number(compact[1]);
    const month = Number(compact[2]);
    const year = Number(compact[3]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  return value;
}

function isoToDisplayDate(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

const WEEKDAYS = [
  { k: 0, name: "Sonntag" },
  { k: 1, name: "Montag" },
  { k: 2, name: "Dienstag" },
  { k: 3, name: "Mittwoch" },
  { k: 4, name: "Donnerstag" },
  { k: 5, name: "Freitag" },
  { k: 6, name: "Samstag" },
];

export default function PausenPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [recurring, setRecurring] = useState<RecurringBlock[]>([]);
  const [oneDayBlocks, setOneDayBlocks] = useState<TimeBlock[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedDateInput, setSelectedDateInput] = useState(isoToDisplayDate(today));

  const [loadingRecurring, setLoadingRecurring] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [savingRecurring, setSavingRecurring] = useState(false);
  const [savingDayBlock, setSavingDayBlock] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newWeekday, setNewWeekday] = useState(1);
  const [newStart, setNewStart] = useState("13:00");
  const [newEnd, setNewEnd] = useState("13:30");
  const [newReason, setNewReason] = useState("Pause");

  const [dayStart, setDayStart] = useState("12:00");
  const [dayEnd, setDayEnd] = useState("12:30");
  const [dayReason, setDayReason] = useState("Privat");

  const [editingRecurringId, setEditingRecurringId] = useState<number | null>(null);
  const [editRecurringWeekday, setEditRecurringWeekday] = useState(1);
  const [editRecurringStart, setEditRecurringStart] = useState("13:00");
  const [editRecurringEnd, setEditRecurringEnd] = useState("13:30");
  const [editRecurringReason, setEditRecurringReason] = useState("");
  const [updatingRecurringId, setUpdatingRecurringId] = useState<number | null>(null);

  const [editingDayBlockId, setEditingDayBlockId] = useState<number | null>(null);
  const [editDayStart, setEditDayStart] = useState("12:00");
  const [editDayEnd, setEditDayEnd] = useState("12:30");
  const [editDayReason, setEditDayReason] = useState("");
  const [updatingDayBlockId, setUpdatingDayBlockId] = useState<number | null>(null);

  function clearAlerts() {
    setError("");
    setMessage("");
  }

  function getToken() {
    return localStorage.getItem("token") || "";
  }

  function applySelectedDate(nextValue: string) {
  const normalized = normalizeISODate(nextValue);
  setSelectedDateInput(isoToDisplayDate(normalized));

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    setSelectedDate(normalized);
    setEditingDayBlockId(null);
    loadDayBlocks(normalized);
  }
}

  async function apiFetch(path: string, init?: RequestInit) {
    const token = getToken();
    if (!token) throw new Error("Kein Token. Bitte als BARBER einloggen.");

    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Fehler (${res.status})`);
    return data;
  }

  async function loadRecurring() {
    setLoadingRecurring(true);
    clearAlerts();
    try {
      const data = await apiFetch(`/admin/recurring-blocks`, { method: "GET" });
      setRecurring(Array.isArray(data?.blocks) ? data.blocks : []);
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
      setRecurring([]);
    } finally {
      setLoadingRecurring(false);
    }
  }

  async function loadDayBlocks(d: string) {
    setLoadingDay(true);
    clearAlerts();
    try {
      const data = await apiFetch(`/admin/time-blocks?date=${encodeURIComponent(d)}`, { method: "GET" });
      setOneDayBlocks(Array.isArray(data?.blocks) ? data.blocks : []);
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
      setOneDayBlocks([]);
    } finally {
      setLoadingDay(false);
    }
  }

  async function createRecurring() {
    clearAlerts();

    const s = hhmmToMin(newStart);
    const e = hhmmToMin(newEnd);

    if (s == null || e == null) return setError("Bitte Start und Ende im Format HH:MM eingeben.");
    if (e <= s) return setError("Ende muss nach Start liegen.");

    setSavingRecurring(true);
    try {
      const data = await apiFetch(`/admin/recurring-blocks`, {
        method: "POST",
        body: JSON.stringify({
          weekday: newWeekday,
          startMin: s,
          endMin: e,
          reason: newReason?.trim() ? newReason.trim() : null,
          enabled: true,
        }),
      });

      setRecurring((prev) =>
        [...prev, data.block].sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin)
      );
      setMessage("Wiederkehrende Pause gespeichert.");
      setNewReason("Pause");
      setNewStart(minToHHMM(s));
      setNewEnd(minToHHMM(e));
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    } finally {
      setSavingRecurring(false);
    }
  }

  async function toggleRecurring(id: number, enabled: boolean) {
    clearAlerts();
    try {
      await apiFetch(`/admin/recurring-blocks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      setRecurring((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
      setMessage(enabled ? "Pause aktiviert." : "Pause deaktiviert.");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    }
  }

  async function deleteRecurring(id: number) {
    clearAlerts();
    try {
      await apiFetch(`/admin/recurring-blocks/${id}`, { method: "DELETE" });
      setRecurring((prev) => prev.filter((r) => r.id !== id));
      if (editingRecurringId === id) setEditingRecurringId(null);
      setMessage("Wiederkehrende Pause gelöscht.");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    }
  }

  function startEditRecurring(r: RecurringBlock) {
    clearAlerts();
    setEditingRecurringId(r.id);
    setEditRecurringWeekday(r.weekday);
    setEditRecurringStart(minToHHMM(r.startMin));
    setEditRecurringEnd(minToHHMM(r.endMin));
    setEditRecurringReason(r.reason ?? "");
  }

  function cancelEditRecurring() {
    setEditingRecurringId(null);
    setUpdatingRecurringId(null);
  }

  async function saveRecurringEdit(id: number) {
    clearAlerts();

    const s = hhmmToMin(editRecurringStart);
    const e = hhmmToMin(editRecurringEnd);

    if (s == null || e == null) return setError("Bitte gültige Zeiten im Format HH:MM eingeben.");
    if (e <= s) return setError("Ende muss nach Start liegen.");

    setUpdatingRecurringId(id);
    try {
      const data = await apiFetch(`/admin/recurring-blocks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          weekday: editRecurringWeekday,
          startMin: s,
          endMin: e,
          reason: editRecurringReason?.trim() ? editRecurringReason.trim() : null,
        }),
      });

      const updated = data?.block;
      if (updated) {
        setRecurring((prev) =>
          prev
            .map((r) => (r.id === id ? updated : r))
            .sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin)
        );
      } else {
        setRecurring((prev) =>
          prev
            .map((r) =>
              r.id === id
                ? {
                    ...r,
                    weekday: editRecurringWeekday,
                    startMin: s,
                    endMin: e,
                    reason: editRecurringReason?.trim() ? editRecurringReason.trim() : null,
                  }
                : r
            )
            .sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin)
        );
      }

      setEditingRecurringId(null);
      setEditRecurringStart(minToHHMM(s));
      setEditRecurringEnd(minToHHMM(e));
      setMessage("Wiederkehrende Pause aktualisiert.");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    } finally {
      setUpdatingRecurringId(null);
    }
  }

  async function createDayBlock() {
    clearAlerts();

    const s = hhmmToMin(dayStart);
    const e = hhmmToMin(dayEnd);

    if (s == null || e == null) return setError("Bitte Start und Ende im Format HH:MM eingeben.");
    if (e <= s) return setError("Ende muss nach Start liegen.");

    setSavingDayBlock(true);
    try {
      await apiFetch(`/admin/time-blocks`, {
        method: "POST",
        body: JSON.stringify({
          date: selectedDate,
          startMin: s,
          endMin: e,
          reason: dayReason?.trim() ? dayReason.trim() : null,
        }),
      });

      setMessage("Blockzeit gespeichert.");
      setDayReason("Privat");
      setDayStart(minToHHMM(s));
      setDayEnd(minToHHMM(e));
      await loadDayBlocks(selectedDate);
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    } finally {
      setSavingDayBlock(false);
    }
  }

  async function deleteDayBlock(id: number) {
    clearAlerts();
    try {
      await apiFetch(`/admin/time-blocks/${id}`, { method: "DELETE" });
      setOneDayBlocks((prev) => prev.filter((b) => b.id !== id));
      if (editingDayBlockId === id) setEditingDayBlockId(null);
      setMessage("Blockzeit gelöscht.");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    }
  }

  function startEditDayBlock(b: TimeBlock) {
    clearAlerts();
    setEditingDayBlockId(b.id);
    setEditDayStart(minToHHMM(b.startMin));
    setEditDayEnd(minToHHMM(b.endMin));
    setEditDayReason(b.reason ?? "");
  }

  function cancelEditDayBlock() {
    setEditingDayBlockId(null);
    setUpdatingDayBlockId(null);
  }

  async function saveDayBlockEdit(id: number) {
    clearAlerts();

    const s = hhmmToMin(editDayStart);
    const e = hhmmToMin(editDayEnd);

    if (s == null || e == null) return setError("Bitte gültige Zeiten im Format HH:MM eingeben.");
    if (e <= s) return setError("Ende muss nach Start liegen.");

    setUpdatingDayBlockId(id);
    try {
      const data = await apiFetch(`/admin/time-blocks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          date: selectedDate,
          startMin: s,
          endMin: e,
          reason: editDayReason?.trim() ? editDayReason.trim() : null,
        }),
      });

      const updated = data?.block;
      if (updated) {
        setOneDayBlocks((prev) => prev.map((b) => (b.id === id ? updated : b)));
      } else {
        setOneDayBlocks((prev) =>
          prev.map((b) =>
            b.id === id
              ? {
                  ...b,
                  date: selectedDate,
                  startMin: s,
                  endMin: e,
                  reason: editDayReason?.trim() ? editDayReason.trim() : null,
                }
              : b
          )
        );
      }

      setEditingDayBlockId(null);
      setEditDayStart(minToHHMM(s));
      setEditDayEnd(minToHHMM(e));
      setMessage("Blockzeit aktualisiert.");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    } finally {
      setUpdatingDayBlockId(null);
    }
  }

  useEffect(() => {
    loadRecurring();
    loadDayBlocks(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const activeRecurringCount = recurring.filter((r) => r.enabled).length;
  const inactiveRecurringCount = recurring.filter((r) => !r.enabled).length;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    height: 52,
    borderRadius: 14,
    border: "1px solid #dedede",
    background: "#fff",
    padding: "0 16px",
    fontSize: 16,
    color: "#111",
    outline: "none",
    boxSizing: "border-box",
    display: "block",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 800,
    color: "#555",
    marginBottom: 8,
  };

  const cardStyle: React.CSSProperties = {
    border: "1px solid #e9e9e9",
    borderRadius: 24,
    background: "#fff",
    padding: 18,
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
    overflow: "hidden",
  };

  const primaryButton: React.CSSProperties = {
    height: 52,
    borderRadius: 14,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 900,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
  };

  const secondaryButton: React.CSSProperties = {
    height: 40,
    borderRadius: 12,
    border: "1px solid #d8d8d8",
    background: "#fff",
    color: "#111",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    padding: "0 14px",
  };

  const dangerButton: React.CSSProperties = {
    ...secondaryButton,
    border: "1px solid #e3c7c7",
  };

  const formGridStyle: React.CSSProperties = {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
    alignItems: "end",
  };

  const twoColEditGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  };

  return (
    <div style={{ padding: 16, maxWidth: 1120, margin: "0 auto", overflowX: "hidden" }}>
      <style jsx>{`
        @media (max-width: 720px) {
          .twoColEdit {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.05, letterSpacing: -0.8 }}>
          Pausen & Blockzeiten
        </h1>
        <div style={{ marginTop: 8, color: "#666", fontSize: 17, lineHeight: 1.45 }}>
          Lege fest, wann Kunden keine Termine buchen können.
        </div>
      </div>

      {(message || error) && (
        <div
          style={{
            marginBottom: 16,
            padding: "14px 16px",
            borderRadius: 16,
            border: error ? "1px solid #f1c7c7" : "1px solid #cfe7d1",
            background: error ? "#fff5f5" : "#f4fbf4",
            color: error ? "#b42318" : "#17663a",
            fontWeight: 700,
          }}
        >
          {error || message}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={cardStyle}>
          <div style={{ fontSize: 13, color: "#666", fontWeight: 700 }}>Aktive Pausen</div>
          <div style={{ marginTop: 8, fontSize: 30, fontWeight: 900 }}>{activeRecurringCount}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, color: "#666", fontWeight: 700 }}>Inaktive Pausen</div>
          <div style={{ marginTop: 8, fontSize: 30, fontWeight: 900 }}>{inactiveRecurringCount}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, color: "#666", fontWeight: 700 }}>Blockzeiten am Datum</div>
          <div style={{ marginTop: 8, fontSize: 30, fontWeight: 900 }}>{oneDayBlocks.length}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <div style={cardStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.1 }}>Wiederkehrende Pausen</h2>
            <div style={{ marginTop: 6, color: "#666", fontSize: 15 }}>
              Ideal für Mittagspause oder feste Sperrzeiten pro Woche.
            </div>
          </div>

          <div style={formGridStyle}>
            <div style={{ minWidth: 0 }}>
              <div style={labelStyle}>Wochentag</div>
              <select value={newWeekday} onChange={(e) => setNewWeekday(Number(e.target.value))} style={inputStyle}>
                {WEEKDAYS.map((d) => (
                  <option key={d.k} value={d.k}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="twoColEdit" style={twoColEditGridStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={labelStyle}>Start</div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="HH:MM"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  onBlur={() => setNewStart(normalizeHHMM(newStart))}
                  style={inputStyle}
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={labelStyle}>Ende</div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="HH:MM"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  onBlur={() => setNewEnd(normalizeHHMM(newEnd))}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
              <div style={labelStyle}>Grund</div>
              <input
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="z. B. Mittagspause"
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
              <button
                onClick={createRecurring}
                disabled={savingRecurring}
                style={{ ...primaryButton, opacity: savingRecurring ? 0.7 : 1 }}
              >
                {savingRecurring ? "Speichert..." : "Pause hinzufügen"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            {loadingRecurring ? (
              <div style={{ color: "#666", padding: "8px 0" }}>Lade wiederkehrende Pausen...</div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 12,
                }}
              >
                {WEEKDAYS.map((d) => {
                  const list = recurringByDay.get(d.k) ?? [];

                  return (
                    <div
                      key={d.k}
                      style={{
                        border: "1px solid #ededed",
                        borderRadius: 20,
                        padding: 14,
                        background: "#fcfcfc",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <div style={{ fontSize: 17, fontWeight: 900 }}>{d.name}</div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#666",
                            background: "#f0f0f0",
                            borderRadius: 999,
                            padding: "5px 10px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {list.length} {list.length === 1 ? "Eintrag" : "Einträge"}
                        </div>
                      </div>

                      {list.length === 0 ? (
                        <div
                          style={{
                            marginTop: 12,
                            borderRadius: 14,
                            padding: 14,
                            background: "#fff",
                            border: "1px dashed #e3e3e3",
                            color: "#777",
                            fontSize: 14,
                          }}
                        >
                          Keine Pausen hinterlegt.
                        </div>
                      ) : (
                        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                          {list.map((r) => {
                            const isEditing = editingRecurringId === r.id;
                            const isSaving = updatingRecurringId === r.id;

                            return (
                              <div
                                key={r.id}
                                style={{
                                  border: "1px solid #e7e7e7",
                                  borderRadius: 16,
                                  background: "#fff",
                                  padding: 12,
                                }}
                              >
                                {!isEditing ? (
                                  <>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 900, fontSize: 16 }}>
                                          {minToHHMM(r.startMin)} – {minToHHMM(r.endMin)}
                                        </div>

                                        <div style={{ marginTop: 4, color: "#666", fontSize: 14, wordBreak: "break-word" }}>
                                          {r.reason?.trim() || "Ohne Bezeichnung"}
                                        </div>

                                        <div style={{ marginTop: 8 }}>
                                          <span
                                            style={{
                                              display: "inline-block",
                                              padding: "5px 9px",
                                              borderRadius: 999,
                                              fontSize: 12,
                                              fontWeight: 900,
                                              background: r.enabled ? "#eef8f0" : "#f3f3f3",
                                              color: r.enabled ? "#17663a" : "#666",
                                              border: r.enabled ? "1px solid #cfe7d1" : "1px solid #e2e2e2",
                                            }}
                                          >
                                            {r.enabled ? "Aktiv" : "Inaktiv"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                                      <button onClick={() => startEditRecurring(r)} style={secondaryButton}>
                                        Bearbeiten
                                      </button>
                                      <button onClick={() => toggleRecurring(r.id, !r.enabled)} style={secondaryButton}>
                                        {r.enabled ? "Deaktivieren" : "Aktivieren"}
                                      </button>
                                      <button onClick={() => deleteRecurring(r.id)} style={dangerButton}>
                                        Löschen
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div style={{ display: "grid", gap: 10 }}>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={labelStyle}>Wochentag</div>
                                        <select
                                          value={editRecurringWeekday}
                                          onChange={(e) => setEditRecurringWeekday(Number(e.target.value))}
                                          style={inputStyle}
                                        >
                                          {WEEKDAYS.map((day) => (
                                            <option key={day.k} value={day.k}>
                                              {day.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="twoColEdit" style={twoColEditGridStyle}>
                                        <div style={{ minWidth: 0 }}>
                                          <div style={labelStyle}>Start</div>
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="HH:MM"
                                            value={editRecurringStart}
                                            onChange={(e) => setEditRecurringStart(e.target.value)}
                                            onBlur={() => setEditRecurringStart(normalizeHHMM(editRecurringStart))}
                                            style={inputStyle}
                                          />
                                        </div>

                                        <div style={{ minWidth: 0 }}>
                                          <div style={labelStyle}>Ende</div>
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="HH:MM"
                                            value={editRecurringEnd}
                                            onChange={(e) => setEditRecurringEnd(e.target.value)}
                                            onBlur={() => setEditRecurringEnd(normalizeHHMM(editRecurringEnd))}
                                            style={inputStyle}
                                          />
                                        </div>
                                      </div>

                                      <div style={{ minWidth: 0 }}>
                                        <div style={labelStyle}>Grund</div>
                                        <input
                                          value={editRecurringReason}
                                          onChange={(e) => setEditRecurringReason(e.target.value)}
                                          placeholder="Grund eingeben"
                                          style={inputStyle}
                                        />
                                      </div>
                                    </div>

                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                                      <button onClick={() => saveRecurringEdit(r.id)} disabled={isSaving} style={secondaryButton}>
                                        {isSaving ? "Speichert..." : "Speichern"}
                                      </button>
                                      <button onClick={cancelEditRecurring} style={secondaryButton}>
                                        Abbrechen
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={cardStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.1 }}>Blockzeiten für ein Datum</h2>
            <div style={{ marginTop: 6, color: "#666", fontSize: 15 }}>
              Für Urlaub, Arzttermine oder einmalige private Sperrzeiten.
            </div>
          </div>

          <div style={formGridStyle}>
            <div style={{ minWidth: 0 }}>
              <div style={labelStyle}>Datum</div>
              <input
  type="text"
  inputMode="numeric"
  placeholder="TT.MM.JJJJ"
  value={selectedDateInput}
  onChange={(e) => setSelectedDateInput(e.target.value)}
  onBlur={() => applySelectedDate(selectedDateInput)}
  style={inputStyle}
/>
            </div>

            <div className="twoColEdit" style={twoColEditGridStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={labelStyle}>Start</div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="HH:MM"
                  value={dayStart}
                  onChange={(e) => setDayStart(e.target.value)}
                  onBlur={() => setDayStart(normalizeHHMM(dayStart))}
                  style={inputStyle}
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={labelStyle}>Ende</div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="HH:MM"
                  value={dayEnd}
                  onChange={(e) => setDayEnd(e.target.value)}
                  onBlur={() => setDayEnd(normalizeHHMM(dayEnd))}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
              <div style={labelStyle}>Grund</div>
              <input
                value={dayReason}
                onChange={(e) => setDayReason(e.target.value)}
                placeholder="z. B. Privat, Arzt, Urlaub"
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
              <button
                onClick={createDayBlock}
                disabled={savingDayBlock}
                style={{ ...primaryButton, opacity: savingDayBlock ? 0.7 : 1 }}
              >
                {savingDayBlock ? "Speichert..." : "Blockzeit speichern"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            {loadingDay ? (
              <div style={{ color: "#666" }}>Lade Blockzeiten...</div>
            ) : oneDayBlocks.length === 0 ? (
              <div
                style={{
                  border: "1px dashed #e2e2e2",
                  borderRadius: 16,
                  padding: 16,
                  color: "#777",
                  background: "#fcfcfc",
                }}
              >
                Für dieses Datum sind keine Blockzeiten hinterlegt.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {oneDayBlocks
                  .slice()
                  .sort((a, b) => a.startMin - b.startMin)
                  .map((b) => {
                    const isEditing = editingDayBlockId === b.id;
                    const isSaving = updatingDayBlockId === b.id;

                    return (
                      <div
                        key={b.id}
                        style={{
                          border: "1px solid #e8e8e8",
                          borderRadius: 18,
                          background: "#fff",
                          padding: 14,
                        }}
                      >
                        {!isEditing ? (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ minWidth: 220, flex: 1 }}>
                              <div style={{ fontWeight: 900, fontSize: 16 }}>
                                {minToHHMM(b.startMin)} – {minToHHMM(b.endMin)}
                              </div>
                              <div style={{ marginTop: 5, color: "#666", fontSize: 14 }}>
                                {b.reason?.trim() || "Ohne Bezeichnung"}
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button onClick={() => startEditDayBlock(b)} style={secondaryButton}>
                                Bearbeiten
                              </button>
                              <button onClick={() => deleteDayBlock(b.id)} style={dangerButton}>
                                Löschen
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "grid", gap: 10 }}>
                              <div className="twoColEdit" style={twoColEditGridStyle}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={labelStyle}>Start</div>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="HH:MM"
                                    value={editDayStart}
                                    onChange={(e) => setEditDayStart(e.target.value)}
                                    onBlur={() => setEditDayStart(normalizeHHMM(editDayStart))}
                                    style={inputStyle}
                                  />
                                </div>

                                <div style={{ minWidth: 0 }}>
                                  <div style={labelStyle}>Ende</div>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="HH:MM"
                                    value={editDayEnd}
                                    onChange={(e) => setEditDayEnd(e.target.value)}
                                    onBlur={() => setEditDayEnd(normalizeHHMM(editDayEnd))}
                                    style={inputStyle}
                                  />
                                </div>
                              </div>

                              <div style={{ minWidth: 0 }}>
                                <div style={labelStyle}>Grund</div>
                                <input
                                  value={editDayReason}
                                  onChange={(e) => setEditDayReason(e.target.value)}
                                  placeholder="Grund eingeben"
                                  style={inputStyle}
                                />
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                              <button onClick={() => saveDayBlockEdit(b.id)} disabled={isSaving} style={secondaryButton}>
                                {isSaving ? "Speichert..." : "Speichern"}
                              </button>
                              <button onClick={cancelEditDayBlock} style={secondaryButton}>
                                Abbrechen
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: "14px 16px",
          borderRadius: 16,
          background: "#fafafa",
          border: "1px solid #ececec",
          color: "#666",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <b>Hinweis:</b> Wiederkehrende Pausen gelten jede Woche am ausgewählten Wochentag.
        Einmalige Blockzeiten gelten nur für das ausgewählte Datum.
      </div>
    </div>
  );
}