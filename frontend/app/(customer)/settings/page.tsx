"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

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
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
    router.refresh();
  }

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
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        router.replace("/login");
        return;
      }

      const m = data as Me;

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
      if (!token) return router.replace("/login");

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

      const updatedMe: Me = (data?.me ?? data) as Me;

      setMe(updatedMe);
      setMessage("✅ Profil gespeichert");

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

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Willst du deinen Account wirklich komplett löschen?\n\nAlle Termine und Daten werden endgültig entfernt."
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setMessage("");

    try {
      const token = getToken();
      if (!token) return router.replace("/login");

      const res = await fetch(`${API_BASE}/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Account konnte nicht gelöscht werden.");
        return;
      }

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.location.assign("/");
    } catch (e) {
      console.error(e);
      setError("Fehler beim Löschen.");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Lade…</div>;

  return (
    <div className="page">
      <style jsx>{`
        .page {
          padding: 20px;
          max-width: 720px;
          margin: 0 auto;
        }

        .header {
          margin-bottom: 14px;
        }

        .sub {
          margin-top: 6px;
          color: #666;
          line-height: 1.4;
        }

        .alertOk {
          margin-bottom: 12px;
          padding: 12px;
          border: 1px solid #b7ebc6;
          background: #f0fff4;
          border-radius: 12px;
        }

        .alertErr {
          margin-bottom: 12px;
          padding: 12px;
          border: 1px solid #f2c6c6;
          background: #fff5f5;
          border-radius: 12px;
          color: #8a1c1c;
        }

        .card {
          border: 1px solid #eee;
          border-radius: 14px;
          padding: 14px;
          background: #fff;
        }

        .grid {
          display: grid;
          gap: 12px;
        }

        .label {
          font-size: 12px;
          color: #666;
          font-weight: 900;
        }

        .input {
          margin-top: 6px;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 12px;
          width: 100%;
        }

        .btnPrimary {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #111;
          background: #111;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }

        .btnPrimary:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .btnGhost {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
          font-weight: 900;
          cursor: pointer;
        }

        .muted {
          color: #666;
          font-size: 12px;
          line-height: 1.4;
        }

        .danger {
          margin-top: 20px;
          border-top: 1px solid #eee;
          padding-top: 16px;
        }

        .dangerTitle {
          font-weight: 900;
          color: #8a1c1c;
        }

        .btnDanger {
          margin-top: 10px;
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #8a1c1c;
          background: #fff5f5;
          color: #8a1c1c;
          font-weight: 900;
          cursor: pointer;
        }

        .btnDanger:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        /* ✅ Mobile */
        @media (max-width: 520px) {
          .page {
            padding: 14px;
          }
        }
      `}</style>

      <div className="header">
        <h1 style={{ margin: 0 }}>Profil</h1>
        <div className="sub">Name & Telefonnummer ändern</div>
      </div>

      {message && (
        <div className="alertOk">
          <b>{message}</b>
        </div>
      )}

      {error && (
        <div className="alertErr">
          <b>{error}</b>
        </div>
      )}

      <div className="card">
        <div className="grid">
          <div>
            <div className="label">Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="z.B. Max Mustermann"
            />
          </div>

          <div>
            <div className="label">Telefon</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="z.B. 0176..."
            />
          </div>

          <button onClick={save} disabled={saving || !name.trim()} className="btnPrimary">
            {saving ? "Speichere..." : "Speichern"}
          </button>

          <div className="muted">
            Eingeloggt als: <b>{me?.email}</b>
          </div>

          {/* ✅ neu: Logout Button */}
          <button onClick={logout} className="btnGhost">
            Ausloggen
          </button>

          <div className="danger">
            <div className="dangerTitle">Gefährliche Aktion</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Dein Account wird endgültig gelöscht. Alle Termine und Daten gehen verloren.
            </div>

            <button onClick={deleteAccount} disabled={deleting} className="btnDanger">
              {deleting ? "Lösche Account..." : "Account endgültig löschen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}