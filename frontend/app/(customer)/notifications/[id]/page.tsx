"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE = "https://frisuer-app.onrender.com";

type Notification = {
  id: number;
  type: "BOOKING_CANCELLED" | "BOOKING_STATUS_CHANGED";
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;

  // ✅ vom Backend (Detail-Endpoint)
  barberSlug?: string | null;
  barberProfileLink?: string | null;
  barberBookLink?: string | null;
};

function getToken() {
  if (typeof window === "undefined") return "";
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

export default function NotificationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params?.id);

  const [item, setItem] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch(`${API_BASE}/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Konnte Nachricht nicht laden.");
        setItem(null);
        return;
      }

      const n = (data?.notification ?? null) as Notification | null;
      setItem(n);

      // ✅ Backup: falls direkt URL geöffnet -> als gelesen markieren
      if (n && !n.isRead) {
        fetch(`${API_BASE}/notifications/${n.id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch (e) {
      console.error(e);
      setError("Fehler beim Laden.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError("Ungültige ID.");
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const details = useMemo(() => extractDetailsFromBody(item?.body ?? ""), [item?.body]);
  const hasSummary = !!(details.friseur || details.service || details.datum || details.timeStr);

  const cleanBody = useMemo(() => {
    if (!item) return "";
    const t = hasSummary ? stripDetailsFromBody(item.body) : item.body;
    if (!t || t === "." || t.length < 3) return "";
    return t;
  }, [item, hasSummary]);

  // ✅ Links: erst vom Backend, sonst fallback via barberSlug
  const barberProfileHref = item?.barberProfileLink ?? (item?.barberSlug ? `/b/${item.barberSlug}` : null);
  const barberBookHref = item?.barberBookLink ?? (item?.barberSlug ? `/b/${item.barberSlug}/book` : null);

  return (
    <div className="page">
      <style jsx>{`
        .page {
          padding: 20px;
          max-width: 860px;
          margin: 0 auto;
        }
        .card {
          border: 1px solid #eee;
          border-radius: 16px;
          background: #fff;
          padding: 14px;
        }
        .top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          align-items: baseline;
        }
        .title {
          font-weight: 1000;
          font-size: 18px;
          margin: 0;
        }
        .time {
          color: #666;
          font-size: 12px;
          font-weight: 900;
        }
        .summary {
          margin-top: 12px;
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 12px;
          background: #fafafa;
          display: grid;
          gap: 6px;
        }
        .body {
          margin-top: 12px;
          color: #222;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .actions {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .btnGhost {
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
          font-weight: 900;
          border-radius: 12px;
          padding: 12px;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
        }
        .btnPrimary {
          border: 1px solid #111;
          background: #111;
          color: #fff;
          font-weight: 1000;
          border-radius: 12px;
          padding: 12px;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
        }
        .err {
          margin-top: 12px;
          padding: 12px;
          border: 1px solid #f2c6c6;
          background: #fff5f5;
          border-radius: 12px;
          color: #8a1c1c;
          font-weight: 900;
        }
        @media (max-width: 520px) {
          .page {
            padding: 14px;
          }
          .actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {loading ? (
        <div style={{ color: "#666" }}>Lädt…</div>
      ) : error ? (
        <div className="err">{error}</div>
      ) : !item ? (
        <div className="err">Nachricht nicht gefunden.</div>
      ) : (
        <div className="card">
          <div className="top">
            <h1 className="title">{item.title}</h1>
            <div className="time">{formatDateTimeBerlinShort(item.createdAt)}</div>
          </div>

          {hasSummary ? (
            <div className="summary">
              {details.friseur ? (
                <div>
                  Friseur: <b>{details.friseur}</b>
                </div>
              ) : null}
              {details.service ? (
                <div>
                  Service: <b>{details.service}</b>
                </div>
              ) : null}
              {details.datum ? (
                <div>
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

          {cleanBody ? <div className="body">{cleanBody}</div> : null}

          <div className="actions">
            <button className="btnGhost" onClick={() => router.back()}>
              Zurück
            </button>

            {barberBookHref ? (
              <a className="btnPrimary" href={barberBookHref}>
                Neu buchen →
              </a>
            ) : (
              <a className="btnPrimary" href="/my-bookings">
                Meine Termine →
              </a>
            )}

            {barberProfileHref ? (
              <a className="btnGhost" href={barberProfileHref}>
                Profil öffnen →
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}