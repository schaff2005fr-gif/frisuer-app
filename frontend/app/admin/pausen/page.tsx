"use client";

import { useEffect, useMemo, useState } from "react";
import AdminNav from "../AdminNav";

const API_BASE = "http://localhost:3001";

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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minToHHMM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function hhmmToMin(hhmm: string) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
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

  const [loadingRecurring, setLoadingRecurring] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Create recurring
  const [newWeekday, setNewWeekday] = useState(1);
  const [newStart, setNewStart] = useState("13:00");
  const [newEnd, setNewEnd] = useState("13:30");
  const [newReason, setNewReason] = useState("Pause");

  // Create one-time
  const [dayStart, setDayStart] = useState("12:00");
  const [dayEnd, setDayEnd] = useState("12:30");
  const [dayReason, setDayReason] = useState("Privat");

  function getToken() {
    return localStorage.getItem("token") || "";
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
    setError("");
    setMessage("");
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
    setError("");
    setMessage("");
    try {
      const data = await apiFetch(`/admin/time-blocks?date=${encodeURIComponent(d)}`, { method: "GET" });
      const list = Array.isArray(data?.blocks) ? data.blocks : [];
      setOneDayBlocks(list);
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
      setOneDayBlocks([]);
    } finally {
      setLoadingDay(false);
    }
  }

  async function createRecurring() {
    setError("");
    setMessage("");

    const s = hhmmToMin(newStart);
    const e = hhmmToMin(newEnd);
    if (s == null || e == null) return setError("Bitte Start/Ende im Format HH:MM eingeben.");
    if (e <= s) return setError("Ende muss nach Start liegen.");

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

      setMessage("✅ Wiederkehrende Pause gespeichert");
      setRecurring((prev) => [...prev, data.block].sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin));
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    }
  }

  async function toggleRecurring(id: number, enabled: boolean) {
    setError("");
    setMessage("");
    try {
      await apiFetch(`/admin/recurring-blocks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      setRecurring((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
      setMessage("✅ Aktualisiert");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    }
  }

  async function deleteRecurring(id: number) {
    setError("");
    setMessage("");
    try {
      await apiFetch(`/admin/recurring-blocks/${id}`, { method: "DELETE" });
      setRecurring((prev) => prev.filter((r) => r.id !== id));
      setMessage("✅ Gelöscht");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    }
  }

  async function createDayBlock() {
    setError("");
    setMessage("");

    const s = hhmmToMin(dayStart);
    const e = hhmmToMin(dayEnd);
    if (s == null || e == null) return setError("Bitte Start/Ende im Format HH:MM eingeben.");
    if (e <= s) return setError("Ende muss nach Start liegen.");

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

      setMessage("✅ Blockzeit gespeichert");
      await loadDayBlocks(selectedDate);
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    }
  }

  async function deleteDayBlock(id: number) {
    setError("");
    setMessage("");
    try {
      await apiFetch(`/admin/time-blocks/${id}`, { method: "DELETE" });
      setOneDayBlocks((prev) => prev.filter((b) => b.id !== id));
      setMessage("✅ Gelöscht");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
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

  return (
    <div style={{ padding: 20, maxWidth: 1020, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <AdminNav />
      </div>

      <h1 style={{ margin: 0 }}>Pausen & Blockzeiten</h1>
      <div style={{ marginTop: 6, color: "#666" }}>
        Steuert, wann Kunden <b>keine</b> Termine buchen können.
      </div>

      {message && (
        <div style={{ marginTop: 12, color: "green" }}>
          <b>{message}</b>
        </div>
      )}
      {error && (
        <div style={{ marginTop: 12, color: "crimson" }}>
          <b>{error}</b>
        </div>
      )}

      {/* Recurring */}
      <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Wiederkehrende Pausen (jede Woche)</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Wochentag</div>
            <select
              value={newWeekday}
              onChange={(e) => setNewWeekday(Number(e.target.value))}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            >
              {WEEKDAYS.map((d) => (
                <option key={d.k} value={d.k}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Start</div>
            <input
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              placeholder="HH:MM"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", width: 120 }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Ende</div>
            <input
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              placeholder="HH:MM"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", width: 120 }}
            />
          </div>

          <div style={{ flex: "1 1 240px" }}>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Grund (optional)</div>
            <input
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="z.B. Pause"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", width: "100%" }}
            />
          </div>

          <button
            onClick={createRecurring}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Hinzufügen
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          {loadingRecurring ? (
            <div style={{ color: "#666" }}>Lade...</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {WEEKDAYS.map((d) => {
                const list = recurringByDay.get(d.k) ?? [];
                return (
                  <div key={d.k} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 900 }}>{d.name}</div>

                    {list.length === 0 ? (
                      <div style={{ marginTop: 6, color: "#666" }}>Keine Pausen</div>
                    ) : (
                      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                        {list.map((r) => (
                          <div
                            key={r.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              alignItems: "center",
                              flexWrap: "wrap",
                              border: "1px solid #eee",
                              borderRadius: 12,
                              padding: 10,
                            }}
                          >
                            <div>
                              <b>
                                {minToHHMM(r.startMin)} – {minToHHMM(r.endMin)}
                              </b>
                              <div style={{ fontSize: 12, color: "#666" }}>{r.reason ?? "—"}</div>
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => toggleRecurring(r.id, !r.enabled)}
                                style={{
                                  padding: "8px 10px",
                                  borderRadius: 10,
                                  border: r.enabled ? "1px solid #111" : "1px solid #ddd",
                                  background: r.enabled ? "#111" : "#fff",
                                  color: r.enabled ? "#fff" : "#111",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                {r.enabled ? "Aktiv" : "Inaktiv"}
                              </button>

                              <button
                                onClick={() => deleteRecurring(r.id)}
                                style={{
                                  padding: "8px 10px",
                                  borderRadius: 10,
                                  border: "1px solid #ddd",
                                  background: "#fff",
                                  color: "#111",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                Löschen
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* One-time */}
      <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Blockzeiten (einmalig für ein Datum)</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Datum</div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const d = e.target.value;
                setSelectedDate(d);
                loadDayBlocks(d);
              }}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Start</div>
            <input
              value={dayStart}
              onChange={(e) => setDayStart(e.target.value)}
              placeholder="HH:MM"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", width: 120 }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Ende</div>
            <input
              value={dayEnd}
              onChange={(e) => setDayEnd(e.target.value)}
              placeholder="HH:MM"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", width: 120 }}
            />
          </div>

          <div style={{ flex: "1 1 240px" }}>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Grund (optional)</div>
            <input
              value={dayReason}
              onChange={(e) => setDayReason(e.target.value)}
              placeholder="z.B. Arzt / Privat"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", width: "100%" }}
            />
          </div>

          <button
            onClick={createDayBlock}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Blocken
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          {loadingDay ? (
            <div style={{ color: "#666" }}>Lade...</div>
          ) : oneDayBlocks.length === 0 ? (
            <div style={{ color: "#666" }}>Keine Blockzeiten für dieses Datum.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {oneDayBlocks
                .slice()
                .sort((a, b) => a.startMin - b.startMin)
                .map((b) => (
                  <div
                    key={b.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <b>
                        {minToHHMM(b.startMin)} – {minToHHMM(b.endMin)}
                      </b>
                      <div style={{ fontSize: 12, color: "#666" }}>{b.reason ?? "—"}</div>
                    </div>

                    <button
                      onClick={() => deleteDayBlock(b.id)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "#fff",
                        color: "#111",
                        fontWeight: 900,
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Löschen
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, color: "#666", fontSize: 12 }}>
        Tipp: Wiederkehrende Pausen sind z.B. Mittagspause. Blockzeiten sind für Urlaub/Arzt/Termine.
      </div>
    </div>
  );
}
