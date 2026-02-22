"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = "https://frisuer-app.onrender.com";

export default function RegisterCustomerPage() {
  const router = useRouter();

  const [name, setName] = useState("Max Mustermann");
  const [email, setEmail] = useState("kunde@test.de");
  const [phone, setPhone] = useState("015123456789");
  const [password, setPassword] = useState("123456");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          phone: phone?.trim() ? phone.trim() : null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Registrierung fehlgeschlagen");

      // token speichern
      localStorage.setItem("token", data.token);

      // user in localStorage speichern (entweder data.user, oder /me laden)
      if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));

      router.replace("/"); // Kunde -> Startseite
    } catch (err: any) {
      setError(err?.message ?? "Registrierung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Kunde registrieren</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
        />
        <input
          placeholder="Telefon "
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
        />
        <input
          placeholder="Passwort (min. 6 Zeichen)"
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
          {busy ? "..." : "Registrieren"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/login")}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Schon einen Account? → Login
        </button>
      </form>
    </div>
  );
}
