"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = "https://frisuer-app.onrender.com";

type Service = { key: string; name: string; durationMin: number };

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
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) throw new Error(d.error);
        setBarber(d.barber);
        setServices(Array.isArray(d.services) ? d.services : []);
      })
      .catch((e) => setError(e?.message || "Fehler"))
      .finally(() => setLoading(false));
  }, [slug]);

  const address = useMemo(() => {
    if (!barber) return "";
    const parts = [
      barber.street,
      [barber.postalCode, barber.city].filter(Boolean).join(" "),
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

  if (loading) return <div style={{ padding: 20 }}>Lade...</div>;
  if (error)
    return (
      <div style={{ padding: 20, color: "crimson" }}>
        <b>{error}</b>
      </div>
    );
  if (!barber) return <div style={{ padding: 20 }}>Nicht gefunden.</div>;

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "end",
          marginBottom: 16,
        }}
      >
        <div>
          <a
            href="/book"
            style={{ textDecoration: "none", color: "#111", fontWeight: 900 }}
          >
            ← Friseur wechseln
          </a>
          <h1 style={{ margin: "10px 0 4px" }}>{barber.name}</h1>
          <div style={{ color: "#666" }}>
            Profil · Services · Online Buchung
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
          <a
            href={`/b/${barber.slug}/book`}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Termin buchen
          </a>

          <div
            style={{
              display: "flex",
              gap: 10,
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            <a
              href="/login"
              style={{ color: "#111", textDecoration: "none" }}
            >
              Login
            </a>
            <a
              href="/register"
              style={{
                color: "#111",
                textDecoration: "none",
                opacity: 0.8,
              }}
            >
              Registrieren
            </a>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* LEFT */}
        <div style={{ display: "grid", gap: 16 }}>
          <section
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 14,
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>
              Über mich
            </div>
            <div style={{ lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {barber.bio?.trim()
                ? barber.bio
                : "Hier kann der Friseur eine kurze Bio schreiben."}
            </div>
          </section>

          <section
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 14,
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 900 }}>
              Services ({services.length})
            </div>

            {services.length === 0 ? (
              <div style={{ marginTop: 10, color: "#666" }}>
                Keine Services verfügbar.
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {services.map((s) => (
                  <div
                    key={s.key}
                    style={{
                      border: "1px solid #f0f0f0",
                      borderRadius: 12,
                      padding: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {s.durationMin} min
                      </div>
                    </div>

                    <a
                      href={`/b/${barber.slug}/book?serviceKey=${encodeURIComponent(
                        s.key
                      )}`}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #111",
                        background: "#111",
                        color: "#fff",
                        fontWeight: 900,
                        textDecoration: "none",
                        fontSize: 12,
                      }}
                    >
                      Buchen →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside
          style={{
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 14,
            background: "#fff",
            position: "sticky",
            top: 16,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 10 }}>
            Kontakt
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>
                Adresse
              </div>
              <div style={{ fontWeight: 900 }}>
                {address || "—"}
              </div>
            </div>

            {barber.phone && (
              <a
                href={`tel:${barber.phone}`}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  textDecoration: "none",
                  fontWeight: 900,
                }}
              >
                Anrufen →
              </a>
            )}

            {instaUrl && (
              <a
                href={instaUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  textDecoration: "none",
                  fontWeight: 900,
                }}
              >
                Instagram →
              </a>
            )}

            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  textDecoration: "none",
                  fontWeight: 900,
                }}
              >
                Website →
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}