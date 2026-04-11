import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type Booking = any;

function statusLabel(s: string) {
  const v = String(s || "").toUpperCase();
  if (v === "CONFIRMED") return "Bestätigt";
  if (v === "COMPLETED") return "Erledigt";
  if (v === "CANCELLED") return "Storniert";
  if (v === "NO_SHOW") return "No-Show";
  return v || "—";
}

function statusStyles(s: string) {
  const v = String(s || "").toUpperCase();

  if (v === "CONFIRMED") {
    return {
      borderColor: "#111",
      backgroundColor: "#111",
      color: "#fff",
    };
  }

  if (v === "COMPLETED") {
    return {
      borderColor: "#b7ebc6",
      backgroundColor: "#f0fff4",
      color: "#1f7a37",
    };
  }

  if (v === "CANCELLED" || v === "NO_SHOW") {
    return {
      borderColor: "#f2c6c6",
      backgroundColor: "#fff5f5",
      color: "#8a1c1c",
    };
  }

  return {
    borderColor: "#eee",
    backgroundColor: "#fff",
    color: "#111",
  };
}

function todayBerlinYYYYMMDD() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

function isValidYYYYMMDD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

export default function MyBookingsScreen() {
  const { token, user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showCancelled, setShowCancelled] = useState(false);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "CUSTOMER") {
      router.replace("/barber");
      return;
    }

    loadBookings();
  }, [token, user]);

  async function loadBookings(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setMessage("");

      if (!token) {
        setError("Nicht eingeloggt.");
        setBookings([]);
        return;
      }

      const res = await api.get("/my-bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = Array.isArray(res.data?.bookings) ? res.data.bookings : [];
      setBookings(list);
    } catch (e: any) {
      console.log("MY BOOKINGS ERROR:", e?.message);
      console.log("MY BOOKINGS RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || "Fehler beim Laden der Termine.");
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function cancelBooking(id: number) {
    try {
      setBusyId(id);
      setError("");
      setMessage("");

      if (!token) {
        setError("Nicht eingeloggt.");
        return;
      }

      const res = await api.delete(`/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data?.ok && !res.data?.alreadyCancelled) {
        throw new Error("Stornieren fehlgeschlagen.");
      }

      setMessage("✅ Termin storniert.");
      await loadBookings();
    } catch (e: any) {
      console.log("CANCEL BOOKING ERROR:", e?.message);
      console.log("CANCEL BOOKING RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || "Fehler beim Stornieren.");
    } finally {
      setBusyId(null);
    }
  }

  const todayStr = useMemo(() => todayBerlinYYYYMMDD(), []);

  const normalized = useMemo(() => {
    return bookings.filter((b: any) => {
      const d = String(b?.date ?? "").trim();
      if (!isValidYYYYMMDD(d)) return true;
      if (showPast) return true;
      return d >= todayStr;
    });
  }, [bookings, showPast, todayStr]);

  const upcoming = useMemo(() => {
    return normalized.filter((b: any) => String(b?.status).toUpperCase() !== "CANCELLED");
  }, [normalized]);

  const cancelled = useMemo(() => {
    return normalized.filter((b: any) => String(b?.status).toUpperCase() === "CANCELLED");
  }, [normalized]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadBookings(true)} />
        }
      >
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 30, fontWeight: "900", color: "#111" }}>Meine Termine</Text>

          <View style={{ marginTop: 12, gap: 10 }}>
            <Pressable
              onPress={() => loadBookings()}
              style={{
                borderWidth: 1,
                borderColor: "#111",
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: "#111",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>Neu laden</Text>
            </Pressable>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setShowCancelled((v) => !v)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: showCancelled ? "#111" : "#ddd",
                  backgroundColor: showCancelled ? "#111" : "#fff",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: showCancelled ? "#fff" : "#111",
                    fontWeight: "900",
                  }}
                >
                  Stornierte {showCancelled ? "✓" : ""}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowPast((v) => !v)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: showPast ? "#111" : "#ddd",
                  backgroundColor: showPast ? "#111" : "#fff",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: showPast ? "#fff" : "#111",
                    fontWeight: "900",
                  }}
                >
                  Vergangene {showPast ? "✓" : ""}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {message ? (
          <View
            style={{
              marginBottom: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: "#b7ebc6",
              backgroundColor: "#f0fff4",
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#1f7a37", fontWeight: "800" }}>{message}</Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={{
              marginBottom: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: "#f2c6c6",
              backgroundColor: "#fff5f5",
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#8a1c1c", fontWeight: "800" }}>{error}</Text>
          </View>
        ) : null}

        {bookings.length === 0 ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#eee",
              borderRadius: 14,
              padding: 14,
              backgroundColor: "#fff",
            }}
          >
            <Text style={{ fontWeight: "900", color: "#111" }}>Keine Termine gefunden</Text>
            <Text style={{ marginTop: 6, color: "#666" }}>
              Gehe zur Startseite und buche einen Termin.
            </Text>

            <Pressable
              onPress={() => router.push("/")}
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: "#111",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: "#111",
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>Jetzt buchen →</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: "#eee",
                borderRadius: 14,
                padding: 14,
                backgroundColor: "#fff",
              }}
            >
              <Text style={{ fontWeight: "900", marginBottom: 10, color: "#111" }}>
                Aktive Termine ({upcoming.length})
              </Text>

              {upcoming.length === 0 ? (
                <Text style={{ color: "#666" }}>Keine aktiven (zukünftigen) Termine.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {upcoming.map((b: any) => {
                    const barberName = b?.barber?.name ?? "—";
                    const barberSlug = b?.barber?.slug ?? "";
                    const serviceName = b?.service?.name ?? "—";
                    const serviceDur = b?.service?.durationMin ?? b?.durationMin ?? "—";
                    const chip = statusStyles(b.status);

                    return (
                      <View
                        key={b.id}
                        style={{
                          borderWidth: 1,
                          borderColor: "#eee",
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            gap: 10,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ fontWeight: "900", color: "#111", flex: 1 }}>
                            {b.date}
                            {b.timeHHMM ? ` — ${b.timeHHMM}` : ""}
                          </Text>

                          <View
                            style={{
                              borderWidth: 1,
                              borderColor: chip.borderColor,
                              backgroundColor: chip.backgroundColor,
                              borderRadius: 999,
                              paddingVertical: 4,
                              paddingHorizontal: 10,
                            }}
                          >
                            <Text style={{ color: chip.color, fontSize: 12, fontWeight: "900" }}>
                              {statusLabel(b.status)}
                            </Text>
                          </View>
                        </View>

                        <View style={{ marginTop: 8, gap: 6 }}>
                          <Text style={{ color: "#111" }}>
                            Friseur: <Text style={{ fontWeight: "900" }}>{barberName}</Text>
                          </Text>

                          <Text style={{ color: "#111" }}>
                            Service: <Text style={{ fontWeight: "900" }}>{serviceName}</Text> ({serviceDur} min)
                          </Text>

                          {b.note ? (
                            <Text style={{ color: "#333" }}>
                              Notiz: <Text style={{ fontStyle: "italic" }}>{b.note}</Text>
                            </Text>
                          ) : null}
                        </View>

                        <View style={{ marginTop: 12, gap: 10 }}>
                          <Pressable
                            onPress={() => cancelBooking(b.id)}
                            disabled={busyId === b.id}
                            style={{
                              paddingVertical: 10,
                              paddingHorizontal: 10,
                              borderWidth: 1,
                              borderColor: "#ccc",
                              borderRadius: 12,
                              backgroundColor: "#fff",
                              alignItems: "center",
                            }}
                          >
                            <Text style={{ fontWeight: "900", color: "#111" }}>
                              {busyId === b.id ? "Storniere..." : "Stornieren"}
                            </Text>
                          </Pressable>

                          {barberSlug ? (
                            <Pressable
                              onPress={() => router.push(`/barber/${barberSlug}` as any)}
                              style={{
                                paddingVertical: 10,
                                paddingHorizontal: 10,
                                borderWidth: 1,
                                borderColor: "#111",
                                borderRadius: 12,
                                backgroundColor: "#111",
                                alignItems: "center",
                              }}
                            >
                              <Text style={{ color: "#fff", fontWeight: "900" }}>Neu buchen →</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {showCancelled ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#eee",
                  borderRadius: 14,
                  padding: 14,
                  backgroundColor: "#fff",
                }}
              >
                <Text style={{ fontWeight: "900", marginBottom: 10, color: "#111" }}>
                  Stornierte Termine ({cancelled.length})
                </Text>

                {cancelled.length === 0 ? (
                  <Text style={{ color: "#666" }}>Keine stornierten Termine in der Auswahl.</Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {cancelled.map((b: any) => {
                      const barberName = b?.barber?.name ?? "—";
                      const serviceName = b?.service?.name ?? "—";
                      const serviceDur = b?.service?.durationMin ?? "—";
                      const chip = statusStyles(b.status);

                      return (
                        <View
                          key={b.id}
                          style={{
                            borderWidth: 1,
                            borderColor: "#eee",
                            borderRadius: 12,
                            padding: 12,
                            opacity: 0.85,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              gap: 10,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <Text style={{ fontWeight: "900", color: "#111", flex: 1 }}>
                              {b.date}
                              {b.timeHHMM ? ` — ${b.timeHHMM}` : ""}
                            </Text>

                            <View
                              style={{
                                borderWidth: 1,
                                borderColor: chip.borderColor,
                                backgroundColor: chip.backgroundColor,
                                borderRadius: 999,
                                paddingVertical: 4,
                                paddingHorizontal: 10,
                              }}
                            >
                              <Text style={{ color: chip.color, fontSize: 12, fontWeight: "900" }}>
                                {statusLabel(b.status)}
                              </Text>
                            </View>
                          </View>

                          <View style={{ marginTop: 8, gap: 6 }}>
                            <Text style={{ color: "#111" }}>
                              Friseur: <Text style={{ fontWeight: "900" }}>{barberName}</Text>
                            </Text>

                            <Text style={{ color: "#111" }}>
                              Service: <Text style={{ fontWeight: "900" }}>{serviceName}</Text> ({serviceDur} min)
                            </Text>

                            {b.note ? (
                              <Text style={{ color: "#333" }}>
                                Notiz: <Text style={{ fontStyle: "italic" }}>{b.note}</Text>
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}