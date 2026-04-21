"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Brand from "@/components/Brand";

type Role = "CUSTOMER" | "BARBER";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://frisuer-app-1.onrender.com";

function normalizeBase(url: string) {
  return String(url || "").replace(/\/+$/, "");
}

function safeNextPath(raw: string | null) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";
  if (!s.startsWith("/")) return "";
  if (s.startsWith("//")) return "";
  return s;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: 20, maxWidth: 460, margin: "0 auto" }}>Lade…</div>}
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextRaw = sp.get("next");
  const nextPath = useMemo(() => safeNextPath(nextRaw), [nextRaw]);

  const customerRegisterHref = nextPath
    ? `/register?next=${encodeURIComponent(nextPath)}`
    : "/register";

  const barberRegisterHref = nextPath
    ? `/register-barber?next=${encodeURIComponent(nextPath)}`
    : "/register-barber";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");

  if (!token || !userRaw) return;

  try {
    const user = JSON.parse(userRaw);

    if (user?.role === "CUSTOMER") {
      router.replace("/");
    } else if (user?.role === "BARBER") {
      router.replace("/barber/subscription");
    }
  } catch {}
}, [router]);
  

 async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (submitting) return;

  setError("");
  setSubmitting(true);

  try {
    const base = normalizeBase(API_BASE);

    const res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || "Login fehlgeschlagen");
    }

    const token: string | undefined = data?.token;
    const user: any = data?.user;

    if (!token || !user) {
      throw new Error("Login fehlgeschlagen.");
    }

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    const role = (user.role as Role) || "CUSTOMER";

    if (nextPath) {
      window.location.assign(nextPath);
      return;
    }

    if (role === "CUSTOMER") {
      window.location.assign("/");
      return;
    }

    const subRes = await fetch(`${base}/admin/subscription-status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const subData = await subRes.json().catch(() => null);

    if (!subRes.ok) {
      window.location.assign("/barber/subscription");
      return;
    }

    const isPro = !!subData?.subscription?.isPro;
    window.location.assign(isPro ? "/admin" : "/barber/subscription");
  } catch (err: any) {
    setError(err?.message || "Login fehlgeschlagen");
  } finally {
    setSubmitting(false);
  }
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
          maxWidth: 520,
          margin: "0 auto",
          padding: "16px 16px 32px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Brand href="/" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              lineHeight: 1.05,
              fontWeight: 900,
              color: "#111",
            }}
          >
            Willkommen zurück
          </h1>
        </div>

        <div
          style={{
            border: "1px solid #e8e8eb",
            borderRadius: 24,
            background: "#fff",
            padding: 18,
          }}
        >
          {error ? (
            <div
              style={{
                marginBottom: 14,
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid #f1c7c7",
                background: "#fff5f5",
                color: "#b42318",
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 13, color: "#555", fontWeight: 800 }}>E-Mail</div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="max.mustermann@email.de"
                required
                style={{
                  minHeight: 54,
                  borderRadius: 16,
                  border: "1px solid #dedede",
                  background: "#fff",
                  padding: "0 16px",
                  fontSize: 16,
                  color: "#111",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 13, color: "#555", fontWeight: 800 }}>Passwort</div>

              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    minHeight: 54,
                    borderRadius: 16,
                    border: "1px solid #dedede",
                    background: "#fff",
                    paddingLeft: 16,
                    paddingRight: 110,
                    fontSize: 16,
                    color: "#111",
                    boxSizing: "border-box",
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 8,
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: "1px solid #ddd",
                    background: "#fff",
                    color: "#111",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? "Verbergen" : "Anzeigen"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                minHeight: 54,
                borderRadius: 16,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 900,
                fontSize: 15,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Lädt..." : "Einloggen"}
            </button>
          </form>
        </div>

        <div
          style={{
            marginTop: 16,
            border: "1px solid #e8e8eb",
            borderRadius: 24,
            background: "#fff",
            padding: 18,
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              textAlign: "center",
              color: "#666",
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 2,
            }}
          >
            Noch kein Konto?
          </div>

          <Link
            href={customerRegisterHref}
            style={{
              minHeight: 54,
              borderRadius: 16,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              fontSize: 15,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 14px",
              boxSizing: "border-box",
            }}
          >
            Als Kunde registrieren
          </Link>

          <Link
            href={barberRegisterHref}
            style={{
              minHeight: 52,
              borderRadius: 16,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#111",
              fontWeight: 900,
              fontSize: 15,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 14px",
              boxSizing: "border-box",
            }}
          >
            Als Friseur registrieren
          </Link>
        </div>

        <div
          style={{
            marginTop: 18,
            padding: "0 8px",
            textAlign: "center",
            color: "#7a7a7a",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          Mit der Nutzung der App gelten unsere{" "}
          <Link
            href="/buchungsregeln"
            style={{
              color: "#111",
              fontWeight: 800,
              textDecoration: "underline",
            }}
          >
            Buchungsregeln
          </Link>
          ,{" "}
          <Link
            href="/datenschutz"
            style={{
              color: "#111",
              fontWeight: 800,
              textDecoration: "underline",
            }}
          >
            Datenschutzhinweise
          </Link>{" "}
          und das{" "}
          <Link
            href="/impressum"
            style={{
              color: "#111",
              fontWeight: 800,
              textDecoration: "underline",
            }}
          >
            Impressum
          </Link>
          .
        </div>
      </div>
    </div>
  );
}