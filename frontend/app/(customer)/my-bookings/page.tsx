"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = "https://frisuer-app.onrender.com";
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
  if (v === "CONFIRMED") return { border: "1px solid #111", background: "#111", color: "#fff" };
  if (v === "COMPLETED") return { border: "1px solid #b7ebc6", background: "#f0fff4", color: "#1f7a37" };
  if (v === "CANCELLED") return { border: "1px solid #f2c6c6", background: "#fff5f5", color: "#8a1c1c" };
  if (v === "NO_SHOW") return { border: "1px solid #f2c6c6", background: "#fff5f5", color: "#8a1c1c" };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="page">
      <style jsx>{`
        .page {
          padding: 20px;
          max-width: 980px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .subtitle {
          color: #666;
          margin-top: 4px;
        }

        .topActions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .btnPrimary {
          border: 1px solid #111;
          padding: 10px 12px;
          border-radius: 12px;
          background: #111;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }

        .btnPrimary:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .alertOk {
          margin-bottom: 12px;
          padding: 12px;
          border: 1px solid #b7ebc6;
          background: #f0fff4;
          border-radius: 12px;
          color: #1f7a37;
        }

        .alertErr {
          margin-bottom: 12px;
          padding: 12px;
          border: 1px solid #f2c6c6;
          background: #fff5f5;
          border-radius: 12px;
          color: #8a1c1c;
        }

        .emptyCard {
          border: 1px solid #eee;
          border-radius: 14px;
          padding: 14px;
          background: #fff;
          color: #666;
        }

        .cta {
          text-decoration: none;
          border: 1px solid #111;
          padding: 10px 12px;
          border-radius: 12px;
          background: #111;
          color: #fff;
          font-weight: 900;
          display: inline-block;
        }

        .grid {
          display: grid;
          gap: 14px;
        }

        .section {
          border: 1px solid #eee;
          border-radius: 14px;
          padding: 14px;
          background: #fff;
        }

        .sectionTitle {
          font-weight: 900;
          margin-bottom: 10px;
        }

        .list {
          display: grid;
          gap: 10px;
        }

        .item {
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 12px;
        }

        .itemTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .itemDate {
          font-weight: 900;
          word-break: break-word;
        }

        .chip {
          font-size: 12px;
          font-weight: 900;
          padding: 4px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }

        .meta {
          margin-top: 8px;
          display: grid;
          gap: 6px;
          word-break: break-word;
        }

        .note {
          color: #333;
        }

        .actions {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btnGhost {
          padding: 9px 10px;
          border: 1px solid #ccc;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 900;
          background: #fff;
        }

        .btnGhost:disabled {
          cursor: not-allowed;
          opacity: 0.75;
        }

        .btnLink {
          text-decoration: none;
          padding: 9px 10px;
          border-radius: 12px;
          border: 1px solid #111;
          background: #111;
          color: #fff;
          font-weight: 900;
        }

        .muted {
          color: #666;
        }

        /* ✅ Mobile polish */
        @media (max-width: 520px) {
          .page {
            padding: 14px;
          }

          .header {
            align-items: flex-start;
          }

          .topActions {
            width: 100%;
          }

          .btnPrimary {
            width: 100%;
          }

          .actions > * {
            width: 100%;
            text-align: center;
          }

          .chip {
            width: fit-content;
          }
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <div>
          <h1 style={{ margin: 0 }}>Meine Termine</h1>
          <div className="subtitle">Übersicht über deine Buchungen. Du kannst Termine auch stornieren.</div>
          {/* unreadCount aktuell nur geladen, nicht angezeigt – falls du willst, bauen wir ein Badge ein */}
        </div>

        <div className="topActions">
          <button onClick={loadBookings} disabled={loading} className="btnPrimary">
            {loading ? "Lädt..." : "Neu laden"}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="alertOk">
          <b>{message}</b>
        </div>
      )}

      {error && (
        <div className="alertErr">
          <b>{error}</b>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="muted">Lade Termine…</div>
      ) : bookings.length === 0 ? (
        <div className="emptyCard">
          <div style={{ fontWeight: 900 }}>Keine Termine gefunden</div>
          <div style={{ marginTop: 6 }}>Gehe zur Startseite und buche einen Termin.</div>
          <div style={{ marginTop: 12 }}>
            <a href="/" className="cta">
              Jetzt buchen →
            </a>
          </div>
        </div>
      ) : (
        <div className="grid">
          {/* Upcoming */}
          <div className="section">
            <div className="sectionTitle">Aktive Termine ({upcoming.length})</div>

            {upcoming.length === 0 ? (
              <div className="muted">Keine aktiven Termine.</div>
            ) : (
              <div className="list">
                {upcoming.map((b: any) => {
                  const barberName = b?.barber?.name ?? "—";
                  const barberSlug = b?.barber?.slug ?? "";
                  const serviceName = b?.service?.name ?? "—";
                  const serviceDur = b?.service?.durationMin ?? b?.durationMin ?? "—";

                  return (
                    <div key={b.id} className="item">
                      <div className="itemTop">
                        <div className="itemDate">
                          {b.date}
                          {b.timeHHMM ? ` — ${b.timeHHMM}` : ""}
                        </div>

                        <span className="chip" style={{ ...statusStyles(b.status) }}>
                          {statusLabel(b.status)}
                        </span>
                      </div>

                      <div className="meta">
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
                          <div className="note">
                            Notiz: <i>{b.note}</i>
                          </div>
                        ) : null}
                      </div>

                      <div className="actions">
                        <button onClick={() => cancelBooking(b.id)} disabled={busyId === b.id} className="btnGhost">
                          {busyId === b.id ? "Storniere..." : "Stornieren"}
                        </button>

                        {barberSlug ? (
                          <a href={`/b/${barberSlug}`} className="btnLink">
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
            <div className="section">
              <div className="sectionTitle">Stornierte Termine ({cancelled.length})</div>

              <div className="list">
                {cancelled.map((b: any) => {
                  const barberName = b?.barber?.name ?? "—";
                  const barberSlug = b?.barber?.slug ?? "";

                  return (
                    <div key={b.id} className="item" style={{ opacity: 0.85 }}>
                      <div className="itemTop">
                        <div className="itemDate">
                          {b.date}
                          {b.timeHHMM ? ` — ${b.timeHHMM}` : ""}
                        </div>

                        <span className="chip" style={{ ...statusStyles(b.status) }}>
                          {statusLabel(b.status)}
                        </span>
                      </div>

                      <div className="meta">
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
                          Service: <b>{b.service?.name}</b> ({b.service?.durationMin} min)
                        </div>

                        {b.note ? (
                          <div className="note">
                            Notiz: <i>{b.note}</i>
                          </div>
                        ) : null}
                      </div>
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