import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import {
  configurePurchases,
  getCurrentOffering,
  getCustomerInfo,
  restorePurchases,
} from "../../lib/purchases";

export default function BarberSubscriptionScreen() {
  const { signOut, user, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    init(user.id);
  }, [user?.id]);

  async function init(userId: number | string) {
    try {
      setLoading(true);

      await configurePurchases(`barber-${userId}`);

      let offering = null;
      try {
        offering = await getCurrentOffering();
        console.log("CURRENT OFFERING:", offering);
      } catch (e: any) {
        console.log("GET OFFERING ERROR:", e?.message);
        console.log("GET OFFERING FULL:", e);
      }

      const pkg =
        offering?.monthly ||
        offering?.availablePackages?.find((p: PurchasesPackage) => p.identifier === "$rc_monthly") ||
        null;

      setMonthlyPackage(pkg ?? null);

      try {
        const info = await getCustomerInfo();
        console.log("CUSTOMER INFO:", info);

        const hasPro = !!info.entitlements.active["pro"];
        if (hasPro) {
          router.replace("/(barber-tabs)");
          return;
        }
      } catch (e: any) {
        console.log("GET CUSTOMER INFO ERROR:", e?.message);
        console.log("GET CUSTOMER INFO FULL:", e);
      }
    } catch (e: any) {
      console.log("SUBSCRIPTION INIT ERROR:", e?.message);
      console.log("SUBSCRIPTION INIT FULL:", e);
    } finally {
      setLoading(false);
    }
  }

  async function syncSubscriptionToBackend() {
  if (!token) return;

  await api.post(
    "/admin/subscription/sync",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

  async function handleSubscribe() {
    try {
      if (!monthlyPackage) {
        Alert.alert("Info", "Das Abo ist aktuell noch nicht verfügbar.");
        return;
      }

      setBuying(true);

      const result = await Purchases.purchasePackage(monthlyPackage);
      const hasPro = !!result.customerInfo.entitlements.active["pro"];

      if (!hasPro) {
        Alert.alert("Fehler", "Abo wurde nicht aktiviert.");
        return;
      }

      await syncSubscriptionToBackend();

      Alert.alert("Erfolg", "Dein Pro-Abo ist jetzt aktiv.");
      router.replace("/(barber-tabs)");
    } catch (e: any) {
      if (e?.userCancelled) return;

      console.log("PURCHASE ERROR:", e?.message);
      console.log("PURCHASE ERROR FULL:", e);

      Alert.alert("Fehler", e?.message || "Kauf fehlgeschlagen.");
    } finally {
      setBuying(false);
    }
  }

  async function handleRestore() {
    try {
      setRestoring(true);

      const info = await restorePurchases();
      const hasPro = !!info.entitlements.active["pro"];

      if (!hasPro) {
        Alert.alert("Info", "Kein aktives Abo gefunden.");
        return;
      }

      Alert.alert("Erfolg", "Käufe wurden erfolgreich wiederhergestellt.");
      router.replace("/(barber-tabs)");
    } catch (e: any) {
      console.log("RESTORE ERROR:", e?.message);
      console.log("RESTORE ERROR FULL:", e);

      Alert.alert("Fehler", e?.message || "Wiederherstellen fehlgeschlagen.");
    } finally {
      setRestoring(false);
    }
  }

  async function handleBackToLogin() {
    await signOut();
    router.replace("/login");
  }

  async function handleOpenPrivacy() {
  router.push("/datenschutz");
}

async function handleOpenTerms() {
  const url = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Fehler", "Der Link zu den Nutzungsbedingungen konnte nicht geöffnet werden.");
      return;
    }

    await Linking.openURL(url);
  } catch {
    Alert.alert("Fehler", "Der Link zu den Nutzungsbedingungen konnte nicht geöffnet werden.");
  }
}

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f6f7" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f6f7" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <View style={{ marginBottom: 18 }}>
          <Text
            style={{
              fontSize: 34,
              lineHeight: 38,
              fontWeight: "900",
              color: "#111",
            }}
          >
            Salora Pro
          </Text>

          <Text
            style={{
              marginTop: 10,
              fontSize: 16,
              lineHeight: 24,
              color: "#666",
            }}
          >
            Schalte den Barber-Bereich frei und verwalte deine Termine direkt in der App.
          </Text>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#e8e8eb",
            borderRadius: 28,
            backgroundColor: "#111",
            padding: 22,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 15,
              fontWeight: "800",
            }}
          >
            PRO ABO
          </Text>

          <Text
            style={{
              marginTop: 10,
              color: "#fff",
              fontSize: 34,
              lineHeight: 38,
              fontWeight: "900",
            }}
          >
            39,99 €
          </Text>

          <Text
            style={{
              marginTop: 4,
              color: "#d7d7d9",
              fontSize: 15,
              lineHeight: 20,
              fontWeight: "700",
            }}
          >
            pro Monat
          </Text>

          <Text
            style={{
              marginTop: 14,
              color: "#d7d7d9",
              fontSize: 14,
              lineHeight: 22,
            }}
          >
            Monatlich kündbar. Die Abrechnung erfolgt über deinen Apple Account.
          </Text>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#e8e8eb",
            borderRadius: 24,
            backgroundColor: "#fff",
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              lineHeight: 28,
              fontWeight: "900",
              color: "#111",
            }}
          >
            Was ist enthalten?
          </Text>

          <View style={{ marginTop: 16, gap: 12 }}>
            <Benefit text="Barber-Dashboard mit Tages- und Wochenansicht" />
            <Benefit text="Termine verwalten und Status aktualisieren" />
            <Benefit text="Pausen und Blockzeiten festlegen" />
            <Benefit text="Services und öffentliches Profil bearbeiten" />
            <Benefit text="Benachrichtigungen und Kundenbuchungen mobil im Blick" />
          </View>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#e8e8eb",
            borderRadius: 24,
            backgroundColor: "#fff",
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              lineHeight: 26,
              fontWeight: "900",
              color: "#111",
            }}
          >
            Barber-Bereich freischalten
          </Text>

          <Text
            style={{
              marginTop: 10,
              fontSize: 15,
              lineHeight: 22,
              color: "#666",
            }}
          >
            Aktuell ist für deinen Account kein aktives Pro-Abo hinterlegt.
          </Text>

          <Pressable
            onPress={handleSubscribe}
            disabled={buying || !monthlyPackage}
            style={{
              marginTop: 18,
              minHeight: 56,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#111",
              backgroundColor: "#111",
              alignItems: "center",
              justifyContent: "center",
              opacity: buying || !monthlyPackage ? 0.7 : 1,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "900",
                fontSize: 15,
              }}
            >
              {buying
                ? "Wird geladen..."
                : monthlyPackage
                ? "Monatlich abonnieren"
                : "Abo aktuell nicht verfügbar"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            style={{
              marginTop: 10,
              minHeight: 54,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#ddd",
              backgroundColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
              opacity: restoring ? 0.7 : 1,
            }}
          >
            <Text
              style={{
                color: "#111",
                fontWeight: "900",
                fontSize: 15,
              }}
            >
              {restoring ? "Wird wiederhergestellt..." : "Käufe wiederherstellen"}
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#ececef",
            borderRadius: 20,
            backgroundColor: "#fbfbfc",
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: "#444",
              fontSize: 13,
              lineHeight: 21,
            }}
          >
            Das Abo verlängert sich automatisch monatlich, wenn es nicht mindestens 24 Stunden vor Ablauf des aktuellen Zeitraums gekündigt wird. Die Verwaltung und Kündigung erfolgt in deinen Apple Account Einstellungen.
          </Text>
        </View>

        <View
  style={{
    borderWidth: 1,
    borderColor: "#ececef",
    borderRadius: 20,
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 16,
  }}
>
  <Text
    style={{
      color: "#444",
      fontSize: 13,
      lineHeight: 21,
      marginBottom: 12,
    }}
  >
    Mit dem Abschluss des Abos gelten unsere Datenschutzinformationen und die Nutzungsbedingungen.
  </Text>

  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
    <Pressable
      onPress={handleOpenPrivacy}
      style={{
        minHeight: 44,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#111",
          fontWeight: "900",
          fontSize: 13,
        }}
      >
        Datenschutz
      </Text>
    </Pressable>

    <Pressable
      onPress={handleOpenTerms}
      style={{
        minHeight: 44,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#111",
          fontWeight: "900",
          fontSize: 13,
        }}
      >
        Nutzungsbedingungen (EULA)
      </Text>
    </Pressable>
  </View>
</View>

        <Pressable
          onPress={handleBackToLogin}
          style={{
            minHeight: 54,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#ddd",
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#111",
              fontWeight: "900",
              fontSize: 15,
            }}
          >
            Zurück zum Login
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          backgroundColor: "#111",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 12,
            fontWeight: "900",
          }}
        >
          ✓
        </Text>
      </View>

      <Text
        style={{
          flex: 1,
          color: "#111",
          fontSize: 15,
          lineHeight: 22,
          fontWeight: "700",
        }}
      >
        {text}
      </Text>
    </View>
  );
}