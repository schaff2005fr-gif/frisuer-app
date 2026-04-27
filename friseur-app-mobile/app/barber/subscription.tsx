import React, { useEffect, useMemo, useState } from "react";
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

type PlanKey = "basic" | "pro";

const BASIC_PRODUCT_IDS = ["salora.basic.monthly", "salora_basic_monthly"];
const PRO_PRODUCT_IDS = ["salora.pro.monthly", "salora_pro_monthly"];

export default function BarberSubscriptionScreen() {
  const { signOut, user, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [buyingPlan, setBuyingPlan] = useState<PlanKey | null>(null);
  const [restoring, setRestoring] = useState(false);

  const [basicPackage, setBasicPackage] = useState<PurchasesPackage | null>(null);
  const [proPackage, setProPackage] = useState<PurchasesPackage | null>(null);

  const isBuying = buyingPlan !== null;

  useEffect(() => {
  const appUserId = (user as any)?.barber?.revenueCatAppUserId;

  if (!appUserId) {
    setLoading(false);
    return;
  }

  init(appUserId);
}, [(user as any)?.barber?.revenueCatAppUserId]);

async function init(appUserId: string) {
  try {
    setLoading(true);

    await configurePurchases(appUserId);
    console.log("RC APP USER ID USED:", appUserId);

    const info = await getCustomerInfo();
    console.log("RC CUSTOMER INFO FULL:", info);
    console.log("RC ACTIVE ENTITLEMENTS:", info.entitlements.active);
    console.log("RC ORIGINAL APP USER ID:", info.originalAppUserId);

    let offering = null;

    try {
      offering = await getCurrentOffering();
      console.log("CURRENT OFFERING:", offering);
    } catch (e: any) {
      console.log("GET OFFERING ERROR:", e?.message);
      console.log("GET OFFERING FULL:", e);
    }

    const packages = offering?.availablePackages ?? [];

    const basicPkg =
      packages.find((p: PurchasesPackage) =>
        BASIC_PRODUCT_IDS.includes(p.product.identifier)
      ) ?? null;

    const proPkg =
      packages.find((p: PurchasesPackage) =>
        PRO_PRODUCT_IDS.includes(p.product.identifier)
      ) ??
      offering?.monthly ??
      null;

    setBasicPackage(basicPkg);
    setProPackage(proPkg);

    const hasPro = !!info.entitlements.active["pro"];
    const hasBasic = !!info.entitlements.active["basic"];

    if (hasPro || hasBasic) {
      await syncSubscriptionToBackend();
      router.replace("/(barber-tabs)");
      return;
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

  async function handleSubscribe(plan: PlanKey) {
  try {
    const selectedPackage = plan === "pro" ? proPackage : basicPackage;

    if (!selectedPackage) {
      Alert.alert(
        "Info",
        plan === "basic"
          ? "Salora Basic ist aktuell noch nicht verfügbar."
          : "Salora Pro ist aktuell noch nicht verfügbar."
      );
      return;
    }

    setBuyingPlan(plan);

    const result = await Purchases.purchasePackage(selectedPackage);

    console.log("PURCHASE CUSTOMER INFO:", result.customerInfo);
    console.log("PURCHASE ACTIVE ENTITLEMENTS:", result.customerInfo.entitlements.active);
    console.log("PURCHASE ORIGINAL APP USER ID:", result.customerInfo.originalAppUserId);

    const hasPro = !!result.customerInfo.entitlements.active["pro"];
    const hasBasic = !!result.customerInfo.entitlements.active["basic"];

    if (!hasPro && !hasBasic) {
      Alert.alert("Fehler", "Abo wurde nicht aktiviert.");
      return;
    }

    await syncSubscriptionToBackend();

    Alert.alert(
      "Erfolg",
      hasPro ? "Dein Pro-Abo ist jetzt aktiv." : "Dein Basic-Abo ist jetzt aktiv."
    );

    router.replace("/(barber-tabs)");
  } catch (e: any) {
    if (e?.userCancelled) return;

    console.log("PURCHASE ERROR:", e?.message);
    console.log("PURCHASE ERROR FULL:", e);

    Alert.alert("Fehler", e?.message || "Kauf fehlgeschlagen.");
  } finally {
    setBuyingPlan(null);
  }
}

  async function handleRestore() {
    try {
      setRestoring(true);

      const info = await restorePurchases();

      const hasPro = !!info.entitlements.active["pro"];
      const hasBasic = !!info.entitlements.active["basic"];

      if (!hasPro && !hasBasic) {
        Alert.alert("Info", "Kein aktives Abo gefunden.");
        return;
      }

      await syncSubscriptionToBackend();

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

  function handleOpenPrivacy() {
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
          <Text style={{ fontSize: 34, lineHeight: 38, fontWeight: "900", color: "#111" }}>
            Wähle dein Salora Abo
          </Text>

          <Text style={{ marginTop: 10, fontSize: 16, lineHeight: 24, color: "#666" }}>
            Starte mit einem eigenen Buchungslink oder schalte mit Pro alle Funktionen frei.
          </Text>
        </View>

        <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  pagingEnabled
  snapToAlignment="center"
  decelerationRate="fast"
  contentContainerStyle={{
    gap: 14,
    paddingRight: 20,
    marginBottom: 16,
  }}
>
  <View style={{ width: 330 }}>
    <PlanCard
      label="BASIC"
      title="Salora Basic"
      price="29,99 €"
      subtitle="pro Monat"
      description="Für Friseure, die nur ihren eigenen Buchungslink nutzen möchten."
      benefits={[
  "Eigener Buchungslink für deine Kunden",
  "Barber-Dashboard mit Tages- und Wochenansicht",
  "Termine, Services, Pausen und Profil verwalten",
  "cross:Nicht öffentlich in der Salora-Kundensuche sichtbar",
  "cross:Kein intelligentes Zeitfenster",
]}
      buttonText={
        buyingPlan === "basic"
          ? "Wird geladen..."
          : basicPackage
          ? "Basic abonnieren"
          : "Basic aktuell nicht verfügbar"
      }
      disabled={isBuying || !basicPackage}
      onPress={() => handleSubscribe("basic")}
      dark={false}
    />
  </View>

  <View style={{ width: 330 }}>
    <PlanCard
      label="PRO"
      title="Salora Pro"
      price="49,99 €"
      subtitle="pro Monat"
      description="Für Friseure, die zusätzlich neue Kunden über Salora erreichen möchten."
      benefits={[
        "Alles aus Basic enthalten",
        "Öffentliche Sichtbarkeit in der Salora-Kundensuche",
        "Kunden können dich direkt in der App finden",
        "Intelligente Zeitfenster automatisch erweitern",
        "Maximale Funktionen für mehr Buchungen",
      ]}
      buttonText={
        buyingPlan === "pro"
          ? "Wird geladen..."
          : proPackage
          ? "Pro abonnieren"
          : "Pro aktuell nicht verfügbar"
      }
      disabled={isBuying || !proPackage}
      onPress={() => handleSubscribe("pro")}
      dark
    />
  </View>
</ScrollView>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#e8e8eb",
            borderRadius: 24,
            backgroundColor: "#fff",
            padding: 20,
            marginBottom: 0,
          }}
        >
          <Text style={{ fontSize: 22, lineHeight: 26, fontWeight: "900", color: "#111" }}>
            Käufe wiederherstellen
          </Text>

          <Text style={{ marginTop: 10, fontSize: 15, lineHeight: 22, color: "#666" }}>
            Falls du bereits ein aktives Abo hast, kannst du es hier wiederherstellen.
          </Text>

          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            style={{
              marginTop: 18,
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
            <Text style={{ color: "#111", fontWeight: "900", fontSize: 15 }}>
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
          <Text style={{ color: "#444", fontSize: 13, lineHeight: 21 }}>
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
          <Text style={{ color: "#444", fontSize: 13, lineHeight: 21, marginBottom: 12 }}>
            Mit dem Abschluss des Abos gelten unsere Datenschutzinformationen und die Nutzungsbedingungen.
          </Text>

          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <SmallButton text="Datenschutz" onPress={handleOpenPrivacy} />
            <SmallButton text="Nutzungsbedingungen (EULA)" onPress={handleOpenTerms} />
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
          <Text style={{ color: "#111", fontWeight: "900", fontSize: 15 }}>
            Zurück zum Login
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  label,
  title,
  price,
  subtitle,
  description,
  benefits,
  buttonText,
  disabled,
  onPress,
  dark,
}: {
  label: string;
  title: string;
  price: string;
  subtitle: string;
  description: string;
  benefits: string[];
  buttonText: string;
  disabled: boolean;
  onPress: () => void;
  dark: boolean;
}) {
  const bg = dark ? "#111" : "#fff";
  const fg = dark ? "#fff" : "#111";
  const muted = dark ? "#d7d7d9" : "#666";
  const border = dark ? "#111" : "#e8e8eb";

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: border,
        borderRadius: 28,
        backgroundColor: bg,
        padding: 22,
        marginBottom: 16,
      }}
    >
      <Text style={{ color: fg, fontSize: 14, fontWeight: "900" }}>{label}</Text>

      <Text style={{ marginTop: 10, color: fg, fontSize: 24, lineHeight: 28, fontWeight: "900" }}>
        {title}
      </Text>

      <Text style={{ marginTop: 10, color: fg, fontSize: 34, lineHeight: 38, fontWeight: "900" }}>
        {price}
      </Text>

      <Text style={{ marginTop: 4, color: muted, fontSize: 15, lineHeight: 20, fontWeight: "700" }}>
        {subtitle}
      </Text>

      <Text style={{ marginTop: 14, color: muted, fontSize: 14, lineHeight: 22 }}>
        {description}
      </Text>

      <View style={{ marginTop: 18, gap: 12 }}>
        {benefits.map((b) => (
          <Benefit key={b} text={b} dark={dark} />
        ))}
      </View>

      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          marginTop: 20,
          minHeight: 56,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: dark ? "#fff" : "#111",
          backgroundColor: dark ? "#fff" : "#111",
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Text
          style={{
            color: dark ? "#111" : "#fff",
            fontWeight: "900",
            fontSize: 15,
          }}
        >
          {buttonText}
        </Text>
      </Pressable>
    </View>
  );
}

function Benefit({ text, dark }: { text: string; dark: boolean }) {
  const isNegative = text.startsWith("cross:");
  const cleanText = isNegative ? text.replace("cross:", "") : text;

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          backgroundColor: isNegative ? "#f3f3f4" : dark ? "#fff" : "#111",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        <Text
          style={{
            color: isNegative ? "#777" : dark ? "#111" : "#fff",
            fontSize: 12,
            fontWeight: "900",
          }}
        >
          {isNegative ? "×" : "✓"}
        </Text>
      </View>

      <Text
        style={{
          flex: 1,
          color: isNegative ? "#777" : dark ? "#fff" : "#111",
          fontSize: 15,
          lineHeight: 22,
          fontWeight: "700",
        }}
      >
        {cleanText}
      </Text>
    </View>
  );
}

function SmallButton({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
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
      <Text style={{ color: "#111", fontWeight: "900", fontSize: 13 }}>{text}</Text>
    </Pressable>
  );
}