import { Redirect, useLocalSearchParams } from "expo-router";

export default function PublicBarberShortRoute() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = String(params.slug ?? "");

  if (!slug) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href={`/barber/${slug}` as any} />;
}