"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

const WEB_CHECKOUT_URL = process.env.NEXT_PUBLIC_WEB_CHECKOUT_URL || "";

type PlanKey = "basic" | "pro";

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

  const appUserId =
    user?.barber?.revenueCatAppUserId || (user?.id ? `barber-${user.id}` : "");

  if (!appUserId) return "";

  const cleanBase = WEB_CHECKOUT_URL.trim().replace(/\/+$/, "");

  return `${cleanBase}/${encodeURIComponent(appUserId)}`;
}

function SubscriptionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const success = useMemo(() => searchParams.get("success"), [searchParams]);
  const isUpgradeMode = useMemo(
    () => searchParams.get("mode") === "upgrade",
    [searchParams]
  );

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [buyingPlan, setBuyingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const [hasBasicActive, setHasBasicActive] = useState(false);
  const [hasProActive, setHasProActive] = useState(false);

  const isBuying = buyingPlan !== null;

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

      const syncData = await syncSubscriptionToBackend();

      const isPro = !!syncData?.isPro;
      const isBasic = !!syncData?.isBasic;

      setHasProActive(isPro);
      setHasBasicActive(isBasic);

      if (isPro) {
        if (showSuccessMessage) {
          setStatusMessage("✅ Dein Pro-Abo ist jetzt aktiv.");
        }

        router.replace("/admin");
        return;
      }

      if (isBasic) {
        if (showSuccessMessage) {
          setStatusMessage("✅ Dein Basic-Abo ist jetzt aktiv.");
        }

        if (!isUpgradeMode) {
          router.replace("/admin");
          return;
        }
      }

      if (showSuccessMessage && !isPro && !isBasic) {
        setStatusMessage("Es wurde noch kein aktives Abo gefunden.");
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Abo-Status konnte nicht geladen werden.");
    } finally {
      setLoading(false);
      setChecking(false);
    }
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
      throw new Error(data?.error || "Abo konnte nicht synchronisiert werden.");
    }

    const localUser = getUser();

    if (localUser?.barber && data?.barber) {
      const nextUser = {
        ...localUser,
        barber: {
          ...localUser.barber,
          ...data.barber,
        },
      };

      localStorage.setItem("user", JSON.stringify(nextUser));
    }

    return data;
  }

  function handleSubscribe(plan: PlanKey) {
    setError("");

    const checkoutUrl = buildCheckoutUrl();

    if (!checkoutUrl) {
      setError("Es ist noch keine Web-Checkout-URL hinterlegt.");
      return;
    }

    setBuyingPlan(plan);

    window.location.href = checkoutUrl;
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
    router.push("/buchungsregeln");
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
          maxWidth: 1060,
          margin: "0 auto",
          padding: "24px 16px 40px",
          boxSizing: "border-box",
        }}
      >
        <style jsx>{`
          .plansGrid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
            align-items: stretch;
          }

          .bottomGrid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-top: 16px;
          }

          .card {
            border: 1px solid #e8e8eb;
            border-radius: 24px;
            background: #fff;
            padding: 20px;
            box-sizing: border-box;
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

          .rowWrap {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          @media (max-width: 860px) {
            .plansGrid {
              grid-template-columns: 1fr;
            }

            .bottomGrid {
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
            Wähle dein Salora Abo
          </h1>

          <p
            style={{
              marginTop: 10,
              marginBottom: 0,
              fontSize: 16,
              lineHeight: 1.5,
              color: "#666",
              maxWidth: 760,
            }}
          >
            Starte mit einem eigenen Buchungslink oder schalte mit Pro alle
            Funktionen frei.
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

        <div className="plansGrid">
          <PlanCard
            label="BASIC"
            title="Salora Basic"
            price="29,99 €"
            subtitle="pro Monat"
            description="Für Friseure, die nur ihren eigenen Buchungslink nutzen möchten."
            benefits={[
              "Eigener Buchungslink für deine Kunden",
              "Barber-Dashboard mit Tages- und Wochenansicht",
              "Termine, Services, Pausen und Profil verwalten",
              "cross:Nicht öffentlich in der Salora-Kundensuche sichtbar",
              "cross:Kein intelligentes Zeitfenster",
            ]}
            buttonText={
              hasBasicActive && !isUpgradeMode
                ? "Aktuelles Abo"
                : buyingPlan === "basic"
                ? "Weiter zum Checkout..."
                : "Basic abonnieren"
            }
            disabled={isBuying || (hasBasicActive && !isUpgradeMode)}
            onPress={() => handleSubscribe("basic")}
            dark={false}
          />

          <PlanCard
            label="PRO"
            title="Salora Pro"
            price="49,99 €"
            subtitle="pro Monat"
            description="Für Friseure, die zusätzlich neue Kunden über Salora erreichen möchten."
            benefits={[
              "Alles aus Basic enthalten",
              "Öffentliche Sichtbarkeit in der Salora-Kundensuche",
              "Kunden können dich direkt in der App finden",
              "Intelligente Zeitfenster automatisch erweitern",
              "Maximale Funktionen für mehr Buchungen",
            ]}
            buttonText={
              hasProActive
                ? "Aktuelles Abo"
                : buyingPlan === "pro"
                ? "Weiter zum Checkout..."
                : hasBasicActive
                ? "Auf Pro upgraden"
                : "Pro abonnieren"
            }
            disabled={isBuying || hasProActive}
            onPress={() => handleSubscribe("pro")}
            dark
          />
        </div>

        <div className="bottomGrid">
          <div className="card">
            <div
              style={{
                fontSize: 22,
                lineHeight: 1.15,
                fontWeight: 900,
                color: "#111",
              }}
            >
              Abo-Status prüfen
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 15,
                lineHeight: 1.5,
                color: "#666",
              }}
            >
              Falls du gerade bezahlt hast, kannst du hier den Status erneut
              synchronisieren.
            </div>

            <button
              type="button"
              onClick={() => checkSubscriptionStatus(true)}
              disabled={checking}
              className="actionBtnLight"
              style={{ marginTop: 18, opacity: checking ? 0.7 : 1 }}
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
              Das Abo verlängert sich automatisch monatlich, wenn es nicht vor
              dem nächsten Abrechnungszeitraum gekündigt wird. Die Verwaltung
              und Kündigung erfolgt über den Web-Checkout bzw. das dort
              verwendete Zahlungsprofil.
            </div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #ececef",
            borderRadius: 20,
            background: "#fff",
            padding: 16,
            marginTop: 16,
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
            Mit dem Abschluss des Abos gelten unsere Datenschutzinformationen
            und die Nutzungsbedingungen.
          </div>

          <div className="rowWrap">
            <button type="button" onClick={handleOpenPrivacy} className="smallBtn">
              Datenschutz
            </button>

            <button type="button" onClick={handleOpenTerms} className="smallBtn">
              Nutzungsbedingungen
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBackToLogin}
          className="actionBtnLight"
          style={{ marginTop: 16 }}
        >
          Zurück zum Login
        </button>
      </div>
    </div>
  );
}

function PlanCard({
  label,
  title,
  price,
  subtitle,
  description,
  benefits,
  buttonText,
  disabled,
  onPress,
  dark,
}: {
  label: string;
  title: string;
  price: string;
  subtitle: string;
  description: string;
  benefits: string[];
  buttonText: string;
  disabled: boolean;
  onPress: () => void;
  dark: boolean;
}) {
  const bg = dark ? "#111" : "#fff";
  const fg = dark ? "#fff" : "#111";
  const muted = dark ? "#d7d7d9" : "#666";
  const border = dark ? "#111" : "#e8e8eb";

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 28,
        background: bg,
        padding: 22,
        boxSizing: "border-box",
        minHeight: "100%",
      }}
    >
      <div style={{ color: fg, fontSize: 14, fontWeight: 900 }}>{label}</div>

      <div
        style={{
          marginTop: 10,
          color: fg,
          fontSize: 24,
          lineHeight: 1.15,
          fontWeight: 900,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 10,
          color: fg,
          fontSize: 34,
          lineHeight: 1.1,
          fontWeight: 900,
        }}
      >
        {price}
      </div>

      <div
        style={{
          marginTop: 4,
          color: muted,
          fontSize: 15,
          lineHeight: 1.3,
          fontWeight: 700,
        }}
      >
        {subtitle}
      </div>

      <div
        style={{
          marginTop: 14,
          color: muted,
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {description}
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        {benefits.map((b) => (
          <Benefit key={b} text={b} dark={dark} />
        ))}
      </div>

      <button
        type="button"
        onClick={onPress}
        disabled={disabled}
        style={{
          marginTop: 20,
          width: "100%",
          minHeight: 56,
          borderRadius: 16,
          border: `1px solid ${dark ? "#fff" : "#111"}`,
          background: dark ? "#fff" : "#111",
          color: dark ? "#111" : "#fff",
          fontWeight: 900,
          fontSize: 15,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        {buttonText}
      </button>
    </div>
  );
}

function Benefit({ text, dark }: { text: string; dark: boolean }) {
  const isNegative = text.startsWith("cross:");
  const cleanText = isNegative ? text.replace("cross:", "") : text;

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
          background: isNegative ? "#f3f3f4" : dark ? "#fff" : "#111",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: isNegative ? "#777" : dark ? "#111" : "#fff",
            fontSize: 12,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {isNegative ? "×" : "✓"}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          color: isNegative ? "#777" : dark ? "#fff" : "#111",
          fontSize: 15,
          lineHeight: 1.5,
          fontWeight: 700,
        }}
      >
        {cleanText}
      </div>
    </div>
  );
}