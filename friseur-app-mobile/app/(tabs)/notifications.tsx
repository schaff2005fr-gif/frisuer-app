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
import { refreshCustomerUnreadBadge } from "./_layout";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type NotificationItem = {
  id: number;
  type: "BOOKING_CANCELLED" | "BOOKING_STATUS_CHANGED";
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
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

function truncate(s: string, n = 140) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= n) return t;
  return t.slice(0, n).trimEnd() + "…";
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

export default function NotificationsScreen() {
  const { token, user } = useAuth();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAll, setBusyAll] = useState(false);
  const [count, setCount] = useState<number>(0);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const unread = useMemo(() => items.filter((n) => !n.isRead), [items]);

  useEffect(() => {
    if (!token || !user) {
      router.replace("/");
      return;
    }

    if (user.role !== "CUSTOMER") {
      router.replace("/(barber-tabs)");
      return;
    }

    loadNotifications();
  }, [token, user]);

  async function loadUnreadCount() {
    try {
      if (!token) {
        setCount(0);
        return;
      }

      const res = await api.get("/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCount(Number(res.data?.count ?? 0));
    } catch {
      setCount(0);
    }
  }

  async function loadNotifications(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setMessage("");

      if (!token) {
        setError("Nicht eingeloggt. Bitte zuerst einloggen.");
        setItems([]);
        setCount(0);
        return;
      }

      const res = await api.get("/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = Array.isArray(res.data?.notifications) ? res.data.notifications : [];
setItems(list);
await loadUnreadCount();
    } catch (e: any) {
      console.log("LOAD NOTIFICATIONS ERROR:", e?.message);
      console.log("LOAD NOTIFICATIONS RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || "Fehler beim Laden.");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function markAllRead() {
    try {
      setBusyAll(true);
      setError("");
      setMessage("");

      if (!token) {
        setError("Nicht eingeloggt.");
        return;
      }

      const res = await api.post(
        "/notifications/read-all",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.data?.ok) {
        throw new Error("Konnte nicht alle als gelesen markieren.");
      }

      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setMessage("✅ Alle Benachrichtigungen als gelesen markiert.");
      await loadUnreadCount();
      await refreshCustomerUnreadBadge?.();
    } catch (e: any) {
      console.log("MARK ALL READ ERROR:", e?.message);
      console.log("MARK ALL READ RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || "Fehler.");
    } finally {
      setBusyAll(false);
    }
  }


  async function openNotification(n: NotificationItem) {
    try {
      if (!token) {
        router.replace("/");
        return;
      }

      if (!n.isRead) {
        await api.patch(
          `/notifications/${n.id}/read`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
        setCount((c) => Math.max(0, c - 1));
        await refreshCustomerUnreadBadge?.();
      }
    } catch {
      // ignore
    } finally {
      router.push(`/notifications/${n.id}` as any);
    }
  }

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
          <RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} />
        }
      >
        <View
          style={{
            marginBottom: 14,
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 30, fontWeight: "900", color: "#111" }}>Nachrichten</Text>
            <Text style={{ color: "#666", marginTop: 4, lineHeight: 20 }}>
              Wichtige Infos zu deinen Terminen.
              {unread.length > 0 ? (
                <Text style={{ fontWeight: "900" }}> ({unread.length} neu)</Text>
              ) : null}
            </Text>
          </View>

          <View style={{ gap: 10, width: "100%" }}>
            <Pressable
              onPress={() => loadNotifications()}
              style={{
                borderWidth: 1,
                borderColor: "#eee",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: "#fff",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#111", fontWeight: "900" }}>Neu laden</Text>
            </Pressable>

            <Pressable
              onPress={markAllRead}
              disabled={busyAll || items.length === 0 || count === 0}
              style={{
                borderWidth: 1,
                borderColor: "#111",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: "#111",
                alignItems: "center",
                opacity: busyAll || items.length === 0 || count === 0 ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>
                {busyAll ? "..." : `Alle gelesen (${count})`}
              </Text>
            </Pressable>
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

        {items.length === 0 ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#eee",
              borderRadius: 14,
              padding: 14,
              backgroundColor: "#fff",
            }}
          >
            <Text style={{ color: "#666" }}>Keine Nachrichten vorhanden.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {items.map((n) => {
              if (n.type === "BOOKING_STATUS_CHANGED") return null;

              const details = extractDetailsFromBody(n.body);
              const hasSummary = !!(details.friseur || details.service || details.datum || details.timeStr);

              const cleanedBody = hasSummary ? stripDetailsFromBody(n.body) : n.body;
              const showBody = truncate(cleanedBody, 180);

              return (
                <View
                  key={n.id}
                  style={{
                    borderWidth: 1,
                    borderColor: !n.isRead ? "#e7e7ff" : "#eee",
                    borderRadius: 14,
                    padding: 14,
                    backgroundColor: !n.isRead ? "#f7f7ff" : "#fff",
                    position: "relative",
                  }}
                >
                  {!n.isRead ? (
                    <View
                      style={{
                        position: "absolute",
                        left: 10,
                        top: 14,
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: "#111",
                      }}
                    />
                  ) : null}

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "baseline",
                      paddingLeft: 14,
                    }}
                  >
                    <Text style={{ fontWeight: "900", fontSize: 14, color: "#111", flex: 1 }}>
                      {n.title}
                    </Text>

                    <Text style={{ fontSize: 12, color: "#666" }}>
                      {formatDateTimeBerlinShort(n.createdAt)}
                    </Text>
                  </View>

                  {hasSummary ? (
                    <View
                      style={{
                        marginTop: 10,
                        borderWidth: 1,
                        borderColor: "#eee",
                        borderRadius: 12,
                        padding: 12,
                        backgroundColor: "#fff",
                        gap: 4,
                        marginLeft: 14,
                      }}
                    >
                      {details.friseur ? (
                        <Text style={{ color: "#222", fontSize: 13 }}>
                          Friseur: <Text style={{ fontWeight: "900" }}>{details.friseur}</Text>
                        </Text>
                      ) : null}

                      {details.service ? (
                        <Text style={{ color: "#222", fontSize: 13 }}>
                          Service: <Text style={{ fontWeight: "900" }}>{details.service}</Text>
                        </Text>
                      ) : null}

                      {details.datum ? (
                        <Text style={{ color: "#222", fontSize: 13 }}>
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

                  {showBody && showBody !== "Dein Termin wurde storniert." ? (
                    <Text
                      style={{
                        marginTop: 10,
                        color: "#444",
                        lineHeight: 22,
                        paddingLeft: 14,
                      }}
                    >
                      {showBody}
                    </Text>
                  ) : null}

                  <View style={{ marginTop: 12, paddingLeft: 14 }}>
                    <Pressable
                      onPress={() => openNotification(n)}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#ddd",
                        backgroundColor: "#fff",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#111", fontWeight: "900" }}>Öffnen →</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}