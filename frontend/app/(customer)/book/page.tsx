"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = "https://frisuer-app.onrender.com";

type Barber = { id: number; name: string; slug: string };

export default function ChooseBarberPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/barbers`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setBarbers(Array.isArray(d?.barbers) ? d.barbers : []))
      .catch(() => setError("Fehler beim Laden der Friseure"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return barbers;
    return barbers.filter((b) => b.name.toLowerCase().includes(s) || b.slug.toLowerCase().includes(s));
  }, [barbers, q]);

  return (
    <div style={{ padding: 20, maxWidth: 1040, margin: "0 auto" }}>
      {/* Page Title (ohne Topbar-Navigation) */}
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Friseur wählen</h1>
        <div style={{ marginTop: 6, color: "#666" }}>Wähle einen Friseur aus und starte die Online-Buchung.</div>
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

      <div style={{ marginTop: 16, color: "#666", fontSize: 12 }}>Hinweis: Buchung ist nur mit Login möglich.</div>
    </div>
  );
}