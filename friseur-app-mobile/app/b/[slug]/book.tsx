import { Redirect, useLocalSearchParams } from "expo-router";

export default function PublicBarberBookShortRoute() {
  const params = useLocalSearchParams<{ slug: string; serviceKey?: string }>();

  const slug = String(params.slug ?? "");
  const serviceKey = params.serviceKey ? String(params.serviceKey) : "";

  if (!slug) {
    return <Redirect href="/(tabs)" />;
  }

  const href = serviceKey
    ? `/barber/${slug}/book?serviceKey=${encodeURIComponent(serviceKey)}`
    : `/barber/${slug}/book`;

  return <Redirect href={href as any} />;
}