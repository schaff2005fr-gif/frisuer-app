"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

type Service = { key: string; name: string; durationMin: number };
type Barber = {
  id: number;
  name: string;
  slug: string;
  phone: string | null;
  imageUrl?: string | null;
};

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

function isoToDisplayDate(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isoToMonthLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}

function getMonthStart(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getMonthEnd(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function dateToISO(d: Date) {
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${year}-${month}-${day}`;
}

function addMonthsToISO(iso: string, delta: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + delta);
  d.setDate(1);
  return dateToISO(d);
}

function isSameMonth(date: Date, monthRefIso: string) {
  const ref = new Date(`${monthRefIso}T00:00:00`);
  return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
}

function buildCalendarDays(monthIso: string) {
  const monthStart = getMonthStart(monthIso);
  const monthEnd = getMonthEnd(monthIso);

  const startWeekday = monthStart.getDay(); // 0 Sonntag
  const days: Date[] = [];

  for (let i = startWeekday; i > 0; i--) {
    const d = new Date(monthStart);
    d.setDate(monthStart.getDate() - i);
    days.push(d);
  }

  for (let day = 1; day <= monthEnd.getDate(); day++) {
    days.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
  }

  while (days.length % 7 !== 0) {
    const d = new Date(monthEnd);
    d.setDate(monthEnd.getDate() + (days.length % 7));
    days.push(d);
  }

  return days;
}

export default function BarberBookPage() {
  const router = useRouter();
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
  const [calendarMonth, setCalendarMonth] = useState(today);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [availableTimes, setAvailableTimes] = useState<number[]>([]);
  const [selectedTimeMin, setSelectedTimeMin] = useState<number | null>(null);

  const [note, setNote] = useState("");

  const [busyTimes, setBusyTimes] = useState(false);
  const [busyBooking, setBusyBooking] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (presetServiceKey) setSelectedServiceKey(presetServiceKey);
  }, [presetServiceKey]);

  const token = getTokenSafe();
  const isLoggedIn = Boolean(token);

  const isCustomer = me?.role === "CUSTOMER";
  const isAuthedCustomer = isLoggedIn && isCustomer;

  const customerName = (me?.customer?.name ?? "").trim();
  const customerPhone = (me?.customer?.phone ?? "").trim();
  const customerProfileComplete = Boolean(customerName && customerPhone);

  const nextUrl = useMemo(
    () => buildNextUrl(slug, selectedServiceKey || presetServiceKey),
    [slug, selectedServiceKey, presetServiceKey]
  );

  const loginHref = `/login?next=${encodeURIComponent(nextUrl)}`;
  const registerHref = `/register?next=${encodeURIComponent(nextUrl)}`;

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setError("");
    setMessage("");

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

  useEffect(() => {
    const t = getTokenSafe();
    if (!t) return;

    fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${t}` },
    })
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

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Fehler beim Laden");

      setAvailableTimes(Array.isArray(data?.times) ? data.times : []);
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
      setAvailableTimes([]);
    } finally {
      setBusyTimes(false);
    }
  }

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

      setMessage(`✅ Termin erfolgreich gebucht: ${isoToDisplayDate(selectedDate)} um ${minToHHMM(selectedTimeMin!)}`);
      setError("");
      setNote("");
      setSelectedTimeMin(null);

      await loadTimes();

      setTimeout(() => {
        router.push("/my-bookings");
      }, 900);
    } catch (e: any) {
      setError(e?.message ?? "Fehler beim Buchen");
    } finally {
      setBusyBooking(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 20, maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ color: "#666" }}>Lade Buchungsseite...</div>
      </div>
    );
  }

  if (error && !barber) {
    return (
      <div style={{ padding: 20, maxWidth: 1120, margin: "0 auto" }}>
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
      <div style={{ padding: 20, maxWidth: 1120, margin: "0 auto" }}>
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

  const disableBook =
    busyBooking ||
    (isLoggedIn && me?.role === "BARBER") ||
    !selectedServiceKey ||
    !selectedDate ||
    selectedTimeMin == null ||
    (isAuthedCustomer && !customerProfileComplete);

  const calendarDays = buildCalendarDays(calendarMonth);
  const monthBackDisabled = addMonthsToISO(calendarMonth, -1) < today.slice(0, 8) + "01";

  const cardStyle: React.CSSProperties = {
    border: "1px solid #e9e9e9",
    borderRadius: 24,
    background: "#fff",
    padding: 18,
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
    overflow: "hidden",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    minHeight: 52,
    borderRadius: 14,
    border: "1px solid #dedede",
    background: "#fff",
    padding: "0 16px",
    fontSize: 16,
    color: "#111",
    outline: "none",
    boxSizing: "border-box",
    display: "block",
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    borderRadius: 14,
    border: "1px solid #dedede",
    background: "#fff",
    padding: "14px 16px",
    fontSize: 16,
    color: "#111",
    outline: "none",
    boxSizing: "border-box",
    display: "block",
    resize: "vertical",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 800,
    color: "#555",
    marginBottom: 8,
  };

  const primaryButton: React.CSSProperties = {
    width: "100%",
    minHeight: 54,
    borderRadius: 14,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 900,
    fontSize: 15,
    cursor: disableBook ? "not-allowed" : "pointer",
    opacity: disableBook ? 0.7 : 1,
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
        @media (max-width: 900px) {
          .layoutGrid,
          .topGrid,
          .summaryGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div style={{ marginBottom: 14 }}>
        <a
          href={`/b/${barber.slug}`}
          style={{
            textDecoration: "none",
            color: "#111",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          ← Zurück zum Profil
        </a>
      </div>

      <div
        className="topGrid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(300px, 0.85fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <section style={{ ...cardStyle, padding: 22 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                width: 82,
                height: 82,
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
                Termin buchen
              </h1>
              <div style={{ marginTop: 8, color: "#444", fontSize: 15, fontWeight: 700 }}>
                {barber.name}
              </div>
            </div>
          </div>
        </section>

        <section style={{ ...cardStyle, padding: 22 }}>
          {!isLoggedIn ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 17 }}>Kunden-Login</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href={loginHref} style={secondaryButton}>
                  Login
                </a>
                <a href={registerHref} style={secondaryButton}>
                  Registrieren
                </a>
              </div>
            </div>
          ) : isCustomer ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 17 }}>Dein Kundenprofil</div>
              <div
                style={{
                  border: "1px solid #ececec",
                  borderRadius: 16,
                  background: "#fafafa",
                  padding: 14,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div>
                  Name: <b>{customerName || "—"}</b>
                </div>
                <div>
                  Telefon: <b>{customerPhone || "—"}</b>
                </div>
              </div>

              {!customerProfileComplete ? (
                <div style={{ color: "#b42318", fontWeight: 800, fontSize: 13 }}>
                  Bitte Name und Telefonnummer in deinem Profil ergänzen.
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ color: "#b42318", fontWeight: 800 }}>
              Du bist als Friseur eingeloggt. Bitte als Kunde einloggen, um zu buchen.
            </div>
          )}
        </section>
      </div>

      {(message || error) && (
        <div
          style={{
            marginBottom: 16,
            padding: "14px 16px",
            borderRadius: 16,
            border: error ? "1px solid #f1c7c7" : "1px solid #cfe7d1",
            background: error ? "#fff5f5" : "#f4fbf4",
            color: error ? "#b42318" : "#17663a",
            fontWeight: 700,
          }}
        >
          {error || message}
        </div>
      )}

      <div
        className="layoutGrid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(300px, 0.85fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section style={cardStyle}>
          <div style={{ fontWeight: 900, fontSize: 22 }}>Termin auswählen</div>

          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            <div>
              <div style={labelStyle}>Service</div>
              <select
                value={selectedServiceKey}
                onChange={(e) => {
                  setSelectedServiceKey(e.target.value);
                  setMessage("");
                  setError("");
                }}
                style={inputStyle}
              >
                <option value="">Bitte wählen</option>
                {services.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name} – {s.durationMin} min
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={labelStyle}>Datum</div>

              <button
                type="button"
                onClick={() => setCalendarOpen((v) => !v)}
                style={{
                  ...inputStyle,
                  textAlign: "left",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isoToDisplayDate(selectedDate)}
              </button>

              {calendarOpen ? (
                <div
                  style={{
                    marginTop: 10,
                    border: "1px solid #e9e9e9",
                    borderRadius: 18,
                    background: "#fff",
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => !monthBackDisabled && setCalendarMonth(addMonthsToISO(calendarMonth, -1))}
                      disabled={monthBackDisabled}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        border: "1px solid #ddd",
                        background: "#fff",
                        cursor: monthBackDisabled ? "not-allowed" : "pointer",
                        opacity: monthBackDisabled ? 0.4 : 1,
                        fontWeight: 900,
                      }}
                    >
                      ←
                    </button>

                    <div style={{ fontWeight: 900, fontSize: 16, textTransform: "capitalize" }}>
                      {isoToMonthLabel(calendarMonth)}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCalendarMonth(addMonthsToISO(calendarMonth, 1))}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        border: "1px solid #ddd",
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      →
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((d) => (
                      <div
                        key={d}
                        style={{
                          textAlign: "center",
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#666",
                          padding: "4px 0",
                        }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                      gap: 6,
                    }}
                  >
                    {calendarDays.map((date) => {
                      const iso = dateToISO(date);
                      const selected = selectedDate === iso;
                      const inCurrentMonth = isSameMonth(date, calendarMonth);
                      const isPast = iso < today;
                      const disabled = !inCurrentMonth || isPast;

                      return (
                        <button
                          key={iso}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            setSelectedDate(iso);
                            setSelectedTimeMin(null);
                            setMessage("");
                            setError("");
                            setCalendarOpen(false);
                          }}
                          style={{
                            height: 42,
                            borderRadius: 12,
                            border: selected ? "1px solid #111" : "1px solid #e2e2e2",
                            background: selected ? "#111" : "#fff",
                            color: selected ? "#fff" : disabled ? "#bbb" : "#111",
                            fontWeight: 800,
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: inCurrentMonth ? 1 : 0.5,
                          }}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <div style={{ ...labelStyle, marginBottom: 10 }}>Uhrzeit</div>

              {!canLoadTimes ? (
                <div
                  style={{
                    border: "1px dashed #e3e3e3",
                    borderRadius: 16,
                    padding: 14,
                    color: "#777",
                    background: "#fcfcfc",
                  }}
                >
                  Bitte zuerst Service und Datum wählen.
                </div>
              ) : busyTimes ? (
                <div
                  style={{
                    border: "1px dashed #e3e3e3",
                    borderRadius: 16,
                    padding: 14,
                    color: "#777",
                    background: "#fcfcfc",
                  }}
                >
                  Verfügbare Zeiten werden geladen...
                </div>
              ) : availableTimes.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed #e3e3e3",
                    borderRadius: 16,
                    padding: 14,
                    color: "#777",
                    background: "#fcfcfc",
                  }}
                >
                  Keine freien Zeiten verfügbar.
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {availableTimes.map((min) => {
                    const selected = selectedTimeMin === min;
                    return (
                      <button
                        key={min}
                        onClick={() => setSelectedTimeMin(min)}
                        style={{
                          minWidth: 82,
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: selected ? "1px solid #111" : "1px solid #ddd",
                          background: selected ? "#111" : "#fff",
                          color: selected ? "#fff" : "#111",
                          fontWeight: 900,
                          cursor: "pointer",
                          fontSize: 14,
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
              <div style={labelStyle}>Notiz</div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
                rows={4}
                style={textareaStyle}
              />
            </div>

            <button
              onClick={bookNow}
              disabled={disableBook}
              style={primaryButton}
              title={!isAuthedCustomer ? "Du wirst zum Login weitergeleitet" : ""}
            >
              {busyBooking ? "Bucht..." : "Termin buchen"}
            </button>
          </div>
        </section>

        <aside style={cardStyle}>
          <div style={{ fontWeight: 900, fontSize: 22 }}>Zusammenfassung</div>

          <div
            className="summaryGrid"
            style={{
              marginTop: 16,
              display: "grid",
              gap: 14,
            }}
          >
            <div>
              <div style={{ color: "#666", fontSize: 12, fontWeight: 800 }}>Friseur</div>
              <div style={{ marginTop: 4, fontWeight: 900 }}>{barber.name}</div>
            </div>

            <div>
              <div style={{ color: "#666", fontSize: 12, fontWeight: 800 }}>Service</div>
              <div style={{ marginTop: 4, fontWeight: 800 }}>
                {selectedService ? `${selectedService.name} · ${selectedService.durationMin} min` : "—"}
              </div>
            </div>

            <div>
              <div style={{ color: "#666", fontSize: 12, fontWeight: 800 }}>Datum</div>
              <div style={{ marginTop: 4, fontWeight: 800 }}>{isoToDisplayDate(selectedDate) || "—"}</div>
            </div>

            <div>
              <div style={{ color: "#666", fontSize: 12, fontWeight: 800 }}>Uhrzeit</div>
              <div style={{ marginTop: 4, fontWeight: 800 }}>
                {selectedTimeMin != null ? minToHHMM(selectedTimeMin) : "—"}
              </div>
            </div>

            <div>
              <div style={{ color: "#666", fontSize: 12, fontWeight: 800 }}>Kunde</div>
              <div style={{ marginTop: 4, fontWeight: 800 }}>{isAuthedCustomer ? customerName || "—" : "—"}</div>
            </div>

            <div>
              <div style={{ color: "#666", fontSize: 12, fontWeight: 800 }}>Telefon</div>
              <div style={{ marginTop: 4, fontWeight: 800 }}>{isAuthedCustomer ? customerPhone || "—" : "—"}</div>
            </div>

            {note.trim() ? (
              <div>
                <div style={{ color: "#666", fontSize: 12, fontWeight: 800 }}>Notiz</div>
                <div style={{ marginTop: 4, fontWeight: 800, whiteSpace: "pre-wrap" }}>{note.trim()}</div>
              </div>
            ) : null}

            {barber.phone ? (
              <a href={`tel:${barber.phone}`} style={secondaryButton}>
                Friseur anrufen
              </a>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}