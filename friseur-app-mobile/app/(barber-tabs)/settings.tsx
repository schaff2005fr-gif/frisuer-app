import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
  Linking,
  Share,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { getCustomerInfo } from "../../lib/purchases";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

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

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
const PUBLIC_APP_URL = process.env.EXPO_PUBLIC_PUBLIC_APP_URL || "";

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

async function uploadToCloudinary(uri: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary ENV fehlt.");
  }

  const filename = uri.split("/").pop() || `barber_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const ext = match?.[1]?.toLowerCase() || "jpg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";

  const form = new FormData();
  form.append(
    "file",
    {
      uri,
      name: filename,
      type: mimeType,
    } as any
  );
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

export default function BarberSettingsScreen() {
  const { token, user, signOut } = useAuth();

  const [tab, setTab] = useState<TabKey>("PROFILE");
  const [hasActivePro, setHasActivePro] = useState(false);
  const [subscriptionManagementUrl, setSubscriptionManagementUrl] = useState("");
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

  useEffect(() => {
    if (!token || !user) {
      router.replace("/");
      return;
    }

    if (user.role !== "BARBER") {
      router.replace("/");
      return;
    }

    Promise.all([loadAll(), loadSubscriptionStatus()]);
  }, [token, user]);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [profileRes, servicesRes, settingsRes] = await Promise.all([
        api.get("/admin/profile", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get("/admin/services", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get("/admin/settings", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setProfile((profileRes.data?.barber ?? null) as BarberProfile | null);
      setServices(Array.isArray(servicesRes.data?.services) ? servicesRes.data.services : []);

      const rawSettings = (settingsRes.data?.settings ?? null) as AppSettings | null;

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
    } catch (e: any) {
      setError(e?.response?.data?.error || "Einstellungen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSubscriptionStatus() {
    try {
      setCheckingSubscription(true);

      const info = await getCustomerInfo();

      const hasPro = !!info.entitlements.active["pro"];
      const managementUrl = info.managementURL ?? "";

      setHasActivePro(hasPro);
      setSubscriptionManagementUrl(managementUrl);
    } catch (e) {
      console.log("LOAD SUBSCRIPTION STATUS ERROR:", e);
      setHasActivePro(false);
      setSubscriptionManagementUrl("");
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

      const res = await api.put(
        "/admin/profile",
        {
          phone: profile.phone,
          bio: profile.bio,
          street: profile.street,
          postalCode: profile.postalCode,
          city: profile.city,
          instagram: profile.instagram,
          website: profile.website,
          imageUrl: profile.imageUrl ?? null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setProfile((res.data?.barber ?? profile) as BarberProfile);
      setMessage("Profil gespeichert.");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Profil konnte nicht gespeichert werden.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveRules() {
    if (!settings) return;

    try {
      setSavingRules(true);
      setError("");
      setMessage("");

      const res = await api.put("/admin/settings", settings, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setSettings((res.data?.settings ?? settings) as AppSettings);
      setMessage("Buchungsregeln gespeichert.");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Buchungsregeln konnten nicht gespeichert werden.");
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

      const res = await api.put("/admin/settings", settings, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setSettings((res.data?.settings ?? settings) as AppSettings);
      setMessage("Arbeitszeiten gespeichert.");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Arbeitszeiten konnten nicht gespeichert werden.");
    } finally {
      setSavingHours(false);
    }
  }

  async function pickImage() {
    try {
      setError("");
      setMessage("");

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Fehler", "Bitte erlaube den Zugriff auf deine Fotos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri || !profile) return;

      setUploadingImg(true);

      const uploadedUrl = await uploadToCloudinary(result.assets[0].uri);

      setProfile((prev) => (prev ? { ...prev, imageUrl: uploadedUrl } : prev));

      await api.put(
        "/admin/profile",
        { imageUrl: uploadedUrl },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

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

      await api.put(
        "/admin/profile",
        { imageUrl: null },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setMessage("Profilbild entfernt.");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Profilbild konnte nicht entfernt werden.");
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

      const res = await api.post(
        "/admin/services",
        {
          name,
          durationMin,
          isActive: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const created = res.data?.service as Service;
      setServices((prev) => [...prev, created].sort((a, b) => a.id - b.id));
      setNewServiceName("");
      setNewServiceDuration(30);
      setMessage("Service hinzugefügt.");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Service konnte nicht erstellt werden.");
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

      const res = await api.patch(`/admin/services/${id}`, patch, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const updated = res.data?.service as Service;
      setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setMessage("Service aktualisiert.");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Service konnte nicht aktualisiert werden.");
    } finally {
      setBusyServiceId(null);
    }
  }

  async function deleteService(id: number) {
    Alert.alert("Service löschen", "Willst du diesen Service wirklich löschen?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          try {
            setBusyServiceId(id);
            setError("");
            setMessage("");

            await api.delete(`/admin/services/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            setServices((prev) => prev.filter((s) => s.id !== id));
            setMessage("Service gelöscht.");
          } catch (e: any) {
            setError(e?.response?.data?.error || "Service konnte nicht gelöscht werden.");
          } finally {
            setBusyServiceId(null);
          }
        },
      },
    ]);
  }

  async function logout() {
    await signOut();
    router.replace("/");
  }

  async function openSubscriptionManagement() {
    try {
      const fallbackUrl = "https://apps.apple.com/account/subscriptions";
      const targetUrl = subscriptionManagementUrl || fallbackUrl;

      const supported = await Linking.canOpenURL(targetUrl);
      if (!supported) {
        Alert.alert("Fehler", "Die Abo-Verwaltung konnte nicht geöffnet werden.");
        return;
      }

      await Linking.openURL(targetUrl);
    } catch (e) {
      console.log("OPEN SUBSCRIPTION MANAGEMENT ERROR:", e);
      Alert.alert("Fehler", "Die Abo-Verwaltung konnte nicht geöffnet werden.");
    }
  }

  async function copyToClipboard(value: string, label: string) {
    try {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(value);
      setMessage(`${label} kopiert.`);
      setError("");
    } catch (e) {
      console.log("COPY ERROR:", e);
      Alert.alert("Fehler", "Link konnte nicht kopiert werden.");
    }
  }

  async function shareLink(value: string, title: string) {
    try {
      await Share.share({
        message: value,
        url: value,
        title,
      });
    } catch (e) {
      console.log("SHARE ERROR:", e);
      Alert.alert("Fehler", "Link konnte nicht geteilt werden.");
    }
  }

  function confirmLogout() {
    Alert.alert("Ausloggen", "Willst du dich wirklich ausloggen?", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Ausloggen", style: "destructive", onPress: logout },
    ]);
  }

  async function deleteAccount() {
    try {
      setError("");
      setMessage("");

      if (hasActivePro) {
        Alert.alert(
          "Aktives Abo vorhanden",
          "Dein Salora Pro Abo wird über Apple verwaltet und nicht automatisch beendet, wenn du deinen Account löschst. Kündige dein Abo zuerst in den Apple-Abonnements oder lösche deinen Account nur, wenn du weißt, dass das Abo bis zur Kündigung weiterlaufen kann.",
          [
            { text: "Abbrechen", style: "cancel" },
            {
              text: "Abo verwalten",
              onPress: openSubscriptionManagement,
            },
            {
              text: "Trotzdem löschen",
              style: "destructive",
              onPress: async () => {
                try {
                  await api.delete("/me", {
                    headers: { Authorization: `Bearer ${token}` },
                  });

                  await signOut();
                  router.replace("/");
                } catch (e: any) {
                  setError(e?.response?.data?.error || "Account konnte nicht gelöscht werden.");
                }
              },
            },
          ]
        );
        return;
      }

      await api.delete("/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      await signOut();
      router.replace("/");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Account konnte nicht gelöscht werden.");
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "Account löschen",
      "Willst du deinen Account wirklich endgültig löschen? Dieser Schritt kann nicht rückgängig gemacht werden.",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Löschen", style: "destructive", onPress: deleteAccount },
      ]
    );
  }

  const profileUrl = useMemo(() => {
    if (!profile?.slug) return "";
    const base = trimTrailingSlash(cleanUrl(PUBLIC_APP_URL));
    if (!base) return "";
    return `${base}/b/${profile.slug}`;
  }, [profile?.slug]);

  const bookingUrl = useMemo(() => {
    if (!profile?.slug) return "";
    const base = trimTrailingSlash(cleanUrl(PUBLIC_APP_URL));
    if (!base) return "";
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
      <View style={loadingWrap}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!profile || !settings) {
    return (
      <SafeAreaView style={page}>
        <View style={{ padding: 16 }}>
          <View style={alertErr}>
            <Text style={alertErrText}>Einstellungen konnten nicht geladen werden.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const previewUrl = cleanUrl(profile.imageUrl);

  return (
    <SafeAreaView style={page}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
        <View style={{ marginBottom: 16 }}>
          <Text style={pageTitle}>Einstellungen</Text>
          <Text style={pageSub}>Profil, Services, Arbeitszeiten und Buchungsregeln verwalten.</Text>
        </View>

        {message ? (
          <View style={alertOk}>
            <Text style={alertOkText}>{message}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={alertErr}>
            <Text style={alertErrText}>{error}</Text>
          </View>
        ) : null}

        <View style={tabWrap}>
          <Pressable onPress={() => setTab("PROFILE")} style={[tabBtn, tab === "PROFILE" ? tabBtnActive : null]}>
            <Text style={[tabBtnText, tab === "PROFILE" ? tabBtnTextActive : null]}>Profil</Text>
          </Pressable>

          <Pressable onPress={() => setTab("SERVICES")} style={[tabBtn, tab === "SERVICES" ? tabBtnActive : null]}>
            <Text style={[tabBtnText, tab === "SERVICES" ? tabBtnTextActive : null]}>Services</Text>
          </Pressable>

          <Pressable onPress={() => setTab("HOURS")} style={[tabBtn, tab === "HOURS" ? tabBtnActive : null]}>
            <Text style={[tabBtnText, tab === "HOURS" ? tabBtnTextActive : null]}>Zeiten</Text>
          </Pressable>

          <Pressable onPress={() => setTab("RULES")} style={[tabBtn, tab === "RULES" ? tabBtnActive : null]}>
            <Text style={[tabBtnText, tab === "RULES" ? tabBtnTextActive : null]}>Regeln</Text>
          </Pressable>
        </View>

        {tab === "PROFILE" ? (
          <>
            <View style={card}>
              <Text style={sectionTitle}>Profilbild</Text>
              <Text style={sectionSub}>So sehen Kunden dein Profil.</Text>

              <View style={avatarSection}>
                <View style={avatarWrap}>
                  {previewUrl ? (
                    <Image source={{ uri: previewUrl }} style={avatarImg} />
                  ) : (
                    <Text style={avatarFallback}>{profile.name?.trim()?.[0]?.toUpperCase() || "B"}</Text>
                  )}
                </View>

                <View style={{ flex: 1, gap: 10 }}>
                  <Pressable
                    onPress={pickImage}
                    disabled={uploadingImg}
                    style={[primaryBtn, uploadingImg ? disabledBtn : null]}
                  >
                    <Text style={primaryBtnText}>{uploadingImg ? "Lädt..." : "Profilbild auswählen"}</Text>
                  </Pressable>

                  {previewUrl ? (
                    <Pressable
                      onPress={removeImage}
                      disabled={uploadingImg}
                      style={[secondaryBtn, uploadingImg ? disabledBtn : null]}
                    >
                      <Text style={secondaryBtnText}>Profilbild entfernen</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={[card, { marginTop: 16 }]}>
              <Text style={sectionTitle}>Öffentliches Profil</Text>
              <Text style={sectionSub}>Diese Informationen sehen deine Kunden.</Text>

              <View style={fieldGap}>
                <Field label="Name">
                  <TextInput value={profile.name || ""} editable={false} style={[input, disabledInput]} />
                </Field>

                <Field label="Telefon">
                  <TextInput
                    value={profile.phone ?? ""}
                    onChangeText={(v) => setProfile({ ...profile, phone: v || null })}
                    placeholder="z. B. 0176..."
                    placeholderTextColor="#9a9a9a"
                    style={input}
                  />
                </Field>

                <Field label="Straße + Nr.">
                  <TextInput
                    value={profile.street ?? ""}
                    onChangeText={(v) => setProfile({ ...profile, street: v || null })}
                    placeholder="z. B. Musterstraße 12"
                    placeholderTextColor="#9a9a9a"
                    style={input}
                  />
                </Field>

                <View style={rowGap}>
                  <View style={{ flex: 1 }}>
                    <Field label="PLZ">
                      <TextInput
                        value={profile.postalCode ?? ""}
                        onChangeText={(v) => setProfile({ ...profile, postalCode: v || null })}
                        placeholder="45127"
                        placeholderTextColor="#9a9a9a"
                        style={input}
                      />
                    </Field>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Field label="Stadt">
                      <TextInput
                        value={profile.city ?? ""}
                        onChangeText={(v) => setProfile({ ...profile, city: v || null })}
                        placeholder="Essen"
                        placeholderTextColor="#9a9a9a"
                        style={input}
                      />
                    </Field>
                  </View>
                </View>

                <Field label="Instagram">
                  <TextInput
                    value={profile.instagram ?? ""}
                    onChangeText={(v) => setProfile({ ...profile, instagram: v || null })}
                    placeholder="@deinprofil"
                    placeholderTextColor="#9a9a9a"
                    style={input}
                  />
                </Field>

                <Field label="Website">
                  <TextInput
                    value={profile.website ?? ""}
                    onChangeText={(v) => setProfile({ ...profile, website: v || null })}
                    placeholder="https://..."
                    placeholderTextColor="#9a9a9a"
                    autoCapitalize="none"
                    style={input}
                  />
                </Field>

                <Field label="Bio">
                  <TextInput
                    value={profile.bio ?? ""}
                    onChangeText={(v) => setProfile({ ...profile, bio: v || null })}
                    placeholder="Kurz über dich"
                    placeholderTextColor="#9a9a9a"
                    multiline
                    textAlignVertical="top"
                    style={textarea}
                  />
                </Field>
              </View>

              <Pressable
                onPress={saveProfile}
                disabled={savingProfile}
                style={[primaryBtn, { marginTop: 16 }, savingProfile ? disabledBtn : null]}
              >
                <Text style={primaryBtnText}>{savingProfile ? "Speichert..." : "Profil speichern"}</Text>
              </Pressable>
            </View>

            {(profileUrl || bookingUrl) && (
              <View style={[card, { marginTop: 16 }]}>
                <Text style={sectionTitle}>Deine Links</Text>
                <Text style={sectionSub}>Diese Links kannst du direkt an Kunden schicken oder teilen.</Text>

                <View style={fieldGap}>
                  {profileUrl ? (
                    <View style={linkCard}>
                      <Text style={linkLabel}>Profil-Link</Text>
                      <Text style={linkValue}>{profileUrl}</Text>

                      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                        <Pressable
                          onPress={() => copyToClipboard(profileUrl, "Profil-Link")}
                          style={[secondaryBtnSmall, { flex: 1 }]}
                        >
                          <Text style={secondaryBtnSmallText}>Kopieren</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => shareLink(profileUrl, "Profil-Link teilen")}
                          style={[primaryBtnSmall, { flex: 1 }]}
                        >
                          <Text style={primaryBtnSmallText}>Teilen</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  {bookingUrl ? (
                    <View style={linkCard}>
                      <Text style={linkLabel}>Buchungs-Link</Text>
                      <Text style={linkValue}>{bookingUrl}</Text>

                      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                        <Pressable
                          onPress={() => copyToClipboard(bookingUrl, "Buchungs-Link")}
                          style={[secondaryBtnSmall, { flex: 1 }]}
                        >
                          <Text style={secondaryBtnSmallText}>Kopieren</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => shareLink(bookingUrl, "Buchungs-Link teilen")}
                          style={[primaryBtnSmall, { flex: 1 }]}
                        >
                          <Text style={primaryBtnSmallText}>Teilen</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            )}

            <View style={[card, { marginTop: 16 }]}>
              <Text style={sectionTitle}>Konto</Text>
              <Text style={sectionSub}>Sichere Aktionen für deinen Account.</Text>
              <Text style={[sectionSub, { marginTop: 10 }]}>
                Abonnements werden über Apple verwaltet. Kündigung und Verwaltung erfolgen in deinen Apple-Abonnements.
              </Text>

              <View style={{ gap: 10, marginTop: 16 }}>
                <Pressable
                  onPress={openSubscriptionManagement}
                  disabled={checkingSubscription}
                  style={[secondaryBtn, checkingSubscription ? disabledBtn : null]}
                >
                  <Text style={secondaryBtnText}>
                    {checkingSubscription ? "Lädt..." : "Abo verwalten"}
                  </Text>
                </Pressable>

                <Pressable onPress={confirmLogout} style={secondaryBtn}>
                  <Text style={secondaryBtnText}>Ausloggen</Text>
                </Pressable>

                <Pressable onPress={confirmDeleteAccount} style={dangerBtn}>
                  <Text style={dangerBtnText}>Account löschen</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : tab === "SERVICES" ? (
          <>
            <View style={card}>
              <Text style={sectionTitle}>Neuen Service anlegen</Text>
              <Text style={sectionSub}>Name eingeben, Dauer auswählen.</Text>

              <View style={fieldGap}>
                <Field label="Service-Name">
                  <TextInput
                    value={newServiceName}
                    onChangeText={setNewServiceName}
                    placeholder="z. B. Haare"
                    placeholderTextColor="#9a9a9a"
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
              </View>

              <Pressable
                onPress={createService}
                disabled={creatingService}
                style={[primaryBtn, { marginTop: 16 }, creatingService ? disabledBtn : null]}
              >
                <Text style={primaryBtnText}>{creatingService ? "Speichert..." : "Service hinzufügen"}</Text>
              </Pressable>
            </View>

            <View style={[card, { marginTop: 16 }]}>
              <Text style={sectionTitle}>Deine Services</Text>
              <Text style={sectionSub}>Dauer ändern, aktivieren oder löschen.</Text>

              <View style={{ marginTop: 16, gap: 12 }}>
                {services.length === 0 ? (
                  <View style={linkCard}>
                    <Text style={linkValue}>Noch keine Services vorhanden.</Text>
                  </View>
                ) : (
                  services
                    .slice()
                    .sort((a, b) => a.id - b.id)
                    .map((service) => {
                      const isBusy = busyServiceId === service.id;

                      return (
                        <View key={service.id} style={serviceCard}>
                          <TextInput
                            defaultValue={service.name}
                            onEndEditing={(e) => {
                              const v = e.nativeEvent.text.trim();
                              if (v && v !== service.name) {
                                updateService(service.id, { name: v });
                              }
                            }}
                            style={input}
                            placeholder="Service-Name"
                            placeholderTextColor="#9a9a9a"
                          />

                          <View style={{ marginTop: 12 }}>
                            <SelectField
                              label="Dauer"
                              value={service.durationMin}
                              options={SERVICE_DURATION_OPTIONS.map((dur) => ({
                                label: `${dur} min`,
                                value: dur,
                              }))}
                              onChange={(dur) => updateService(service.id, { durationMin: dur })}
                            />
                          </View>

                          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                            <Pressable
                              onPress={() => updateService(service.id, { isActive: !service.isActive })}
                              disabled={isBusy}
                              style={[
                                service.isActive ? primaryBtnSmall : secondaryBtnSmall,
                                { flex: 1 },
                                isBusy ? disabledBtn : null,
                              ]}
                            >
                              <Text style={service.isActive ? primaryBtnSmallText : secondaryBtnSmallText}>
                                {service.isActive ? "Aktiv" : "Inaktiv"}
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={() => deleteService(service.id)}
                              disabled={isBusy}
                              style={[dangerBtnSmall, { flex: 1 }, isBusy ? disabledBtn : null]}
                            >
                              <Text style={dangerBtnSmallText}>Löschen</Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })
                )}
              </View>
            </View>
          </>
        ) : tab === "HOURS" ? (
          <View style={card}>
            <Text style={sectionTitle}>Arbeitszeiten</Text>
            <Text style={sectionSub}>Lege fest, an welchen Tagen und Uhrzeiten du buchbar bist.</Text>

            <View style={{ marginTop: 16, gap: 12 }}>
              {workingHoursUi.map((row) => {
                const dayName = WEEKDAYS.find((d) => d.k === row.day)?.name ?? String(row.day);

                return (
                  <View key={row.day} style={serviceCard}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Text style={dayTitle}>{dayName}</Text>

                      <Pressable
                        onPress={() => {
                          setSettings({
                            ...settings,
                            workingHours: workingHoursUi.map((r) =>
                              r.day === row.day ? { ...r, isOpen: !r.isOpen } : r
                            ),
                          });
                        }}
                        style={[row.isOpen ? primaryBtnSmall : secondaryBtnSmall, { minWidth: 110 }]}
                      >
                        <Text style={row.isOpen ? primaryBtnSmallText : secondaryBtnSmallText}>
                          {row.isOpen ? "Geöffnet" : "Geschlossen"}
                        </Text>
                      </Pressable>
                    </View>

                    {row.isOpen ? (
                      <View style={{ marginTop: 14, gap: 12 }}>
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
                      </View>
                    ) : (
                      <Text style={helperText}>
                        An diesem Tag können keine Termine gebucht werden.
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            <Pressable
              onPress={saveHours}
              disabled={savingHours}
              style={[primaryBtn, { marginTop: 16 }, savingHours ? disabledBtn : null]}
            >
              <Text style={primaryBtnText}>{savingHours ? "Speichert..." : "Arbeitszeiten speichern"}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={card}>
            <Text style={sectionTitle}>Buchungsregeln</Text>
            <Text style={sectionSub}>Hier legst du fest, was Kunden zuerst sehen.</Text>

            <View style={fieldGap}>
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
                    settings.displayEndMin <= nextStart ? Math.min(1440, nextStart + 60) : settings.displayEndMin;

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
                options={DISPLAY_TIME_OPTIONS.filter((value) => value > settings.displayStartMin).map((value) => ({
                  label: minToHHMM(value),
                  value,
                }))}
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
                <Pressable
                  onPress={() =>
                    setSettings({
                      ...settings,
                      extendIfFirstHourFull: !settings.extendIfFirstHourFull,
                    })
                  }
                  style={[settings.extendIfFirstHourFull ? primaryBtnSmall : secondaryBtnSmall]}
                >
                  <Text style={settings.extendIfFirstHourFull ? primaryBtnSmallText : secondaryBtnSmallText}>
                    {settings.extendIfFirstHourFull ? "AN" : "AUS"}
                  </Text>
                </Pressable>
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
            </View>

            <Pressable
              onPress={saveRules}
              disabled={savingRules}
              style={[primaryBtn, { marginTop: 16 }, savingRules ? disabledBtn : null]}
            >
              <Text style={primaryBtnText}>
                {savingRules ? "Speichert..." : "Buchungsregeln speichern"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  children: React.ReactNode;
  helperText?: string;
}) {
  return (
    <View>
      <Text style={fieldLabel}>{props.label}</Text>
      {props.children}
      {props.helperText ? <Text style={helperText}>{props.helperText}</Text> : null}
    </View>
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
    <View style={{ zIndex: open ? 50 : 1 }}>
      <Text style={fieldLabel}>{props.label}</Text>

      <Pressable onPress={() => setOpen((v) => !v)} style={selectTrigger}>
        <Text style={selectTriggerText}>{selected}</Text>
        <Text style={selectChevron}>{open ? "▲" : "▼"}</Text>
      </Pressable>

      {props.helperText ? <Text style={helperText}>{props.helperText}</Text> : null}

      {open ? (
        <View style={selectMenu}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
            {props.options.map((option, index) => {
              const active = option.value === props.value;

              return (
                <Pressable
                  key={`${String(option.value)}-${index}`}
                  onPress={() => {
                    props.onChange(option.value);
                    setOpen(false);
                  }}
                  style={[
                    selectOption,
                    index === 0 ? { borderTopWidth: 0 } : null,
                    active ? selectOptionActive : null,
                  ]}
                >
                  <Text style={[selectOptionText, active ? selectOptionTextActive : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const page = {
  flex: 1,
  backgroundColor: "#f6f6f7",
} as const;

const loadingWrap = {
  flex: 1,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: "#f6f6f7",
} as const;

const pageTitle = {
  fontSize: 32,
  lineHeight: 36,
  fontWeight: "900" as const,
  color: "#111",
} as const;

const pageSub = {
  marginTop: 8,
  color: "#666",
  fontSize: 15,
  lineHeight: 22,
} as const;

const tabWrap = {
  flexDirection: "row" as const,
  backgroundColor: "#ededf0",
  borderRadius: 18,
  padding: 5,
  gap: 5,
  marginBottom: 16,
} as const;

const tabBtn = {
  flex: 1,
  minHeight: 44,
  borderRadius: 14,
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const tabBtnActive = {
  backgroundColor: "#111",
} as const;

const tabBtnText = {
  color: "#111",
  fontWeight: "900" as const,
  fontSize: 14,
} as const;

const tabBtnTextActive = {
  color: "#fff",
} as const;

const card = {
  borderWidth: 1,
  borderColor: "#e8e8eb",
  borderRadius: 24,
  backgroundColor: "#fff",
  padding: 18,
} as const;

const sectionTitle = {
  fontSize: 24,
  lineHeight: 28,
  fontWeight: "900" as const,
  color: "#111",
} as const;

const sectionSub = {
  marginTop: 6,
  color: "#666",
  fontSize: 15,
  lineHeight: 20,
} as const;

const avatarSection = {
  marginTop: 16,
  flexDirection: "row" as const,
  gap: 14,
  alignItems: "center" as const,
} as const;

const avatarWrap = {
  width: 92,
  height: 92,
  borderRadius: 999,
  overflow: "hidden" as const,
  backgroundColor: "#f1f1f3",
  borderWidth: 1,
  borderColor: "#e3e3e6",
  alignItems: "center" as const,
  justifyContent: "center" as const,
} as const;

const avatarImg = {
  width: "100%" as const,
  height: "100%" as const,
} as const;

const avatarFallback = {
  fontSize: 32,
  fontWeight: "900" as const,
  color: "#555",
} as const;

const fieldGap = {
  marginTop: 16,
  gap: 14,
} as const;

const rowGap = {
  flexDirection: "row" as const,
  gap: 10,
} as const;

const fieldLabel = {
  fontSize: 13,
  fontWeight: "800" as const,
  color: "#555",
  marginBottom: 8,
} as const;

const helperText = {
  marginTop: 8,
  color: "#777",
  fontSize: 13,
  lineHeight: 18,
} as const;

const input = {
  width: "100%" as const,
  minHeight: 52,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#dedede",
  backgroundColor: "#fff",
  paddingHorizontal: 16,
  fontSize: 16,
  color: "#111",
} as const;

const textarea = {
  width: "100%" as const,
  minHeight: 120,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#dedede",
  backgroundColor: "#fff",
  paddingHorizontal: 16,
  paddingTop: 14,
  paddingBottom: 14,
  fontSize: 16,
  color: "#111",
} as const;

const disabledInput = {
  backgroundColor: "#f4f4f6",
  color: "#777",
} as const;

const primaryBtn = {
  minHeight: 52,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#111",
  backgroundColor: "#111",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: 14,
} as const;

const primaryBtnText = {
  color: "#fff",
  fontWeight: "900" as const,
  fontSize: 15,
} as const;

const secondaryBtn = {
  minHeight: 50,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#d8d8d8",
  backgroundColor: "#fff",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: 14,
} as const;

const secondaryBtnText = {
  color: "#111",
  fontWeight: "800" as const,
  fontSize: 15,
} as const;

const dangerBtn = {
  minHeight: 50,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#e6c7c7",
  backgroundColor: "#fff5f5",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: 14,
} as const;

const dangerBtnText = {
  color: "#9b1c1c",
  fontWeight: "900" as const,
  fontSize: 15,
} as const;

const primaryBtnSmall = {
  minHeight: 44,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#111",
  backgroundColor: "#111",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: 12,
} as const;

const primaryBtnSmallText = {
  color: "#fff",
  fontWeight: "900" as const,
  fontSize: 13,
} as const;

const secondaryBtnSmall = {
  minHeight: 44,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#d8d8d8",
  backgroundColor: "#fff",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: 12,
} as const;

const secondaryBtnSmallText = {
  color: "#111",
  fontWeight: "800" as const,
  fontSize: 13,
} as const;

const dangerBtnSmall = {
  minHeight: 44,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#e6c7c7",
  backgroundColor: "#fff5f5",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: 12,
} as const;

const dangerBtnSmallText = {
  color: "#9b1c1c",
  fontWeight: "900" as const,
  fontSize: 13,
} as const;

const disabledBtn = {
  opacity: 0.7,
} as const;

const serviceCard = {
  borderWidth: 1,
  borderColor: "#ececef",
  borderRadius: 16,
  backgroundColor: "#fbfbfc",
  padding: 14,
} as const;

const dayTitle = {
  fontSize: 17,
  lineHeight: 22,
  color: "#111",
  fontWeight: "900" as const,
} as const;

const linkCard = {
  borderWidth: 1,
  borderColor: "#ececef",
  borderRadius: 16,
  backgroundColor: "#fbfbfc",
  padding: 14,
} as const;

const linkLabel = {
  fontSize: 13,
  fontWeight: "800" as const,
  color: "#666",
} as const;

const linkValue = {
  marginTop: 8,
  fontSize: 14,
  lineHeight: 20,
  color: "#111",
  fontWeight: "700" as const,
} as const;

const alertOk = {
  marginBottom: 16,
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#cfe7d1",
  backgroundColor: "#f4fbf4",
} as const;

const alertOkText = {
  color: "#17663a",
  fontWeight: "700" as const,
} as const;

const alertErr = {
  marginBottom: 16,
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#f1c7c7",
  backgroundColor: "#fff5f5",
} as const;

const alertErrText = {
  color: "#b42318",
  fontWeight: "700" as const,
} as const;

const selectTrigger = {
  minHeight: 52,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#dedede",
  backgroundColor: "#fff",
  paddingHorizontal: 16,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
} as const;

const selectTriggerText = {
  fontSize: 16,
  color: "#111",
  fontWeight: "700" as const,
} as const;

const selectChevron = {
  fontSize: 14,
  color: "#666",
  fontWeight: "800" as const,
} as const;

const selectMenu = {
  marginTop: 8,
  borderWidth: 1,
  borderColor: "#e6e6e8",
  borderRadius: 14,
  backgroundColor: "#fff",
  overflow: "hidden" as const,
} as const;

const selectOption = {
  minHeight: 48,
  paddingHorizontal: 16,
  alignItems: "flex-start" as const,
  justifyContent: "center" as const,
  borderTopWidth: 1,
  borderTopColor: "#f1f1f3",
} as const;

const selectOptionActive = {
  backgroundColor: "#111",
} as const;

const selectOptionText = {
  fontSize: 15,
  color: "#111",
  fontWeight: "700" as const,
} as const;

const selectOptionTextActive = {
  color: "#fff",
} as const;