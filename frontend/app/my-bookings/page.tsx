"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:3001";
const GET_MY_BOOKINGS_URL = `${API_BASE}/my-bookings`;
const DELETE_BOOKING_URL = (id: number) => `${API_BASE}/bookings/${id}`;

type Booking = any;

function getToken() {
  return localStorage.getItem("token") || "";
}

function statusLabel(s: string) {
  const v = String(s || "").toUpperCase();
  if (v === "CONFIRMED") return "Bestätigt";
  if (v === "COMPLETED") return "Erledigt";
  if (v === "CANCELLED") return "Storniert";
  if (v === "NO_SHOW") return "No-Show";
  return v || "—";
}

function statusStyles(s: string): React.CSSProperties {
  const v = String(s || "").toUpperCase();
  if (v === "CONFIRMED")
    return { border: "1px solid #111", background: "#111", color: "#fff" };
  if (v === "COMPLETED")
    return { border: "1px solid #b7ebc6", background: "#f0fff4", color: "#1f7a37" };
  if (v === "CANCELLED")
    return { border: "1px solid #f2c6c6", background: "#fff5f5", color: "#8a1c1c" };
  if (v === "NO_SHOW")
    return { border: "1px solid #f2c6c6", background: "#fff5f5", color: "#8a1c1c" };
  return { border: "1px solid #eee", background: "#fff", color: "#111" };
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadUnreadCount() {
    try {
      const token = getToken();
      if (!token) return setUnreadCount(0);

      const res = await fetch(`${API_BASE}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) setUnreadCount(Number(data?.count ?? 0));
    } catch {
      // ignore
    }
  }

  async function loadBookings() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const token = getToken();
      if (!token) {
        setError("Nicht eingeloggt (kein Token). Bitte erst einloggen.");
        setBookings([]);
        setUnreadCount(0);
        return;
      }

      const res = await fetch(GET_MY_BOOKINGS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Konnte Termine nicht laden.");
        setBookings([]);
        return;
      }

      const list = Array.isArray(data?.bookings) ? data.bookings : [];
      setBookings(list);
      await loadUnreadCount();
    } catch (e) {
      console.error(e);
      setError("Fehler beim Laden der Termine.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking(id: number) {
    setBusyId(id);
    setError("");
    setMessage("");

    try {
      const token = getToken();
      if (!token) {
        setError("Nicht eingeloggt (kein Token).");
        return;
      }

      const res = await fetch(DELETE_BOOKING_URL(id), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Stornieren fehlgeschlagen.");
        return;
      }

      setMessage("✅ Termin storniert.");
      await loadBookings();
    } catch (e) {
      console.error(e);
      setError("Fehler beim Stornieren.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  const upcoming = useMemo(
    () => bookings.filter((b: any) => String(b?.status).toUpperCase() !== "CANCELLED"),
    [bookings]
  );
  const cancelled = useMemo(
    () => bookings.filter((b: any) => String(b?.status).toUpperCase() === "CANCELLED"),
    [bookings]
  );

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      {/* Header + Topbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Meine Termine</h1>
          <div style={{ color: "#666", marginTop: 4 }}>
            Übersicht über deine Buchungen. Du kannst Termine auch stornieren.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <a
            href="/"
            style={{
              textDecoration: "none",
              border: "1px solid #eee",
              padding: "10px 12px",
              borderRadius: 12,
              color: "#111",
              fontWeight: 900,
              background: "#fff",
            }}
          >
            Startseite
          </a>

          <a
            href="/notifications"
            style={{
              textDecoration: "none",
              border: "1px solid #eee",
              padding: "10px 12px",
              borderRadius: 12,
              color: "#111",
              fontWeight: 900,
              background: "#fff",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            Nachrichten
            {unreadCount > 0 ? (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: "1px solid #111",
                }}
              >
                {unreadCount}
              </span>
            ) : null}
          </a>

          <button
            onClick={loadBookings}
            disabled={loading}
            style={{
              border: "1px solid #111",
              padding: "10px 12px",
              borderRadius: 12,
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Lädt..." : "Neu laden"}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            border: "1px solid #b7ebc6",
            background: "#f0fff4",
            borderRadius: 12,
            color: "#1f7a37",
          }}
        >
          <b>{message}</b>
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            border: "1px solid #f2c6c6",
            background: "#fff5f5",
            borderRadius: 12,
            color: "#8a1c1c",
          }}
        >
          <b>{error}</b>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ color: "#666" }}>Lade Termine…</div>
      ) : bookings.length === 0 ? (
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 14,
            background: "#fff",
            color: "#666",
          }}
        >
          <div style={{ fontWeight: 900 }}>Keine Termine gefunden</div>
          <div style={{ marginTop: 6 }}>Gehe zur Startseite und buche einen Termin.</div>
          <div style={{ marginTop: 12 }}>
            <a
              href="/"
              style={{
                textDecoration: "none",
                border: "1px solid #111",
                padding: "10px 12px",
                borderRadius: 12,
                background: "#111",
                color: "#fff",
                fontWeight: 900,
                display: "inline-block",
              }}
            >
              Jetzt buchen →
            </a>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {/* Upcoming */}
          <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>
              Aktive Termine ({upcoming.length})
            </div>

            {upcoming.length === 0 ? (
              <div style={{ color: "#666" }}>Keine aktiven Termine.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {upcoming.map((b: any) => {
                  const barberName = b?.barber?.name ?? "—";
                  const barberSlug = b?.barber?.slug ?? "";
                  const serviceName = b?.service?.name ?? "—";
                  const serviceDur = b?.service?.durationMin ?? b?.durationMin ?? "—";

                  return (
                    <div key={b.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900 }}>
                          {b.date}
                          {b.timeHHMM ? ` — ${b.timeHHMM}` : ""}
                        </div>

                        <span
                          style={{
                            ...statusStyles(b.status),
                            fontSize: 12,
                            fontWeight: 900,
                            padding: "4px 10px",
                            borderRadius: 999,
                          }}
                        >
                          {statusLabel(b.status)}
                        </span>
                      </div>

                      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                        <div>
                          Friseur:{" "}
                          {barberSlug ? (
                            <a href={`/b/${barberSlug}`} style={{ fontWeight: 900, color: "#111" }}>
                              {barberName}
                            </a>
                          ) : (
                            <b>{barberName}</b>
                          )}
                        </div>

                        <div>
                          Service: <b>{serviceName}</b> ({serviceDur} min)
                        </div>

                        {b.note ? (
                          <div style={{ color: "#333" }}>
                            Notiz: <i>{b.note}</i>
                          </div>
                        ) : null}
                      </div>

                      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          onClick={() => cancelBooking(b.id)}
                          disabled={busyId === b.id}
                          style={{
                            padding: "9px 10px",
                            border: "1px solid #ccc",
                            borderRadius: 12,
                            cursor: busyId === b.id ? "not-allowed" : "pointer",
                            fontWeight: 900,
                            background: "#fff",
                          }}
                        >
                          {busyId === b.id ? "Storniere..." : "Stornieren"}
                        </button>

                        {barberSlug ? (
                          <a
                            href={`/b/${barberSlug}`}
                            style={{
                              textDecoration: "none",
                              padding: "9px 10px",
                              borderRadius: 12,
                              border: "1px solid #111",
                              background: "#111",
                              color: "#fff",
                              fontWeight: 900,
                            }}
                          >
                            Neu buchen →
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cancelled */}
          {cancelled.length > 0 ? (
            <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>
                Stornierte Termine ({cancelled.length})
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {cancelled.map((b: any) => {
                  const barberName = b?.barber?.name ?? "—";
                  const barberSlug = b?.barber?.slug ?? "";

                  return (
                    <div
                      key={b.id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 12,
                        opacity: 0.85,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900 }}>
                          {b.date}
                          {b.timeHHMM ? ` — ${b.timeHHMM}` : ""}
                        </div>

                        <span
                          style={{
                            ...statusStyles(b.status),
                            fontSize: 12,
                            fontWeight: 900,
                            padding: "4px 10px",
                            borderRadius: 999,
                          }}
                        >
                          {statusLabel(b.status)}
                        </span>
                      </div>

                      <div style={{ marginTop: 8 }}>
                        Friseur:{" "}
                        {barberSlug ? (
                          <a href={`/b/${barberSlug}`} style={{ fontWeight: 900, color: "#111" }}>
                            {barberName}
                          </a>
                        ) : (
                          <b>{barberName}</b>
                        )}
                      </div>

                      <div style={{ marginTop: 6 }}>
                        Service: <b>{b.service?.name}</b> ({b.service?.durationMin} min)
                      </div>

                      {b.note ? (
                        <div style={{ marginTop: 6, color: "#333" }}>
                          Notiz: <i>{b.note}</i>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
