"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";

type Role = "CUSTOMER" | "BARBER";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.login({ email: email.trim(), password });

      // Erwartet: { token, user }
      const token = res?.token;
      const user = res?.user;

      if (!token || !user) throw new Error("Login fehlgeschlagen (keine Daten).");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      const role = (user.role as Role) || "CUSTOMER";

      if (role === "BARBER") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 460, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Login</h1>
      <p style={{ color: "#666", marginTop: 6 }}>Melde dich an, um zu buchen oder dein Dashboard zu öffnen.</p>

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
          {loading ? "Logge ein..." : "Login"}
        </button>

        <div style={{ color: "#666", fontSize: 12 }}>
          Noch kein Konto? <a href="/register">Jetzt registrieren</a>
        </div>
      </form>
    </div>
  );
}