"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = "https://frisuer-app.onrender.com";

type Barber = { id: number; name: string; slug: string };

type Me = {
  id: number;
  email: string;
  role: "CUSTOMER" | "BARBER";
  customer: { id: number; name: string; phone: string | null } | null;
  barber?: any;
};

function getTokenSafe() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("token") || "";
}

export default function HomePage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [me, setMe] = useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // UI state
  const [q, setQ] = useState("");

  async function loadMe() {
    setLoadingMe(true);
    try {
      const token = getTokenSafe();
      if (!token) {
        setMe(null);
        setUnreadCount(0);
        return;
      }

      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMe(null);
        setUnreadCount(0);
        return;
      }

      setMe(data as Me);
    } catch {
      setMe(null);
      setUnreadCount(0);
    } finally {
      setLoadingMe(false);
    }
  }

  async function loadUnreadCount() {
    try {
      const token = getTokenSafe();
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

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setMe(null);
    setUnreadCount(0);
    // ✅ keine Navigation/Redirect mehr
  }

  useEffect(() => {
    setLoading(true);
    setError("");

    fetch(`${API_BASE}/barbers`)
      .then((r) => r.json())
      .then((d) => setBarbers(Array.isArray(d?.barbers) ? d.barbers : []))
      .catch(() => setError("Fehler beim Laden"))
      .finally(() => setLoading(false));

    loadMe();
  }, []);

  useEffect(() => {
    if (me?.role === "CUSTOMER") loadUnreadCount();
    else setUnreadCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const isCustomer = me?.role === "CUSTOMER";
  const displayName = (me?.customer?.name ?? "").trim() || me?.email || "";

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return barbers;

    return barbers.filter((b) => {
      const name = (b.name ?? "").toLowerCase();
      const slug = (b.slug ?? "").toLowerCase();
      return name.includes(s) || slug.includes(s);
    });
  }, [barbers, q]);

  return (
    <div style={{ padding: 20, maxWidth: 1040, margin: "0 auto" }}>
      {/* Topbar */}
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
          <h1 style={{ margin: 0 }}>Friseur buchen</h1>
          <div style={{ color: "#666", marginTop: 6 }}>
            Wähle deinen Friseur aus und buche deinen Termin online.
          </div>
        </div>

        {/* ✅ Navigation-Links entfernt, aber Status/Info + Logout bleibt */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {loadingMe ? (
            <div style={{ color: "#666", fontWeight: 800 }}>lädt…</div>
          ) : me ? (
            <>
              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: "#fff",
                  fontWeight: 900,
                }}
              >
                {isCustomer ? "👤 " : "🔧 "}
                {displayName}
              </div>

              {isCustomer ? (
                <div
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: "10px 12px",
                    background: "#fff",
                    fontWeight: 900,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    color: "#111",
                  }}
                  title="Ungelesene Nachrichten"
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
                </div>
              ) : null}

              <button
                onClick={logout}
                style={{
                  border: "1px solid #111",
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "#111",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: "10px 12px",
                background: "#fff",
                fontWeight: 900,
                color: "#666",
              }}
            >
              Nicht eingeloggt
            </div>
          )}
        </div>
      </div>

      {/* Search card */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 14,
          padding: 14,
          background: "#fff",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 900 }}>Suche</div>
          <div style={{ color: "#666", fontSize: 12 }}>Name oder Slug</div>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="z.B. Ali, barber-essen..."
          style={{
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 12,
            width: 360,
            maxWidth: "100%",
          }}
        />

        <div style={{ color: "#666", fontSize: 12, fontWeight: 900 }}>
          {loading ? "…" : `${filtered.length} Friseur(e)`}
        </div>
      </div>

      {/* Loading/Error */}
      {loading ? <div style={{ marginTop: 12, color: "#666" }}>Lade…</div> : null}
      {error ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #f2c6c6",
            background: "#fff5f5",
            borderRadius: 12,
            color: "#8a1c1c",
          }}
        >
          <b>{error}</b>
        </div>
      ) : null}

      {/* Cards grid */}
      <div style={{ marginTop: 16, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {!loading && filtered.length === 0 ? (
          <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff", color: "#666" }}>
            Keine Friseure gefunden.
          </div>
        ) : null}

        {filtered.map((b) => (
          <div
            key={b.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 14,
              background: "#fff",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 1000, fontSize: 16 }}>{b.name}</div>
                <div style={{ color: "#666", fontSize: 12 }}>/b/{b.slug}</div>
              </div>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: "1px solid #ddd",
                  color: "#333",
                }}
              >
                Profil
              </span>
            </div>

            {/* ✅ Buttons bleiben sichtbar, aber ohne Navigation */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div
                style={{
                  flex: "1 1 120px",
                  textAlign: "center",
                  border: "1px solid #ddd",
                  padding: "10px 12px",
                  borderRadius: 12,
                  color: "#111",
                  fontWeight: 900,
                  background: "#fff",
                  opacity: 0.6,
                }}
                title={`/b/${b.slug}`}
              >
                Profil ansehen
              </div>

              <div
                style={{
                  flex: "1 1 120px",
                  textAlign: "center",
                  border: "1px solid #111",
                  padding: "10px 12px",
                  borderRadius: 12,
                  color: "#fff",
                  fontWeight: 900,
                  background: "#111",
                  opacity: 0.6,
                }}
                title={`/b/${b.slug}/book`}
              >
                Buchen →
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, color: "#666", fontSize: 12 }}>
        Hinweis: Buchung ist nur mit Login möglich.
      </div>
    </div>
  );
}