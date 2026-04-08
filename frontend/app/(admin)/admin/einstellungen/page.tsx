"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";
const PUBLIC_APP_URL = process.env.NEXT_PUBLIC_PUBLIC_APP_URL || "";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

type Role = "CUSTOMER" | "BARBER";

type Service = {
  id: number;
  key: string;
  name: string;
  durationMin: number;
  isActive: boolean;
};

type WorkingHoursRow = {
  day: number;
  isOpen: boolean;
  startMin: number;
  endMin: number;
};

type AppSettings = {
  stepMin: number;
  workingHours: WorkingHoursRow[];
  extendIfFirstHourFull: boolean;
  extendStepMin: number;
  earliestLimitMin: number;
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
  imageUrl: string | null;
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

function cleanUrl(u?: string | null) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return "https://" + s;
}

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary ENV fehlt (CLOUD_NAME / UPLOAD_PRESET).");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", "salora/barbers");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Upload fehlgeschlagen");
  return data.secure_url as string;
}

export default function AdminSettingsPage() {
  const router = useRouter();

  const [tab, setTab] = useState<"PROFILE" | "SERVICES" | "HOURS" | "SLOTS">("PROFILE");
  const [menuOpen, setMenuOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [copied, setCopied] = useState<"" | "profile" | "book">("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imgMsg, setImgMsg] = useState("");
  const [localPreview, setLocalPreview] = useState<string>("");

  const [profile, setProfile] = useState<BarberProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [newName, setNewName] = useState("Haare");
  const [newDuration, setNewDuration] = useState(30);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  function clearAlerts() {
    setError("");
    setMessage("");
  }

  function getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
    router.refresh();
  }

  async function deleteAccount() {
    const ok = window.confirm(
      "Willst du deinen Friseur-Account wirklich endgültig löschen?\n\nAlle Daten, Services und Einstellungen gehen dabei verloren."
    );
    if (!ok) return;

    setDeletingAccount(true);
    clearAlerts();

    try {
      const token = getToken();
      if (!token) {
        logout();
        return;
      }

      const res = await fetch(`${API_BASE}/me`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Account konnte nicht gelöscht werden.");
      }

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.assign("/login");
    } catch (e: any) {
      setError(e?.message || "Fehler beim Löschen.");
    } finally {
      setDeletingAccount(false);
    }
  }

  function publicBaseUrl() {
    const envUrl = trimTrailingSlash(cleanUrl(PUBLIC_APP_URL));
    if (envUrl) return envUrl;

    if (typeof window !== "undefined") {
      return trimTrailingSlash(window.location.origin);
    }

    return "https://frisuer-app-1.onrender.com";
  }

  async function copyToClipboard(text: string, kind: "profile" | "book") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      window.prompt("Kopiere den Link:", text);
    }
  }

  async function apiFetch(path: string, init?: RequestInit) {
    const token = getToken();
    if (!token) throw new Error("Kein Token. Bitte als BARBER einloggen.");

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...(init?.headers as Record<string, string> | undefined),
    };

    const method = String(init?.method || "GET").toUpperCase();
    const hasBody = init?.body != null;

    if (hasBody && method !== "GET") {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Fehler (${res.status})`);
    return data;
  }

  async function loadAll() {
    setLoading(true);
    clearAlerts();

    try {
      const p = await apiFetch("/admin/profile", { method: "GET" });
      setProfile(p?.barber ?? null);

      const s1 = await apiFetch("/admin/services", { method: "GET" });
      const list: Service[] = Array.isArray(s1?.services) ? s1.services : [];
      setServices(list);

      const s2 = await apiFetch("/admin/settings", { method: "GET" });

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

  async function saveProfile() {
    if (!profile) return;

    setSaving(true);
    clearAlerts();

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
          imageUrl: profile.imageUrl ?? null,
        }),
      });

      setProfile(data?.barber ?? profile);
      setMessage("Profil gespeichert.");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function saveImageOnly(nextUrl: string | null) {
    const data = await apiFetch("/admin/profile", {
      method: "PUT",
      body: JSON.stringify({ imageUrl: nextUrl }),
    });

    setProfile((prev) => (prev ? { ...prev, imageUrl: data?.barber?.imageUrl ?? nextUrl } : prev));
  }

  async function onPickProfileImage(e: React.ChangeEvent<HTMLInputElement>) {
    setImgMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (localPreview) URL.revokeObjectURL(localPreview);

    if (!file.type.startsWith("image/")) {
      setImgMsg("Bitte nur Bilder auswählen.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImgMsg("Bild ist zu groß (max. 5MB).");
      return;
    }

    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);

    setUploadingImg(true);
    try {
      const url = await uploadToCloudinary(file);

      if (profile) setProfile({ ...profile, imageUrl: url });

      await saveImageOnly(url);
      setImgMsg("✅ Profilbild gespeichert.");
    } catch (err: any) {
      setImgMsg(err?.message || "Upload fehlgeschlagen");
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  }

  async function createService() {
    clearAlerts();
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
      setMessage("Service erstellt.");
      setNewName("");
      setNewDuration(30);
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function updateService(id: number, patch: Partial<Pick<Service, "name" | "durationMin" | "isActive">>) {
    clearAlerts();

    try {
      const data = await apiFetch(`/admin/services/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });

      const updated: Service = data?.service;
      setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setMessage("Service aktualisiert.");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    }
  }

  async function deleteService(id: number) {
    clearAlerts();
    if (!confirm("Service wirklich löschen?")) return;

    try {
      await apiFetch(`/admin/services/${id}`, { method: "DELETE" });
      setServices((prev) => prev.filter((s) => s.id !== id));
      setMessage("Service gelöscht.");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    }
  }

  async function saveSettings(next: AppSettings) {
    clearAlerts();
    setSaving(true);

    try {
      const data = await apiFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(next),
      });

      setSettings(data?.settings ?? next);
      setMessage("Einstellungen gespeichert.");
    } catch (e: any) {
      setError(e?.message ?? "Fehler");
    } finally {
      setSaving(false);
    }
  }

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

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const workingHoursUi = useMemo(() => {
    const wh = settings?.workingHours ?? [];
    const map = new Map<number, WorkingHoursRow>();
    for (const r of wh) map.set(r.day, r);

    return WEEKDAYS.map(
      (d) => map.get(d.k) ?? { day: d.k, isOpen: false, startMin: 12 * 60, endMin: 17 * 60 }
    );
  }, [settings]);

  const previewUrl = cleanUrl(profile?.imageUrl ?? "");
  const showPreview = previewUrl || localPreview;

  const profileUrl = profile ? `${publicBaseUrl()}/b/${profile.slug}` : "";
  const bookUrl = profile ? `${publicBaseUrl()}/b/${profile.slug}/book` : "";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    height: 52,
    borderRadius: 14,
    border: "1px solid #dedede",
    background: "#fff",
    padding: "0 16px",
    fontSize: 16,
    color: "#111",
    outline: "none",
    boxSizing: "border-box",
    display: "block",
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    borderRadius: 14,
    border: "1px solid #dedede",
    background: "#fff",
    padding: "14px 16px",
    fontSize: 16,
    color: "#111",
    outline: "none",
    boxSizing: "border-box",
    display: "block",
    resize: "vertical",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 800,
    color: "#555",
    marginBottom: 8,
  };

  const pageCardStyle: React.CSSProperties = {
    border: "1px solid #e9e9e9",
    borderRadius: 24,
    background: "#fff",
    padding: 18,
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
    overflow: "hidden",
  };

  const sectionCardStyle: React.CSSProperties = {
    border: "1px solid #ededed",
    borderRadius: 18,
    background: "#fcfcfc",
    padding: 14,
  };

  const primaryButton: React.CSSProperties = {
    height: 52,
    borderRadius: 14,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 900,
    fontSize: 15,
    cursor: saving ? "not-allowed" : "pointer",
    width: "100%",
    opacity: saving ? 0.75 : 1,
  };

  const secondaryButton: React.CSSProperties = {
    height: 44,
    borderRadius: 12,
    border: "1px solid #d8d8d8",
    background: "#fff",
    color: "#111",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    padding: "0 14px",
    width: "100%",
  };

  function goTab(next: "PROFILE" | "SERVICES" | "HOURS" | "SLOTS") {
    setTab(next);
    setMenuOpen(false);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1120, margin: "0 auto", overflowX: "hidden" }}>
      <style jsx>{`
        @media (max-width: 720px) {
          .twoColGrid,
          .threeColGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.05, letterSpacing: -0.8 }}>
            Einstellungen
          </h1>
          <div style={{ marginTop: 8, color: "#666", fontSize: 17, lineHeight: 1.45 }}>
            Profil, Services, Arbeitszeiten und Slot-Logik verwalten.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Menü öffnen"
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <span style={{ width: 18, height: 2, background: "#111", display: "block", borderRadius: 999 }} />
            <span style={{ width: 18, height: 2, background: "#111", display: "block", borderRadius: 999 }} />
            <span style={{ width: 18, height: 2, background: "#111", display: "block", borderRadius: 999 }} />
          </div>
        </button>
      </div>

      {(message || error) && (
        <div
          style={{
            marginBottom: 16,
            padding: "14px 16px",
            borderRadius: 16,
            border: error ? "1px solid #f1c7c7" : "1px solid #cfe7d1",
            background: error ? "#fff5f5" : "#f4fbf4",
            color: error ? "#b42318" : "#17663a",
            fontWeight: 700,
          }}
        >
          {error || message}
        </div>
      )}

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Menü schließen"
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              border: "none",
              zIndex: 80,
              cursor: "pointer",
            }}
          />

          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "min(360px, 88vw)",
              height: "100vh",
              background: "#fff",
              zIndex: 90,
              borderLeft: "1px solid #ececec",
              boxShadow: "-8px 0 30px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: 16,
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 1000, fontSize: 20 }}>Menü</div>
                <div style={{ marginTop: 4, color: "#666", fontSize: 13 }}>
                  Bereiche öffnen und Konto verwalten
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Schließen"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 16, display: "grid", gap: 10, overflowY: "auto" }}>
              <DrawerButton active={tab === "PROFILE"} onClick={() => goTab("PROFILE")} label="Profil" />
              <DrawerButton active={tab === "SERVICES"} onClick={() => goTab("SERVICES")} label="Services" />
              <DrawerButton active={tab === "HOURS"} onClick={() => goTab("HOURS")} label="Arbeitszeiten" />
              <DrawerButton active={tab === "SLOTS"} onClick={() => goTab("SLOTS")} label="Slot-Logik" />

              <div style={{ height: 1, background: "#eee", margin: "6px 0" }} />

              <Link
                href="/impressum"
                onClick={() => setMenuOpen(false)}
                style={{
                  height: 48,
                  borderRadius: 14,
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#111",
                  fontWeight: 900,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                }}
              >
                Impressum
              </Link>

              <Link
                href="/datenschutz"
                onClick={() => setMenuOpen(false)}
                style={{
                  height: 48,
                  borderRadius: 14,
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#111",
                  fontWeight: 900,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                }}
              >
                Datenschutz
              </Link>

              <button
                type="button"
                onClick={logout}
                style={{
                  height: 48,
                  borderRadius: 14,
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#111",
                  fontWeight: 900,
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "0 14px",
                }}
              >
                Ausloggen
              </button>

              <button
                type="button"
                onClick={deleteAccount}
                disabled={deletingAccount}
                style={{
                  minHeight: 48,
                  borderRadius: 14,
                  border: "1px solid #d92d20",
                  background: "#fff5f5",
                  color: "#b42318",
                  fontWeight: 900,
                  cursor: deletingAccount ? "not-allowed" : "pointer",
                  textAlign: "left",
                  padding: "12px 14px",
                  opacity: deletingAccount ? 0.7 : 1,
                }}
              >
                {deletingAccount ? "Account wird gelöscht..." : "Account endgültig löschen"}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {loading ? (
        <div style={{ color: "#666" }}>Lade Einstellungen...</div>
      ) : tab === "PROFILE" ? (
        <div style={pageCardStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.1 }}>Profil</h2>
            <div style={{ marginTop: 6, color: "#666", fontSize: 15 }}>
              Öffentliche Infos, Links und Profilbild verwalten.
            </div>
          </div>

          {!profile ? (
            <div style={{ marginTop: 16, color: "#666" }}>Kein Profil geladen.</div>
          ) : (
            <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
              <div
                className="twoColGrid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <div style={sectionCardStyle}>
                  <div style={{ fontWeight: 900, fontSize: 17 }}>Öffentliche Links</div>
                  <div style={{ marginTop: 6, color: "#666", fontSize: 14 }}>
                    Diese Links teilst du mit deinen Kunden.
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                    <LinkBox
                      title="Profil-Link"
                      url={profileUrl}
                      copied={copied === "profile"}
                      onCopy={() => copyToClipboard(profileUrl, "profile")}
                      openLabel="Profil öffnen"
                    />

                    <LinkBox
                      title="Buchungs-Link"
                      url={bookUrl}
                      copied={copied === "book"}
                      onCopy={() => copyToClipboard(bookUrl, "book")}
                      openLabel="Buchung öffnen"
                    />

                    {!PUBLIC_APP_URL ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#8a6200",
                          background: "#fff8e8",
                          border: "1px solid #f1dfb3",
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        Hinweis: Setze in Vercel <b>NEXT_PUBLIC_PUBLIC_APP_URL</b> auf deine echte Domain,
                        damit hier nicht die Vercel-URL verwendet wird.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div style={sectionCardStyle}>
                  <div style={{ fontWeight: 900, fontSize: 17 }}>Profilbild</div>
                  <div style={{ marginTop: 6, color: "#666", fontSize: 14 }}>
                    Bild auswählen, hochladen und direkt speichern.
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                    <div
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 999,
                        border: "1px solid #e7e7e7",
                        background: "#fafafa",
                        overflow: "hidden",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 900,
                        color: "#666",
                      }}
                    >
                      {showPreview ? (
                        <img
                          src={showPreview}
                          alt="Profilbild"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        "—"
                      )}
                    </div>

                    <div>
                      <div style={labelStyle}>Bild auswählen</div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onPickProfileImage}
                        disabled={uploadingImg || saving}
                        style={{
                          ...inputStyle,
                          paddingTop: 12,
                          paddingBottom: 12,
                          height: "auto",
                        }}
                      />
                    </div>

                    <Field
                      label="Profilbild (Link)"
                      value={profile.imageUrl ?? ""}
                      onChange={(v) => setProfile({ ...profile, imageUrl: v || null })}
                      placeholder="https://..."
                      inputStyle={inputStyle}
                      labelStyle={labelStyle}
                    />

                    {imgMsg ? (
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: imgMsg.startsWith("✅") ? "#17663a" : "#b42318",
                        }}
                      >
                        {imgMsg}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#666" }}>
                        Status: {showPreview ? (uploadingImg ? "lädt..." : "bereit") : "kein Bild"}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={sectionCardStyle}>
                <div style={{ fontWeight: 900, fontSize: 17 }}>Grunddaten</div>

                <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                  <div>
                    <div style={labelStyle}>Name</div>
                    <input value={profile.name} disabled style={{ ...inputStyle, opacity: 0.8 }} />
                  </div>

                  <Field
                    label="Telefon"
                    value={profile.phone ?? ""}
                    onChange={(v) => setProfile({ ...profile, phone: v || null })}
                    placeholder="z. B. 0176..."
                    inputStyle={inputStyle}
                    labelStyle={labelStyle}
                  />

                  <div
                    className="threeColGrid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 12,
                    }}
                  >
                    <Field
                      label="Straße + Nr."
                      value={profile.street ?? ""}
                      onChange={(v) => setProfile({ ...profile, street: v || null })}
                      placeholder="Musterstraße 12"
                      inputStyle={inputStyle}
                      labelStyle={labelStyle}
                    />
                    <Field
                      label="PLZ"
                      value={profile.postalCode ?? ""}
                      onChange={(v) => setProfile({ ...profile, postalCode: v || null })}
                      placeholder="45127"
                      inputStyle={inputStyle}
                      labelStyle={labelStyle}
                    />
                    <Field
                      label="Stadt"
                      value={profile.city ?? ""}
                      onChange={(v) => setProfile({ ...profile, city: v || null })}
                      placeholder="Essen"
                      inputStyle={inputStyle}
                      labelStyle={labelStyle}
                    />
                  </div>

                  <Field
                    label="Instagram (optional)"
                    value={profile.instagram ?? ""}
                    onChange={(v) => setProfile({ ...profile, instagram: v || null })}
                    placeholder="@meinbarber"
                    inputStyle={inputStyle}
                    labelStyle={labelStyle}
                  />

                  <Field
                    label="Website (optional)"
                    value={profile.website ?? ""}
                    onChange={(v) => setProfile({ ...profile, website: v || null })}
                    placeholder="https://..."
                    inputStyle={inputStyle}
                    labelStyle={labelStyle}
                  />

                  <div>
                    <div style={labelStyle}>Bio</div>
                    <textarea
                      value={profile.bio ?? ""}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value || null })}
                      placeholder="Kurzer Text über dich, Spezialisierung, Erfahrung..."
                      rows={5}
                      style={textareaStyle}
                    />
                  </div>
                </div>
              </div>

              <button disabled={saving} onClick={saveProfile} style={primaryButton}>
                {saving ? "Speichert..." : "Profil speichern"}
              </button>
            </div>
          )}
        </div>
      ) : tab === "SERVICES" ? (
        <div style={pageCardStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.1 }}>Services</h2>
            <div style={{ marginTop: 6, color: "#666", fontSize: 15 }}>
              Leistungen, Dauer und Aktiv-Status verwalten.
            </div>
          </div>

          <div style={{ ...sectionCardStyle, marginTop: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 17 }}>Neuen Service anlegen</div>

            <div
              className="threeColGrid"
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
                alignItems: "end",
              }}
            >
              <Field
                label="Name"
                value={newName}
                onChange={setNewName}
                placeholder="z. B. Haare"
                inputStyle={inputStyle}
                labelStyle={labelStyle}
              />

              <div>
                <div style={labelStyle}>Dauer (Minuten)</div>
                <input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>

              <button disabled={saving} onClick={createService} style={primaryButton}>
                {saving ? "Speichert..." : "Service hinzufügen"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {services.length === 0 ? (
              <div style={{ color: "#666" }}>Keine Services vorhanden.</div>
            ) : (
              services
                .slice()
                .sort((a, b) => a.id - b.id)
                .map((s) => (
                  <div key={s.id} style={sectionCardStyle}>
                    <div
                      className="twoColGrid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 12,
                        alignItems: "end",
                      }}
                    >
                      <div>
                        <div style={labelStyle}>Name</div>
                        <input
                          defaultValue={s.name}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== s.name) updateService(s.id, { name: v });
                          }}
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <div style={labelStyle}>Dauer (Minuten)</div>
                        <input
                          type="number"
                          defaultValue={s.durationMin}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v) && v > 0 && v !== s.durationMin) {
                              updateService(s.id, { durationMin: v });
                            }
                          }}
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 10, color: "#666", fontSize: 12, wordBreak: "break-word" }}>
                      key: <b>{s.key}</b> · ID: {s.id}
                    </div>

                    <div
                      className="twoColGrid"
                      style={{
                        marginTop: 12,
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 10,
                      }}
                    >
                      <button
                        onClick={() => updateService(s.id, { isActive: !s.isActive })}
                        style={{
                          ...secondaryButton,
                          border: s.isActive ? "1px solid #111" : "1px solid #ddd",
                          background: s.isActive ? "#111" : "#fff",
                          color: s.isActive ? "#fff" : "#111",
                        }}
                      >
                        {s.isActive ? "Aktiv" : "Inaktiv"}
                      </button>

                      <button onClick={() => deleteService(s.id)} style={secondaryButton}>
                        Löschen
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      ) : tab === "HOURS" ? (
        <div style={pageCardStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.1 }}>Arbeitszeiten</h2>
            <div style={{ marginTop: 6, color: "#666", fontSize: 15 }}>
              Öffnungszeiten pro Wochentag festlegen.
            </div>
          </div>

          {!settings ? (
            <div style={{ marginTop: 16, color: "#666" }}>Keine Einstellungen geladen.</div>
          ) : (
            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              {workingHoursUi.map((row) => {
                const dayName = WEEKDAYS.find((d) => d.k === row.day)?.name ?? String(row.day);

                return (
                  <div key={row.day} style={sectionCardStyle}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontWeight: 900, fontSize: 17 }}>{dayName}</div>

                      <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 800 }}>
                        <input
                          type="checkbox"
                          checked={row.isOpen}
                          onChange={(e) => {
                            const next = { ...(settings as AppSettings) };
                            next.workingHours = workingHoursUi.map((r) =>
                              r.day === row.day ? { ...r, isOpen: e.target.checked } : r
                            );
                            setSettings(next);
                          }}
                        />
                        Geöffnet
                      </label>
                    </div>

                    <div
                      className="twoColGrid"
                      style={{
                        marginTop: 12,
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 12,
                        alignItems: "end",
                      }}
                    >
                      <div>
                        <div style={labelStyle}>Start</div>
                        <input
                          defaultValue={minToHHMM(row.startMin)}
                          onBlur={(e) => {
                            const v = hhmmToMin(e.target.value);
                            if (v == null) return;

                            const next = { ...(settings as AppSettings) };
                            next.workingHours = workingHoursUi.map((r) =>
                              r.day === row.day ? { ...r, startMin: clamp(v, 0, 1439) } : r
                            );
                            setSettings(next);
                          }}
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <div style={labelStyle}>Ende</div>
                        <input
                          defaultValue={minToHHMM(row.endMin)}
                          onBlur={(e) => {
                            const v = hhmmToMin(e.target.value);
                            if (v == null) return;

                            const next = { ...(settings as AppSettings) };
                            next.workingHours = workingHoursUi.map((r) =>
                              r.day === row.day ? { ...r, endMin: clamp(v, 1, 1440) } : r
                            );
                            setSettings(next);
                          }}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <button disabled={saving} onClick={() => saveSettings(settings)} style={primaryButton}>
                {saving ? "Speichert..." : "Arbeitszeiten speichern"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={pageCardStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.1 }}>Slot-Logik</h2>
            <div style={{ marginTop: 6, color: "#666", fontSize: 15 }}>
              Regeln für verfügbare Termine und Buchungsabstände festlegen.
            </div>
          </div>

          {!settings ? (
            <div style={{ marginTop: 16, color: "#666" }}>Keine Einstellungen geladen.</div>
          ) : (
            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              <FieldNumber
                label="Schrittweite (stepMin) in Minuten"
                value={settings.stepMin}
                onChange={(v) => setSettings({ ...settings, stepMin: clamp(v, 1, 120) })}
                inputStyle={inputStyle}
              />

              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  border: "1px solid #eee",
                  borderRadius: 16,
                  padding: 14,
                  background: "#fcfcfc",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.extendIfFirstHourFull}
                  onChange={(e) => setSettings({ ...settings, extendIfFirstHourFull: e.target.checked })}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontWeight: 900 }}>Wenn erste Stunde voll ist → nach vorne öffnen</div>
                  <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
                    Wenn in der ersten Stunde keine freien Slots sind, wird das Fenster nach vorne erweitert.
                  </div>
                </div>
              </label>

              <FieldNumber
                label="Erweiterungsschritt (extendStepMin) in Minuten"
                value={settings.extendStepMin}
                onChange={(v) => setSettings({ ...settings, extendStepMin: clamp(v, 10, 240) })}
                inputStyle={inputStyle}
              />

              <FieldTime
                label="Früheste Grenze (earliestLimitMin)"
                valueMin={settings.earliestLimitMin}
                onChangeMin={(min) => setSettings({ ...settings, earliestLimitMin: clamp(min, 0, 1439) })}
                inputStyle={inputStyle}
              />

              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: 16,
                  padding: 14,
                  background: "#fcfcfc",
                }}
              >
                <div style={{ fontWeight: 900 }}>Mindestabstand pro Kunde</div>
                <div style={{ marginTop: 6, color: "#666", fontSize: 13, lineHeight: 1.45 }}>
                  Ein Kunde darf erst wieder buchen, wenn seit seinem letzten Termin mindestens <b>X Tage</b>
                  vergangen sind. <b>0</b> bedeutet keine Begrenzung.
                </div>

                <input
                  type="number"
                  value={settings.minDaysBetweenBookings ?? 0}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSettings({
                      ...settings,
                      minDaysBetweenBookings: clamp(Number.isFinite(v) ? v : 0, 0, 365),
                    });
                  }}
                  style={{ ...inputStyle, marginTop: 12, maxWidth: 260 }}
                />
              </div>

              <button disabled={saving} onClick={() => saveSettings(settings)} style={primaryButton}>
                {saving ? "Speichert..." : "Slot-Einstellungen speichern"}
              </button>

              <div
                style={{
                  color: "#666",
                  fontSize: 13,
                  lineHeight: 1.45,
                  border: "1px solid #ececec",
                  background: "#fafafa",
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                Tipp: Für „immer nur 1 Stunde vorher öffnen“ setzt du <b>extendStepMin = 60</b>. Die Grenze
                kannst du z. B. auf <b>10:00</b> setzen.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DrawerButton(props: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        height: 48,
        borderRadius: 14,
        border: props.active ? "1px solid #111" : "1px solid #ddd",
        background: props.active ? "#111" : "#fff",
        color: props.active ? "#fff" : "#111",
        fontWeight: 900,
        cursor: "pointer",
        textAlign: "left",
        padding: "0 14px",
      }}
    >
      {props.label}
    </button>
  );
}

function LinkBox(props: {
  title: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
  openLabel: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e9e9e9",
        borderRadius: 16,
        padding: 14,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 13, color: "#666", fontWeight: 800 }}>{props.title}</div>
      <div style={{ marginTop: 8, fontWeight: 900, wordBreak: "break-word", lineHeight: 1.4 }}>
        {props.url}
      </div>

      <div
        className="twoColGrid"
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={props.onCopy}
          style={{
            height: 44,
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "#fff",
            fontWeight: 900,
            cursor: "pointer",
            width: "100%",
          }}
        >
          {props.copied ? "✅ Kopiert" : "Link kopieren"}
        </button>

        <a
          href={props.url}
          target="_blank"
          rel="noreferrer"
          style={{
            height: 44,
            borderRadius: 12,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            fontWeight: 900,
            textDecoration: "none",
            display: "grid",
            placeItems: "center",
            width: "100%",
          }}
        >
          {props.openLabel}
        </a>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={props.labelStyle}>{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        style={props.inputStyle}
      />
    </div>
  );
}

function FieldNumber(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  inputStyle: React.CSSProperties;
}) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 16,
        padding: 14,
        background: "#fcfcfc",
      }}
    >
      <div style={{ fontWeight: 900 }}>{props.label}</div>
      <input
        type="number"
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        style={{ ...props.inputStyle, marginTop: 10, maxWidth: 260 }}
      />
    </div>
  );
}

function FieldTime(props: {
  label: string;
  valueMin: number;
  onChangeMin: (min: number) => void;
  inputStyle: React.CSSProperties;
}) {
  function localMinToHHMM(min: number) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function localHhmmToMin(v: string) {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(v).trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 16,
        padding: 14,
        background: "#fcfcfc",
      }}
    >
      <div style={{ fontWeight: 900 }}>{props.label}</div>
      <input
        value={localMinToHHMM(props.valueMin)}
        onChange={(e) => {
          const v = localHhmmToMin(e.target.value);
          if (v != null) props.onChangeMin(v);
        }}
        style={{ ...props.inputStyle, marginTop: 10, maxWidth: 260 }}
      />
    </div>
  );
}