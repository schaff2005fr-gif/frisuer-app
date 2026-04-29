"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

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
  const d = new Date();
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${year}-${month}-${day}`;
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

function buildNextDays(count: number) {
  const out: string[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const year = d.getFullYear();
    const month = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());

    out.push(`${year}-${month}-${day}`);
  }

  return out;
}

function cleanUrl(u?: string | null) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return "https://" + s;
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
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "");

  const searchParams = useSearchParams();
  const presetServiceKey = searchParams.get("serviceKey") || "";

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

  const nextDays = useMemo(() => buildNextDays(21), []);

  const token = getTokenSafe();
  const isLoggedIn = Boolean(token);
  const isCustomer = me?.role === "CUSTOMER";
  const isAuthedCustomer = isLoggedIn && isCustomer;

  const customerName = (me?.customer?.name ?? "").trim();
  const customerPhone = (me?.customer?.phone ?? "").trim();
  const customerProfileComplete = Boolean(customerName && customerPhone);

  const selectedService = useMemo(
    () => services.find((s) => s.key === selectedServiceKey) ?? null,
    [services, selectedServiceKey]
  );

  const nextUrl = useMemo(
    () => buildNextUrl(slug, selectedServiceKey || presetServiceKey),
    [slug, selectedServiceKey, presetServiceKey]
  );

  const loginHref = `/login?next=${encodeURIComponent(nextUrl)}`;
  const registerHref = `/register?next=${encodeURIComponent(nextUrl)}`;

  useEffect(() => {
    if (presetServiceKey) {
      setSelectedServiceKey(presetServiceKey);
    }
  }, [presetServiceKey]);

  useEffect(() => {
    if (!slug) return;
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!selectedServiceKey || !selectedDate) {
      setAvailableTimes([]);
      setSelectedTimeMin(null);
      return;
    }

    loadTimes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceKey, selectedDate]);

  async function loadPage() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const barberRes = await fetch(`${API_BASE}/barbers/${encodeURIComponent(slug)}`, {
        method: "GET",
        cache: "no-store",
      });

      const barberRaw = await barberRes.text();
      let barberData: any = {};

      try {
        barberData = barberRaw ? JSON.parse(barberRaw) : {};
      } catch {
        barberData = { raw: barberRaw };
      }

      if (!barberRes.ok) {
        throw new Error(barberData?.error || "Fehler");
      }

      setBarber(barberData?.barber ?? null);
      setServices(Array.isArray(barberData?.services) ? barberData.services : []);

      const t = getTokenSafe();

      if (t) {
        try {
          const meRes = await fetch(`${API_BASE}/me`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${t}`,
            },
            cache: "no-store",
          });

          if (meRes.ok) {
            const meData = await meRes.json().catch(() => null);
            setMe(meData as Me);
          } else {
            setMe(null);
          }
        } catch {
          setMe(null);
        }
      } else {
        setMe(null);
      }
    } catch (e: any) {
      setError(e?.message || "Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function loadTimes() {
    try {
      setBusyTimes(true);
      setError("");
      setMessage("");
      setSelectedTimeMin(null);

      const res = await fetch(
        `${API_BASE}/public/available-times?barberSlug=${encodeURIComponent(
          slug
        )}&date=${encodeURIComponent(selectedDate)}&serviceKey=${encodeURIComponent(
          selectedServiceKey
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

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

      setAvailableTimes(Array.isArray(data?.times) ? data.times : []);
    } catch (e: any) {
      setError(e?.message || "Fehler beim Laden");
      setAvailableTimes([]);
    } finally {
      setBusyTimes(false);
    }
  }

  function redirectToLogin() {
    window.location.href = loginHref;
  }

  async function bookNow() {
    try {
      setBusyBooking(true);
      setError("");
      setMessage("");

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

      const raw = await res.text();
      let data: any = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Buchung fehlgeschlagen");
      }

      setMessage(
        `✅ Termin erfolgreich gebucht: ${isoToDisplayDate(selectedDate)} um ${minToHHMM(
          selectedTimeMin!
        )}`
      );

      setError("");
      setNote("");
      setSelectedTimeMin(null);

      await loadTimes();

      setTimeout(() => {
        router.push("/my-bookings");
      }, 100);
    } catch (e: any) {
      setError(e?.message || "Fehler beim Buchen");
    } finally {
      setBusyBooking(false);
    }
  }

  const disableBook =
    busyBooking ||
    (isLoggedIn && me?.role === "BARBER") ||
    !selectedServiceKey ||
    !selectedDate ||
    selectedTimeMin == null ||
    (isAuthedCustomer && !customerProfileComplete);

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
        Lade Buchungsseite...
      </div>
    );
  }

  if (error && !barber) {
    return (
      <div className="page">
        <style jsx>{styles}</style>

        <div className="alertError">{error}</div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="page">
        <style jsx>{styles}</style>

        <div className="emptyBox">Friseur nicht gefunden.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <style jsx>{styles}</style>

      <a href={`/b/${barber.slug}`} className="backLink">
        ← Zurück zum Profil
      </a>

      <section className="card">
        <div className="heroRow">
          <div className="avatar">
            {barber.imageUrl ? (
              <img src={cleanUrl(barber.imageUrl)} alt={barber.name} />
            ) : (
              <span>{barber.name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>

          <div className="heroText">
            <h1>Termin buchen</h1>
            <div>{barber.name}</div>
          </div>
        </div>
      </section>

      <section className="card">
        {!isLoggedIn ? (
          <div className="loginBox">
            <div className="boxTitle">Kunden-Login</div>

            <div className="loginActions">
              <a href={loginHref} className="secondaryBtn">
                Login
              </a>

              <a href={registerHref} className="secondaryBtn">
                Registrieren
              </a>
            </div>
          </div>
        ) : isCustomer ? (
          <div className="loginBox">
            <div className="boxTitle">Dein Kundenprofil</div>

            <div className="profileBox">
              <div>
                Name: <b>{customerName || "—"}</b>
              </div>
              <div>
                Telefon: <b>{customerPhone || "—"}</b>
              </div>
            </div>

            {!customerProfileComplete ? (
              <div className="profileWarning">
                Bitte Name und Telefonnummer in deinem Profil ergänzen.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="profileWarning">
            Du bist als Friseur eingeloggt. Bitte als Kunde einloggen, um zu buchen.
          </div>
        )}
      </section>

      {(message || error) ? (
        <div className={error ? "alertError" : "alertOk"}>{error || message}</div>
      ) : null}

      <section className="card">
        <h2>Termin auswählen</h2>

        <div className="formGrid">
          <div>
            <label>Service</label>

            <div className="serviceList">
              {services.length === 0 ? (
                <div className="emptyBox">Aktuell sind keine Services verfügbar.</div>
              ) : (
                services.map((s) => {
                  const selected = selectedServiceKey === s.key;

                  return (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => {
                        setSelectedServiceKey(s.key);
                        setMessage("");
                        setError("");
                      }}
                      className={`serviceBtn ${selected ? "selected" : ""}`}
                    >
                      {s.name} – {s.durationMin} min
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label>Datum</label>

            <div className="dateScroller">
              {nextDays.map((iso) => {
                const selected = selectedDate === iso;

                return (
                  <button
                    type="button"
                    key={iso}
                    onClick={() => {
                      setSelectedDate(iso);
                      setSelectedTimeMin(null);
                      setMessage("");
                      setError("");
                    }}
                    className={`dateBtn ${selected ? "selected" : ""}`}
                  >
                    {new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </button>
                );
              })}
            </div>

            <div className="selectedDateText">{isoToDisplayDate(selectedDate)}</div>
          </div>

          <div>
            <label>Uhrzeit</label>

            {!selectedServiceKey || !selectedDate ? (
              <div className="emptyBox">Bitte zuerst Service und Datum wählen.</div>
            ) : busyTimes ? (
              <div className="emptyBox">Verfügbare Zeiten werden geladen...</div>
            ) : availableTimes.length === 0 ? (
              <div className="emptyBox">Keine freien Zeiten verfügbar.</div>
            ) : (
              <div className="timeGrid">
                {availableTimes.map((min) => {
                  const selected = selectedTimeMin === min;

                  return (
                    <button
                      type="button"
                      key={min}
                      onClick={() => setSelectedTimeMin(min)}
                      className={`timeBtn ${selected ? "selected" : ""}`}
                    >
                      {minToHHMM(min)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label>Notiz</label>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              rows={4}
              className="textarea"
            />
          </div>

          <button
            type="button"
            onClick={bookNow}
            disabled={disableBook}
            className="bookBtn"
            title={!isAuthedCustomer ? "Du wirst zum Login weitergeleitet" : ""}
          >
            {busyBooking ? "Bucht..." : "Termin buchen"}
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Zusammenfassung</h2>

        <div className="summaryGrid">
          <Info label="Friseur" value={barber.name} />

          <Info
            label="Service"
            value={
              selectedService
                ? `${selectedService.name} · ${selectedService.durationMin} min`
                : "—"
            }
          />

          <Info label="Datum" value={isoToDisplayDate(selectedDate) || "—"} />

          <Info
            label="Uhrzeit"
            value={selectedTimeMin != null ? minToHHMM(selectedTimeMin) : "—"}
          />

          <Info label="Kunde" value={isAuthedCustomer ? customerName || "—" : "—"} />

          <Info
            label="Telefon"
            value={isAuthedCustomer ? customerPhone || "—" : "—"}
          />

          {note.trim() ? <Info label="Notiz" value={note.trim()} /> : null}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="infoLabel">{label}</div>
      <div className="infoValue">{value}</div>

      <style jsx>{`
        .infoLabel {
          color: #666;
          font-size: 12px;
          font-weight: 800;
        }

        .infoValue {
          margin-top: 4px;
          font-weight: 800;
          color: #111;
          line-height: 20px;
          white-space: pre-wrap;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}

const styles = `
  .page {
    padding: 16px;
    padding-bottom: 36px;
    background: #fff;
    max-width: 900px;
    margin: 0 auto;
    box-sizing: border-box;
  }

  .backLink {
    display: inline-flex;
    margin-bottom: 14px;
    text-decoration: none;
    color: #111;
    font-weight: 900;
    font-size: 14px;
  }

  .card {
    border: 1px solid #e9e9e9;
    border-radius: 24px;
    background: #fff;
    padding: 18px;
    margin-bottom: 16px;
    box-sizing: border-box;
  }

  .heroRow {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .avatar {
    width: 82px;
    height: 82px;
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

  .heroText {
    flex: 1;
    min-width: 0;
  }

  .heroText h1 {
    margin: 0;
    font-size: 28px;
    line-height: 31px;
    font-weight: 900;
    color: #111;
    letter-spacing: -0.5px;
  }

  .heroText div {
    margin-top: 8px;
    color: #444;
    font-size: 15px;
    font-weight: 700;
  }

  .loginBox {
    display: grid;
    gap: 10px;
  }

  .boxTitle {
    font-weight: 900;
    font-size: 17px;
    color: #111;
  }

  .loginActions {
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

  .profileBox {
    border: 1px solid #ececec;
    border-radius: 16px;
    background: #fafafa;
    padding: 14px;
    display: grid;
    gap: 6px;
    color: #111;
  }

  .profileWarning {
    color: #b42318;
    font-weight: 800;
    font-size: 13px;
    line-height: 19px;
  }

  .alertError,
  .alertOk {
    margin-bottom: 16px;
    padding: 14px 16px;
    border-radius: 16px;
    font-weight: 700;
  }

  .alertError {
    border: 1px solid #f1c7c7;
    background: #fff5f5;
    color: #b42318;
  }

  .alertOk {
    border: 1px solid #cfe7d1;
    background: #f4fbf4;
    color: #17663a;
  }

  h2 {
    margin: 0;
    font-weight: 900;
    font-size: 22px;
    color: #111;
    line-height: 1.2;
  }

  .formGrid {
    margin-top: 16px;
    display: grid;
    gap: 14px;
  }

  label {
    display: block;
    font-size: 13px;
    font-weight: 800;
    color: #555;
    margin-bottom: 8px;
  }

  .serviceList {
    display: grid;
    gap: 8px;
  }

  .serviceBtn {
    width: 100%;
    min-height: 52px;
    border-radius: 14px;
    border: 1px solid #dedede;
    background: #fff;
    padding: 0 16px;
    color: #111;
    font-size: 16px;
    font-weight: 800;
    text-align: left;
    cursor: pointer;
  }

  .serviceBtn.selected {
    border-color: #111;
    background: #111;
    color: #fff;
  }

  .dateScroller {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }

  .dateScroller::-webkit-scrollbar {
    display: none;
  }

  .dateBtn {
    min-width: 94px;
    padding: 12px;
    border-radius: 14px;
    border: 1px solid #ddd;
    background: #fff;
    color: #111;
    font-weight: 900;
    text-align: center;
    font-size: 13px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .dateBtn.selected {
    border-color: #111;
    background: #111;
    color: #fff;
  }

  .selectedDateText {
    margin-top: 8px;
    color: #666;
    font-size: 13px;
    line-height: 19px;
  }

  .timeGrid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .timeBtn {
    min-width: 82px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid #ddd;
    background: #fff;
    color: #111;
    font-weight: 900;
    font-size: 14px;
    text-align: center;
    cursor: pointer;
  }

  .timeBtn.selected {
    border-color: #111;
    background: #111;
    color: #fff;
  }

  .textarea {
    width: 100%;
    min-height: 110px;
    border-radius: 14px;
    border: 1px solid #dedede;
    background: #fff;
    padding: 14px 16px;
    font-size: 16px;
    color: #111;
    box-sizing: border-box;
    outline: none;
    resize: vertical;
    font-family: inherit;
  }

  .bookBtn {
    width: 100%;
    min-height: 54px;
    border-radius: 14px;
    border: 1px solid #111;
    background: #111;
    color: #fff;
    font-weight: 900;
    font-size: 15px;
    cursor: pointer;
  }

  .bookBtn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .emptyBox {
    border: 1px dashed #e3e3e3;
    border-radius: 16px;
    padding: 14px;
    color: #777;
    background: #fcfcfc;
    font-weight: 700;
    line-height: 20px;
  }

  .summaryGrid {
    margin-top: 16px;
    display: grid;
    gap: 14px;
  }

  @media (min-width: 760px) {
    .summaryGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 430px) {
    .avatar {
      width: 74px;
      height: 74px;
    }

    .heroText h1 {
      font-size: 26px;
      line-height: 29px;
    }

    .loginActions {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .secondaryBtn {
      width: 100%;
      box-sizing: border-box;
    }
  }
`;