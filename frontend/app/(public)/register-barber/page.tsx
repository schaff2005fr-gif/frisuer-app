"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE = "https://frisuer-app.onrender.com";

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
    <Suspense fallback={<div style={{ padding: 20, maxWidth: 520, margin: "0 auto", color: "#666" }}>Lade…</div>}>
      <RegisterBarberInner />
    </Suspense>
  );
}

function RegisterBarberInner() {
  const sp = useSearchParams();
  const nextRaw = sp.get("next");
  const nextPath = useMemo(() => safeNextPath(nextRaw), [nextRaw]);

  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setError(null);

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    setBusy(true);

    try {
      const res = await fetch(`${API_BASE}/auth/register-barber`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim() ? phone.trim() : null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Registrierung fehlgeschlagen");

      localStorage.setItem("token", data.token);
      if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));

      const target = nextPath || "/admin";
      window.location.assign(target);
    } catch (err: any) {
      setError(err?.message ?? "Registrierung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 520, margin: "0 auto" }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Friseur-Account erstellen</h1>
        <div style={{ marginTop: 6, color: "#666" }}>Registriere deinen Barbershop und verwalte Termine online.</div>
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
          Nach der Registrierung geht’s weiter zu: <span style={{ opacity: 0.8 }}>{nextPath}</span>
        </div>
      ) : null}

      {error && (
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
      )}

      <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#666" }}>Name (Shop oder Friseur)</div>
            <input
              placeholder="Barbershop Ali"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#666" }}>E-Mail</div>
            <input
              type="email"
              placeholder="kontakt@barbershop-ali.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#666" }}>Telefon (optional)</div>
            <input
              placeholder="0170 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#666" }}>Passwort</div>
            <input
              type="password"
              placeholder="Mindestens 8 Zeichen"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
            />
            <div style={{ fontSize: 11, color: "#666" }}>Mindestens 8 Zeichen.</div>
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: 4,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.75 : 1,
            }}
          >
            {busy ? "Registriere..." : "Friseur-Account erstellen"}
          </button>

          <div style={{ fontSize: 12, color: "#666" }}>
            Schon ein Konto?{" "}
            <a href={loginHref} style={{ fontWeight: 900, color: "#111" }}>
              Zum Login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}