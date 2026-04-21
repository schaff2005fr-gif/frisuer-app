"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

const WEB_CHECKOUT_URL = process.env.NEXT_PUBLIC_WEB_CHECKOUT_URL || "";

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

export default function BarberSubscriptionPage() {
  return (
    <Suspense fallback={<SubscriptionFallback />}>
      <SubscriptionInner />
    </Suspense>
  );
}

function SubscriptionFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f6f7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <div style={{ color: "#666", fontWeight: 800 }}>Lade Abo-Seite...</div>
    </div>
  );
}

function buildCheckoutUrl() {
  if (!WEB_CHECKOUT_URL) return "";

  const user = getUser();
  if (!user?.id) return "";

  const url = new URL(WEB_CHECKOUT_URL);
  url.searchParams.set("app_user_id", `barber-${user.id}`);

  return url.toString();
}
function SubscriptionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const success = useMemo(() => searchParams.get("success"), [searchParams]);

  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (success === "1") {
      checkSubscriptionStatus(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  async function init() {
    const token = getToken();
    const user = getUser();

    if (!token || !user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "BARBER") {
      router.replace("/");
      return;
    }

    await checkSubscriptionStatus(false);
  }

  async function checkSubscriptionStatus(showSuccessMessage: boolean) {
  try {
    setLoading(true);
    setChecking(true);
    setError("");

    await syncSubscriptionToBackend();

    const token = getToken();

    const res = await fetch(`${API_BASE}/admin/subscription-status`, {
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
      setError(data?.error || "Abo-Status konnte nicht geladen werden.");
      return;
    }

    const isPro = !!data?.subscription?.isPro;

    if (isPro) {
      if (showSuccessMessage) {
        setStatusMessage("✅ Dein Pro-Abo ist jetzt aktiv.");
      }
      router.replace("/admin");
      return;
    }

    if (showSuccessMessage) {
      setStatusMessage("Es wurde noch kein aktives Pro-Abo gefunden.");
    }
  } catch (e: any) {
    console.error(e);
    setError(e?.message || "Abo-Status konnte nicht geladen werden.");
  } finally {
    setLoading(false);
    setChecking(false);
  }
}

  function handleSubscribe() {
  setError("");

  if (!WEB_CHECKOUT_URL) {
    setError("Es ist noch keine Web-Checkout-URL hinterlegt.");
    return;
  }

  const checkoutUrl = buildCheckoutUrl();

  if (!checkoutUrl) {
    setError("Checkout-Link konnte nicht erstellt werden.");
    return;
  }

  setBuying(true);
  window.location.href = checkoutUrl;
}

async function syncSubscriptionToBackend() {
  const token = getToken();

  if (!token) {
    throw new Error("Kein Token gefunden.");
  }

  const res = await fetch(`${API_BASE}/admin/subscription/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const raw = await res.text();
  let data: any = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!res.ok) {
    throw new Error(data?.error || "Abo konnte nicht synchronisiert werden.");
  }

  return data;
}

  function handleBackToLogin() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  }

  function handleOpenPrivacy() {
    router.push("/datenschutz");
  }

  function handleOpenTerms() {
    window.open("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/", "_blank");
  }

  if (loading) {
    return <SubscriptionFallback />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f6f7",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "24px 16px 40px",
          boxSizing: "border-box",
        }}
      >
        <style jsx>{`
          .grid {
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 16px;
            align-items: start;
          }

          .card {
            border: 1px solid #e8e8eb;
            border-radius: 24px;
            background: #fff;
            padding: 20px;
            box-sizing: border-box;
          }

          .darkCard {
            border: 1px solid #e8e8eb;
            border-radius: 28px;
            background: #111;
            padding: 22px;
            box-sizing: border-box;
          }

          .actionBtnDark {
            width: 100%;
            min-height: 56px;
            border-radius: 16px;
            border: 1px solid #111;
            background: #111;
            color: #fff;
            font-weight: 900;
            font-size: 15px;
            cursor: pointer;
          }

          .actionBtnLight {
            width: 100%;
            min-height: 54px;
            border-radius: 16px;
            border: 1px solid #ddd;
            background: #fff;
            color: #111;
            font-weight: 900;
            font-size: 15px;
            cursor: pointer;
          }

          .smallBtn {
            min-height: 44px;
            padding: 0 14px;
            border-radius: 12px;
            border: 1px solid #ddd;
            background: #fff;
            color: #111;
            font-weight: 900;
            font-size: 13px;
            cursor: pointer;
          }

          .benefits {
            margin-top: 16px;
            display: grid;
            gap: 12px;
          }

          .rowWrap {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          @media (max-width: 860px) {
            .grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <div style={{ marginBottom: 18 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 34,
              lineHeight: 1.1,
              fontWeight: 900,
              color: "#111",
            }}
          >
            Salora Pro
          </h1>

          <p
            style={{
              marginTop: 10,
              marginBottom: 0,
              fontSize: 16,
              lineHeight: 1.5,
              color: "#666",
              maxWidth: 700,
            }}
          >
            Schalte den Barber-Bereich frei und verwalte deine Termine direkt über
            Webseite und App.
          </p>
        </div>

        {statusMessage ? (
          <div
            style={{
              marginBottom: 16,
              padding: "14px 16px",
              borderRadius: 16,
              border: "1px solid #cfe7d1",
              background: "#f4fbf4",
              color: "#17663a",
              fontWeight: 700,
            }}
          >
            {statusMessage}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              marginBottom: 16,
              padding: "14px 16px",
              borderRadius: 16,
              border: "1px solid #f1c7c7",
              background: "#fff5f5",
              color: "#b42318",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        <div className="grid">
          <div style={{ display: "grid", gap: 16 }}>
            <div className="darkCard">
              <div
                style={{
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                PRO ABO
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#fff",
                  fontSize: 34,
                  lineHeight: 1.1,
                  fontWeight: 900,
                }}
              >
                39,99 €
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: "#d7d7d9",
                  fontSize: 15,
                  lineHeight: 1.3,
                  fontWeight: 700,
                }}
              >
                pro Monat
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#d7d7d9",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                Monatlich kündbar. Die Abrechnung erfolgt über den Web-Checkout.
              </div>
            </div>

            <div className="card">
              <div
                style={{
                  fontSize: 24,
                  lineHeight: 1.15,
                  fontWeight: 900,
                  color: "#111",
                }}
              >
                Was ist enthalten?
              </div>

              <div className="benefits">
                <Benefit text="Barber-Dashboard mit Tages- und Wochenansicht" />
                <Benefit text="Termine verwalten und Status aktualisieren" />
                <Benefit text="Pausen und Blockzeiten festlegen" />
                <Benefit text="Services und öffentliches Profil bearbeiten" />
                <Benefit text="Benachrichtigungen und Kundenbuchungen mobil im Blick" />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div className="card">
              <div
                style={{
                  fontSize: 22,
                  lineHeight: 1.15,
                  fontWeight: 900,
                  color: "#111",
                }}
              >
                Barber-Bereich freischalten
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 15,
                  lineHeight: 1.5,
                  color: "#666",
                }}
              >
                Aktuell ist für deinen Account kein aktives Pro-Abo hinterlegt.
              </div>

              <button
                type="button"
                onClick={handleSubscribe}
                disabled={buying || checking}
                className="actionBtnDark"
                style={{ marginTop: 18, opacity: buying || checking ? 0.7 : 1 }}
              >
                {buying ? "Weiter zum Checkout..." : "Monatlich abonnieren"}
              </button>

              <button
                type="button"
                onClick={() => checkSubscriptionStatus(true)}
                disabled={checking}
                className="actionBtnLight"
                style={{ marginTop: 10, opacity: checking ? 0.7 : 1 }}
              >
                {checking ? "Prüfe Abo..." : "Abo-Status prüfen"}
              </button>
            </div>

            <div
              style={{
                border: "1px solid #ececef",
                borderRadius: 20,
                background: "#fbfbfc",
                padding: 16,
              }}
            >
              <div
                style={{
                  color: "#444",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Das Abo verlängert sich automatisch monatlich, wenn es nicht vor dem
                nächsten Abrechnungszeitraum gekündigt wird. Die Verwaltung und Kündigung
                erfolgt über den jeweiligen Checkout bzw. das dort verwendete Zahlungsprofil.
              </div>
            </div>

            <div
              style={{
                border: "1px solid #ececef",
                borderRadius: 20,
                background: "#fff",
                padding: 16,
              }}
            >
              <div
                style={{
                  color: "#444",
                  fontSize: 13,
                  lineHeight: 1.6,
                  marginBottom: 12,
                }}
              >
                Mit dem Abschluss des Abos gelten unsere Datenschutzinformationen und die
                Nutzungsbedingungen.
              </div>

              <div className="rowWrap">
                <button type="button" onClick={handleOpenPrivacy} className="smallBtn">
                  Datenschutz
                </button>

                <button type="button" onClick={handleOpenTerms} className="smallBtn">
                  Nutzungsbedingungen (EULA)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBackToLogin}
              className="actionBtnLight"
            >
              Zurück zum Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "#111",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: 12,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          ✓
        </span>
      </div>

      <div
        style={{
          flex: 1,
          color: "#111",
          fontSize: 15,
          lineHeight: 1.5,
          fontWeight: 700,
        }}
      >
        {text}
      </div>
    </div>
  );
}