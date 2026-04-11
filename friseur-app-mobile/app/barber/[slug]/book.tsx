import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";

type Service = { key: string; name: string; durationMin: number };
type Barber = {
  id: number;
  name: string;
  slug: string;
  phone: string | null;
  imageUrl?: string | null;
};

type Me = {
  id: number;
  email: string;
  role: "CUSTOMER" | "BARBER";
  customer: { id: number; name: string; phone: string | null } | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minToHHMM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function todayYYYYMMDD() {
  const d = new Date();
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${year}-${month}-${day}`;
}

function isoToDisplayDate(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildNextDays(count: number) {
  const out: string[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const year = d.getFullYear();
    const month = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());

    out.push(`${year}-${month}-${day}`);
  }

  return out;
}

function cleanUrl(u?: string | null) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return "https://" + s;
}

export default function BarberBookScreen() {
  const params = useLocalSearchParams<{ slug: string; serviceKey?: string }>();
  const slug = String(params?.slug ?? "");
  const presetServiceKey = String(params?.serviceKey ?? "");

  const { token } = useAuth();

  const today = todayYYYYMMDD();

  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [me, setMe] = useState<Me | null>(null);

  const [selectedServiceKey, setSelectedServiceKey] = useState(presetServiceKey);
  const [selectedDate, setSelectedDate] = useState(today);

  const [availableTimes, setAvailableTimes] = useState<number[]>([]);
  const [selectedTimeMin, setSelectedTimeMin] = useState<number | null>(null);

  const [note, setNote] = useState("");

  const [busyTimes, setBusyTimes] = useState(false);
  const [busyBooking, setBusyBooking] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const nextDays = useMemo(() => buildNextDays(21), []);
  const isLoggedIn = Boolean(token);
  const isCustomer = me?.role === "CUSTOMER";
  const isAuthedCustomer = isLoggedIn && isCustomer;

  const customerName = (me?.customer?.name ?? "").trim();
  const customerPhone = (me?.customer?.phone ?? "").trim();
  const customerProfileComplete = Boolean(customerName && customerPhone);

  useEffect(() => {
    if (presetServiceKey) setSelectedServiceKey(presetServiceKey);
  }, [presetServiceKey]);

  useEffect(() => {
    if (!slug) return;

    loadPage();
  }, [slug]);

  useEffect(() => {
    if (!selectedServiceKey || !selectedDate) {
      setAvailableTimes([]);
      setSelectedTimeMin(null);
      return;
    }

    loadTimes();
  }, [selectedServiceKey, selectedDate]);

  async function loadPage() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const barberRes = await api.get(`/barbers/${encodeURIComponent(slug)}`);
      setBarber(barberRes.data?.barber ?? null);
      setServices(Array.isArray(barberRes.data?.services) ? barberRes.data.services : []);

      if (token) {
        try {
          const meRes = await api.get("/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setMe(meRes.data as Me);
        } catch {
          setMe(null);
        }
      } else {
        setMe(null);
      }
    } catch (e: any) {
      console.log("BOOK PAGE ERROR:", e?.message);
      console.log("BOOK PAGE RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || e?.message || "Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function loadTimes() {
    try {
      setBusyTimes(true);
      setError("");
      setMessage("");
      setSelectedTimeMin(null);

      const res = await api.get("/public/available-times", {
        params: {
          barberSlug: slug,
          date: selectedDate,
          serviceKey: selectedServiceKey,
        },
      });

      setAvailableTimes(Array.isArray(res.data?.times) ? res.data.times : []);
    } catch (e: any) {
      console.log("LOAD TIMES ERROR:", e?.message);
      console.log("LOAD TIMES RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || e?.message || "Fehler beim Laden");
      setAvailableTimes([]);
    } finally {
      setBusyTimes(false);
    }
  }

  async function bookNow() {
    try {
      setBusyBooking(true);
      setError("");
      setMessage("");

      if (!isAuthedCustomer) {
        router.replace("/login");
        return;
      }

      const res = await api.post(
        "/bookings",
        {
          barberSlug: slug,
          date: selectedDate,
          serviceKey: selectedServiceKey,
          exactTime: selectedTimeMin,
          note: note.trim() ? note.trim() : null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.data?.ok) {
        throw new Error("Buchung fehlgeschlagen");
      }

      setMessage(`✅ Termin erfolgreich gebucht: ${isoToDisplayDate(selectedDate)} um ${minToHHMM(selectedTimeMin!)}`);
      setError("");
      setNote("");
      setSelectedTimeMin(null);

      await loadTimes();

      setTimeout(() => {
        router.push("/my-bookings");
      }, 900);
    } catch (e: any) {
      console.log("BOOK ERROR:", e?.message);
      console.log("BOOK ERROR RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || e?.message || "Fehler beim Buchen");
    } finally {
      setBusyBooking(false);
    }
  }

  const selectedService = useMemo(
    () => services.find((s) => s.key === selectedServiceKey) ?? null,
    [services, selectedServiceKey]
  );

  const disableBook =
    busyBooking ||
    (isLoggedIn && me?.role === "BARBER") ||
    !selectedServiceKey ||
    !selectedDate ||
    selectedTimeMin == null ||
    (isAuthedCustomer && !customerProfileComplete);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error && !barber) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ padding: 16 }}>
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
          paddingBottom: 36,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ marginBottom: 14 }}>
          <Text style={{ color: "#111", fontWeight: "900", fontSize: 14 }}>← Zurück zum Profil</Text>
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
                width: 82,
                height: 82,
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
              <Text style={{ fontSize: 28, lineHeight: 31, fontWeight: "900", color: "#111" }}>
                Termin buchen
              </Text>
              <Text style={{ marginTop: 8, color: "#444", fontSize: 15, fontWeight: "700" }}>
                {barber.name}
              </Text>
            </View>
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
          {!isLoggedIn ? (
            <View style={{ gap: 10 }}>
              <Text style={{ fontWeight: "900", fontSize: 17, color: "#111" }}>Kunden-Login</Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => router.replace("/login")}
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
                  <Text style={{ color: "#111", fontWeight: "800", fontSize: 14 }}>Login</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.replace("/register")}
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
                  <Text style={{ color: "#111", fontWeight: "800", fontSize: 14 }}>Registrieren</Text>
                </Pressable>
              </View>
            </View>
          ) : isCustomer ? (
            <View style={{ gap: 10 }}>
              <Text style={{ fontWeight: "900", fontSize: 17, color: "#111" }}>Dein Kundenprofil</Text>

              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#ececec",
                  borderRadius: 16,
                  backgroundColor: "#fafafa",
                  padding: 14,
                  gap: 6,
                }}
              >
                <Text style={{ color: "#111" }}>
                  Name: <Text style={{ fontWeight: "900" }}>{customerName || "—"}</Text>
                </Text>
                <Text style={{ color: "#111" }}>
                  Telefon: <Text style={{ fontWeight: "900" }}>{customerPhone || "—"}</Text>
                </Text>
              </View>

              {!customerProfileComplete ? (
                <Text style={{ color: "#b42318", fontWeight: "800", fontSize: 13 }}>
                  Bitte Name und Telefonnummer in deinem Profil ergänzen.
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={{ color: "#b42318", fontWeight: "800" }}>
              Du bist als Friseur eingeloggt. Bitte als Kunde einloggen, um zu buchen.
            </Text>
          )}
        </View>

        {(message || error) ? (
          <View
            style={{
              marginBottom: 16,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: error ? "#f1c7c7" : "#cfe7d1",
              backgroundColor: error ? "#fff5f5" : "#f4fbf4",
            }}
          >
            <Text style={{ color: error ? "#b42318" : "#17663a", fontWeight: "700" }}>
              {error || message}
            </Text>
          </View>
        ) : null}

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
          <Text style={{ fontWeight: "900", fontSize: 22, color: "#111" }}>Termin auswählen</Text>

          <View style={{ marginTop: 16, gap: 14 }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#555", marginBottom: 8 }}>
                Service
              </Text>

              <View style={{ gap: 8 }}>
                {services.map((s) => {
                  const selected = selectedServiceKey === s.key;

                  return (
                    <Pressable
                      key={s.key}
                      onPress={() => {
                        setSelectedServiceKey(s.key);
                        setMessage("");
                        setError("");
                      }}
                      style={{
                        minHeight: 52,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: selected ? "#111" : "#dedede",
                        backgroundColor: selected ? "#111" : "#fff",
                        paddingHorizontal: 16,
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: selected ? "#fff" : "#111",
                          fontSize: 16,
                          fontWeight: "800",
                        }}
                      >
                        {s.name} – {s.durationMin} min
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#555", marginBottom: 8 }}>
                Datum
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {nextDays.map((iso) => {
                    const selected = selectedDate === iso;

                    return (
                      <Pressable
                        key={iso}
                        onPress={() => {
                          setSelectedDate(iso);
                          setSelectedTimeMin(null);
                          setMessage("");
                          setError("");
                        }}
                        style={{
                          minWidth: 94,
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: selected ? "#111" : "#ddd",
                          backgroundColor: selected ? "#111" : "#fff",
                        }}
                      >
                        <Text
                          style={{
                            color: selected ? "#fff" : "#111",
                            fontWeight: "900",
                            textAlign: "center",
                            fontSize: 13,
                          }}
                        >
                          {new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={{ marginTop: 8, color: "#666", fontSize: 13 }}>
                {isoToDisplayDate(selectedDate)}
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#555", marginBottom: 10 }}>
                Uhrzeit
              </Text>

              {!selectedServiceKey || !selectedDate ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: "#e3e3e3",
                    borderRadius: 16,
                    padding: 14,
                    backgroundColor: "#fcfcfc",
                  }}
                >
                  <Text style={{ color: "#777" }}>Bitte zuerst Service und Datum wählen.</Text>
                </View>
              ) : busyTimes ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: "#e3e3e3",
                    borderRadius: 16,
                    padding: 14,
                    backgroundColor: "#fcfcfc",
                  }}
                >
                  <Text style={{ color: "#777" }}>Verfügbare Zeiten werden geladen...</Text>
                </View>
              ) : availableTimes.length === 0 ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: "#e3e3e3",
                    borderRadius: 16,
                    padding: 14,
                    backgroundColor: "#fcfcfc",
                  }}
                >
                  <Text style={{ color: "#777" }}>Keine freien Zeiten verfügbar.</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {availableTimes.map((min) => {
                    const selected = selectedTimeMin === min;

                    return (
                      <Pressable
                        key={min}
                        onPress={() => setSelectedTimeMin(min)}
                        style={{
                          minWidth: 82,
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: selected ? "#111" : "#ddd",
                          backgroundColor: selected ? "#111" : "#fff",
                        }}
                      >
                        <Text
                          style={{
                            color: selected ? "#fff" : "#111",
                            fontWeight: "900",
                            fontSize: 14,
                            textAlign: "center",
                          }}
                        >
                          {minToHHMM(min)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#555", marginBottom: 8 }}>
                Notiz
              </Text>

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Optional"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{
                  width: "100%",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#dedede",
                  backgroundColor: "#fff",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: "#111",
                  minHeight: 110,
                }}
              />
            </View>

            <Pressable
              onPress={bookNow}
              disabled={disableBook}
              style={{
                width: "100%",
                minHeight: 54,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#111",
                backgroundColor: "#111",
                opacity: disableBook ? 0.7 : 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>
                {busyBooking ? "Bucht..." : "Termin buchen"}
              </Text>
            </Pressable>
          </View>
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
          <Text style={{ fontWeight: "900", fontSize: 22, color: "#111" }}>Zusammenfassung</Text>

          <View style={{ marginTop: 16, gap: 14 }}>
            <View>
              <Text style={{ color: "#666", fontSize: 12, fontWeight: "800" }}>Friseur</Text>
              <Text style={{ marginTop: 4, fontWeight: "900", color: "#111" }}>{barber.name}</Text>
            </View>

            <View>
              <Text style={{ color: "#666", fontSize: 12, fontWeight: "800" }}>Service</Text>
              <Text style={{ marginTop: 4, fontWeight: "800", color: "#111" }}>
                {selectedService ? `${selectedService.name} · ${selectedService.durationMin} min` : "—"}
              </Text>
            </View>

            <View>
              <Text style={{ color: "#666", fontSize: 12, fontWeight: "800" }}>Datum</Text>
              <Text style={{ marginTop: 4, fontWeight: "800", color: "#111" }}>
                {isoToDisplayDate(selectedDate) || "—"}
              </Text>
            </View>

            <View>
              <Text style={{ color: "#666", fontSize: 12, fontWeight: "800" }}>Uhrzeit</Text>
              <Text style={{ marginTop: 4, fontWeight: "800", color: "#111" }}>
                {selectedTimeMin != null ? minToHHMM(selectedTimeMin) : "—"}
              </Text>
            </View>

            <View>
              <Text style={{ color: "#666", fontSize: 12, fontWeight: "800" }}>Kunde</Text>
              <Text style={{ marginTop: 4, fontWeight: "800", color: "#111" }}>
                {isAuthedCustomer ? customerName || "—" : "—"}
              </Text>
            </View>

            <View>
              <Text style={{ color: "#666", fontSize: 12, fontWeight: "800" }}>Telefon</Text>
              <Text style={{ marginTop: 4, fontWeight: "800", color: "#111" }}>
                {isAuthedCustomer ? customerPhone || "—" : "—"}
              </Text>
            </View>

            {note.trim() ? (
              <View>
                <Text style={{ color: "#666", fontSize: 12, fontWeight: "800" }}>Notiz</Text>
                <Text style={{ marginTop: 4, fontWeight: "800", color: "#111" }}>{note.trim()}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}