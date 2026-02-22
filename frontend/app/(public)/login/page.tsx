"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Role = "CUSTOMER" | "BARBER";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://frisuer-app.onrender.com";

function normalizeBase(url: string) {
  return String(url || "").replace(/\/+$/, "");
}

function safeNextPath(raw: string | null) {
  // Sicherheits-Check: nur interne Pfade erlauben (kein http://...)
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";
  if (!s.startsWith("/")) return "";
  if (s.startsWith("//")) return "";
  return s;
}

export default function LoginPage() {
  const sp = useSearchParams();
  const nextRaw = sp.get("next");
  const nextPath = useMemo(() => safeNextPath(nextRaw), [nextRaw]);

  const registerHref = nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : "/register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

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
        throw new Error(data?.error || `Login fehlgeschlagen (HTTP ${res.status})`);
      }

      const token: string | undefined = data?.token;
      const user: any = data?.user;

      if (!token || !user) throw new Error("Login fehlgeschlagen (keine Daten).");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      const role = (user.role as Role) || "CUSTOMER";

      // ✅ Priorität 1: next
      // ✅ sonst Standard: Barber -> /admin, Customer -> /
      const target = nextPath || (role === "BARBER" ? "/admin" : "/");

      // ✅ zuverlässigster Redirect
      window.location.assign(target);
    } catch (err: any) {
      setError(err?.message || "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 520, margin: "0 auto" }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Login</h1>
        <div style={{ marginTop: 6, color: "#666" }}>
          Bitte melde dich an, um einen Termin zu buchen.
        </div>
      </div>

      {nextPath ? (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            border: "1px solid #eee",
            background: "#fff",
            borderRadius: 12,
            color: "#111",
            fontWeight: 900,
            fontSize: 12,
          }}
        >
          Nach dem Login geht’s weiter zu: <span style={{ opacity: 0.8 }}>{nextPath}</span>
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

      <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>E-Mail</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="mail@example.com"
              style={{
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 10,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Passwort</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              style={{
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 10,
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? "Logge ein..." : "Einloggen"}
          </button>

          <div style={{ color: "#666", fontSize: 12 }}>
            Noch kein Konto?{" "}
            <a href={registerHref} style={{ fontWeight: 900, color: "#111" }}>
              Jetzt registrieren
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}