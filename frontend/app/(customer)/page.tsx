"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

type Barber = {
  id: number;
  name: string;
  slug: string;
  city?: string | null;
  street?: string | null;
  postalCode?: string | null;
  imageUrl?: string | null;
  nextDate?: string | null;
  isFavorite?: boolean;
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
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [me, setMe] = useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  async function loadMeAndProtect() {
    setLoadingMe(true);

    try {
      const token = getTokenSafe();

      if (!token) {
        window.location.replace("/login");
        return;
      }

      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.replace("/login");
        return;
      }

      const meData = data as Me;
      setMe(meData);

      if (meData.role === "BARBER") {
        window.location.replace("/admin");
        return;
      }

      if (meData.role !== "CUSTOMER") {
        window.location.replace("/login");
        return;
      }

      setAuthorized(true);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("/login");
    } finally {
      setLoadingMe(false);
    }
  }

  async function loadFavorites(isRefresh = false) {
    try {
      const token = getTokenSafe();

      if (!token) {
        window.location.replace("/login");
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoadingFavorites(true);
      }

      setError("");

      const res = await fetch(`${API_BASE}/favorites/barbers`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const raw = await res.text();
      let data: any = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      if (!res.ok) {
        throw new Error(data?.error || "Fehler beim Laden deiner Favoriten");
      }

      setBarbers(Array.isArray(data?.barbers) ? data.barbers : []);
    } catch (err: any) {
      console.log("LOAD FAVORITES ERROR:", err?.message);
      setError("Fehler beim Laden deiner Favoriten");
    } finally {
      setLoadingFavorites(false);
      setRefreshing(false);
    }
  }

  async function removeFavorite(barberId: number) {
    try {
      const token = getTokenSafe();

      if (!token) {
        window.location.replace("/login");
        return;
      }

      await fetch(`${API_BASE}/favorites/barbers/${barberId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setBarbers((prev) => prev.filter((b) => b.id !== barberId));
    } catch (err: any) {
      console.log("REMOVE FAVORITE ERROR:", err?.message);
    }
  }

  useEffect(() => {
    loadMeAndProtect();
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadFavorites();
  }, [authorized]);

  const fn = firstName(me?.customer?.name ?? "");
  const titleText = loadingMe ? "Lade..." : `Hallo ${fn || "👋"}`;
  const subText =
    "Hier siehst du deine favorisierten Friseure für den schnellen Zugriff.";

  if (loadingMe || !authorized) {
    return (
      <div
        style={{
          padding: 20,
          maxWidth: 1020,
          margin: "0 auto",
          color: "#666",
          fontWeight: 800,
        }}
      >
        Lade...
      </div>
    );
  }

  return (
    <div className="page">
      <style jsx>{`
        .page {
          padding: 16px;
          padding-bottom: 32px;
          box-sizing: border-box;
          background: #fff;
        }

        .hero {
          margin-bottom: 18px;
        }

        .title {
          margin: 0;
          font-size: 34px;
          line-height: 36px;
          font-weight: 900;
          letter-spacing: -0.7px;
          color: #111;
        }

        .sub {
          color: #666;
          margin-top: 10px;
          font-size: 16px;
          line-height: 23px;
          max-width: 680px;
        }

        .topActions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .refreshBtn,
        .searchBtn {
          min-height: 44px;
          border-radius: 14px;
          padding: 0 14px;
          font-weight: 900;
          font-size: 14px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .refreshBtn {
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
        }

        .refreshBtn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .searchBtn {
          border: 1px solid #111;
          background: #111;
          color: #fff;
        }

        .alertErr {
          margin-bottom: 12px;
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
          margin-bottom: 14px;
        }

        .emptyTitle {
          color: #777;
          font-weight: 700;
        }

        .emptySub {
          color: #777;
          margin-top: 6px;
          line-height: 20px;
        }

        .cards {
          display: grid;
          gap: 14px;
        }

        .card {
          border: 1px solid #e9e9e9;
          border-radius: 24px;
          padding: 16px;
          background: #fff;
        }

        .topRow {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .avatar {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          background: #111;
          color: #fff;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-weight: 900;
          font-size: 18px;
        }

        .avatarImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .content {
          flex: 1;
          min-width: 0;
        }

        .name {
          font-size: 20px;
          font-weight: 900;
          color: #111;
          line-height: 1.2;
          word-break: break-word;
        }

        .meta {
          margin-top: 4px;
          color: #666;
          font-size: 14px;
          line-height: 20px;
          word-break: break-word;
        }

        .nextPill {
          margin-top: 10px;
          display: inline-flex;
          align-self: flex-start;
          border: 1px solid #111;
          background: #111;
          border-radius: 999px;
          padding: 8px 12px;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
        }

        .heartBtn {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 1px solid #f0d3d3;
          background: #fff5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .actions {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }

        .btnGhost,
        .btnPrimary {
          flex: 1;
          min-height: 48px;
          border-radius: 14px;
          padding: 0 12px;
          font-weight: 900;
          font-size: 14px;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .btnGhost {
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
        }

        .btnPrimary {
          border: 1px solid #111;
          background: #111;
          color: #fff;
        }

        .loadingText {
          padding: 20px 0;
          color: #666;
          font-weight: 800;
        }

        @media (min-width: 760px) {
          .cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 420px) {
          .actions {
            flex-direction: column;
          }

          .title {
            font-size: 32px;
          }
        }
      `}</style>

      <div className="hero">
        <h1 className="title">{titleText}</h1>
        <div className="sub">{subText}</div>

        <div className="topActions">
          <button
            type="button"
            onClick={() => loadFavorites(true)}
            disabled={refreshing || loadingFavorites}
            className="refreshBtn"
          >
            {refreshing || loadingFavorites ? "Lädt..." : "Aktualisieren"}
          </button>

          <a href="/search" className="searchBtn">
            Friseure suchen
          </a>
        </div>
      </div>

      {loadingFavorites ? <div className="loadingText">Lade Favoriten...</div> : null}

      {error ? <div className="alertErr">{error}</div> : null}

      {!loadingFavorites && barbers.length === 0 ? (
        <div className="emptyCard">
          <div className="emptyTitle">Noch keine Favoriten vorhanden.</div>
          <div className="emptySub">
            Öffne den neuen Suche-Tab und markiere Friseure mit dem Herz.
          </div>
        </div>
      ) : null}

      <div className="cards">
        {barbers.map((b) => {
          const addr =
            [
              b.street,
              [b.postalCode, b.city].filter(Boolean).join(" "),
            ]
              .filter(Boolean)
              .join(", ") || null;

          const nextLabel = b.nextDate
            ? `Nächster Termin: ${formatDateDE(b.nextDate)}`
            : "Nächster Termin: —";

          return (
            <article key={b.id} className="card">
              <div className="topRow">
                <div className="avatar" aria-label={b.name}>
                  {b.imageUrl ? (
                    <img
                      src={cleanUrl(b.imageUrl)}
                      alt={b.name}
                      className="avatarImg"
                    />
                  ) : (
                    initials(b.name)
                  )}
                </div>

                <div className="content">
                  <div className="name">{b.name}</div>
                  <div className="meta">{addr ? addr : `/b/${b.slug}`}</div>
                  <div className="nextPill">{nextLabel}</div>
                </div>

                <button
                  type="button"
                  onClick={() => removeFavorite(b.id)}
                  className="heartBtn"
                  aria-label="Aus Favoriten entfernen"
                >
                  <Heart size={18} color="#b42318" fill="#b42318" />
                </button>
              </div>

              <div className="actions">
                <a href={`/b/${b.slug}`} className="btnGhost">
                  Profil ansehen
                </a>

                <a href={`/b/${b.slug}/book`} className="btnPrimary">
                  Termin buchen
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}