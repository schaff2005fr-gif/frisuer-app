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
      {/* ✅ Mobile CSS nur für diese Seite */}
      <style jsx>{`
        .headerRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-end;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .meBadge {
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 10px 12px;
          background: #fff;
          font-weight: 900;
          white-space: nowrap;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .meBadgeMuted {
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 10px 12px;
          background: #fff;
          font-weight: 900;
          color: #666;
          white-space: nowrap;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .searchBox {
          border: 1px solid #eee;
          border-radius: 14px;
          padding: 14px;
          background: #fff;
          display: grid;
          grid-template-columns: 1fr 360px auto;
          gap: 12px;
          align-items: center;
        }

        .searchInput {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 12px;
          width: 100%;
          max-width: 100%;
        }

        .countText {
          color: #666;
          font-size: 12px;
          font-weight: 900;
          text-align: right;
          white-space: nowrap;
        }

        .cards {
          margin-top: 16px;
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }

        .card {
          border: 1px solid #eee;
          border-radius: 14px;
          padding: 14px;
          background: #fff;
          display: grid;
          gap: 10px;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }

        .pill {
          font-size: 12px;
          font-weight: 900;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid #ddd;
          white-space: nowrap;
          height: fit-content;
        }

        .cardActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btnGhost {
          flex: 1 1 140px;
          text-align: center;
          text-decoration: none;
          border: 1px solid #ddd;
          padding: 10px 12px;
          border-radius: 12px;
          color: #111;
          font-weight: 900;
          background: #fff;
        }

        .btnPrimary {
          flex: 1 1 140px;
          text-align: center;
          text-decoration: none;
          border: 1px solid #111;
          padding: 10px 12px;
          border-radius: 12px;
          color: #fff;
          font-weight: 900;
          background: #111;
        }

        /* ✅ Mobile: alles untereinander + buttons 2-spaltig */
        @media (max-width: 720px) {
          .searchBox {
            grid-template-columns: 1fr;
          }

          .countText {
            text-align: left;
          }
        }

        @media (max-width: 420px) {
          .cardActions a {
            flex: 1 1 calc(50% - 10px);
          }
        }
      `}</style>

      {/* Header */}
      <div className="headerRow">
        <div>
          <h1 style={{ margin: 0 }}>Friseur buchen</h1>
          <div style={{ color: "#666", marginTop: 6 }}>
            Wähle deinen Friseur aus und buche deinen Termin online.
          </div>
        </div>

        {/* Nur Statusanzeige – keine Navigation mehr */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {loadingMe ? (
            <div style={{ color: "#666", fontWeight: 800 }}>lädt…</div>
          ) : me ? (
            <div className="meBadge" title={displayName}>
              {isCustomer ? "👤 " : "🔧 "}
              {displayName}
            </div>
          ) : (
            <div className="meBadgeMuted">Nicht eingeloggt</div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="searchBox">
        <div>
          <div style={{ fontWeight: 900 }}>Suche</div>
          <div style={{ color: "#666", fontSize: 12 }}>Name oder Slug</div>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="z.B. Ali, barber-essen..."
          className="searchInput"
        />

        <div className="countText">{loading ? "…" : `${filtered.length} Friseur(e)`}</div>
      </div>

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
      <div className="cards">
        {!loading && filtered.length === 0 ? (
          <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff", color: "#666" }}>
            Keine Friseure gefunden.
          </div>
        ) : null}

        {filtered.map((b) => (
          <div key={b.id} className="card">
            <div className="cardTop">
              <div>
                <div style={{ fontWeight: 1000, fontSize: 16 }}>{b.name}</div>
                <div style={{ color: "#666", fontSize: 12 }}>/b/{b.slug}</div>
              </div>

              <span className="pill">Profil</span>
            </div>

            <div className="cardActions">
              <a href={`/b/${b.slug}`} className="btnGhost">
                Profil ansehen
              </a>

              <a href={`/b/${b.slug}/book`} className="btnPrimary">
                Buchen →
              </a>
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