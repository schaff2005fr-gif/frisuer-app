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

export default function ChooseBarberPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [me, setMe] = useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [q, setQ] = useState("");

  async function loadMe() {
    setLoadingMe(true);
    try {
      const token = getTokenSafe();
      if (!token) {
        setMe(null);
        return;
      }

      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMe(null);
        return;
      }

      setMe(data as Me);
    } catch {
      setMe(null);
    } finally {
      setLoadingMe(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setMe(null);
    window.location.href = "/book";
  }

  useEffect(() => {
    fetch(`${API_BASE}/barbers`)
      .then((r) => r.json())
      .then((d) => setBarbers(Array.isArray(d?.barbers) ? d.barbers : []))
      .catch(() => setError("Fehler beim Laden der Friseure"))
      .finally(() => setLoading(false));

    loadMe();
  }, []);

  const isCustomer = me?.role === "CUSTOMER";
  const displayName = (me?.customer?.name ?? "").trim() || me?.email || "";

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return barbers;
    return barbers.filter((b) => b.name.toLowerCase().includes(s) || b.slug.toLowerCase().includes(s));
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
          <h1 style={{ margin: 0 }}>Friseur wählen</h1>
          <div style={{ marginTop: 6, color: "#666" }}>
            Wähle einen Friseur aus und starte die Online-Buchung.
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
                <a
                  href="/my-bookings"
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
                  Meine Termine
                </a>
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
            <>
              <a
                href="/login"
                style={{
                  textDecoration: "none",
                  border: "1px solid #111",
                  padding: "10px 12px",
                  borderRadius: 12,
                  color: "#fff",
                  fontWeight: 900,
                  background: "#111",
                }}
              >
                Login
              </a>
              <a
                href="/register"
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
                Registrieren
              </a>
            </>
          )}
        </div>
      </div>

      {/* Search */}
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
      </div>

      {/* Loading/Error */}
      {loading ? <div style={{ marginTop: 12, color: "#666" }}>Lade…</div> : null}
      {error ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f2c6c6", background: "#fff5f5", borderRadius: 12, color: "#8a1c1c" }}>
          <b>{error}</b>
        </div>
      ) : null}

      {/* Cards */}
      <div style={{ marginTop: 16, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
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

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href={`/b/${b.slug}`}
                style={{
                  flex: "1 1 120px",
                  textAlign: "center",
                  textDecoration: "none",
                  border: "1px solid #ddd",
                  padding: "10px 12px",
                  borderRadius: 12,
                  color: "#111",
                  fontWeight: 900,
                  background: "#fff",
                }}
              >
                Profil ansehen
              </a>

              <a
                href={`/b/${b.slug}/book`}
                style={{
                  flex: "1 1 120px",
                  textAlign: "center",
                  textDecoration: "none",
                  border: "1px solid #111",
                  padding: "10px 12px",
                  borderRadius: 12,
                  color: "#fff",
                  fontWeight: 900,
                  background: "#111",
                }}
              >
                Buchen →
              </a>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 ? (
          <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff", color: "#666" }}>
            Keine Friseure gefunden.
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 16, color: "#666", fontSize: 12 }}>
        Hinweis: Buchung ist nur mit Login möglich.
      </div>
    </div>
  );
}