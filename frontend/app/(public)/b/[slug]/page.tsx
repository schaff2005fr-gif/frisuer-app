"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Heart } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

type Service = {
  key: string;
  name: string;
  durationMin: number;
};

type Barber = {
  id: number;
  name: string;
  slug: string;
  phone: string | null;
  bio?: string | null;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  instagram?: string | null;
  website?: string | null;
  imageUrl?: string | null;
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
  const s = String(u || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return "https://" + s;
}

function buildBookUrl(slug: string) {
  return `/b/${encodeURIComponent(slug)}/book`;
}

function buildRegisterUrl(slug: string) {
  const next = buildBookUrl(slug);
  return `/register?next=${encodeURIComponent(next)}`;
}

function getBookingHref(slug: string) {
  const token = getToken();

  if (!token) {
    return buildRegisterUrl(slug);
  }

  return buildBookUrl(slug);
}

export default function PublicBarberProfilePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = String(params?.slug ?? "");

  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  const user = getUser();
  const isCustomer = user?.role === "CUSTOMER";

  useEffect(() => {
    if (!slug) return;
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      const headers =
        token && isCustomer
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined;

      const res = await fetch(`${API_BASE}/barbers/${encodeURIComponent(slug)}`, {
        method: "GET",
        headers,
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
        throw new Error(data?.error || "Fehler beim Laden");
      }

      setBarber(data?.barber ?? null);
      setServices(Array.isArray(data?.services) ? data.services : []);
    } catch (e: any) {
      setError(e?.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  const address = useMemo(() => {
    if (!barber) return "";

    const parts = [
      barber.street?.trim(),
      [barber.postalCode?.trim(), barber.city?.trim()].filter(Boolean).join(" "),
    ].filter(Boolean);

    return parts.join(", ");
  }, [barber]);

  const instaUrl = useMemo(() => {
    const raw = String(barber?.instagram ?? "").trim();
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;

    const handle = raw.startsWith("@") ? raw.slice(1) : raw;
    return `https://instagram.com/${handle}`;
  }, [barber]);

  const websiteUrl = useMemo(() => {
    const raw = String(barber?.website ?? "").trim();
    return raw ? cleanUrl(raw) : "";
  }, [barber]);

  async function toggleFavorite() {
    if (!barber || favoriteBusy) return;

    const token = getToken();
    const user = getUser();

    if (!token || user?.role !== "CUSTOMER") {
      router.push(`/login?next=${encodeURIComponent(`/b/${barber.slug}`)}`);
      return;
    }

    try {
      setFavoriteBusy(true);

      if (barber.isFavorite) {
        await fetch(`${API_BASE}/favorites/barbers/${barber.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setBarber((prev) => (prev ? { ...prev, isFavorite: false } : prev));
      } else {
        await fetch(`${API_BASE}/favorites/barbers/${barber.id}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        setBarber((prev) => (prev ? { ...prev, isFavorite: true } : prev));
      }
    } catch (e) {
      console.log("TOGGLE FAVORITE ERROR:", e);
    } finally {
      setFavoriteBusy(false);
    }
  }

  function goToBooking() {
    if (!barber) return;
    router.push(getBookingHref(barber.slug));
  }

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
        Lade Profil...
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <style jsx>{styles}</style>

        <button type="button" onClick={() => router.back()} className="backBtn">
          ← Zurück
        </button>

        <div className="errorBox">{error}</div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="page">
        <style jsx>{styles}</style>

        <button type="button" onClick={() => router.back()} className="backBtn">
          ← Zurück
        </button>

        <div className="emptyBox">Friseur nicht gefunden.</div>
      </div>
    );
  }

  const bookingHref = getBookingHref(barber.slug);

  return (
    <div className="page">
      <style jsx>{styles}</style>

      <button type="button" onClick={() => router.back()} className="backBtn">
        ← Zurück
      </button>

      <section className="card heroCard">
        <div className="profileRow">
          <div className="avatar">
            {barber.imageUrl ? (
              <img src={cleanUrl(barber.imageUrl)} alt={barber.name} />
            ) : (
              <span>{barber.name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>

          <div className="profileInfo">
            <h1>{barber.name}</h1>

            {address ? <div className="address">{address}</div> : null}
          </div>
        </div>

        <div className="heroActions">
          <a href={bookingHref} className="primaryBtn">
            Termin buchen
          </a>

          {isCustomer ? (
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={favoriteBusy}
              className={`favoriteBtn ${barber.isFavorite ? "favoriteActive" : ""}`}
              aria-label={
                barber.isFavorite
                  ? "Aus Favoriten entfernen"
                  : "Zu Favoriten hinzufügen"
              }
            >
              <Heart
                size={20}
                color={barber.isFavorite ? "#b42318" : "#444"}
                fill={barber.isFavorite ? "#b42318" : "transparent"}
              />
            </button>
          ) : null}
        </div>
      </section>

      <section className="card">
        <h2>Kontakt</h2>

        <div className="contactGrid">
          <div>
            <div className="label">Adresse</div>
            <div className="value">{address || "Keine Adresse hinterlegt."}</div>
          </div>

          <div>
            <div className="label">Telefon</div>
            <div className="value">{barber.phone || "Keine Telefonnummer hinterlegt."}</div>
          </div>

          {(barber.phone || instaUrl || websiteUrl) && (
            <div className="contactActions">
              {barber.phone ? (
                <a href={`tel:${barber.phone}`} className="secondaryBtn">
                  Anrufen
                </a>
              ) : null}

              {instaUrl ? (
                <a
                  href={instaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="secondaryBtn"
                >
                  Instagram
                </a>
              ) : null}

              {websiteUrl ? (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="secondaryBtn"
                >
                  Website
                </a>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Über mich</h2>

        <p className="bio">
          {barber.bio?.trim()
            ? barber.bio
            : "Hier kann der Friseur einen kurzen Text zu Erfahrung, Stil und Spezialisierung hinterlegen."}
        </p>
      </section>

      <section className="card">
        <div className="sectionTop">
          <h2>Services</h2>

          <a href={bookingHref} className="smallPrimaryBtn">
            Jetzt buchen
          </a>
        </div>

        {services.length === 0 ? (
          <div className="emptyBox">Aktuell sind keine Services verfügbar.</div>
        ) : (
          <div className="serviceList">
            {services.map((s) => (
              <div key={s.key} className="serviceCard">
                <div className="serviceName">{s.name}</div>
                <div className="serviceDuration">{s.durationMin} Minuten</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const styles = `
  .page {
    padding: 16px;
    padding-bottom: 32px;
    box-sizing: border-box;
    background: #fff;
    max-width: 900px;
    margin: 0 auto;
  }

  .backBtn {
    margin-bottom: 14px;
    border: none;
    background: transparent;
    color: #111;
    font-weight: 900;
    font-size: 14px;
    cursor: pointer;
    padding: 0;
  }

  .card {
    border: 1px solid #e9e9e9;
    border-radius: 24px;
    background: #fff;
    padding: 18px;
    margin-bottom: 16px;
    box-sizing: border-box;
  }

  .heroCard {
    margin-bottom: 16px;
  }

  .profileRow {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .avatar {
    width: 90px;
    height: 90px;
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid #ececec;
    background: #fafafa;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .avatar span {
    font-weight: 900;
    color: #666;
    font-size: 28px;
  }

  .profileInfo {
    flex: 1;
    min-width: 0;
  }

  h1 {
    margin: 0;
    font-size: 28px;
    line-height: 31px;
    font-weight: 900;
    color: #111;
    letter-spacing: -0.5px;
    word-break: break-word;
  }

  .address {
    margin-top: 8px;
    color: #555;
    font-size: 14px;
    font-weight: 700;
    line-height: 20px;
  }

  .heroActions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
  }

  .primaryBtn {
    flex: 1;
    min-height: 50px;
    border-radius: 14px;
    border: 1px solid #111;
    background: #111;
    color: #fff;
    text-decoration: none;
    font-weight: 900;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 18px;
  }

  .favoriteBtn {
    width: 54px;
    min-height: 50px;
    border-radius: 14px;
    border: 1px solid #ddd;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .favoriteBtn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .favoriteActive {
    border-color: #f0d3d3;
    background: #fff5f5;
  }

  h2 {
    margin: 0;
    font-weight: 900;
    font-size: 20px;
    color: #111;
    line-height: 1.2;
  }

  .contactGrid {
    margin-top: 14px;
    display: grid;
    gap: 12px;
  }

  .label {
    color: #666;
    font-size: 12px;
    font-weight: 800;
  }

  .value {
    margin-top: 4px;
    font-weight: 800;
    color: #111;
    line-height: 20px;
    word-break: break-word;
  }

  .contactActions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .secondaryBtn {
    min-height: 46px;
    padding: 0 16px;
    border-radius: 14px;
    border: 1px solid #ddd;
    background: #fff;
    color: #111;
    text-decoration: none;
    font-weight: 800;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .bio {
    margin: 10px 0 0;
    color: #333;
    line-height: 24px;
    white-space: pre-wrap;
  }

  .sectionTop {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    margin-bottom: 16px;
  }

  .smallPrimaryBtn {
    min-height: 46px;
    padding: 0 16px;
    border-radius: 14px;
    border: 1px solid #111;
    background: #111;
    color: #fff;
    text-decoration: none;
    font-weight: 900;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
  }

  .serviceList {
    display: grid;
    gap: 12px;
  }

  .serviceCard {
    border: 1px solid #ececec;
    border-radius: 18px;
    padding: 16px;
    background: #fff;
  }

  .serviceName {
    font-weight: 900;
    font-size: 17px;
    color: #111;
  }

  .serviceDuration {
    color: #666;
    font-size: 14px;
    margin-top: 6px;
  }

  .emptyBox {
    border: 1px dashed #e3e3e3;
    border-radius: 16px;
    padding: 16px;
    background: #fcfcfc;
    color: #777;
    font-weight: 700;
  }

  .errorBox {
    padding: 14px 16px;
    border: 1px solid #f1c7c7;
    background: #fff5f5;
    border-radius: 16px;
    color: #8a1c1c;
    font-weight: 800;
  }

  @media (min-width: 760px) {
    .serviceList {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 430px) {
    .profileRow {
      align-items: flex-start;
    }

    .avatar {
      width: 78px;
      height: 78px;
    }

    h1 {
      font-size: 26px;
      line-height: 29px;
    }

    .contactActions {
      display: grid;
      grid-template-columns: 1fr;
    }

    .sectionTop {
      align-items: flex-start;
      flex-direction: column;
    }

    .smallPrimaryBtn {
      width: 100%;
      box-sizing: border-box;
    }
  }
`;