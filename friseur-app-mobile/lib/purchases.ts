import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

// Production-Key als Fallback.
// In deiner lokalen Staging-Umgebung wird dieser durch
// EXPO_PUBLIC_REVENUECAT_API_KEY aus .env.local überschrieben.
const PRODUCTION_REVENUECAT_API_KEYS = {
  ios: "appl_CcPMNdFraBttZptkjcIsRDdfCqU",
};

const REVENUECAT_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
  PRODUCTION_REVENUECAT_API_KEYS.ios;

let purchasesConfigured = false;
let configuredUserId: string | null = null;

export async function configurePurchases(appUserId: string) {
  if (Platform.OS !== "ios") return;
  if (!appUserId) return;

  Purchases.setLogLevel(LOG_LEVEL.DEBUG);

  // RevenueCat SDK nur einmal initial konfigurieren.
  if (!purchasesConfigured) {
    Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: appUserId,
    });

    purchasesConfigured = true;
    configuredUserId = appUserId;
    return;
  }

  // Falls sich innerhalb derselben App-Sitzung ein anderer Friseur anmeldet,
  // RevenueCat-Benutzer wechseln statt Purchases erneut zu konfigurieren.
  if (configuredUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    configuredUserId = appUserId;
  }
}

export async function getCurrentOffering() {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function getCustomerInfo() {
  return Purchases.getCustomerInfo();
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}