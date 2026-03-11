"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

type Service = { key: string; name: string; durationMin: number };
type Barber = { id: number; name: string; slug: string; phone: string | null };

type Me = {
  id: number;
  email: string;
  role: "CUSTOMER" | "BARBER";
  customer: { id: number; name: string; phone: string | null } | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function minToHHMM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}
function todayYYYYMMDD() {
  return new Date().toISOString().slice(0, 10);
}
function getTokenSafe() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("token") || "";
}

function buildNextUrl(slug: string, serviceKey?: string) {
  const base = `/b/${encodeURIComponent(slug)}/book`;
  if (serviceKey) return `${base}?serviceKey=${encodeURIComponent(serviceKey)}`;
  return base;
}

export default function BarberBookPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "");

  const sp = useSearchParams();
  const presetServiceKey = sp.get("serviceKey") || "";

  const today = todayYYYYMMDD();

  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [me, setMe] = useState<Me | null>(null);

  const [selectedServiceKey, setSelectedServiceKey] = useState(presetServiceKey);
  const [selectedDate, setSelectedDate] = useState(today);

  const [availableTimes, setAvailableTimes] = useState<number[]>([]);
  const [selectedTimeMin, setSelectedTimeMin] = useState<number | null>(null);

  const [note, setNote] = useState("");

  const [busyTimes, setBusyTimes] = useState(false);
  const [busyBooking, setBusyBooking] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // wenn URL ?serviceKey=... sich ändert, übernehmen
  useEffect(() => {
    if (presetServiceKey) setSelectedServiceKey(presetServiceKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetServiceKey]);

  // token nur im Client lesen
  const token = getTokenSafe();
  const isLoggedIn = Boolean(token);

  const isCustomer = me?.role === "CUSTOMER";
  const isAuthedCustomer = isLoggedIn && isCustomer;

  const customerName = (me?.customer?.name ?? "").trim();
  const customerPhone = (me?.customer?.phone ?? "").trim();

  const nextUrl = useMemo(
    () => buildNextUrl(slug, selectedServiceKey || presetServiceKey),
    [slug, selectedServiceKey, presetServiceKey]
  );
  const loginHref = `/login?next=${encodeURIComponent(nextUrl)}`;
  const registerHref = `/register?next=${encodeURIComponent(nextUrl)}`;

  // load barber + services
  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setError("");
    setMessage("");

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

  // load me (optional)
  useEffect(() => {
    const t = getTokenSafe();
    if (!t) return;

    fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setMe(d as Me);
      })
      .catch(() => null);
  }, []);

  const selectedService = useMemo(
    () => services.find((s) => s.key === selectedServiceKey) ?? null,
    [services, selectedServiceKey]
  );

  const canLoadTimes = Boolean(selectedServiceKey && selectedDate);

  async function loadTimes() {
    setBusyTimes(true);
    setError("");
    setMessage("");
    setSelectedTimeMin(null);

    try {
      const res = await fetch(
        `${API_BASE}/public/available-times?barberSlug=${encodeURIComponent(slug)}&date=${encodeURIComponent(
          selectedDate
        )}&serviceKey=${encodeURIComponent(selectedServiceKey)}`
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Fehler beim Laden");

      setAvailableTimes(Array.isArray(data?.times) ? data.times : []);
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
      setAvailableTimes([]);
    } finally {
      setBusyTimes(false);
    }
  }

  // auto-load times when selection changes
  useEffect(() => {
    if (canLoadTimes) loadTimes();
    else {
      setAvailableTimes([]);
      setSelectedTimeMin(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceKey, selectedDate]);

  function redirectToLogin() {
    if (typeof window === "undefined") return;
    window.location.href = loginHref;
  }

  async function bookNow() {
    setBusyBooking(true);
    setError("");
    setMessage("");

    try {
      if (!isAuthedCustomer) {
        redirectToLogin();
        return;
      }

      const t = getTokenSafe();
      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({
          barberSlug: slug,
          date: selectedDate,
          serviceKey: selectedServiceKey,
          exactTime: selectedTimeMin,
          note: note.trim() ? note.trim() : null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Buchung fehlgeschlagen");

      setMessage(`✅ Gebucht: ${selectedDate} um ${minToHHMM(selectedTimeMin!)}`);
      setNote("");
      await loadTimes();
    } catch (e: any) {
      setError(e?.message ?? "Fehler beim Buchen");
    } finally {
      setBusyBooking(false);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Lade…</div>;

  if (error && !barber) {
    return (
      <div style={{ padding: 20 }}>
        <div
          style={{
            padding: 12,
            border: "1px solid #f2c6c6",
            background: "#fff5f5",
            borderRadius: 12,
            color: "#8a1c1c",
          }}
        >
          <b>{error}</b>
        </div>
      </div>
    );
  }

  if (!barber) return <div style={{ padding: 20 }}>Nicht gefunden.</div>;

  const disableBook =
    busyBooking ||
    (isLoggedIn && me?.role === "BARBER") ||
    !selectedServiceKey ||
    !selectedDate ||
    selectedTimeMin == null;

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      {/* Header (mobile-friendly) */}
      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <a
          href={`/b/${barber.slug}`}
          style={{ textDecoration: "none", color: "#111", fontWeight: 900 }}
        >
          ← Zurück zum Profil
        </a>

        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 14,
            background: "#fff",
            display: "grid",
            gap: 6,
          }}
        >
          <h1 style={{ margin: 0 }}>Termin buchen</h1>
          <div style={{ color: "#666" }}>
            Friseur: <b>{barber.name}</b>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            {!isLoggedIn ? (
              <>
                <a
                  href={loginHref}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #111",
                    background: "#111",
                    color: "#fff",
                    fontWeight: 900,
                    textDecoration: "none",
                  }}
                >
                  Login
                </a>
                <a
                  href={registerHref}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#fff",
                    color: "#111",
                    fontWeight: 900,
                    textDecoration: "none",
                  }}
                >
                  Registrieren
                </a>
              </>
            ) : isCustomer ? (
              <a
                href="/my-bookings"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#111",
                  fontWeight: 900,
                  textDecoration: "none",
                }}
              >
                Meine Termine
              </a>
            ) : (
              <div style={{ fontSize: 12, color: "crimson", fontWeight: 900 }}>
                Als Friseur eingeloggt – zum Buchen bitte als Kunde einloggen.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {message ? (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            border: "1px solid #b7ebc6",
            background: "#f0fff4",
            borderRadius: 12,
            color: "#1f7a37",
          }}
        >
          <b>{message}</b>
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginBottom: 12,
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

      <div style={{ display: "grid", gap: 14 }}>
        {/* Kontakt */}
        <section style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Kontakt</div>

          {isAuthedCustomer ? (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ color: "#666", fontSize: 12 }}>
                Eingeloggt als: <b>{me?.email}</b>
              </div>

              <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fafafa" }}>
                <div>
                  Name: <b>{customerName || "—"}</b>
                </div>
                <div style={{ marginTop: 4 }}>
                  Telefon: <b>{customerPhone || "—"}</b>
                </div>

                {!customerName || !customerPhone ? (
                  <div style={{ marginTop: 10, color: "crimson", fontWeight: 900, fontSize: 12 }}>
                    Bitte Profil vervollständigen (Name + Telefon), sonst kannst du nicht buchen.
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ color: "#666" }}>Buchung nur mit Kunden-Login möglich.</div>

              {!isLoggedIn ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <a
                    href={loginHref}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #111",
                      background: "#111",
                      color: "#fff",
                      fontWeight: 900,
                      textDecoration: "none",
                    }}
                  >
                    Login
                  </a>
                  <a
                    href={registerHref}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#fff",
                      color: "#111",
                      fontWeight: 900,
                      textDecoration: "none",
                    }}
                  >
                    Registrieren
                  </a>
                </div>
              ) : null}

              {isLoggedIn && me?.role === "BARBER" ? (
                <div style={{ fontSize: 12, color: "crimson", fontWeight: 900 }}>
                  Du bist als Friseur eingeloggt. Zum Buchen bitte als Kunde einloggen oder ausloggen.
                </div>
              ) : null}
            </div>
          )}
        </section>

        {/* Termin */}
        <section style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Termin</div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Service</div>
              <select
                value={selectedServiceKey}
                onChange={(e) => {
                  setSelectedServiceKey(e.target.value);
                  setMessage("");
                  setError("");
                }}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              >
                <option value="">Bitte wählen</option>
                {services.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name} – {s.durationMin} min
                  </option>
                ))}
              </select>

              {selectedService ? (
                <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                  Dauer: <b>{selectedService.durationMin} min</b>
                </div>
              ) : null}
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Datum</div>
              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setMessage("");
                  setError("");
                }}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>Uhrzeit</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {!canLoadTimes ? "Service + Datum wählen" : busyTimes ? "lädt…" : `${availableTimes.length} Slots`}
                </div>
              </div>

              {!canLoadTimes ? (
                <div style={{ marginTop: 8, color: "#666", fontSize: 13 }}>Bitte zuerst Service und Datum auswählen.</div>
              ) : busyTimes ? (
                <div style={{ marginTop: 8, color: "#666" }}>Verfügbare Zeiten werden geladen…</div>
              ) : availableTimes.length === 0 ? (
                <div style={{ marginTop: 8, color: "#666" }}>Keine freien Zeiten. Versuch ein anderes Datum/Service.</div>
              ) : (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {availableTimes.map((min) => {
                    const selected = selectedTimeMin === min;
                    return (
                      <button
                        key={min}
                        onClick={() => setSelectedTimeMin(min)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: selected ? "1px solid #111" : "1px solid #ddd",
                          background: selected ? "#111" : "#fff",
                          color: selected ? "#fff" : "#111",
                          fontWeight: 900,
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        {minToHHMM(min)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Notiz (optional)</div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="z.B. Seiten kurz"
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
            </div>

            <button
              onClick={bookNow}
              disabled={disableBook}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 900,
                cursor: busyBooking ? "not-allowed" : "pointer",
                opacity: disableBook ? 0.7 : 1,
              }}
              title={!isAuthedCustomer ? "Du wirst zum Login weitergeleitet" : ""}
            >
              {busyBooking ? "Buche..." : "Termin buchen"}
            </button>

            <div style={{ fontSize: 12, color: "#666" }}>
              Hinweis: Buchung nur mit Login möglich. Name/Telefon kommen aus deinem Profil.
            </div>
          </div>
        </section>

        {/* Zusammenfassung (untereinander, mobile friendly) */}
        <section style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Zusammenfassung</div>

          <div style={{ marginTop: 12, display: "grid", gap: 10, fontSize: 13 }}>
            <div>
              <div style={{ color: "#666", fontSize: 12 }}>Friseur</div>
              <div style={{ fontWeight: 900 }}>{barber.name}</div>
            </div>

            <div>
              <div style={{ color: "#666", fontSize: 12 }}>Service</div>
              <div style={{ fontWeight: 700 }}>
                {selectedService ? `${selectedService.name} (${selectedService.durationMin} min)` : "—"}
              </div>
            </div>

            <div>
              <div style={{ color: "#666", fontSize: 12 }}>Datum</div>
              <div style={{ fontWeight: 700 }}>{selectedDate || "—"}</div>
            </div>

            <div>
              <div style={{ color: "#666", fontSize: 12 }}>Uhrzeit</div>
              <div style={{ fontWeight: 700 }}>{selectedTimeMin != null ? minToHHMM(selectedTimeMin) : "—"}</div>
            </div>

            <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
              <div style={{ color: "#666", fontSize: 12 }}>Kontakt</div>
              <div style={{ marginTop: 6 }}>
                Name: <b>{isAuthedCustomer ? (customerName || "—") : "—"}</b>
              </div>
              <div>
                Telefon: <b>{isAuthedCustomer ? (customerPhone || "—") : "—"}</b>
              </div>
            </div>

            {note.trim() ? (
              <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
                <div style={{ color: "#666", fontSize: 12 }}>Notiz</div>
                <div style={{ fontWeight: 700 }}>{note.trim()}</div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}