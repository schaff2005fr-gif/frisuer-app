"use client";

import { useState } from "react";

type Role = "CUSTOMER" | "BARBER";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://frisuer-app.onrender.com";

function normalizeBase(url: string) {
  return String(url || "").replace(/\/+$/, "");
}

export default function LoginPage() {
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
      const target = role === "BARBER" ? "/admin" : "/";

      // ✅ zuverlässigster Redirect (lädt neu, keine Router/Cache-Probleme)
      window.location.assign(target);
    } catch (err: any) {
      setError(err?.message || "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 460, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Login</h1>

      {error && (
        <div style={{ marginTop: 12, color: "crimson" }}>
          <b>{error}</b>
        </div>
      )}

      <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>E-Mail</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="mail@example.com"
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

        <div style={{ color: "#666", fontSize: 12 }}>
          Noch kein Konto? <a href="/register">Jetzt registrieren</a>
        </div>
      </form>
    </div>
  );
}