"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "../AdminNav";

const API_BASE = "http://localhost:3001";

type Role = "CUSTOMER" | "BARBER";

type Service = {
  id: number;
  key: string;
  name: string;
  durationMin: number;
  isActive: boolean;
};

type WorkingHoursRow = { day: number; isOpen: boolean; startMin: number; endMin: number };

type AppSettings = {
  stepMin: number;
  workingHours: WorkingHoursRow[];
  extendIfFirstHourFull: boolean;
  extendStepMin: number;
  earliestLimitMin: number;

  // ✅ NEU: Mindestabstand zwischen Buchungen (pro Kunde)
  // 0 = keine Begrenzung
  minDaysBetweenBookings: number;
};

type BarberProfile = {
  id: number;
  name: string;
  slug: string;
  phone: string | null;
  bio: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  instagram: string | null;
  website: string | null;
};

const WEEKDAYS = [
  { k: 0, name: "Sonntag" },
  { k: 1, name: "Montag" },
  { k: 2, name: "Dienstag" },
  { k: 3, name: "Mittwoch" },
  { k: 4, name: "Donnerstag" },
  { k: 5, name: "Freitag" },
  { k: 6, name: "Samstag" },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function minToHHMM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}
function hhmmToMin(v: string) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(v).trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function AdminSettingsPage() {
  const router = useRouter();

  const [tab, setTab] = useState<"PROFILE" | "SERVICES" | "HOURS" | "SLOTS">("PROFILE");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [copied, setCopied] = useState<"" | "profile" | "book">("");

function publicBaseUrl() {
  if (typeof window === "undefined") return "http://localhost:3000";
  // nimmt automatisch die aktuelle Domain (später live super)
  return window.location.origin;
}

async function copyToClipboard(text: string, kind: "profile" | "book") {
  try {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(""), 1200);
  } catch {
    // fallback: prompt
    window.prompt("Kopiere den Link:", text);
  }
}

  // profile
  const [profile, setProfile] = useState<BarberProfile | null>(null);

  // services
  const [services, setServices] = useState<Service[]>([]);
  const [newName, setNewName] = useState("Haare");
  const [newDuration, setNewDuration] = useState(30);

  // settings
  const [settings, setSettings] = useState<AppSettings | null>(null);

  function getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  }

  async function apiFetch(path: string, init?: RequestInit) {
    const token = getToken();
    if (!token) throw new Error("Kein Token. Bitte als BARBER einloggen.");

    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Fehler (${res.status})`);
    return data;
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const p = await apiFetch("/admin/profile", { method: "GET" });
      setProfile(p?.barber ?? null);

      const s1 = await apiFetch("/admin/services", { method: "GET" });
      const list: Service[] = Array.isArray(s1?.services) ? s1.services : [];
      setServices(list);

      const s2 = await apiFetch("/admin/settings", { method: "GET" });

      // ✅ Falls Backend minDaysBetweenBookings noch nicht liefert: Default 0 setzen
      const raw = (s2?.settings ?? null) as AppSettings | null;
      if (raw) {
        setSettings({
          ...raw,
          minDaysBetweenBookings: Number.isFinite((raw as any).minDaysBetweenBookings)
            ? Number((raw as any).minDaysBetweenBookings)
            : 0,
        });
      } else {
        setSettings(null);
      }
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    } finally {
      setLoading(false);
    }
  }

  // ---- PROFILE ----
  async function saveProfile() {
    if (!profile) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await apiFetch("/admin/profile", {
        method: "PUT",
        body: JSON.stringify({
          phone: profile.phone,
          bio: profile.bio,
          street: profile.street,
          postalCode: profile.postalCode,
          city: profile.city,
          instagram: profile.instagram,
          website: profile.website,
        }),
      });

      setProfile(data?.barber ?? profile);
      setMessage("✅ Profil gespeichert");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    } finally {
      setSaving(false);
    }
  }

  // ---- SERVICES ----
  async function createService() {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const name = newName.trim();
      const durationMin = Number(newDuration);
      if (!name) throw new Error("Service-Name fehlt");
      if (!Number.isFinite(durationMin) || durationMin <= 0) throw new Error("Dauer muss > 0 sein");

      const data = await apiFetch("/admin/services", {
        method: "POST",
        body: JSON.stringify({ name, durationMin, isActive: true }),
      });

      const created: Service = data?.service;
      setServices((prev) => [...prev, created].sort((a, b) => a.id - b.id));
      setMessage("✅ Service erstellt");
      setNewName("");
      setNewDuration(30);
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function updateService(id: number, patch: Partial<Pick<Service, "name" | "durationMin" | "isActive">>) {
    setError("");
    setMessage("");
    try {
      const data = await apiFetch(`/admin/services/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      const updated: Service = data?.service;
      setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setMessage("✅ Service aktualisiert");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    }
  }

  async function deleteService(id: number) {
    setError("");
    setMessage("");
    if (!confirm("Service wirklich löschen?")) return;
    try {
      await apiFetch(`/admin/services/${id}`, { method: "DELETE" });
      setServices((prev) => prev.filter((s) => s.id !== id));
      setMessage("✅ Service gelöscht");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    }
  }

  // ---- SETTINGS ----
  async function saveSettings(next: AppSettings) {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const data = await apiFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(next),
      });
      setSettings(data?.settings ?? next);
      setMessage("✅ Einstellungen gespeichert");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    } finally {
      setSaving(false);
    }
  }

  // guard
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
      router.replace("/login");
      return;
    }

    let u: any = null;
    try {
      u = JSON.parse(userRaw);
    } catch {
      u = null;
    }

    if (!u || (u.role as Role) !== "BARBER") {
      router.replace("/");
      return;
    }

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const workingHoursUi = useMemo(() => {
    const wh = settings?.workingHours ?? [];
    const map = new Map<number, WorkingHoursRow>();
    for (const r of wh) map.set(r.day, r);
    return WEEKDAYS.map((d) => map.get(d.k) ?? { day: d.k, isOpen: false, startMin: 12 * 60, endMin: 17 * 60 });
  }, [settings]);

  return (
    <div style={{ padding: 20, maxWidth: 1020, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <h1 style={{ margin: 0 }}>Einstellungen</h1>
          <div style={{ marginTop: 6, color: "#666" }}>Profil · Services · Arbeitszeiten · Slot-Logik</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <AdminNav />
        </div>
      </div>

      {message && (
        <div style={{ marginTop: 12, color: "green" }}>
          <b>{message}</b>
        </div>
      )}
      {error && (
        <div style={{ marginTop: 12, color: "crimson" }}>
          <b>{error}</b>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <TabButton active={tab === "PROFILE"} onClick={() => setTab("PROFILE")}>
          Profil
        </TabButton>
        <TabButton active={tab === "SERVICES"} onClick={() => setTab("SERVICES")}>
          Services
        </TabButton>
        <TabButton active={tab === "HOURS"} onClick={() => setTab("HOURS")}>
          Arbeitszeiten
        </TabButton>
        <TabButton active={tab === "SLOTS"} onClick={() => setTab("SLOTS")}>
          Slot-Logik
        </TabButton>
      </div>

      {loading ? (
        <div style={{ marginTop: 16, color: "#666" }}>Lade...</div>
      ) : tab === "PROFILE" ? (
        <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Profil</h2>

          {!profile ? (
            <div style={{ color: "#666" }}>Kein Profil geladen.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Name</div>
                <input value={profile.name} disabled style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, width: "100%", opacity: 0.8 }} />
                <div style={{ marginTop: 6, display: "grid", gap: 10 }}>
  <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Deine Links</div>

  {(() => {
    const base = publicBaseUrl();
    const profileUrl = `${base}/b/${profile.slug}`;
    const bookUrl = `${base}/b/${profile.slug}/book`;

    return (
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fafafa" }}>
        <div style={{ display: "grid", gap: 10 }}>
          {/* Profil */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ minWidth: 240 }}>
              <div style={{ fontSize: 12, color: "#666" }}>Profil-Link</div>
              <div style={{ fontWeight: 900 }}>{profileUrl}</div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => copyToClipboard(profileUrl, "profile")}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {copied === "profile" ? "✅ Kopiert" : "Link kopieren"}
              </button>

              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  fontWeight: 900,
                  textDecoration: "none",
                  fontSize: 12,
                }}
              >
                Profil öffnen →
              </a>
            </div>
          </div>

          {/* Buchung */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ minWidth: 240 }}>
              <div style={{ fontSize: 12, color: "#666" }}>Buchungs-Link</div>
              <div style={{ fontWeight: 900 }}>{bookUrl}</div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => copyToClipboard(bookUrl, "book")}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {copied === "book" ? "✅ Kopiert" : "Link kopieren"}
              </button>

              <a
                href={bookUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  fontWeight: 900,
                  textDecoration: "none",
                  fontSize: 12,
                }}
              >
                Buchung öffnen →
              </a>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#666" }}>
            Tipp: Schick den <b>Buchungs-Link</b> an deine Kunden.
          </div>
        </div>
      </div>
    );
  })()}
</div>
              </div>

              <Field label="Telefon" value={profile.phone ?? ""} onChange={(v) => setProfile({ ...profile, phone: v || null })} placeholder="z.B. 0176..." />

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
                <Field label="Straße + Nr." value={profile.street ?? ""} onChange={(v) => setProfile({ ...profile, street: v || null })} placeholder="Musterstraße 12" />
                <Field label="PLZ" value={profile.postalCode ?? ""} onChange={(v) => setProfile({ ...profile, postalCode: v || null })} placeholder="45127" />
                <Field label="Stadt" value={profile.city ?? ""} onChange={(v) => setProfile({ ...profile, city: v || null })} placeholder="Essen" />
              </div>

              <Field label="Instagram (optional)" value={profile.instagram ?? ""} onChange={(v) => setProfile({ ...profile, instagram: v || null })} placeholder="@meinbarber" />
              <Field label="Website (optional)" value={profile.website ?? ""} onChange={(v) => setProfile({ ...profile, website: v || null })} placeholder="https://..." />

              <div>
                <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Bio</div>
                <textarea
                  value={profile.bio ?? ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value || null })}
                  placeholder="Kurzer Text über dich, Spezialisierung, Erfahrung..."
                  rows={5}
                  style={{ marginTop: 6, width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
                />
              </div>

              <button
                disabled={saving}
                onClick={saveProfile}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.75 : 1,
                }}
              >
                {saving ? "Speichere..." : "Profil speichern"}
              </button>
            </div>
          )}
        </div>
      ) : tab === "SERVICES" ? (
        <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Services verwalten</h2>

          {/* Create */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <div style={{ flex: "1 1 260px" }}>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Name</div>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z.B. Haare"
                style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, width: "100%" }}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Dauer (Min)</div>
              <input
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, width: 140 }}
              />
            </div>

            <button
              disabled={saving}
              onClick={createService}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 900,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.75 : 1,
              }}
            >
              Hinzufügen
            </button>
          </div>

          {/* List */}
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {services.length === 0 ? (
              <div style={{ color: "#666" }}>Keine Services vorhanden.</div>
            ) : (
              services
                .slice()
                .sort((a, b) => a.id - b.id)
                .map((s) => (
                  <div
                    key={s.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "grid", gap: 8, flex: "1 1 420px" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 240px" }}>
                          <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Name</div>
                          <input
                            defaultValue={s.name}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== s.name) updateService(s.id, { name: v });
                            }}
                            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, width: "100%" }}
                          />
                        </div>

                        <div>
                          <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Dauer</div>
                          <input
                            type="number"
                            defaultValue={s.durationMin}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v) && v > 0 && v !== s.durationMin) updateService(s.id, { durationMin: v });
                            }}
                            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, width: 140 }}
                          />
                        </div>
                      </div>

                      <div style={{ color: "#666", fontSize: 12 }}>
                        key: <b>{s.key}</b> · ID: {s.id}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => updateService(s.id, { isActive: !s.isActive })}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: s.isActive ? "1px solid #111" : "1px solid #ddd",
                          background: s.isActive ? "#111" : "#fff",
                          color: s.isActive ? "#fff" : "#111",
                          fontWeight: 900,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        {s.isActive ? "Aktiv" : "Inaktiv"}
                      </button>

                      <button
                        onClick={() => deleteService(s.id)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #ddd",
                          background: "#fff",
                          color: "#111",
                          fontWeight: 900,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      ) : tab === "HOURS" ? (
        <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Arbeitszeiten</h2>

          {!settings ? (
            <div style={{ color: "#666" }}>Keine Settings geladen.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {workingHoursUi.map((row) => {
                const dayName = WEEKDAYS.find((d) => d.k === row.day)?.name ?? String(row.day);

                return (
                  <div
                    key={row.day}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontWeight: 900, minWidth: 140 }}>{dayName}</div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={row.isOpen}
                          onChange={(e) => {
                            const next = { ...(settings as AppSettings) };
                            next.workingHours = workingHoursUi.map((r) => (r.day === row.day ? { ...r, isOpen: e.target.checked } : r));
                            setSettings(next);
                          }}
                        />
                        <span style={{ fontWeight: 900 }}>Geöffnet</span>
                      </label>

                      <div>
                        <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Start</div>
                        <input
                          defaultValue={minToHHMM(row.startMin)}
                          onBlur={(e) => {
                            const v = hhmmToMin(e.target.value);
                            if (v == null) return;

                            const next = { ...(settings as AppSettings) };
                            next.workingHours = workingHoursUi.map((r) => (r.day === row.day ? { ...r, startMin: clamp(v, 0, 1439) } : r));
                            setSettings(next);
                          }}
                          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, width: 120 }}
                        />
                      </div>

                      <div>
                        <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Ende</div>
                        <input
                          defaultValue={minToHHMM(row.endMin)}
                          onBlur={(e) => {
                            const v = hhmmToMin(e.target.value);
                            if (v == null) return;

                            const next = { ...(settings as AppSettings) };
                            next.workingHours = workingHoursUi.map((r) => (r.day === row.day ? { ...r, endMin: clamp(v, 1, 1440) } : r));
                            setSettings(next);
                          }}
                          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, width: 120 }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                disabled={saving}
                onClick={() => saveSettings(settings as AppSettings)}
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.75 : 1,
                }}
              >
                {saving ? "Speichere..." : "Arbeitszeiten speichern"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Slot-Logik</h2>

          {!settings ? (
            <div style={{ color: "#666" }}>Keine Settings geladen.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <FieldNumber label="Schrittweite (stepMin) in Minuten" value={settings.stepMin} onChange={(v) => setSettings({ ...settings, stepMin: clamp(v, 1, 120) })} />

              <label style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <input type="checkbox" checked={settings.extendIfFirstHourFull} onChange={(e) => setSettings({ ...settings, extendIfFirstHourFull: e.target.checked })} />
                <div>
                  <div style={{ fontWeight: 900 }}>Wenn erste Stunde voll ist → nach vorne öffnen</div>
                  <div style={{ color: "#666", fontSize: 12 }}>Wenn in der ersten Stunde keine freien Slots sind, wird das Fenster nach vorne erweitert.</div>
                </div>
              </label>

              <FieldNumber label="Erweiterungsschritt (extendStepMin) in Minuten" value={settings.extendStepMin} onChange={(v) => setSettings({ ...settings, extendStepMin: clamp(v, 10, 240) })} />

              <FieldTime label="Früheste Grenze (earliestLimitMin) – nicht weiter davor öffnen als" valueMin={settings.earliestLimitMin} onChangeMin={(min) => setSettings({ ...settings, earliestLimitMin: clamp(min, 0, 1439) })} />

              {/* ✅ NEU: Mindest-Tage-Abstand */}
              <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 900 }}>Mindestabstand pro Kunde</div>
                <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
                  Ein Kunde darf erst wieder buchen, wenn seit seinem letzten Termin mindestens <b>X Tage</b> vergangen sind.
                  <br />
                  <b>0</b> = keine Begrenzung.
                </div>

                <input
                  type="number"
                  value={settings.minDaysBetweenBookings ?? 0}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSettings({ ...settings, minDaysBetweenBookings: clamp(Number.isFinite(v) ? v : 0, 0, 365) });
                  }}
                  style={{ marginTop: 10, padding: 10, border: "1px solid #ddd", borderRadius: 10, width: 200 }}
                />
              </div>

              <button
                disabled={saving}
                onClick={() => saveSettings(settings)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.75 : 1,
                }}
              >
                {saving ? "Speichere..." : "Slot-Einstellungen speichern"}
              </button>

              <div style={{ color: "#666", fontSize: 12 }}>
                Tipp: Bei dir ist “immer nur 1 Stunde vorher öffnen” = <b>extendStepMin = 60</b>. Die Grenze setzt du z.B. auf <b>10:00</b>.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton(props: { active: boolean; onClick: () => void; children: any }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: props.active ? "1px solid #111" : "1px solid #ddd",
        background: props.active ? "#111" : "#fff",
        color: props.active ? "#fff" : "#111",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {props.children}
    </button>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, width: "100%" }}
      />
    </div>
  );
}

function FieldNumber(props: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 900 }}>{props.label}</div>
      <input
        type="number"
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        style={{ marginTop: 8, padding: 10, border: "1px solid #ddd", borderRadius: 10, width: 200 }}
      />
    </div>
  );
}

function FieldTime(props: { label: string; valueMin: number; onChangeMin: (min: number) => void }) {
  function minToHHMM(min: number) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  function hhmmToMin(v: string) {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(v).trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 900 }}>{props.label}</div>
      <input
        value={minToHHMM(props.valueMin)}
        onChange={(e) => {
          const v = hhmmToMin(e.target.value);
          if (v != null) props.onChangeMin(v);
        }}
        style={{ marginTop: 8, padding: 10, border: "1px solid #ddd", borderRadius: 10, width: 200 }}
      />
    </div>
  );
}