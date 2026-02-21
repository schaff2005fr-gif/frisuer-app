"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = "https://frisuer-app.onrender.com";

type Me = {
  id: number;
  email: string;
  role: "CUSTOMER" | "BARBER";
  customer: { id: number; name: string; phone: string | null } | null;
  barber?: any;
};

function getToken() {
  return localStorage.getItem("token") || "";
}

export default function CustomerSettingsPage() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadMe() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        router.replace("/login");
        return;
      }

      const m = data as Me;

      // Guard: nur CUSTOMER
      if (m.role !== "CUSTOMER") {
        router.replace("/");
        return;
      }

      setMe(m);
      setName(m.customer?.name ?? "");
      setPhone(m.customer?.phone ?? "");
    } catch (e) {
      console.error(e);
      setError("Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch(`${API_BASE}/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Konnte nicht speichern.");
        return;
      }

      const updatedMe: Me = data?.me;

      setMe(updatedMe);
      setMessage("✅ Profil gespeichert");

      // ✅ WICHTIG: localStorage user updaten, damit Guards/Redirects stimmen
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: updatedMe.id,
          email: updatedMe.email,
          role: updatedMe.role,
          barberId: (updatedMe as any).barberId ?? null,
          customer: updatedMe.customer,
          barber: (updatedMe as any).barber ?? null,
        })
      );
    } catch (e) {
      console.error(e);
      setError("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Lade…</div>;

  return (
    <div style={{ padding: 20, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <h1 style={{ margin: 0 }}>Profil</h1>
          <div style={{ marginTop: 6, color: "#666" }}>Name & Telefonnummer ändern</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href="/"
            style={{
              textDecoration: "none",
              border: "1px solid #eee",
              padding: "10px 12px",
              borderRadius: 12,
              color: "#111",
              fontWeight: 900,
              background: "#fff",
            }}
          >
            Startseite
          </a>

          <a
            href="/my-bookings"
            style={{
              textDecoration: "none",
              border: "1px solid #eee",
              padding: "10px 12px",
              borderRadius: 12,
              color: "#111",
              fontWeight: 900,
              background: "#fff",
            }}
          >
            Meine Termine
          </a>
        </div>
      </div>

      {message ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #b7ebc6", background: "#f0fff4", borderRadius: 12 }}>
          <b>{message}</b>
        </div>
      ) : null}

      {error ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f2c6c6", background: "#fff5f5", borderRadius: 12, color: "#8a1c1c" }}>
          <b>{error}</b>
        </div>
      ) : null}

      <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Name </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ marginTop: 6, padding: 12, border: "1px solid #ddd", borderRadius: 12, width: "100%" }}
              placeholder="z.B. Max Mustermann"
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Telefon </div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ marginTop: 6, padding: 12, border: "1px solid #ddd", borderRadius: 12, width: "100%" }}
              placeholder="z.B. 0176..."
            />
            <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
              
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving || !name.trim()}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving || !name.trim() ? 0.7 : 1,
            }}
          >
            {saving ? "Speichere..." : "Speichern"}
          </button>

          <div style={{ color: "#666", fontSize: 12 }}>
            Eingeloggt als: <b>{me?.email}</b>
          </div>
        </div>
      </div>
    </div>
  );
}