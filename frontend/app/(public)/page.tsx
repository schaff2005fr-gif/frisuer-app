"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("kunde@test.de");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      await login(email, password);

      // ✅ 100% zuverlässig: direkt aus localStorage lesen
      const u = JSON.parse(localStorage.getItem("user") || "null");

      if (u?.role === "BARBER") router.replace("/admin");
      else router.replace("/");
    } catch (err: any) {
      setError(err.message ?? "Login fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Login</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
        />
        <input
          placeholder="Passwort"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
        />

        {error && <div style={{ color: "crimson" }}>{error}</div>}

        <button
          disabled={busy}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #111",
            background: busy ? "#eee" : "#111",
            color: busy ? "#111" : "#fff",
            cursor: busy ? "not-allowed" : "pointer",
            fontWeight: 800,
          }}
        >
          {busy ? "..." : "Einloggen"}
        </button>

        {/* ✅ Registrierung Auswahl */}
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => router.push("/register")}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Kunde registrieren
          </button>

          <button
            type="button"
            onClick={() => router.push("/register-barber")}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Friseur registrieren
          </button>
        </div>
      </form>
    </div>
  );
}
