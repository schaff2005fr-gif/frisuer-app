import React, { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type NotificationDetail = {
  id: number;
  type: "BOOKING_CANCELLED" | "BOOKING_STATUS_CHANGED";
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  barberSlug?: string | null;
  barberProfileLink?: string | null;
  barberBookLink?: string | null;
};

function formatDateTimeBerlinShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function extractDetailsFromBody(body: string) {
  const t = String(body ?? "");
  const friseur = /Friseur:\s*([^\n•]+)/i.exec(t)?.[1]?.trim() || null;
  const service = /Service:\s*([^\n•]+)/i.exec(t)?.[1]?.trim() || null;
  const datum = /Datum:\s*(\d{4}-\d{2}-\d{2})/i.exec(t)?.[1]?.trim() || null;
  const zeit = /Zeit:\s*([0-9]{1,2}:[0-9]{2})\s*-\s*([0-9]{1,2}:[0-9]{2})/i.exec(t);
  const timeStr = zeit ? `${zeit[1]}–${zeit[2]}` : null;
  return { friseur, service, datum, timeStr };
}

function stripDetailsFromBody(body: string) {
  let t = String(body ?? "");

  t = t.replace(/Friseur:\s*[^\n•]+/gi, "").trim();
  t = t.replace(/Service:\s*[^\n•]+/gi, "").trim();
  t = t.replace(/Datum:\s*\d{4}-\d{2}-\d{2}/gi, "").trim();
  t = t.replace(/Zeit:\s*[0-9]{1,2}:[0-9]{2}\s*-\s*[0-9]{1,2}:[0-9]{2}/gi, "").trim();

  t = t.replace(/[•·]\s*[•·]/g, "•");
  t = t.replace(/\s{2,}/g, " ").trim();
  t = t.replace(/^[-•·\s]+/, "").trim();

  return t;
}

export default function NotificationDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params?.id);

  const { token } = useAuth();

  const [item, setItem] = useState<NotificationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await api.get(`/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const n = (res.data?.notification ?? null) as NotificationDetail | null;
      setItem(n);

      if (n && !n.isRead) {
        api.patch(
          `/notifications/${n.id}/read`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ).catch(() => {});
      }
    } catch (e: any) {
      console.log("NOTIFICATION DETAIL ERROR:", e?.message);
      console.log("NOTIFICATION DETAIL RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || "Fehler beim Laden.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError("Ungültige ID.");
      setLoading(false);
      return;
    }

    load();
  }, [id]);

  const details = useMemo(() => extractDetailsFromBody(item?.body ?? ""), [item?.body]);
  const hasSummary = !!(details.friseur || details.service || details.datum || details.timeStr);

  const cleanBody = useMemo(() => {
    if (!item) return "";
    const t = hasSummary ? stripDetailsFromBody(item.body) : item.body;
    if (!t || t === "." || t.length < 3) return "";
    return t;
  }, [item, hasSummary]);

  const barberProfileHref = item?.barberProfileLink ?? (item?.barberSlug ? `/barber/${item.barberSlug}` : null);
  const barberBookHref = item?.barberBookLink ?? (item?.barberSlug ? `/barber/${item.barberSlug}/book` : null);

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
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: "#f2c6c6",
              backgroundColor: "#fff5f5",
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#8a1c1c", fontWeight: "900" }}>{error}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ padding: 16 }}>
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: "#f2c6c6",
              backgroundColor: "#fff5f5",
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#8a1c1c", fontWeight: "900" }}>Nachricht nicht gefunden.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View
          style={{
            borderWidth: 1,
            borderColor: "#eee",
            borderRadius: 16,
            backgroundColor: "#fff",
            padding: 14,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "baseline",
            }}
          >
            <Text style={{ fontWeight: "900", fontSize: 18, color: "#111", flex: 1 }}>
              {item.title}
            </Text>

            <Text style={{ color: "#666", fontSize: 12, fontWeight: "900" }}>
              {formatDateTimeBerlinShort(item.createdAt)}
            </Text>
          </View>

          {hasSummary ? (
            <View
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: "#eee",
                borderRadius: 12,
                padding: 12,
                backgroundColor: "#fafafa",
                gap: 6,
              }}
            >
              {details.friseur ? (
                <Text>
                  Friseur: <Text style={{ fontWeight: "900" }}>{details.friseur}</Text>
                </Text>
              ) : null}

              {details.service ? (
                <Text>
                  Service: <Text style={{ fontWeight: "900" }}>{details.service}</Text>
                </Text>
              ) : null}

              {details.datum ? (
                <Text>
                  Datum: <Text style={{ fontWeight: "900" }}>{details.datum}</Text>
                  {details.timeStr ? (
                    <Text>
                      {" "}
                      · Zeit: <Text style={{ fontWeight: "900" }}>{details.timeStr}</Text>
                    </Text>
                  ) : null}
                </Text>
              ) : null}
            </View>
          ) : null}

          {cleanBody ? (
            <Text
              style={{
                marginTop: 12,
                color: "#222",
                lineHeight: 24,
              }}
            >
              {cleanBody}
            </Text>
          ) : null}

          <View style={{ marginTop: 14, gap: 10 }}>
            <Pressable
              onPress={() => router.back()}
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#111", fontWeight: "900" }}>Zurück</Text>
            </Pressable>

            {barberBookHref ? (
              <Pressable
                onPress={() => router.push(barberBookHref as any)}
                style={{
                  borderWidth: 1,
                  borderColor: "#111",
                  backgroundColor: "#111",
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "900" }}>Neu buchen →</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push("/my-bookings")}
                style={{
                  borderWidth: 1,
                  borderColor: "#111",
                  backgroundColor: "#111",
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "900" }}>Meine Termine →</Text>
              </Pressable>
            )}

            {barberProfileHref ? (
              <Pressable
                onPress={() => router.push(barberProfileHref as any)}
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#111", fontWeight: "900" }}>Profil öffnen →</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}