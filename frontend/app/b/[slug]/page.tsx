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
    const parts = [barber.street, [barber.postalCode, barber.city].filter(Boolean).join(" ")].filter(Boolean);
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <a href="/book" style={{ textDecoration: "none", color: "#111", fontWeight: 900 }}>
            ← Friseur wechseln
          </a>
          <h1 style={{ margin: "10px 0 4px" }}>{barber.name}</h1>
          <div style={{ color: "#666" }}>Profil · Services · Online Buchung</div>
        </div>

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
      </div>

      {/* Layout */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, alignItems: "start" }}>
        {/* LEFT: Bio + Services */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Bio */}
          <section style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Über mich</div>
            <div style={{ color: "#222", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {barber.bio?.trim()
                ? barber.bio
                : "Hier kann der Friseur eine kurze Bio schreiben (Erfahrung, Spezialisierung, Stil, etc.)."}
            </div>
          </section>

          {/* Services */}
          <section style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900 }}>Services</div>
              <div style={{ fontSize: 12, color: "#666" }}>{services.length} verfügbar</div>
            </div>

            {services.length === 0 ? (
              <div style={{ marginTop: 10, color: "#666" }}>Keine Services verfügbar.</div>
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
                      <div style={{ color: "#666", fontSize: 12 }}>{s.durationMin} min</div>
                    </div>

                    <a
                      href={`/b/${barber.slug}/book?serviceKey=${encodeURIComponent(s.key)}`}
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

        {/* RIGHT: Kontakt/Adresse */}
        <aside style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff", position: "sticky", top: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Kontakt</div>

          <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fafafa" }}>
              <div style={{ color: "#666", fontSize: 12 }}>Adresse</div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>{address || "—"}</div>
              {!address ? <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>Noch nicht hinterlegt.</div> : null}
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fafafa" }}>
              <div style={{ color: "#666", fontSize: 12 }}>Telefon</div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>{barber.phone?.trim() || "—"}</div>
              {barber.phone?.trim() ? (
                <a
                  href={`tel:${barber.phone}`}
                  style={{
                    display: "inline-block",
                    marginTop: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#fff",
                    color: "#111",
                    fontWeight: 900,
                    textDecoration: "none",
                    fontSize: 12,
                  }}
                >
                  Anrufen →
                </a>
              ) : (
                <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>Noch nicht hinterlegt.</div>
              )}
            </div>

            {/* Social */}
            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fafafa" }}>
              <div style={{ color: "#666", fontSize: 12 }}>Online</div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {instaUrl ? (
                  <a
                    href={instaUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#fff",
                      color: "#111",
                      fontWeight: 900,
                      textDecoration: "none",
                      fontSize: 12,
                    }}
                  >
                    Instagram →
                  </a>
                ) : (
                  <div style={{ color: "#666", fontSize: 12 }}>Instagram nicht hinterlegt.</div>
                )}

                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#fff",
                      color: "#111",
                      fontWeight: 900,
                      textDecoration: "none",
                      fontSize: 12,
                    }}
                  >
                    Website →
                  </a>
                ) : (
                  <div style={{ color: "#666", fontSize: 12 }}>Website nicht hinterlegt.</div>
                )}
              </div>
            </div>

            <a
              href={`/b/${barber.slug}/book`}
              style={{
                padding: "12px 12px",
                borderRadius: 12,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 900,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Termin buchen
            </a>

            <div style={{ color: "#666", fontSize: 12 }}>
              Hinweis: Buchung ist nur mit Login möglich.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}