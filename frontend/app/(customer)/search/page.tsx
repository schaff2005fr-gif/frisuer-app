"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function getUser() {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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

export default function CustomerSearchPage() {
  const router = useRouter();

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBarbers, setLoadingBarbers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const token = getToken();
    const user = getUser();

    if (!token || !user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "CUSTOMER") {
      router.replace("/admin");
      return;
    }

    setLoading(false);
    loadBarbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBarbers(isRefresh = false) {
    try {
      const token = getToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoadingBarbers(true);
      }

      setError("");

      const res = await fetch(`${API_BASE}/barbers`, {
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
        throw new Error(data?.error || "Fehler beim Laden der Friseure");
      }

      setBarbers(Array.isArray(data?.barbers) ? data.barbers : []);
    } catch (err: any) {
      console.log("LOAD BARBERS ERROR:", err?.message);
      setError("Fehler beim Laden der Friseure");
    } finally {
      setLoadingBarbers(false);
      setRefreshing(false);
    }
  }

  async function toggleFavorite(barber: Barber) {
    try {
      const token = getToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      if (barber.isFavorite) {
        await fetch(`${API_BASE}/favorites/barbers/${barber.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        await fetch(`${API_BASE}/favorites/barbers/${barber.id}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
      }

      setBarbers((prev) =>
        prev.map((b) =>
          b.id === barber.id ? { ...b, isFavorite: !b.isFavorite } : b
        )
      );
    } catch (err: any) {
      console.log("TOGGLE FAVORITE ERROR:", err?.message);
    }
  }

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

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontWeight: 800,
        }}
      >
        Lade Suche...
      </div>
    );
  }

  return (
    <div style={{ background: "#fff" }}>
      <style jsx>{`
        .page {
          padding: 16px;
          padding-bottom: 32px;
          box-sizing: border-box;
        }

        .headline {
          font-size: 34px;
          line-height: 36px;
          font-weight: 900;
          color: #111;
          margin: 0;
          letter-spacing: -0.7px;
        }

        .sub {
          color: #666;
          margin-top: 10px;
          font-size: 16px;
          line-height: 23px;
          max-width: 680px;
        }

        .searchCard {
          margin-top: 16px;
          border: 1px solid #e9e9e9;
          border-radius: 24px;
          padding: 16px;
          background: #fff;
        }

        .searchTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 12px;
        }

        .searchTitle {
          font-weight: 900;
          font-size: 18px;
          color: #111;
        }

        .searchSub {
          color: #666;
          font-size: 13px;
          margin-top: 4px;
        }

        .countPill {
          border: 1px solid #e4e4e4;
          border-radius: 999px;
          background: #fafafa;
          padding: 7px 10px;
          color: #666;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .input {
          width: 100%;
          height: 52px;
          border-radius: 14px;
          border: 1px solid #dedede;
          background: #fff;
          padding: 0 16px;
          font-size: 16px;
          color: #111;
          box-sizing: border-box;
          outline: none;
        }

        .input:focus {
          border-color: #111;
        }

        .toolbar {
          display: flex;
          gap: 10px;
          margin: 14px 0;
          align-items: center;
          justify-content: space-between;
        }

        .refreshBtn {
          min-height: 42px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
          font-weight: 900;
          cursor: pointer;
        }

        .refreshBtn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .errorBox {
          margin-bottom: 12px;
          padding: 14px 16px;
          border: 1px solid #f1c7c7;
          background: #fff5f5;
          border-radius: 16px;
          color: #8a1c1c;
          font-weight: 800;
        }

        .emptyBox {
          border: 1px dashed #e3e3e3;
          border-radius: 20px;
          padding: 16px;
          background: #fcfcfc;
          margin-bottom: 14px;
          color: #777;
        }

        .list {
          display: grid;
          gap: 14px;
        }

        .card {
          border: 1px solid #e9e9e9;
          border-radius: 24px;
          padding: 16px;
          background: #fff;
        }

        .cardTop {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .avatar {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          background: #111;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #fff;
          font-weight: 900;
          font-size: 18px;
        }

        .avatar img {
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

        .location {
          margin-top: 5px;
          color: #666;
          font-size: 13px;
          line-height: 18px;
          font-weight: 700;
        }

        .nextPill {
          margin-top: 10px;
          display: inline-flex;
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
          border: 1px solid #ddd;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .heartBtnActive {
          border-color: #f0d3d3;
          background: #fff5f5;
        }

        .actions {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }

        .secondaryBtn,
        .primaryBtn {
          flex: 1;
          min-height: 48px;
          border-radius: 14px;
          padding: 0 12px;
          font-weight: 900;
          cursor: pointer;
          font-size: 14px;
        }

        .secondaryBtn {
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
        }

        .primaryBtn {
          border: 1px solid #111;
          background: #111;
          color: #fff;
        }

        @media (min-width: 760px) {
          .list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 420px) {
          .actions {
            flex-direction: column;
          }

          .headline {
            font-size: 32px;
          }
        }
      `}</style>

      <main className="page">
        <section style={{ marginBottom: 18 }}>
          <h1 className="headline">Friseure suchen</h1>

          <div className="sub">
            Suche nach Namen, Stadt oder Profil und markiere deine Favoriten.
          </div>

          <div className="searchCard">
            <div className="searchTop">
              <div style={{ flex: 1 }}>
                <div className="searchTitle">Suche</div>
                <div className="searchSub">
                  Nach Name, Stadt oder Profil suchen
                </div>
              </div>

              <div className="countPill">
                {loadingBarbers ? "…" : `${filtered.length} Friseur(e)`}
              </div>
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="z. B. Ali, Essen, barber-essen..."
              className="input"
            />
          </div>
        </section>

        <div className="toolbar">
          <button
            type="button"
            onClick={() => loadBarbers(true)}
            disabled={refreshing || loadingBarbers}
            className="refreshBtn"
          >
            {refreshing || loadingBarbers ? "Lädt..." : "Aktualisieren"}
          </button>
        </div>

        {error ? <div className="errorBox">{error}</div> : null}

        {!loadingBarbers && filtered.length === 0 ? (
          <div className="emptyBox">Keine Friseure gefunden.</div>
        ) : null}

        {loadingBarbers ? (
          <div
            style={{
              padding: "24px 0",
              color: "#666",
              fontWeight: 800,
            }}
          >
            Lade Friseure...
          </div>
        ) : null}

        <div className="list">
          {filtered.map((b) => {
            const nextLabel = b.nextDate
              ? `Nächster Termin: ${formatDateDE(b.nextDate)}`
              : "Nächster Termin: —";

            const location = [b.street, b.postalCode, b.city]
              .filter(Boolean)
              .join(", ");

            return (
              <article key={b.id} className="card">
                <div className="cardTop">
                  <div className="avatar">
                    {b.imageUrl ? (
                      <img src={cleanUrl(b.imageUrl)} alt={b.name} />
                    ) : (
                      initials(b.name)
                    )}
                  </div>

                  <div className="content">
                    <div className="name">{b.name}</div>

                    {location ? <div className="location">{location}</div> : null}

                    <div className="nextPill">{nextLabel}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(b)}
                    className={`heartBtn ${b.isFavorite ? "heartBtnActive" : ""}`}
                    aria-label={
                      b.isFavorite
                        ? "Aus Favoriten entfernen"
                        : "Zu Favoriten hinzufügen"
                    }
                  >
                    <Heart
                      size={18}
                      color={b.isFavorite ? "#b42318" : "#666"}
                      fill={b.isFavorite ? "#b42318" : "transparent"}
                    />
                  </button>
                </div>

                <div className="actions">
                  <button
                    type="button"
                    onClick={() => router.push(`/b/${b.slug}`)}
                    className="secondaryBtn"
                  >
                    Profil ansehen
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/b/${b.slug}/book`)}
                    className="primaryBtn"
                  >
                    Termin buchen
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}