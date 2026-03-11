"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

type Barber = {
  id: number;
  name: string;
  slug: string;

  city?: string | null;
  street?: string | null;
  postalCode?: string | null;
  imageUrl?: string | null;

  nextDate?: string | null;
};

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

function cleanUrl(u?: string | null) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return "https://" + s;
}

function initials(name: string) {
  const s = String(name || "").trim();
  if (!s) return "S";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "S";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function formatDateDE(dateStr: string) {
  const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" }).format(d);
}

function firstName(full: string) {
  const s = String(full || "").trim();
  if (!s) return "";
  return s.split(/\s+/).filter(Boolean)[0] ?? "";
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
  const fn = firstName(me?.customer?.name ?? "");

  const titleText = loadingMe ? "Salora" : me && isCustomer ? `Hallo ${fn || "👋"}` : "Friseure";
  const subText = loadingMe
    ? "Lade…"
    : me && isCustomer
    

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return barbers;

    return barbers.filter((b) => {
      const name = (b.name ?? "").toLowerCase();
      const slug = (b.slug ?? "").toLowerCase();
      const city = (b.city ?? "").toLowerCase();
      return name.includes(s) || slug.includes(s) || city.includes(s);
    });
  }, [barbers, q]);

  return (
    <div className="page">
      <style jsx>{`
        .page {
          padding: 20px;
          max-width: 1040px;
          margin: 0 auto;
        }

        .hero {
          margin-bottom: 14px;
        }

        .title {
          margin: 0;
          font-size: 36px;
          line-height: 1.05;
          letter-spacing: -1px;
        }

        .sub {
          color: #666;
          margin-top: 8px;
          font-size: 16px;
          line-height: 1.4;
          max-width: 720px;
        }

        /* ✅ Suchbox jetzt wie Card */
        .searchBox {
          margin-top: 14px;
          border: 1px solid #eee;
          border-radius: 18px;
          padding: 14px;
          background: #fff;
          display: grid;
          gap: 10px;
        }

        .searchTop {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .searchTitle {
          font-weight: 1000;
        }

        .countText {
          color: #666;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .searchHint {
          color: #666;
          font-size: 12px;
          margin-top: 4px;
        }

        .searchInput {
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 14px;
          width: 100%;
          font-size: 16px;
        }

        .cards {
          margin-top: 16px;
          display: grid;
          gap: 12px;
        }

        .card {
          border: 1px solid #eee;
          border-radius: 18px;
          padding: 14px;
          background: #fff;
          display: grid;
          gap: 12px;
        }

        .row {
          display: grid;
          grid-template-columns: 54px 1fr auto;
          gap: 12px;
          align-items: center;
        }

        .avatar {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          background: #111;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          letter-spacing: -0.6px;
          overflow: hidden;
        }

        .avatarImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .name {
          font-weight: 1000;
          font-size: 18px;
          line-height: 1.2;
        }

        .meta {
          margin-top: 4px;
          color: #666;
          font-size: 13px;
          line-height: 1.25;
        }

        .chip {
          font-size: 12px;
          font-weight: 900;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid #ddd;
          background: #fff;
          white-space: nowrap;
        }

        .chipStrong {
          border: 1px solid #111;
          background: #111;
          color: #fff;
        }

        .actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .btnGhost {
          text-align: center;
          text-decoration: none;
          border: 1px solid #ddd;
          padding: 12px;
          border-radius: 14px;
          color: #111;
          font-weight: 900;
          background: #fff;
        }

        .btnPrimary {
          text-align: center;
          text-decoration: none;
          border: 1px solid #111;
          padding: 12px;
          border-radius: 14px;
          color: #fff;
          font-weight: 900;
          background: #111;
        }

        .alertErr {
          margin-top: 12px;
          padding: 12px;
          border: 1px solid #f2c6c6;
          background: #fff5f5;
          border-radius: 14px;
          color: #8a1c1c;
          font-weight: 900;
        }

        .emptyCard {
          border: 1px solid #eee;
          border-radius: 18px;
          padding: 14px;
          background: #fff;
          color: #666;
        }

        .hint {
          margin-top: 16px;
          color: #666;
          font-size: 12px;
        }

        @media (max-width: 720px) {
          .page {
            padding: 14px;
          }

          .title {
            font-size: 34px;
          }

          .row {
            grid-template-columns: 52px 1fr;
            grid-template-rows: auto auto;
          }

          .chip {
            grid-column: 1 / -1;
            width: fit-content;
          }

          .actions {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      <div className="hero">
        <h1 className="title">{titleText}</h1>
        <div className="sub">{subText}</div>

        {/* ✅ Suchbox jetzt wie Card & volle Breite */}
        <div className="searchBox">
          <div className="searchTop">
            <div>
              <div className="searchTitle">Suche</div>
              <div className="searchHint">Name, Stadt oder Slug</div>
            </div>

            <div className="countText">{loading ? "…" : `${filtered.length} Friseur(e)`}</div>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="z.B. Ali, Essen, barber-essen..."
            className="searchInput"
          />
        </div>
      </div>

      {loading ? <div style={{ marginTop: 12, color: "#666" }}>Lade…</div> : null}
      {error ? <div className="alertErr">{error}</div> : null}

      <div className="cards">
        {!loading && filtered.length === 0 ? <div className="emptyCard">Keine Friseure gefunden.</div> : null}

        {filtered.map((b) => {
          const addr =
            [b.street, [b.postalCode, b.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null;

          const nextLabel = b.nextDate ? `Nächster Termin: ${formatDateDE(b.nextDate)}` : "Nächster Termin: —";

          return (
            <div key={b.id} className="card">
              <div className="row">
                <div className="avatar" aria-label={b.name}>
                  {b.imageUrl ? <img src={cleanUrl(b.imageUrl)} alt={b.name} className="avatarImg" /> : initials(b.name)}
                </div>

                <div>
                  <div className="name">{b.name}</div>
                  <div className="meta">{addr ? addr : `/b/${b.slug}`}</div>
                </div>

                <div className="chip chipStrong">{nextLabel}</div>
              </div>

              <div className="actions">
                <a href={`/b/${b.slug}`} className="btnGhost">
                  Profil
                </a>
                <a href={`/b/${b.slug}/book`} className="btnPrimary">
                  Buchen →
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hint">Hinweis: Buchung ist nur mit Login möglich.</div>
    </div>
  );
}