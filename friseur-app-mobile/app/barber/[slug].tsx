import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Heart } from "lucide-react-native";

import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type Service = {
  key: string;
  name: string;
  durationMin: number;
};

type Barber = {
  id: number;
  name: string;
  slug: string;
  phone: string | null;
  bio?: string | null;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  instagram?: string | null;
  website?: string | null;
  imageUrl?: string | null;
  isFavorite?: boolean;
};

function cleanUrl(u?: string | null) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return "https://" + s;
}

export default function BarberProfileScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = String(params?.slug ?? "");

  const { token, user } = useAuth();

  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    loadProfile();
  }, [slug]);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const headers =
        token && user?.role === "CUSTOMER"
          ? { Authorization: `Bearer ${token}` }
          : undefined;

      const res = await api.get(`/barbers/${encodeURIComponent(slug)}`, {
        headers,
      });

      setBarber(res.data?.barber ?? null);
      setServices(Array.isArray(res.data?.services) ? res.data.services : []);
    } catch (e: any) {
      console.log("BARBER PROFILE ERROR:", e?.message);
      console.log("BARBER PROFILE RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || e?.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  const address = useMemo(() => {
    if (!barber) return "";
    const parts = [
      barber.street?.trim(),
      [barber.postalCode?.trim(), barber.city?.trim()].filter(Boolean).join(" "),
    ].filter(Boolean);
    return parts.join(", ");
  }, [barber]);

  const instaUrl = useMemo(() => {
    const raw = String(barber?.instagram ?? "").trim();
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;
    const handle = raw.startsWith("@") ? raw.slice(1) : raw;
    return `https://instagram.com/${handle}`;
  }, [barber]);

  const websiteUrl = useMemo(() => {
    const raw = String(barber?.website ?? "").trim();
    return raw ? cleanUrl(raw) : "";
  }, [barber]);

  async function openLink(url: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (e) {
      console.log("OPEN LINK ERROR:", e);
    }
  }

  async function toggleFavorite() {
    if (!barber || !token || user?.role !== "CUSTOMER" || favoriteBusy) return;

    try {
      setFavoriteBusy(true);

      if (barber.isFavorite) {
        await api.delete(`/favorites/barbers/${barber.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setBarber((prev) => (prev ? { ...prev, isFavorite: false } : prev));
      } else {
        await api.post(
          `/favorites/barbers/${barber.id}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setBarber((prev) => (prev ? { ...prev, isFavorite: true } : prev));
      }
    } catch (e) {
      console.log("TOGGLE FAVORITE ERROR:", e);
    } finally {
      setFavoriteBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ padding: 16 }}>
          <Pressable onPress={() => router.back()} style={{ marginBottom: 14 }}>
            <Text style={{ color: "#111", fontWeight: "900", fontSize: 14 }}>← Zurück</Text>
          </Pressable>

          <View
            style={{
              padding: 14,
              borderWidth: 1,
              borderColor: "#f1c7c7",
              backgroundColor: "#fff5f5",
              borderRadius: 16,
            }}
          >
            <Text style={{ color: "#8a1c1c", fontWeight: "800" }}>{error}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!barber) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ padding: 16 }}>
          <Pressable onPress={() => router.back()} style={{ marginBottom: 14 }}>
            <Text style={{ color: "#111", fontWeight: "900", fontSize: 14 }}>← Zurück</Text>
          </Pressable>

          <View
            style={{
              padding: 14,
              borderWidth: 1,
              borderColor: "#eee",
              backgroundColor: "#fff",
              borderRadius: 16,
            }}
          >
            <Text style={{ color: "#666", fontWeight: "700" }}>Friseur nicht gefunden.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ marginBottom: 14 }}>
          <Text style={{ color: "#111", fontWeight: "900", fontSize: 14 }}>← Zurück</Text>
        </Pressable>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#e9e9e9",
            borderRadius: 24,
            backgroundColor: "#fff",
            padding: 18,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
            <View
              style={{
                width: 90,
                height: 90,
                borderRadius: 999,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "#ececec",
                backgroundColor: "#fafafa",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {barber.imageUrl ? (
                <Image
                  source={{ uri: cleanUrl(barber.imageUrl) }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ fontWeight: "900", color: "#666", fontSize: 28 }}>
                  {barber.name.slice(0, 1).toUpperCase()}
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 28,
                  lineHeight: 31,
                  fontWeight: "900",
                  color: "#111",
                }}
              >
                {barber.name}
              </Text>

              {address ? (
                <Text
                  style={{
                    marginTop: 8,
                    color: "#555",
                    fontSize: 14,
                    fontWeight: "700",
                    lineHeight: 20,
                  }}
                >
                  {address}
                </Text>
              ) : null}
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 18,
            }}
          >
            <Pressable
              onPress={() => router.push(`/barber/${barber.slug}/book` as any)}
              style={{
                flex: 1,
                minHeight: 50,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#111",
                backgroundColor: "#111",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 18,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>
                Termin buchen
              </Text>
            </Pressable>

            {user?.role === "CUSTOMER" ? (
              <Pressable
                onPress={toggleFavorite}
                disabled={favoriteBusy}
                style={{
                  width: 54,
                  minHeight: 50,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: barber.isFavorite ? "#f0d3d3" : "#ddd",
                  backgroundColor: barber.isFavorite ? "#fff5f5" : "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: favoriteBusy ? 0.7 : 1,
                }}
              >
                <Heart
                  size={20}
                  color={barber.isFavorite ? "#b42318" : "#444"}
                  fill={barber.isFavorite ? "#b42318" : "transparent"}
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#e9e9e9",
            borderRadius: 24,
            backgroundColor: "#fff",
            padding: 18,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontWeight: "900", fontSize: 18, color: "#111" }}>Kontakt</Text>

          <View style={{ marginTop: 14, gap: 12 }}>
            <View>
              <Text style={{ color: "#666", fontSize: 12, fontWeight: "800" }}>Adresse</Text>
              <Text style={{ marginTop: 4, fontWeight: "800", color: "#111" }}>
                {address || "Keine Adresse hinterlegt."}
              </Text>
            </View>

            <View>
              <Text style={{ color: "#666", fontSize: 12, fontWeight: "800" }}>Telefon</Text>
              <Text style={{ marginTop: 4, fontWeight: "800", color: "#111" }}>
                {barber.phone || "Keine Telefonnummer hinterlegt."}
              </Text>
            </View>

            {(barber.phone || instaUrl || websiteUrl) && (
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                {barber.phone ? (
                  <Pressable
                    onPress={() => openLink(`tel:${barber.phone}`)}
                    style={{
                      minHeight: 46,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#ddd",
                      backgroundColor: "#fff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#111", fontWeight: "800", fontSize: 14 }}>
                      Anrufen
                    </Text>
                  </Pressable>
                ) : null}

                {instaUrl ? (
                  <Pressable
                    onPress={() => openLink(instaUrl)}
                    style={{
                      minHeight: 46,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#ddd",
                      backgroundColor: "#fff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#111", fontWeight: "800", fontSize: 14 }}>
                      Instagram
                    </Text>
                  </Pressable>
                ) : null}

                {websiteUrl ? (
                  <Pressable
                    onPress={() => openLink(websiteUrl)}
                    style={{
                      minHeight: 46,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#ddd",
                      backgroundColor: "#fff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#111", fontWeight: "800", fontSize: 14 }}>
                      Website
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#e9e9e9",
            borderRadius: 24,
            backgroundColor: "#fff",
            padding: 18,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontWeight: "900", fontSize: 20, color: "#111" }}>Über mich</Text>

          <Text
            style={{
              marginTop: 10,
              color: "#333",
              lineHeight: 24,
            }}
          >
            {barber.bio?.trim()
              ? barber.bio
              : "Hier kann der Friseur einen kurzen Text zu Erfahrung, Stil und Spezialisierung hinterlegen."}
          </Text>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#e9e9e9",
            borderRadius: 24,
            backgroundColor: "#fff",
            padding: 18,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontWeight: "900", fontSize: 22, color: "#111" }}>Services</Text>

            <Pressable
              onPress={() => router.push(`/barber/${barber.slug}/book` as any)}
              style={{
                minHeight: 46,
                paddingHorizontal: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#111",
                backgroundColor: "#111",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>Jetzt buchen</Text>
            </Pressable>
          </View>

          {services.length === 0 ? (
            <View
              style={{
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "#e3e3e3",
                borderRadius: 16,
                padding: 16,
                backgroundColor: "#fcfcfc",
              }}
            >
              <Text style={{ color: "#777" }}>Aktuell sind keine Services verfügbar.</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {services.map((s) => (
                <View
                  key={s.key}
                  style={{
                    borderWidth: 1,
                    borderColor: "#ececec",
                    borderRadius: 18,
                    padding: 16,
                    backgroundColor: "#fff",
                  }}
                >
                  <Text style={{ fontWeight: "900", fontSize: 17, color: "#111" }}>{s.name}</Text>
                  <Text style={{ color: "#666", fontSize: 14, marginTop: 6 }}>
                    {s.durationMin} Minuten
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}