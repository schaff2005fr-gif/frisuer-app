"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

type Notification = {
  id: number;
  type: "BOOKING_CANCELLED" | "BOOKING_STATUS_CHANGED";
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

function getToken() {
  return localStorage.getItem("token") || "";
}

function formatDateTimeBerlinShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function truncate(s: string, n = 140) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= n) return t;
  return t.slice(0, n).trimEnd() + "…";
}

function extractDetailsFromBody(body: string) {
  const t = String(body ?? "");

  const friseur = /Friseur:\s*([^\n•]+)/i.exec(t)?.[1]?.trim() || null;
  const service = /Service:\s*([^\n•]+)/i.exec(t)?.[1]?.trim() || null;
  const datum = /Datum:\s*(\d{4}-\d{2}-\d{2})/i.exec(t)?.[1]?.trim() || null;

  const zeit = /Zeit:\s*([0-9]{1,2}:[0-9]{2})\s*-\s*([0-9]{1,2}:[0-9]{2})/i.exec(t);
  const timeStr = zeit ? `${zeit[1]}–${zeit[2]}` : null;

  return { friseur, service, datum, timeStr };
}

function stripDetailsFromBody(body: string) {
  let t = String(body ?? "");

  t = t.replace(/Friseur:\s*[^\n•]+/gi, "").trim();
  t = t.replace(/Service:\s*[^\n•]+/gi, "").trim();
  t = t.replace(/Datum:\s*\d{4}-\d{2}-\d{2}/gi, "").trim();
  t = t.replace(/Zeit:\s*[0-9]{1,2}:[0-9]{2}\s*-\s*[0-9]{1,2}:[0-9]{2}/gi, "").trim();

  t = t.replace(/[•·]\s*[•·]/g, "•");
  t = t.replace(/\s{2,}/g, " ").trim();
  t = t.replace(/^[-•·\s]+/, "").trim();

  return t;
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
          position: relative;
        }

        .cardUnread {
          background: #f7f7ff;
          border-color: #e7e7ff;
        }

        .unreadDot {
          position: absolute;
          left: 10px;
          top: 14px;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #111;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          align-items: baseline;
          padding-left: 14px;
        }

        .title {
          font-weight: 1000;
          font-size: 14px;
          word-break: break-word;
        }

        .metaTime {
          font-size: 12px;
          color: #666;
          white-space: nowrap;
        }

        .summary {
          margin-top: 10px;
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 12px;
          background: #fff;
          display: grid;
          gap: 4px;
          padding-left: 14px;
        }

        .summaryRow {
          color: #222;
          line-height: 1.3;
          word-break: break-word;
          font-size: 13px;
        }

        .body {
          margin-top: 10px;
          color: #444;
          word-break: break-word;
          line-height: 1.45;
          padding-left: 14px;
        }

        .footerActions {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          padding-left: 14px;
        }

        .btnRead {
          border: 1px solid #111;
          padding: 12px;
          border-radius: 12px;
          background: #111;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
          flex: 1 1 160px;
        }

        .btnRead:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .btnOpen {
          text-decoration: none;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
          font-weight: 1000;
          text-align: center;
          flex: 1 1 160px;
        }

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
          }

          .metaTime {
            white-space: normal;
          }
        }
      `}</style>

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

      {loading ? (
        <div style={{ color: "#666" }}>Lädt…</div>
      ) : items.length === 0 ? (
        <div className="empty">Keine Nachrichten vorhanden.</div>
      ) : (
        <div className="list">
          {items.map((n) => {
            // ✅ Wenn du Backend umgestellt hast, sollten eh nur CANCELLED reinkommen.
            // Trotzdem filtern wir Status-Changed raus, falls noch alte in DB sind:
            if (n.type === "BOOKING_STATUS_CHANGED") return null;

            const details = extractDetailsFromBody(n.body);
            const hasSummary = !!(details.friseur || details.service || details.datum || details.timeStr);

            // ✅ Bei "Termin storniert" reicht Title + Summary, Body oft unnötig
            const cleanedBody = hasSummary ? stripDetailsFromBody(n.body) : n.body;
            const showBody = truncate(cleanedBody, 180);

            return (
              <div key={n.id} className={`card ${n.isRead ? "" : "cardUnread"}`}>
                {!n.isRead ? <div className="unreadDot" /> : null}

                <div className="cardTop">
                  <div className="title">{n.title}</div>
                  <div className="metaTime">{formatDateTimeBerlinShort(n.createdAt)}</div>
                </div>

                {hasSummary ? (
                  <div className="summary">
                    {details.friseur ? (
                      <div className="summaryRow">
                        Friseur: <b>{details.friseur}</b>
                      </div>
                    ) : null}
                    {details.service ? (
                      <div className="summaryRow">
                        Service: <b>{details.service}</b>
                      </div>
                    ) : null}
                    {details.datum ? (
                      <div className="summaryRow">
                        Datum: <b>{details.datum}</b>
                        {details.timeStr ? (
                          <>
                            {" "}
                            · Zeit: <b>{details.timeStr}</b>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* ✅ Body nur wenn er wirklich was bringt */}
                {showBody && showBody !== "Dein Termin wurde storniert." ? <div className="body">{showBody}</div> : null}

                <div className="footerActions">
  <a
    className="btnOpen"
    href={`/notifications/${n.id}`}
    onClick={(e) => {
      // ✅ sofort als gelesen markieren, dann weiter navigieren
      if (n.isRead) return;

      e.preventDefault();

      const token = getToken();
      if (!token) {
        window.location.assign("/login");
        return;
      }

      fetch(`${API_BASE}/notifications/${n.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
        .catch(() => {})
        .finally(() => {
          // Local UI sofort aktualisieren
          setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
          setCount((c) => Math.max(0, c - 1));
          window.location.assign(`/notifications/${n.id}`);
        });
    }}
  >
    Öffnen →
  </a>

  {/* ✅ Kein extra "als gelesen" Button mehr nötig */}
</div>
                
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}