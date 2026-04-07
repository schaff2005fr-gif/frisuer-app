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
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeZone: "Europe/Berlin",
  }).format(d);
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
    ? "Lade..."
    : me && isCustomer
    ? "Wähle einen Friseur und buche deinen nächsten Termin."
    : "Finde einen passenden Friseur und buche direkt online.";

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
          max-width: 1120px;
          margin: 0 auto;
        }

        .hero {
          margin-bottom: 18px;
        }

        .title {
          margin: 0;
          font-size: 38px;
          line-height: 1.03;
          letter-spacing: -1px;
          color: #111;
        }

        .sub {
          color: #666;
          margin-top: 10px;
          font-size: 17px;
          line-height: 1.45;
          max-width: 760px;
        }

        .searchBox {
          margin-top: 16px;
          border: 1px solid #e9e9e9;
          border-radius: 24px;
          padding: 16px;
          background: #fff;
          display: grid;
          gap: 12px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .searchTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .searchTitle {
          font-weight: 1000;
          font-size: 18px;
          color: #111;
        }

        .searchHint {
          color: #666;
          font-size: 13px;
          margin-top: 4px;
        }

        .countText {
          color: #666;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid #e4e4e4;
          background: #fafafa;
        }

        .searchInput {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          height: 52px;
          border-radius: 14px;
          border: 1px solid #dedede;
          background: #fff;
          padding: 0 16px;
          font-size: 16px;
          color: #111;
          outline: none;
          box-sizing: border-box;
          display: block;
        }

        .cards {
          margin-top: 16px;
          display: grid;
          gap: 14px;
        }

        .card {
          border: 1px solid #e9e9e9;
          border-radius: 24px;
          padding: 16px;
          background: #fff;
          display: grid;
          gap: 14px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .topRow {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
        }

        .avatar {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: #111;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 18px;
          letter-spacing: -0.6px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .avatarImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .name {
          font-weight: 1000;
          font-size: 20px;
          line-height: 1.15;
          color: #111;
        }

        .meta {
          margin-top: 6px;
          color: #666;
          font-size: 14px;
          line-height: 1.35;
          word-break: break-word;
        }

        .chip {
          font-size: 12px;
          font-weight: 900;
          padding: 9px 12px;
          border-radius: 999px;
          border: 1px solid #111;
          background: #111;
          color: #fff;
          white-space: nowrap;
          text-align: center;
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
          min-height: 48px;
          padding: 0 14px;
          border-radius: 14px;
          color: #111;
          font-weight: 900;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btnPrimary {
          text-align: center;
          text-decoration: none;
          border: 1px solid #111;
          min-height: 48px;
          padding: 0 14px;
          border-radius: 14px;
          color: #fff;
          font-weight: 900;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .alertErr {
          margin-top: 12px;
          padding: 14px 16px;
          border: 1px solid #f1c7c7;
          background: #fff5f5;
          border-radius: 16px;
          color: #8a1c1c;
          font-weight: 800;
        }

        .emptyCard {
          border: 1px dashed #e3e3e3;
          border-radius: 20px;
          padding: 16px;
          background: #fcfcfc;
          color: #777;
        }

        .hint {
          margin-top: 16px;
          color: #666;
          font-size: 13px;
          line-height: 1.45;
          border: 1px solid #ececec;
          background: #fafafa;
          border-radius: 16px;
          padding: 14px 16px;
        }

        @media (max-width: 720px) {
          .page {
            padding: 14px;
          }

          .title {
            font-size: 34px;
          }

          .sub {
            font-size: 16px;
          }

          .topRow {
            grid-template-columns: 56px minmax(0, 1fr);
            grid-template-rows: auto auto;
            align-items: start;
          }

          .avatar {
            width: 56px;
            height: 56px;
            border-radius: 16px;
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

        <div className="searchBox">
          <div className="searchTop">
            <div>
              <div className="searchTitle">Friseur suchen</div>
              <div className="searchHint">Nach Name, Stadt oder Profil suchen</div>
            </div>

            <div className="countText">{loading ? "…" : `${filtered.length} Friseur(e)`}</div>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="z. B. Ali, Essen, barber-essen..."
            className="searchInput"
          />
        </div>
      </div>

      {loading ? <div style={{ marginTop: 12, color: "#666" }}>Lade...</div> : null}
      {error ? <div className="alertErr">{error}</div> : null}

      <div className="cards">
        {!loading && filtered.length === 0 ? <div className="emptyCard">Keine Friseure gefunden.</div> : null}

        {filtered.map((b) => {
          const addr =
            [b.street, [b.postalCode, b.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null;

          const nextLabel = b.nextDate ? `Nächster Termin: ${formatDateDE(b.nextDate)}` : "Nächster Termin: —";

          return (
            <div key={b.id} className="card">
              <div className="topRow">
                <div className="avatar" aria-label={b.name}>
                  {b.imageUrl ? <img src={cleanUrl(b.imageUrl)} alt={b.name} className="avatarImg" /> : initials(b.name)}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className="name">{b.name}</div>
                  <div className="meta">{addr ? addr : `/b/${b.slug}`}</div>
                </div>

                <div className="chip">{nextLabel}</div>
              </div>

              <div className="actions">
                <a href={`/b/${b.slug}`} className="btnGhost">
                  Profil ansehen
                </a>
                <a href={`/b/${b.slug}/book`} className="btnPrimary">
                  Termin buchen
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hint">Hinweis: Für eine Buchung ist ein Kunden-Login erforderlich.</div>
    </div>
  );
}