"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = "https://frisuer-app.onrender.com";

type Notification = {
  id: number;
  type: "BOOKING_CANCELLED" | "BOOKING_STATUS_CHANGED";
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;

  booking?: {
    id: number;
    date: string; // ISO
    exactTime: number | null;
    durationMin: number;
    barber?: { name: string; slug: string } | null;
    service?: { name: string; durationMin: number } | null;
  } | null;
};

function getToken() {
  return localStorage.getItem("token") || "";
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minToHHMM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function formatDateTimeBerlin(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(d);
}

function formatDateBerlinFromISO(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(d);
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAll, setBusyAll] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [count, setCount] = useState<number>(0);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const unread = useMemo(() => items.filter((n) => !n.isRead), [items]);

  async function loadUnreadCount() {
    try {
      const token = getToken();
      if (!token) return setCount(0);

      const res = await fetch(`${API_BASE}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) setCount(Number(data?.count ?? 0));
    } catch {
      // ignore
    }
  }

  async function loadNotifications() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const token = getToken();
      if (!token) {
        setError("Nicht eingeloggt. Bitte zuerst einloggen.");
        setItems([]);
        setCount(0);
        return;
      }

      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Konnte Benachrichtigungen nicht laden.");
        setItems([]);
        return;
      }

      const list = Array.isArray(data?.notifications) ? data.notifications : [];
      setItems(list);
      await loadUnreadCount();
    } catch (e) {
      console.error(e);
      setError("Fehler beim Laden.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: number) {
    setBusyId(id);
    setError("");
    setMessage("");

    try {
      const token = getToken();
      if (!token) return setError("Nicht eingeloggt.");

      const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data?.error || "Konnte nicht als gelesen markieren.");

      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      await loadUnreadCount();
    } catch (e) {
      console.error(e);
      setError("Fehler.");
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    setBusyAll(true);
    setError("");
    setMessage("");

    try {
      const token = getToken();
      if (!token) return setError("Nicht eingeloggt.");

      const res = await fetch(`${API_BASE}/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data?.error || "Konnte nicht alle als gelesen markieren.");

      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setMessage("✅ Alle Benachrichtigungen als gelesen markiert.");
      await loadUnreadCount();
    } catch (e) {
      console.error(e);
      setError("Fehler.");
    } finally {
      setBusyAll(false);
    }
  }

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        .sub {
          color: #666;
          margin-top: 4px;
          line-height: 1.4;
        }

        .actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .btnGhost {
          border: 1px solid #eee;
          padding: 10px 12px;
          border-radius: 12px;
          background: #fff;
          color: #111;
          font-weight: 900;
          cursor: pointer;
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

        .btnGhost:disabled,
        .btnPrimary:disabled {
          cursor: not-allowed;
          opacity: 0.6;
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

        .empty {
          border: 1px solid #eee;
          border-radius: 14px;
          padding: 14px;
          background: #fff;
          color: #666;
        }

        .list {
          display: grid;
          gap: 10px;
        }

        .card {
          border: 1px solid #eee;
          border-radius: 14px;
          padding: 14px;
          background: #fff;
        }

        .cardUnread {
          background: #f7f7ff;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          align-items: baseline;
        }

        .title {
          font-weight: 900;
          font-size: 14px;
          word-break: break-word;
        }

        .metaTime {
          font-size: 12px;
          color: #666;
          white-space: nowrap;
        }

        .body {
          margin-top: 10px;
          color: #222;
          word-break: break-word;
          line-height: 1.45;
        }

        .bookingBox {
          margin-top: 10px;
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 12px;
          background: #fff;
        }

        .bookingLabel {
          font-size: 12px;
          color: #666;
          font-weight: 900;
        }

        .bookingGrid {
          margin-top: 6px;
          display: grid;
          gap: 4px;
          word-break: break-word;
        }

        .footerActions {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btnRead {
          border: 1px solid #111;
          padding: 9px 10px;
          border-radius: 12px;
          background: #111;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }

        .btnRead:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        /* Optionaler Link-Button (nur wenn du später Navigation willst) */
        .btnLinkDisabled {
          border: 1px solid #eee;
          padding: 9px 10px;
          border-radius: 12px;
          color: #111;
          font-weight: 900;
          background: #fff;
          opacity: 0.6;
        }

        /* ✅ Mobile */
        @media (max-width: 520px) {
          .page {
            padding: 14px;
          }

          .actions {
            width: 100%;
          }

          .btnGhost,
          .btnPrimary {
            width: 100%;
          }

          .footerActions > * {
            width: 100%;
            text-align: center;
          }

          .metaTime {
            white-space: normal;
          }
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <div>
          <h1 style={{ margin: 0 }}>Nachrichten</h1>
          <div className="sub">
            Wichtige Infos zu deinen Terminen.
            {unread.length > 0 ? <span style={{ marginLeft: 8, fontWeight: 900 }}>({unread.length} neu)</span> : null}
          </div>
        </div>

        <div className="actions">
          <button onClick={loadNotifications} disabled={loading} className="btnGhost">
            {loading ? "..." : "Neu laden"}
          </button>

          <button onClick={markAllRead} disabled={busyAll || items.length === 0 || count === 0} className="btnPrimary">
            {busyAll ? "..." : `Alle gelesen (${count})`}
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
        <div style={{ color: "#666" }}>Lädt…</div>
      ) : items.length === 0 ? (
        <div className="empty">Keine Nachrichten vorhanden.</div>
      ) : (
        <div className="list">
          {items.map((n) => {
            const b = n.booking ?? null;

            const barberName = b?.barber?.name ?? null;
            const serviceName = b?.service?.name ?? null;

            const dateStr = b?.date ? formatDateBerlinFromISO(b.date) : null;

            const timeStr =
              b?.exactTime != null
                ? (() => {
                    const start = minToHHMM(b.exactTime);
                    const end = b?.durationMin ? minToHHMM(b.exactTime + b.durationMin) : null;
                    return end ? `${start}–${end}` : start;
                  })()
                : null;

            return (
              <div key={n.id} className={`card ${n.isRead ? "" : "cardUnread"}`}>
                <div className="cardTop">
                  <div className="title">
                    {n.title} {!n.isRead ? <span style={{ color: "#555" }}>• neu</span> : null}
                  </div>
                  <div className="metaTime">{formatDateTimeBerlin(n.createdAt)}</div>
                </div>

                {/* Booking Summary */}
                {b ? (
                  <div className="bookingBox">
                    <div className="bookingLabel">Betroffener Termin</div>
                    <div className="bookingGrid">
                      <div>
                        Friseur: <b>{barberName ?? "—"}</b>
                      </div>
                      <div>
                        Datum: <b>{dateStr ?? "—"}</b>
                        {timeStr ? (
                          <>
                            {" "}
                            · Uhrzeit: <b>{timeStr}</b>
                          </>
                        ) : null}
                      </div>
                      {serviceName ? (
                        <div>
                          Service: <b>{serviceName}</b>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="body">{n.body}</div>

                <div className="footerActions">
                  {n.link ? (
                    <div className="btnLinkDisabled" title={n.link}>
                      Öffnen →
                    </div>
                  ) : null}

                  {!n.isRead ? (
                    <button onClick={() => markRead(n.id)} disabled={busyId === n.id} className="btnRead">
                      {busyId === n.id ? "..." : "Als gelesen"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}