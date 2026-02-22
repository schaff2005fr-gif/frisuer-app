"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "CUSTOMER" | "BARBER";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://frisuer-app.onrender.com";

export default function LoginPage() {
  const router = useRouter();

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
      console.log("LOGIN submit", { API_BASE }); // Debug: siehst du in Console

      const res = await fetch(`${API_BASE.replace(/\/+$/, "")}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || `Login fehlgeschlagen (HTTP ${res.status})`);
      }

      const token = data?.token;
      const user = data?.user;

      if (!token || !user) throw new Error("Login fehlgeschlagen (keine Daten).");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      const role = (user.role as Role) || "CUSTOMER";
      router.replace(role === "BARBER" ? "/admin" : "/");
      router.refresh();
    } catch (err: any) {
      console.error("LOGIN error:", err);
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