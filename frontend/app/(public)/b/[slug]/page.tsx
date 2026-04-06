"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

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
};

function cleanUrl(u: string) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return "https://" + s;
}

export default function PublicBarberProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "");

  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setError("");

    fetch(`${API_BASE}/barbers/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.error || "Load failed");
        return d;
      })
      .then((d) => {
        setBarber(d?.barber ?? null);
        setServices(Array.isArray(d?.services) ? d.services : []);
      })
      .catch((e) => setError(e?.message || "Fehler"))
      .finally(() => setLoading(false));
  }, [slug]);

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

  if (loading) {
    return (
      <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ color: "#666" }}>Lade Profil...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            padding: 14,
            border: "1px solid #f1c7c7",
            background: "#fff5f5",
            borderRadius: 16,
            color: "#8a1c1c",
            fontWeight: 800,
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            padding: 14,
            border: "1px solid #eee",
            background: "#fff",
            borderRadius: 16,
            color: "#666",
            fontWeight: 700,
          }}
        >
          Friseur nicht gefunden.
        </div>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    border: "1px solid #e9e9e9",
    borderRadius: 24,
    background: "#fff",
    padding: 18,
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
    overflow: "hidden",
  };

  const primaryButton: React.CSSProperties = {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 50,
    padding: "0 18px",
    borderRadius: 14,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 15,
  };

  const secondaryButton: React.CSSProperties = {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 46,
    padding: "0 16px",
    borderRadius: 14,
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
  };

  return (
    <div style={{ padding: 20, maxWidth: 1120, margin: "0 auto" }}>
      <style jsx>{`
        @media (max-width: 840px) {
          .heroGrid,
          .infoGrid,
          .serviceGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div style={{ marginBottom: 14 }}>
        <a
          href="/"
          style={{
            textDecoration: "none",
            color: "#111",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          ← Zurück
        </a>
      </div>

      <div
        className="heroGrid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <section style={{ ...cardStyle, padding: 22 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: 999,
                overflow: "hidden",
                border: "1px solid #ececec",
                background: "#fafafa",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                color: "#666",
                flexShrink: 0,
              }}
            >
              {barber.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={barber.imageUrl}
                  alt={barber.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                barber.name.slice(0, 1).toUpperCase()
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, letterSpacing: -0.4 }}>
                {barber.name}
              </h1>

              {address ? (
                <div style={{ marginTop: 8, color: "#555", fontSize: 14, fontWeight: 700 }}>
                  {address}
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <a href={`/b/${barber.slug}/book`} style={primaryButton}>
              Termin buchen
            </a>
          </div>
        </section>

        <aside style={{ ...cardStyle, padding: 22 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Kontakt</div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div>
              <div style={{ color: "#666", fontSize: 12, fontWeight: 800 }}>Adresse</div>
              <div style={{ marginTop: 4, fontWeight: 800 }}>{address || "Keine Adresse hinterlegt."}</div>
            </div>

            <div>
              <div style={{ color: "#666", fontSize: 12, fontWeight: 800 }}>Telefon</div>
              <div style={{ marginTop: 4, fontWeight: 800 }}>{barber.phone || "Keine Telefonnummer hinterlegt."}</div>
            </div>

            {(barber.phone || instaUrl || websiteUrl) && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {barber.phone ? (
                  <a href={`tel:${barber.phone}`} style={secondaryButton}>
                    Anrufen
                  </a>
                ) : null}

                {instaUrl ? (
                  <a href={instaUrl} target="_blank" rel="noreferrer" style={secondaryButton}>
                    Instagram
                  </a>
                ) : null}

                {websiteUrl ? (
                  <a href={websiteUrl} target="_blank" rel="noreferrer" style={secondaryButton}>
                    Website
                  </a>
                ) : null}
              </div>
            )}
          </div>
        </aside>
      </div>

      <div
        className="infoGrid"
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section style={cardStyle}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>Über mich</div>
          <div style={{ marginTop: 10, color: "#333", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
            {barber.bio?.trim()
              ? barber.bio
              : "Hier kann der Friseur einen kurzen Text zu Erfahrung, Stil und Spezialisierung hinterlegen."}
          </div>
        </section>
      </div>

      <section id="services" style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 22 }}>Services</div>

          <a href={`/b/${barber.slug}/book`} style={primaryButton}>
            Jetzt buchen
          </a>
        </div>

        {services.length === 0 ? (
          <div
            style={{
              marginTop: 16,
              border: "1px dashed #e3e3e3",
              borderRadius: 16,
              padding: 16,
              color: "#777",
              background: "#fcfcfc",
            }}
          >
            Aktuell sind keine Services verfügbar.
          </div>
        ) : (
          <div
            className="serviceGrid"
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {services.map((s) => (
              <div
                key={s.key}
                style={{
                  border: "1px solid #ececec",
                  borderRadius: 18,
                  padding: 16,
                  background: "#fff",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 17 }}>{s.name}</div>
                <div style={{ color: "#666", fontSize: 14 }}>{s.durationMin} Minuten</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}