import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

const REVENUECAT_API_KEYS = {
  ios: "appl_CcPMNdFraBttZptkjcIsRDdfCqU",
};

let configuredUserId: string | null = null;

export async function configurePurchases(appUserId: string) {
  if (Platform.OS !== "ios") return;
  if (!appUserId) return;
  if (configuredUserId === appUserId) return;

  Purchases.setLogLevel(LOG_LEVEL.DEBUG);

  Purchases.configure({
    apiKey: REVENUECAT_API_KEYS.ios,
    appUserID: appUserId,
  });

  configuredUserId = appUserId;
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