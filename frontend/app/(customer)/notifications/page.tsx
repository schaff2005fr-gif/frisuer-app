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

  // optional, falls Backend include booking mitsendet:
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
  // YYYY-MM-DD in Berlin
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
          <h1 style={{ margin: 0 }}>Nachrichten</h1>
          <div style={{ color: "#666", marginTop: 4 }}>
            Wichtige Infos zu deinen Terminen.
            {unread.length > 0 ? (
              <span style={{ marginLeft: 8, fontWeight: 900 }}>({unread.length} neu)</span>
            ) : null}
          </div>
        </div>

        {/* ✅ Nur seiten-interne Funktionen (keine Navigation) */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={loadNotifications}
            disabled={loading}
            style={{
              border: "1px solid #eee",
              padding: "10px 12px",
              borderRadius: 12,
              background: "#fff",
              color: "#111",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "..." : "Neu laden"}
          </button>

          <button
            onClick={markAllRead}
            disabled={busyAll || items.length === 0 || count === 0}
            style={{
              border: "1px solid #111",
              padding: "10px 12px",
              borderRadius: 12,
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              cursor: busyAll ? "not-allowed" : "pointer",
              opacity: busyAll || items.length === 0 || count === 0 ? 0.6 : 1,
            }}
          >
            {busyAll ? "..." : `Alle gelesen (${count})`}
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
        <div style={{ color: "#666" }}>Lädt…</div>
      ) : items.length === 0 ? (
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 14,
            background: "#fff",
            color: "#666",
          }}
        >
          Keine Nachrichten vorhanden.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
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
              <div
                key={n.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 14,
                  padding: 14,
                  background: n.isRead ? "#fff" : "#f7f7ff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>
                    {n.title} {!n.isRead ? <span style={{ color: "#555" }}>• neu</span> : null}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>{formatDateTimeBerlin(n.createdAt)}</div>
                </div>

                {/* Booking Summary (professionell) */}
                {b ? (
                  <div
                    style={{
                      marginTop: 10,
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 12,
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Betroffener Termin</div>
                    <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
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

                <div style={{ marginTop: 10, color: "#222" }}>{n.body}</div>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {/* ✅ Link bleibt sichtbar, aber ohne Navigation */}
                  {n.link ? (
                    <div
                      style={{
                        border: "1px solid #eee",
                        padding: "9px 10px",
                        borderRadius: 12,
                        color: "#111",
                        fontWeight: 900,
                        background: "#fff",
                        opacity: 0.6,
                      }}
                      title={n.link}
                    >
                      Öffnen →
                    </div>
                  ) : null}

                  {!n.isRead ? (
                    <button
                      onClick={() => markRead(n.id)}
                      disabled={busyId === n.id}
                      style={{
                        border: "1px solid #111",
                        padding: "9px 10px",
                        borderRadius: 12,
                        background: "#111",
                        color: "#fff",
                        fontWeight: 900,
                        cursor: busyId === n.id ? "not-allowed" : "pointer",
                        opacity: busyId === n.id ? 0.7 : 1,
                      }}
                    >
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