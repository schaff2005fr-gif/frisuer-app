"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "./AdminNav";

const API_BASE = "http://localhost:3001";

type BookingStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

type ApiBooking = {
  id: number;
  status: BookingStatus;
  customer: { id: number; name: string; phone: string } | null;
  service: { key: string; name: string; durationMin: number } | null;
  exactTime: number | null; // minutes
  timeHHMM: string | null; // "HH:MM - HH:MM"
  note: string | null;

  windowStart?: number | null;
  windowEnd?: number | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
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
  if (s === "NO_SHOW") return "No-Show";
  return "Storniert";
}

function statusTone(s: BookingStatus) {
  if (s === "CONFIRMED") return { border: "#111", text: "#111", bg: "#fff" };
  if (s === "COMPLETED") return { border: "#0a7a2f", text: "#0a7a2f", bg: "#fff" };
  if (s === "NO_SHOW") return { border: "#b36b00", text: "#b36b00", bg: "#fff" };
  return { border: "#b00020", text: "#b00020", bg: "#fff" };
}

function PrimaryButtonStyle(disabled?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.75 : 1,
  };
}

function GhostButtonStyle(active?: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: active ? "1px solid #111" : "1px solid #ddd",
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#111",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  };
}

export default function AdminPage() {
  const router = useRouter();

  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const [filter, setFilter] = useState<"ALL" | BookingStatus>("ALL");
  const [search, setSearch] = useState("");

  const [updatingId, setUpdatingId] = useState<number | null>(null);

  function getToken() {
    return localStorage.getItem("token") || "";
  }

  async function loadDayBookings(d: string) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const token = getToken();
      if (!token) {
        setError("Kein Token gefunden. Bitte als BARBER einloggen.");
        setBookings([]);
        return;
      }

      const res = await fetch(`${API_BASE}/admin/bookings?date=${encodeURIComponent(d)}`, {
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
        setError(data?.error || `Fehler (Status ${res.status})`);
        setBookings([]);
        return;
      }

      const list: ApiBooking[] = Array.isArray(data?.bookings) ? data.bookings : [];
      setBookings(list);
      setMessage(`✅ ${data?.count ?? list.length ?? 0} Termine geladen`);
    } catch (e) {
      console.error(e);
      setError("Fehler beim Laden.");
      setBookings([]);
    } finally {
      setLoading(false);
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

      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
      setMessage("✅ Status aktualisiert");
    } catch (e) {
      console.error(e);
      setError("Fehler beim Aktualisieren.");
    } finally {
      setUpdatingId(null);
    }
  }

  const dayWindow = useMemo(() => {
    const start = (bookings.find((b) => Number.isFinite(b.windowStart as any))?.windowStart ?? 12 * 60) as number;
    const end = (bookings.find((b) => Number.isFinite(b.windowEnd as any))?.windowEnd ?? 17 * 60) as number;
    return { start, end };
  }, [bookings]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
    const completed = bookings.filter((b) => b.status === "COMPLETED").length;
    const noShow = bookings.filter((b) => b.status === "NO_SHOW").length;
    const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;

    const bookedMin = bookings
      .filter((b) => b.status !== "CANCELLED")
      .reduce((sum, b) => sum + (b.service?.durationMin ?? 0), 0);

    const dayTotalMin = Math.max(0, dayWindow.end - dayWindow.start);
    const freeMin = Math.max(0, dayTotalMin - bookedMin);
    const occ = dayTotalMin > 0 ? Math.round((bookedMin / dayTotalMin) * 100) : 0;

    return { total, confirmed, completed, noShow, cancelled, dayTotalMin, bookedMin, freeMin, occ };
  }, [bookings, dayWindow.start, dayWindow.end]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();

    return bookings.filter((b) => {
      if (filter !== "ALL" && b.status !== filter) return false;
      if (!q) return true;

      const name = (b.customer?.name ?? "").toLowerCase();
      const phone = (b.customer?.phone ?? "").toLowerCase();
      const service = (b.service?.name ?? b.service?.key ?? "").toLowerCase();
      const note = (b.note ?? "").toLowerCase();
      const idStr = String(b.id);

      return name.includes(q) || phone.includes(q) || service.includes(q) || note.includes(q) || idStr.includes(q);
    });
  }, [bookings, filter, search]);

  const timeline = useMemo(() => {
    const items = filteredBookings
      .map((b) => {
        const se = parseStartEndFromTimeHHMM(b.timeHHMM);
        return { booking: b, startMin: se?.startMin ?? null, endMin: se?.endMin ?? null };
      })
      .filter((x) => x.startMin !== null && x.endMin !== null)
      .sort((a, b) => a.startMin! - b.startMin!);

    const out: Array<
      | { type: "booking"; startMin: number; endMin: number; b: ApiBooking }
      | { type: "free"; startMin: number; endMin: number }
    > = [];

    let cursor = dayWindow.start;

    for (const it of items) {
      const s = it.startMin!;
      const e = it.endMin!;

      if (s > cursor) out.push({ type: "free", startMin: cursor, endMin: s });
      out.push({ type: "booking", startMin: s, endMin: e, b: it.booking });
      cursor = Math.max(cursor, e);
    }

    if (cursor < dayWindow.end) out.push({ type: "free", startMin: cursor, endMin: dayWindow.end });

    return out;
  }, [filteredBookings, dayWindow.start, dayWindow.end]);

  // ✅ GUARD: Nur BARBER darf hier rein
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

    loadDayBookings(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 20, maxWidth: 1020, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <div style={{ marginTop: 6, color: "#666" }}>Tagesansicht · {date}</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <AdminNav />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
          />

          <button onClick={() => loadDayBookings(date)} disabled={loading || !date} style={PrimaryButtonStyle(loading || !date)}>
            {loading ? "Lade..." : "Neu laden"}
          </button>
        </div>
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

      {/* Stats */}
      <div
        style={{
          marginTop: 16,
          border: "1px solid #eee",
          borderRadius: 14,
          padding: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          background: "#fff",
        }}
      >
        <StatCard title="Termine" value={String(stats.total)} sub={`${stats.confirmed} bestätigt`} />
        <StatCard title="Erledigt" value={String(stats.completed)} sub={`${stats.noShow} No-Show`} />
        <StatCard
          title="Storniert"
          value={String(stats.cancelled)}
          sub={`Arbeitszeit: ${minToHHMM(dayWindow.start)}–${minToHHMM(dayWindow.end)}`}
        />
        <StatCard title="Auslastung" value={`${stats.occ}%`} sub={`${stats.bookedMin} min belegt · ${stats.freeMin} min frei`} />
      </div>

      {/* Controls */}
      <div
        style={{
          marginTop: 14,
          border: "1px solid #eee",
          borderRadius: 14,
          padding: 14,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setFilter("ALL")} style={GhostButtonStyle(filter === "ALL")}>
            Alle
          </button>
          <button onClick={() => setFilter("CONFIRMED")} style={GhostButtonStyle(filter === "CONFIRMED")}>
            Bestätigt
          </button>
          <button onClick={() => setFilter("COMPLETED")} style={GhostButtonStyle(filter === "COMPLETED")}>
            Erledigt
          </button>
          <button onClick={() => setFilter("NO_SHOW")} style={GhostButtonStyle(filter === "NO_SHOW")}>
            No-Show
          </button>
          <button onClick={() => setFilter("CANCELLED")} style={GhostButtonStyle(filter === "CANCELLED")}>
            Storniert
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche: Name, Tel, Service, Notiz, #ID"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
            width: 320,
            maxWidth: "100%",
          }}
        />
      </div>

      {/* Timeline */}
      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ color: "#666" }}>Lade Termine...</div>
        ) : timeline.length === 0 ? (
          <div style={{ color: "#666" }}>
            <i>Keine Termine / keine Daten.</i>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {timeline.map((t, idx) => {
              if (t.type === "free") {
                if (t.endMin - t.startMin < 5) return null;

                return (
                  <div
                    key={`free-${idx}`}
                    style={{
                      border: "1px dashed #ccc",
                      borderRadius: 14,
                      padding: 12,
                      background: "#fafafa",
                      color: "#555",
                    }}
                  >
                    <b>Frei</b> — {minToHHMM(t.startMin)} – {minToHHMM(t.endMin)}
                  </div>
                );
              }

              const b = t.b;
              const tone = statusTone(b.status);

              return (
                <div
                  key={b.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 14,
                    padding: 12,
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 900 }}>
                        {minToHHMM(t.startMin)} – {minToHHMM(t.endMin)}
                      </div>

                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: `1px solid ${tone.border}`,
                          color: tone.text,
                          background: tone.bg,
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {statusLabel(b.status)}
                      </span>

                      <span style={{ fontSize: 12, color: "#777" }}>#{b.id}</span>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <StatusButton label="Bestätigt" active={b.status === "CONFIRMED"} disabled={updatingId === b.id} onClick={() => updateStatus(b.id, "CONFIRMED")} />
                      <StatusButton label="Erledigt" active={b.status === "COMPLETED"} disabled={updatingId === b.id} onClick={() => updateStatus(b.id, "COMPLETED")} />
                      <StatusButton label="No-Show" active={b.status === "NO_SHOW"} disabled={updatingId === b.id} onClick={() => updateStatus(b.id, "NO_SHOW")} />
                      <StatusButton label="Storniert" active={b.status === "CANCELLED"} disabled={updatingId === b.id} onClick={() => updateStatus(b.id, "CANCELLED")} />
                    </div>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                    <div>
                      Kunde: <b>{b.customer?.name || "—"}</b>
                      {b.customer?.phone ? ` · ${b.customer.phone}` : ""}
                    </div>

                    <div>
                      Service: <b>{b.service?.name || b.service?.key || "—"}</b> {b.service?.durationMin ? `(${b.service.durationMin} min)` : ""}
                    </div>

                    {b.note ? (
                      <div>
                        Notiz: <i>{b.note}</i>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: 18, fontSize: 12, color: "#666" }}>
        Hinweis: <b>CANCELLED</b> blockiert keine Zeit (Slots werden wieder frei).
      </div>
    </div>
  );
}

function StatCard(props: { title: string; value: string; sub: string }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fff" }}>
      <div style={{ color: "#666", fontSize: 12, fontWeight: 900 }}>{props.title}</div>
      <div style={{ marginTop: 6, fontSize: 24, fontWeight: 1000 }}>{props.value}</div>
      <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>{props.sub}</div>
    </div>
  );
}

function StatusButton(props: { label: string; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      disabled={props.disabled}
      onClick={props.onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
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
