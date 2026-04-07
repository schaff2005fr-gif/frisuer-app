"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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
    <Suspense fallback={<div style={{ padding: 20, maxWidth: 460, margin: "0 auto" }}>Lade…</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const sp = useSearchParams();
  const nextRaw = sp.get("next");
  const nextPath = useMemo(() => safeNextPath(nextRaw), [nextRaw]);

  const customerRegisterHref = nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : "/register";
  const barberRegisterHref = nextPath
    ? `/register-barber?next=${encodeURIComponent(nextPath)}`
    : "/register-barber";

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
        throw new Error(data?.error || "Login fehlgeschlagen");
      }

      const token: string | undefined = data?.token;
      const user: any = data?.user;

      if (!token || !user) throw new Error("Login fehlgeschlagen.");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      const role = (user.role as Role) || "CUSTOMER";
      const target = nextPath || (role === "BARBER" ? "/admin" : "/");

      window.location.assign(target);
    } catch (err: any) {
      setError(err?.message || "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 460, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Login</h1>

      {error ? (
        <div style={{ marginTop: 12, color: "crimson" }}>
          <b>{error}</b>
        </div>
      ) : null}

      <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>E-Mail</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="max.mustermann@email.de"
            required
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
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
            required
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
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
      </form>

      <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
        <div style={{ textAlign: "center", fontSize: 13, color: "#666" }}>Noch kein Konto?</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href={customerRegisterHref}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Als Kunde registrieren
          </Link>

          <Link
            href={barberRegisterHref}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#111",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Als Friseur registrieren
          </Link>
        </div>
      </div>
    </div>
  );
}