"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";
const PUBLIC_APP_URL = process.env.NEXT_PUBLIC_PUBLIC_APP_URL || "";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

type Role = "CUSTOMER" | "BARBER";
type TabKey = "PROFILE" | "SERVICES" | "HOURS" | "RULES";

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
  subscriptionStatus?: string | null;
  subscriptionPlan?: string | null;
  subscriptionSource?: string | null;
  subscriptionExpiresAt?: string | null;
  trialEndsAt?: string | null;
  revenueCatAppUserId?: string | null;
  subscriptionUpdatedAt?: string | null;
};

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
  displayStartMin: number;
  displayEndMin: number;
  extendIfFirstHourFull: boolean;
  extendStepMin: number;
  minDaysBetweenBookings: number;
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

const SERVICE_DURATION_OPTIONS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 60];
const STEP_MIN_OPTIONS = [5, 10, 15, 20, 30];
const EXTEND_STEP_OPTIONS = [15, 30, 45, 60];
const DISPLAY_TIME_OPTIONS = [
  6 * 60,
  7 * 60,
  8 * 60,
  9 * 60,
  10 * 60,
  11 * 60,
  12 * 60,
  13 * 60,
  14 * 60,
  15 * 60,
  16 * 60,
  17 * 60,
  18 * 60,
  19 * 60,
  20 * 60,
  21 * 60,
  22 * 60,
];
const MIN_DAYS_OPTIONS = [0, 1, 2, 3, 5, 7, 10, 14, 21, 30];
const WORK_TIME_OPTIONS = [
  6 * 60,
  7 * 60,
  8 * 60,
  9 * 60,
  10 * 60,
  11 * 60,
  12 * 60,
  13 * 60,
  14 * 60,
  15 * 60,
  16 * 60,
  17 * 60,
  18 * 60,
  19 * 60,
  20 * 60,
  21 * 60,
  22 * 60,
];

function cleanUrl(u?: string | null) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return "https://" + s;
}

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minToHHMM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary ENV fehlt.");
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
  if (!res.ok) {
    throw new Error(data?.error?.message || "Upload fehlgeschlagen");
  }

  return String(data.secure_url || "");
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setUser(nextUser: any) {
  if (typeof window === "undefined") return;
  localStorage.setItem("user", JSON.stringify(nextUser));
}

export default function AdminSettingsPage() {
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("PROFILE");
  const [hasActivePro, setHasActivePro] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [creatingService, setCreatingService] = useState(false);
  const [busyServiceId, setBusyServiceId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [profile, setProfile] = useState<BarberProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState(30);

  const [copied, setCopied] = useState<"" | "profile" | "book">("");
  const [localPreview, setLocalPreview] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = getUser();

    if (!token || !user) {
      router.replace("/login");
      return;
    }

    if ((user.role as Role) !== "BARBER") {
      router.replace("/");
      return;
    }

    Promise.all([loadAll(), loadSubscriptionStatus()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function apiFetch(path: string, init?: RequestInit) {
    const token = getToken();
    if (!token) throw new Error("Kein Token. Bitte neu einloggen.");

    const isFormData = init?.body instanceof FormData;

    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const raw = await res.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      throw new Error(data?.error || `Fehler (${res.status})`);
    }

    return data;
  }

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [profileRes, servicesRes, settingsRes] = await Promise.all([
        apiFetch("/admin/profile", { method: "GET" }),
        apiFetch("/admin/services", { method: "GET" }),
        apiFetch("/admin/settings", { method: "GET" }),
      ]);

      const nextProfile = (profileRes.barber ?? profileRes.data?.barber ?? null) as BarberProfile | null;
      setProfile(nextProfile);

      setServices(
        Array.isArray(servicesRes.services)
          ? servicesRes.services
          : Array.isArray(servicesRes.data?.services)
          ? servicesRes.data.services
          : []
      );

      const rawSettings =
        (settingsRes.settings ?? settingsRes.data?.settings ?? null) as AppSettings | null;

      if (rawSettings) {
        setSettings({
          ...rawSettings,
          displayStartMin: Number.isFinite((rawSettings as any).displayStartMin)
            ? Number((rawSettings as any).displayStartMin)
            : Number.isFinite((rawSettings as any).earliestLimitMin)
            ? Number((rawSettings as any).earliestLimitMin)
            : 12 * 60,
          displayEndMin: Number.isFinite((rawSettings as any).displayEndMin)
            ? Number((rawSettings as any).displayEndMin)
            : 17 * 60,
          minDaysBetweenBookings: Number.isFinite((rawSettings as any).minDaysBetweenBookings)
            ? Number((rawSettings as any).minDaysBetweenBookings)
            : 0,
        });
      } else {
        setSettings(null);
      }

      const localUser = getUser();
      if (localUser?.role === "BARBER" && nextProfile) {
        setUser({
          ...localUser,
          barber: {
            ...localUser.barber,
            ...nextProfile,
          },
        });
      }
    } catch (e: any) {
      setError(e?.message || "Einstellungen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSubscriptionStatus() {
    try {
      setCheckingSubscription(true);

      const syncData = await apiFetch("/admin/subscription/sync", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const subData = await apiFetch("/admin/subscription-status", { method: "GET" });
      const subscription = subData?.subscription ?? {};

      setHasActivePro(!!subscription?.isPro);

      const localUser = getUser();
      if (localUser?.role === "BARBER") {
        const nextUser = {
          ...localUser,
          barber: {
            ...localUser.barber,
            ...(syncData?.barber ?? {}),
            subscriptionStatus: subscription?.status ?? localUser?.barber?.subscriptionStatus ?? null,
            subscriptionPlan: subscription?.plan ?? localUser?.barber?.subscriptionPlan ?? null,
            subscriptionSource: subscription?.source ?? localUser?.barber?.subscriptionSource ?? null,
            subscriptionExpiresAt: subscription?.expiresAt ?? localUser?.barber?.subscriptionExpiresAt ?? null,
            trialEndsAt: subscription?.trialEndsAt ?? localUser?.barber?.trialEndsAt ?? null,
            revenueCatAppUserId:
              subscription?.revenueCatAppUserId ??
              syncData?.revenueCatAppUserId ??
              localUser?.barber?.revenueCatAppUserId ??
              null,
            subscriptionUpdatedAt: subscription?.updatedAt ?? localUser?.barber?.subscriptionUpdatedAt ?? null,
          },
        };
        setUser(nextUser);
      }
    } catch (e) {
      console.log("LOAD SUBSCRIPTION STATUS ERROR:", e);
      setHasActivePro(false);
    } finally {
      setCheckingSubscription(false);
    }
  }

  async function saveProfile() {
    if (!profile) return;

    try {
      setSavingProfile(true);
      setError("");
      setMessage("");

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

      const nextProfile = (data?.barber ?? data?.data?.barber ?? profile) as BarberProfile;
      setProfile(nextProfile);

      const localUser = getUser();
      if (localUser?.role === "BARBER") {
        setUser({
          ...localUser,
          barber: {
            ...localUser.barber,
            ...nextProfile,
          },
        });
      }

      setMessage("Profil gespeichert.");
    } catch (e: any) {
      setError(e?.message || "Profil konnte nicht gespeichert werden.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function pickImage(file: File | null) {
    if (!file || !profile) return;

    try {
      setError("");
      setMessage("");

      if (localPreview) URL.revokeObjectURL(localPreview);

      if (!file.type.startsWith("image/")) {
        setError("Bitte nur Bilder auswählen.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Bild ist zu groß (max. 5MB).");
        return;
      }

      const preview = URL.createObjectURL(file);
      setLocalPreview(preview);
      setUploadingImg(true);

      const uploadedUrl = await uploadToCloudinary(file);

      setProfile((prev) => (prev ? { ...prev, imageUrl: uploadedUrl } : prev));

      await apiFetch("/admin/profile", {
        method: "PUT",
        body: JSON.stringify({ imageUrl: uploadedUrl }),
      });

      const localUser = getUser();
      if (localUser?.role === "BARBER") {
        setUser({
          ...localUser,
          barber: {
            ...localUser.barber,
            imageUrl: uploadedUrl,
          },
        });
      }

      setMessage("Profilbild gespeichert.");
    } catch (e: any) {
      setError(e?.message || "Profilbild konnte nicht hochgeladen werden.");
    } finally {
      setUploadingImg(false);
    }
  }

  async function removeImage() {
    if (!profile) return;

    try {
      setUploadingImg(true);
      setError("");
      setMessage("");

      setProfile((prev) => (prev ? { ...prev, imageUrl: null } : prev));

      await apiFetch("/admin/profile", {
        method: "PUT",
        body: JSON.stringify({ imageUrl: null }),
      });

      const localUser = getUser();
      if (localUser?.role === "BARBER") {
        setUser({
          ...localUser,
          barber: {
            ...localUser.barber,
            imageUrl: null,
          },
        });
      }

      setLocalPreview("");
      setMessage("Profilbild entfernt.");
    } catch (e: any) {
      setError(e?.message || "Profilbild konnte nicht entfernt werden.");
    } finally {
      setUploadingImg(false);
    }
  }

  async function createService() {
    const name = newServiceName.trim();
    const durationMin = Number(newServiceDuration);

    if (!name) {
      setError("Bitte einen Service-Namen eingeben.");
      return;
    }

    if (!Number.isFinite(durationMin) || durationMin <= 0) {
      setError("Bitte eine gültige Dauer auswählen.");
      return;
    }

    try {
      setCreatingService(true);
      setError("");
      setMessage("");

      const data = await apiFetch("/admin/services", {
        method: "POST",
        body: JSON.stringify({
          name,
          durationMin,
          isActive: true,
        }),
      });

      const created = data?.service as Service;
      setServices((prev) => [...prev, created].sort((a, b) => a.id - b.id));
      setNewServiceName("");
      setNewServiceDuration(30);
      setMessage("Service hinzugefügt.");
    } catch (e: any) {
      setError(e?.message || "Service konnte nicht erstellt werden.");
    } finally {
      setCreatingService(false);
    }
  }

  async function updateService(
    id: number,
    patch: Partial<Pick<Service, "name" | "durationMin" | "isActive">>
  ) {
    try {
      setBusyServiceId(id);
      setError("");
      setMessage("");

      const data = await apiFetch(`/admin/services/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });

      const updated = data?.service as Service;
      setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setMessage("Service aktualisiert.");
    } catch (e: any) {
      setError(e?.message || "Service konnte nicht aktualisiert werden.");
    } finally {
      setBusyServiceId(null);
    }
  }

  async function deleteService(id: number) {
    const ok = window.confirm("Willst du diesen Service wirklich löschen?");
    if (!ok) return;

    try {
      setBusyServiceId(id);
      setError("");
      setMessage("");

      await apiFetch(`/admin/services/${id}`, {
        method: "DELETE",
      });

      setServices((prev) => prev.filter((s) => s.id !== id));
      setMessage("Service gelöscht.");
    } catch (e: any) {
      setError(e?.message || "Service konnte nicht gelöscht werden.");
    } finally {
      setBusyServiceId(null);
    }
  }

  async function saveRules() {
    if (!settings) return;

    try {
      setSavingRules(true);
      setError("");
      setMessage("");

      const data = await apiFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });

      setSettings((data?.settings ?? settings) as AppSettings);
      setMessage("Buchungsregeln gespeichert.");
    } catch (e: any) {
      setError(e?.message || "Buchungsregeln konnten nicht gespeichert werden.");
    } finally {
      setSavingRules(false);
    }
  }

  async function saveHours() {
    if (!settings) return;

    try {
      setSavingHours(true);
      setError("");
      setMessage("");

      const data = await apiFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });

      setSettings((data?.settings ?? settings) as AppSettings);
      setMessage("Arbeitszeiten gespeichert.");
    } catch (e: any) {
      setError(e?.message || "Arbeitszeiten konnten nicht gespeichert werden.");
    } finally {
      setSavingHours(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  }

  async function openSubscriptionManagement() {
    try {
      setError("");
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(`${API_BASE}/admin/subscription/portal`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const raw = await res.text();
      let data: any = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      if (!res.ok || !data?.url) {
        setError(data?.error || "Abo-Verwaltung konnte nicht geöffnet werden.");
        return;
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setError(e?.message || "Abo-Verwaltung konnte nicht geöffnet werden.");
    }
  }

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label === "Profil-Link" ? "profile" : "book");
      setTimeout(() => setCopied(""), 1200);
      setMessage(`${label} kopiert.`);
      setError("");
    } catch {
      window.prompt("Kopiere den Link:", value);
    }
  }

  async function shareLink(value: string, title: string) {
    try {
      if (navigator.share) {
        await navigator.share({ url: value, title });
      } else {
        await navigator.clipboard.writeText(value);
        setMessage("Link kopiert.");
      }
    } catch (e) {
      console.log("SHARE ERROR:", e);
    }
  }

  function confirmLogout() {
    const ok = window.confirm("Willst du dich wirklich ausloggen?");
    if (!ok) return;
    logout();
  }

  async function deleteAccount() {
    try {
      setError("");
      setMessage("");

      if (hasActivePro) {
        const proceed = window.confirm(
          "Dein Salora Pro Abo ist noch aktiv. Es wird nicht automatisch beendet, wenn du deinen Account löschst. Kündige dein Abo zuerst über die Abo-Verwaltung. Klicke auf OK, um die Abo-Verwaltung zu öffnen."
        );

        if (proceed) {
          await openSubscriptionManagement();
        }
        return;
      }

      await apiFetch("/me", {
        method: "DELETE",
      });

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/login");
    } catch (e: any) {
      setError(e?.message || "Account konnte nicht gelöscht werden.");
    }
  }

  function confirmDeleteAccount() {
    const ok = window.confirm(
      "Willst du deinen Account wirklich endgültig löschen? Dieser Schritt kann nicht rückgängig gemacht werden."
    );
    if (!ok) return;
    deleteAccount();
  }

  const profileUrl = useMemo(() => {
    if (!profile?.slug) return "";
    const base = trimTrailingSlash(
      cleanUrl(PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : ""))
    );
    return `${base}/b/${profile.slug}`;
  }, [profile?.slug]);

  const bookingUrl = useMemo(() => {
    if (!profile?.slug) return "";
    const base = trimTrailingSlash(
      cleanUrl(PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : ""))
    );
    return `${base}/b/${profile.slug}/book`;
  }, [profile?.slug]);

  const workingHoursUi = useMemo(() => {
    const wh = settings?.workingHours ?? [];
    const map = new Map<number, WorkingHoursRow>();
    for (const row of wh) map.set(row.day, row);

    return WEEKDAYS.map(
      (d) => map.get(d.k) ?? { day: d.k, isOpen: false, startMin: 12 * 60, endMin: 17 * 60 }
    );
  }, [settings]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontWeight: 800,
        }}
      >
        Lade Einstellungen...
      </div>
    );
  }

  if (!profile || !settings) {
    return (
      <div style={{ padding: 16 }}>
        <div style={alertErr}>
          <div style={alertErrText}>Einstellungen konnten nicht geladen werden.</div>
        </div>
      </div>
    );
  }

  const previewUrl = cleanUrl(localPreview || profile.imageUrl);

  return (
    <div style={{ padding: 16, maxWidth: 1120, margin: "0 auto" }}>
      <style jsx>{`
        .tabGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 16px;
        }

        .twoColGrid,
        .threeColGrid,
        .accountButtons {
          display: grid;
          gap: 12px;
        }

        .twoColGrid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .threeColGrid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .accountButtons {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        @media (max-width: 900px) {
          .threeColGrid,
          .accountButtons {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .tabGrid,
          .twoColGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={{ marginBottom: 16 }}>
        <div style={pageTitle}>Einstellungen</div>
        <div style={pageSub}>
          Profil, Services, Arbeitszeiten und Buchungsregeln verwalten.
        </div>
      </div>

      {message ? (
        <div style={alertOk}>
          <div style={alertOkText}>{message}</div>
        </div>
      ) : null}

      {error ? (
        <div style={alertErr}>
          <div style={alertErrText}>{error}</div>
        </div>
      ) : null}

      <div className="tabGrid">
        <button
          onClick={() => setTab("PROFILE")}
          style={{ ...tabBtn, ...(tab === "PROFILE" ? tabBtnActive : {}) }}
        >
          <span style={{ ...tabBtnText, ...(tab === "PROFILE" ? tabBtnTextActive : {}) }}>
            Profil
          </span>
        </button>

        <button
          onClick={() => setTab("SERVICES")}
          style={{ ...tabBtn, ...(tab === "SERVICES" ? tabBtnActive : {}) }}
        >
          <span style={{ ...tabBtnText, ...(tab === "SERVICES" ? tabBtnTextActive : {}) }}>
            Services
          </span>
        </button>

        <button
          onClick={() => setTab("HOURS")}
          style={{ ...tabBtn, ...(tab === "HOURS" ? tabBtnActive : {}) }}
        >
          <span style={{ ...tabBtnText, ...(tab === "HOURS" ? tabBtnTextActive : {}) }}>
            Zeiten
          </span>
        </button>

        <button
          onClick={() => setTab("RULES")}
          style={{ ...tabBtn, ...(tab === "RULES" ? tabBtnActive : {}) }}
        >
          <span style={{ ...tabBtnText, ...(tab === "RULES" ? tabBtnTextActive : {}) }}>
            Regeln
          </span>
        </button>
      </div>

      {tab === "PROFILE" ? (
        <>
          <div style={card}>
            <div style={sectionTitle}>Profilbild</div>
            <div style={sectionSub}>So sehen Kunden dein Profil.</div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 14,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={avatarWrap}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Profilbild" style={avatarImg} />
                ) : (
                  <div style={avatarFallback}>{profile.name?.trim()?.[0]?.toUpperCase() || "B"}</div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 260, display: "grid", gap: 10 }}>
                <label style={primaryBtnLikeLabel(uploadingImg)}>
                  <span style={primaryBtnText}>
                    {uploadingImg ? "Lädt..." : "Profilbild auswählen"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImg}
                    onChange={(e) => pickImage(e.target.files?.[0] || null)}
                    style={{ display: "none" }}
                  />
                </label>

                {previewUrl ? (
                  <button
                    onClick={removeImage}
                    disabled={uploadingImg}
                    style={{ ...secondaryBtn, ...(uploadingImg ? disabledBtn : {}) }}
                  >
                    <span style={secondaryBtnText}>Profilbild entfernen</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ ...card, marginTop: 16 }}>
            <div style={sectionTitle}>Öffentliches Profil</div>
            <div style={sectionSub}>Diese Informationen sehen deine Kunden.</div>

            <div style={fieldGap}>
              <Field label="Name">
                <input value={profile.name || ""} disabled style={{ ...input, ...disabledInput }} />
              </Field>

              <Field label="Telefon">
                <input
                  value={profile.phone ?? ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value || null })}
                  placeholder="z. B. 0176..."
                  style={input}
                />
              </Field>

              <div className="threeColGrid">
                <Field label="Straße + Nr.">
                  <input
                    value={profile.street ?? ""}
                    onChange={(e) => setProfile({ ...profile, street: e.target.value || null })}
                    placeholder="z. B. Musterstraße 12"
                    style={input}
                  />
                </Field>

                <Field label="PLZ">
                  <input
                    value={profile.postalCode ?? ""}
                    onChange={(e) => setProfile({ ...profile, postalCode: e.target.value || null })}
                    placeholder="45127"
                    style={input}
                  />
                </Field>

                <Field label="Stadt">
                  <input
                    value={profile.city ?? ""}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value || null })}
                    placeholder="Essen"
                    style={input}
                  />
                </Field>
              </div>

              <Field label="Instagram">
                <input
                  value={profile.instagram ?? ""}
                  onChange={(e) => setProfile({ ...profile, instagram: e.target.value || null })}
                  placeholder="@deinprofil"
                  style={input}
                />
              </Field>

              <Field label="Website">
                <input
                  value={profile.website ?? ""}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value || null })}
                  placeholder="https://..."
                  style={input}
                />
              </Field>

              <Field label="Bio">
                <textarea
                  value={profile.bio ?? ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value || null })}
                  placeholder="Kurz über dich"
                  style={textarea}
                  rows={5}
                />
              </Field>
            </div>

            <button
              onClick={saveProfile}
              disabled={savingProfile}
              style={{ ...primaryBtn, marginTop: 16, ...(savingProfile ? disabledBtn : {}) }}
            >
              <span style={primaryBtnText}>
                {savingProfile ? "Speichert..." : "Profil speichern"}
              </span>
            </button>
          </div>

          {(profileUrl || bookingUrl) && (
            <div style={{ ...card, marginTop: 16 }}>
              <div style={sectionTitle}>Deine Links</div>
              <div style={sectionSub}>
                Diese Links kannst du direkt an Kunden schicken oder teilen.
              </div>

              <div style={fieldGap}>
                {profileUrl ? (
                  <div style={linkCard}>
                    <div style={linkLabel}>Profil-Link</div>
                    <div style={linkValue}>{profileUrl}</div>

                    <div className="twoColGrid" style={{ marginTop: 12 }}>
                      <button
                        onClick={() => copyToClipboard(profileUrl, "Profil-Link")}
                        style={secondaryBtnSmall}
                      >
                        <span style={secondaryBtnSmallText}>
                          {copied === "profile" ? "Kopiert" : "Kopieren"}
                        </span>
                      </button>

                      <button
                        onClick={() => shareLink(profileUrl, "Profil-Link")}
                        style={primaryBtnSmall}
                      >
                        <span style={primaryBtnSmallText}>Teilen</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {bookingUrl ? (
                  <div style={linkCard}>
                    <div style={linkLabel}>Buchungs-Link</div>
                    <div style={linkValue}>{bookingUrl}</div>

                    <div className="twoColGrid" style={{ marginTop: 12 }}>
                      <button
                        onClick={() => copyToClipboard(bookingUrl, "Buchungs-Link")}
                        style={secondaryBtnSmall}
                      >
                        <span style={secondaryBtnSmallText}>
                          {copied === "book" ? "Kopiert" : "Kopieren"}
                        </span>
                      </button>

                      <button
                        onClick={() => shareLink(bookingUrl, "Buchungs-Link")}
                        style={primaryBtnSmall}
                      >
                        <span style={primaryBtnSmallText}>Teilen</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <div style={{ ...card, marginTop: 16 }}>
            <div style={sectionTitle}>Konto</div>
            <div style={sectionSub}>Sichere Aktionen für deinen Account.</div>
            <div style={{ ...sectionSub, marginTop: 10 }}>
              Abonnements werden separat verwaltet. Wenn dein Abo aktiv ist, öffnet „Abo verwalten“
              direkt die echte Verwaltungsseite. Vor dem Löschen des Accounts solltest du ein aktives
              Abo zuerst kündigen.
            </div>

            <div className="accountButtons" style={{ marginTop: 16 }}>
              <button
                onClick={openSubscriptionManagement}
                disabled={checkingSubscription || !hasActivePro}
                style={{
                  ...secondaryBtn,
                  ...((checkingSubscription || !hasActivePro) ? disabledBtn : {}),
                }}
                title={!hasActivePro ? "Nur bei aktivem Abo verfügbar" : ""}
              >
                <span style={secondaryBtnText}>
                  {checkingSubscription ? "Lädt..." : "Abo verwalten"}
                </span>
              </button>

              <button onClick={confirmLogout} style={secondaryBtn}>
                <span style={secondaryBtnText}>Ausloggen</span>
              </button>

              <button onClick={confirmDeleteAccount} style={dangerBtn}>
                <span style={dangerBtnText}>Account löschen</span>
              </button>
            </div>
          </div>
        </>
      ) : tab === "SERVICES" ? (
        <>
          <div style={card}>
            <div style={sectionTitle}>Neuen Service anlegen</div>
            <div style={sectionSub}>Name eingeben, Dauer auswählen.</div>

            <div style={fieldGap}>
              <Field label="Service-Name">
                <input
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="z. B. Haare"
                  style={input}
                />
              </Field>

              <SelectField
                label="Dauer"
                value={newServiceDuration}
                options={SERVICE_DURATION_OPTIONS.map((dur) => ({
                  label: `${dur} min`,
                  value: dur,
                }))}
                onChange={setNewServiceDuration}
              />
            </div>

            <button
              onClick={createService}
              disabled={creatingService}
              style={{ ...primaryBtn, marginTop: 16, ...(creatingService ? disabledBtn : {}) }}
            >
              <span style={primaryBtnText}>
                {creatingService ? "Speichert..." : "Service hinzufügen"}
              </span>
            </button>
          </div>

          <div style={{ ...card, marginTop: 16 }}>
            <div style={sectionTitle}>Deine Services</div>
            <div style={sectionSub}>Dauer ändern, aktivieren oder löschen.</div>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {services.length === 0 ? (
                <div style={linkCard}>
                  <div style={linkValue}>Noch keine Services vorhanden.</div>
                </div>
              ) : (
                services
                  .slice()
                  .sort((a, b) => a.id - b.id)
                  .map((service) => {
                    const isBusy = busyServiceId === service.id;

                    return (
                      <div key={service.id} style={serviceCard}>
                        <input
                          defaultValue={service.name}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== service.name) {
                              updateService(service.id, { name: v });
                            }
                          }}
                          style={input}
                          placeholder="Service-Name"
                        />

                        <div style={{ marginTop: 12 }}>
                          <SelectField
                            label="Dauer"
                            value={service.durationMin}
                            options={SERVICE_DURATION_OPTIONS.map((dur) => ({
                              label: `${dur} min`,
                              value: dur,
                            }))}
                            onChange={(dur) => updateService(service.id, { durationMin: dur })}
                          />
                        </div>

                        <div className="twoColGrid" style={{ marginTop: 12 }}>
                          <button
                            onClick={() => updateService(service.id, { isActive: !service.isActive })}
                            disabled={isBusy}
                            style={{
                              ...(service.isActive ? primaryBtnSmall : secondaryBtnSmall),
                              ...(isBusy ? disabledBtn : {}),
                            }}
                          >
                            <span style={service.isActive ? primaryBtnSmallText : secondaryBtnSmallText}>
                              {service.isActive ? "Aktiv" : "Inaktiv"}
                            </span>
                          </button>

                          <button
                            onClick={() => deleteService(service.id)}
                            disabled={isBusy}
                            style={{ ...dangerBtnSmall, ...(isBusy ? disabledBtn : {}) }}
                          >
                            <span style={dangerBtnSmallText}>Löschen</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </>
      ) : tab === "HOURS" ? (
        <div style={card}>
          <div style={sectionTitle}>Arbeitszeiten</div>
          <div style={sectionSub}>
            Lege fest, an welchen Tagen und Uhrzeiten du buchbar bist.
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {workingHoursUi.map((row) => {
              const dayName = WEEKDAYS.find((d) => d.k === row.day)?.name ?? String(row.day);

              return (
                <div key={row.day} style={serviceCard}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={dayTitle}>{dayName}</div>

                    <button
                      onClick={() => {
                        setSettings({
                          ...settings,
                          workingHours: workingHoursUi.map((r) =>
                            r.day === row.day ? { ...r, isOpen: !r.isOpen } : r
                          ),
                        });
                      }}
                      style={{
                        ...(row.isOpen ? primaryBtnSmall : secondaryBtnSmall),
                        minWidth: 110,
                      }}
                    >
                      <span style={row.isOpen ? primaryBtnSmallText : secondaryBtnSmallText}>
                        {row.isOpen ? "Geöffnet" : "Geschlossen"}
                      </span>
                    </button>
                  </div>

                  {row.isOpen ? (
                    <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                      <SelectField
                        label="Start"
                        value={row.startMin}
                        options={WORK_TIME_OPTIONS.map((value) => ({
                          label: minToHHMM(value),
                          value,
                        }))}
                        onChange={(value) => {
                          const safeStart = clamp(value, 0, 1439);
                          const safeEnd = row.endMin <= safeStart ? safeStart + 60 : row.endMin;

                          setSettings({
                            ...settings,
                            workingHours: workingHoursUi.map((r) =>
                              r.day === row.day
                                ? {
                                    ...r,
                                    startMin: safeStart,
                                    endMin: clamp(safeEnd, safeStart + 1, 1440),
                                  }
                                : r
                            ),
                          });
                        }}
                      />

                      <SelectField
                        label="Ende"
                        value={row.endMin}
                        options={WORK_TIME_OPTIONS.filter((value) => value > row.startMin).map((value) => ({
                          label: minToHHMM(value),
                          value,
                        }))}
                        onChange={(value) => {
                          setSettings({
                            ...settings,
                            workingHours: workingHoursUi.map((r) =>
                              r.day === row.day
                                ? { ...r, endMin: clamp(value, r.startMin + 1, 1440) }
                                : r
                            ),
                          });
                        }}
                      />
                    </div>
                  ) : (
                    <div style={helperText}>
                      An diesem Tag können keine Termine gebucht werden.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={saveHours}
            disabled={savingHours}
            style={{ ...primaryBtn, marginTop: 16, ...(savingHours ? disabledBtn : {}) }}
          >
            <span style={primaryBtnText}>
              {savingHours ? "Speichert..." : "Arbeitszeiten speichern"}
            </span>
          </button>
        </div>
      ) : (
        <div style={card}>
          <div style={sectionTitle}>Buchungsregeln</div>
          <div style={sectionSub}>Hier legst du fest, was Kunden zuerst sehen.</div>

          <div style={fieldGap}>
            <SelectField
              label="Schrittweite"
              helperText="Legt fest, in welchen Minutenabständen freie Termine angezeigt werden."
              value={settings.stepMin}
              options={STEP_MIN_OPTIONS.map((value) => ({
                label: `${value} min`,
                value,
              }))}
              onChange={(value) => setSettings({ ...settings, stepMin: value })}
            />

            <SelectField
              label="Zuerst sichtbarer Start"
              helperText="Ab dieser Uhrzeit werden freie Slots Kunden anfangs angezeigt."
              value={settings.displayStartMin}
              options={DISPLAY_TIME_OPTIONS.map((value) => ({
                label: minToHHMM(value),
                value,
              }))}
              onChange={(value) => {
                const nextStart = value;
                const nextEnd =
                  settings.displayEndMin <= nextStart
                    ? Math.min(1440, nextStart + 60)
                    : settings.displayEndMin;

                setSettings({
                  ...settings,
                  displayStartMin: nextStart,
                  displayEndMin: nextEnd,
                });
              }}
            />

            <SelectField
              label="Zuerst sichtbares Ende"
              helperText="Bis zu dieser Uhrzeit werden Slots standardmäßig angezeigt."
              value={settings.displayEndMin}
              options={DISPLAY_TIME_OPTIONS.filter((value) => value > settings.displayStartMin).map(
                (value) => ({
                  label: minToHHMM(value),
                  value,
                })
              )}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  displayEndMin: value,
                })
              }
            />

            <Field
              label="Automatische Vorverlagerung"
              helperText="Wenn die erste sichtbare Stunde voll ist, können automatisch frühere Slots geöffnet werden – aber nur innerhalb deiner echten Arbeitszeit."
            >
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    extendIfFirstHourFull: !settings.extendIfFirstHourFull,
                  })
                }
                style={settings.extendIfFirstHourFull ? primaryBtnSmall : secondaryBtnSmall}
              >
                <span
                  style={
                    settings.extendIfFirstHourFull ? primaryBtnSmallText : secondaryBtnSmallText
                  }
                >
                  {settings.extendIfFirstHourFull ? "AN" : "AUS"}
                </span>
              </button>
            </Field>

            <SelectField
              label="Erweiterungsschritt"
              helperText="Bestimmt, in welchen Schritten früher geöffnet wird, z. B. 15 oder 30 Minuten."
              value={settings.extendStepMin}
              options={EXTEND_STEP_OPTIONS.map((value) => ({
                label: `${value} min`,
                value,
              }))}
              onChange={(value) => setSettings({ ...settings, extendStepMin: value })}
            />

            <SelectField
              label="Mindestabstand pro Kunde"
              helperText="Legt fest, wie viele Tage ein Kunde nach einer Buchung mindestens warten muss, bis erneut gebucht werden kann."
              value={settings.minDaysBetweenBookings ?? 0}
              options={MIN_DAYS_OPTIONS.map((value) => ({
                label: `${value} Tag${value === 1 ? "" : "e"}`,
                value,
              }))}
              onChange={(value) => setSettings({ ...settings, minDaysBetweenBookings: value })}
            />
          </div>

          <button
            onClick={saveRules}
            disabled={savingRules}
            style={{ ...primaryBtn, marginTop: 16, ...(savingRules ? disabledBtn : {}) }}
          >
            <span style={primaryBtnText}>
              {savingRules ? "Speichert..." : "Buchungsregeln speichern"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function Field(props: {
  label: string;
  children: React.ReactNode;
  helperText?: string;
}) {
  return (
    <div>
      <div style={fieldLabel}>{props.label}</div>
      {props.children}
      {props.helperText ? <div style={helperText}>{props.helperText}</div> : null}
    </div>
  );
}

function SelectField<T extends string | number>(props: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
  helperText?: string;
}) {
  const [open, setOpen] = useState(false);

  const selected =
    props.options.find((o) => o.value === props.value)?.label ?? String(props.value);

  return (
    <div style={{ position: "relative", zIndex: open ? 50 : 1 }}>
      <div style={fieldLabel}>{props.label}</div>

      <button type="button" onClick={() => setOpen((v) => !v)} style={selectTrigger}>
        <span style={selectTriggerText}>{selected}</span>
        <span style={selectChevron}>{open ? "▲" : "▼"}</span>
      </button>

      {props.helperText ? <div style={helperText}>{props.helperText}</div> : null}

      {open ? (
        <div style={selectMenu}>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {props.options.map((option, index) => {
              const active = option.value === props.value;

              return (
                <button
                  type="button"
                  key={`${String(option.value)}-${index}`}
                  onClick={() => {
                    props.onChange(option.value);
                    setOpen(false);
                  }}
                  style={{
                    ...selectOption,
                    ...(index === 0 ? { borderTopWidth: 0 } : {}),
                    ...(active ? selectOptionActive : {}),
                  }}
                >
                  <span style={{ ...selectOptionText, ...(active ? selectOptionTextActive : {}) }}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const pageTitle: React.CSSProperties = {
  fontSize: 32,
  lineHeight: "36px",
  fontWeight: 900,
  color: "#111",
};

const pageSub: React.CSSProperties = {
  marginTop: 8,
  color: "#666",
  fontSize: 15,
  lineHeight: "22px",
};

const tabBtn: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 14,
  border: "none",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const tabBtnActive: React.CSSProperties = {
  backgroundColor: "#111",
};

const tabBtnText: React.CSSProperties = {
  color: "#111",
  fontWeight: 900,
  fontSize: 14,
};

const tabBtnTextActive: React.CSSProperties = {
  color: "#fff",
};

const card: React.CSSProperties = {
  border: "1px solid #e8e8eb",
  borderRadius: 24,
  background: "#fff",
  padding: 18,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 24,
  lineHeight: "28px",
  fontWeight: 900,
  color: "#111",
};

const sectionSub: React.CSSProperties = {
  marginTop: 6,
  color: "#666",
  fontSize: 15,
  lineHeight: "20px",
};

const avatarWrap: React.CSSProperties = {
  width: 92,
  height: 92,
  borderRadius: 999,
  overflow: "hidden",
  background: "#f1f1f3",
  border: "1px solid #e3e3e6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const avatarImg: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const avatarFallback: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 900,
  color: "#555",
};

const fieldGap: React.CSSProperties = {
  marginTop: 16,
  display: "grid",
  gap: 14,
};

const fieldLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#555",
  marginBottom: 8,
};

const helperText: React.CSSProperties = {
  marginTop: 8,
  color: "#777",
  fontSize: 13,
  lineHeight: "18px",
};

const input: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  borderRadius: 14,
  border: "1px solid #dedede",
  background: "#fff",
  padding: "0 16px",
  fontSize: 16,
  color: "#111",
  boxSizing: "border-box",
};

const textarea: React.CSSProperties = {
  width: "100%",
  minHeight: 120,
  borderRadius: 14,
  border: "1px solid #dedede",
  background: "#fff",
  padding: "14px 16px",
  fontSize: 16,
  color: "#111",
  boxSizing: "border-box",
  resize: "vertical",
  fontFamily: "inherit",
};

const disabledInput: React.CSSProperties = {
  background: "#f4f4f6",
  color: "#777",
};

const primaryBtn: React.CSSProperties = {
  minHeight: 52,
  borderRadius: 14,
  border: "1px solid #111",
  background: "#111",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 14px",
  width: "100%",
  cursor: "pointer",
};

const primaryBtnText: React.CSSProperties = {
  color: "#fff",
  fontWeight: 900,
  fontSize: 15,
};

const secondaryBtn: React.CSSProperties = {
  minHeight: 50,
  borderRadius: 14,
  border: "1px solid #d8d8d8",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 14px",
  width: "100%",
  cursor: "pointer",
};

const secondaryBtnText: React.CSSProperties = {
  color: "#111",
  fontWeight: 800,
  fontSize: 15,
};

const dangerBtn: React.CSSProperties = {
  minHeight: 50,
  borderRadius: 14,
  border: "1px solid #e6c7c7",
  background: "#fff5f5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 14px",
  width: "100%",
  cursor: "pointer",
};

const dangerBtnText: React.CSSProperties = {
  color: "#9b1c1c",
  fontWeight: 900,
  fontSize: 15,
};

const primaryBtnSmall: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 12,
  border: "1px solid #111",
  background: "#111",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 12px",
  width: "100%",
  cursor: "pointer",
};

const primaryBtnSmallText: React.CSSProperties = {
  color: "#fff",
  fontWeight: 900,
  fontSize: 13,
};

const secondaryBtnSmall: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 12,
  border: "1px solid #d8d8d8",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 12px",
  width: "100%",
  cursor: "pointer",
};

const secondaryBtnSmallText: React.CSSProperties = {
  color: "#111",
  fontWeight: 800,
  fontSize: 13,
};

const dangerBtnSmall: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 12,
  border: "1px solid #e6c7c7",
  background: "#fff5f5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 12px",
  width: "100%",
  cursor: "pointer",
};

const dangerBtnSmallText: React.CSSProperties = {
  color: "#9b1c1c",
  fontWeight: 900,
  fontSize: 13,
};

const disabledBtn: React.CSSProperties = {
  opacity: 0.7,
  cursor: "not-allowed",
};

const serviceCard: React.CSSProperties = {
  border: "1px solid #ececef",
  borderRadius: 16,
  background: "#fbfbfc",
  padding: 14,
};

const dayTitle: React.CSSProperties = {
  fontSize: 17,
  lineHeight: "22px",
  color: "#111",
  fontWeight: 900,
};

const linkCard: React.CSSProperties = {
  border: "1px solid #ececef",
  borderRadius: 16,
  background: "#fbfbfc",
  padding: 14,
};

const linkLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#666",
};

const linkValue: React.CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  lineHeight: "20px",
  color: "#111",
  fontWeight: 700,
  wordBreak: "break-word",
};

const alertOk: React.CSSProperties = {
  marginBottom: 16,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid #cfe7d1",
  background: "#f4fbf4",
};

const alertOkText: React.CSSProperties = {
  color: "#17663a",
  fontWeight: 700,
};

const alertErr: React.CSSProperties = {
  marginBottom: 16,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid #f1c7c7",
  background: "#fff5f5",
};

const alertErrText: React.CSSProperties = {
  color: "#b42318",
  fontWeight: 700,
};

const selectTrigger: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  borderRadius: 14,
  border: "1px solid #dedede",
  background: "#fff",
  padding: "0 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
};

const selectTriggerText: React.CSSProperties = {
  fontSize: 16,
  color: "#111",
  fontWeight: 700,
};

const selectChevron: React.CSSProperties = {
  fontSize: 14,
  color: "#666",
  fontWeight: 800,
};

const selectMenu: React.CSSProperties = {
  marginTop: 8,
  border: "1px solid #e6e6e8",
  borderRadius: 14,
  background: "#fff",
  overflow: "hidden",
  position: "absolute",
  left: 0,
  right: 0,
  top: "100%",
  zIndex: 100,
};

const selectOption: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "0 16px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  borderTop: "1px solid #f1f1f3",
  background: "#fff",
  cursor: "pointer",
};

const selectOptionActive: React.CSSProperties = {
  background: "#111",
};

const selectOptionText: React.CSSProperties = {
  fontSize: 15,
  color: "#111",
  fontWeight: 700,
};

const selectOptionTextActive: React.CSSProperties = {
  color: "#fff",
};

function primaryBtnLikeLabel(disabled: boolean): React.CSSProperties {
  return {
    ...primaryBtn,
    ...(disabled ? disabledBtn : {}),
  };
}