"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Brand from "@/components/Brand";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

function safeNextPath(raw: string | null) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";
  if (!s.startsWith("/")) return "";
  if (s.startsWith("//")) return "";
  return s;
}

export default function RegisterBarberPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#f6f6f7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            boxSizing: "border-box",
            color: "#666",
            fontWeight: 800,
          }}
        >
          Lade…
        </div>
      }
    >
      <RegisterBarberInner />
    </Suspense>
  );
}

function RegisterBarberInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextRaw = sp.get("next");
  const nextPath = useMemo(() => safeNextPath(nextRaw), [nextRaw]);

  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) return;

    try {
      const user = JSON.parse(userRaw);

      if (user?.role === "CUSTOMER") {
        router.replace("/");
      } else if (user?.role === "BARBER") {
        router.replace("/admin");
      }
    } catch {}
  }, [router]);

  async function handleRegisterBarber(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError("");

    if (!name.trim()) {
      setError("Bitte gib deinen Namen ein.");
      return;
    }

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    if (!acceptedPrivacy) {
      setError("Bitte bestätige die Datenschutzerklärung.");
      return;
    }

    if (!acceptedTerms) {
      setError("Bitte akzeptiere die Nutzungsregeln.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`${API_BASE}/auth/register-barber`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() ? phone.trim() : null,
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Registrierung fehlgeschlagen");
      }

      localStorage.setItem("token", data.token);
      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      const target = nextPath || "/barber/subscription";
      window.location.assign(target);
    } catch (err: any) {
      setError(err?.message || "Registrierung fehlgeschlagen");
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
            Als Friseur registrieren
          </h1>
        </div>

        {nextPath ? (
          <div
            style={{
              marginBottom: 12,
              padding: 12,
              border: "1px solid #eee",
              background: "#fff",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            Nach der Registrierung geht’s weiter zu:{" "}
            <span style={{ opacity: 0.8 }}>{nextPath}</span>
          </div>
        ) : null}

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

          <form onSubmit={handleRegisterBarber} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 13, color: "#555", fontWeight: 800 }}>
                Name / Friseurname
              </div>
              <input
                placeholder="z. B. Barber"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
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
              <div style={{ fontSize: 13, color: "#555", fontWeight: 800 }}>E-Mail</div>
              <input
                type="email"
                placeholder="barber@email.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="none"
                autoComplete="email"
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
              <div style={{ fontSize: 13, color: "#555", fontWeight: 800 }}>Telefon</div>
              <input
                placeholder="0151 23456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
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
                  placeholder="Mindestens 8 Zeichen"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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

              <div style={{ fontSize: 11, color: "#666", marginTop: -2 }}>
                Mindestens 8 Zeichen.
              </div>
            </div>

            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 16,
                background: "#fafafa",
                padding: 14,
                display: "grid",
                gap: 12,
              }}
            >
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span style={{ flex: 1, color: "#222", fontSize: 13, lineHeight: 1.45 }}>
                  Ich habe die{" "}
                  <Link
                    href="/datenschutz"
                    target="_blank"
                    style={{
                      color: "#111",
                      fontWeight: 900,
                      textDecoration: "underline",
                    }}
                  >
                    Datenschutzerklärung
                  </Link>{" "}
                  zur Kenntnis genommen.
                </span>
              </label>

              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span style={{ flex: 1, color: "#222", fontSize: 13, lineHeight: 1.45 }}>
                  Ich akzeptiere die{" "}
                  <Link
                    href="/buchungsregeln"
                    target="_blank"
                    style={{
                      color: "#111",
                      fontWeight: 900,
                      textDecoration: "underline",
                    }}
                  >
                    Nutzungs- und Buchungsregeln
                  </Link>
                  .
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || !acceptedPrivacy || !acceptedTerms}
              style={{
                minHeight: 54,
                borderRadius: 16,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 900,
                fontSize: 15,
                cursor:
                  submitting || !acceptedPrivacy || !acceptedTerms
                    ? "not-allowed"
                    : "pointer",
                opacity: submitting || !acceptedPrivacy || !acceptedTerms ? 0.7 : 1,
              }}
            >
              {submitting ? "Registriere..." : "Als Friseur registrieren"}
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
            Schon ein Konto?
          </div>

          <Link
            href={loginHref}
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
            Zum Login
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
          {" · "}
          <Link
            href="/datenschutz"
            style={{
              color: "#111",
              fontWeight: 800,
              textDecoration: "underline",
            }}
          >
            Datenschutz
          </Link>
          {" · "}
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
        </div>
      </div>
    </div>
  );
}