"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

export default function AppFooter() {
  const pathname = usePathname();

  const showFooter =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/register/customer" ||
    pathname === "/register/barber";

  if (!showFooter) return null;

  return <Footer />;
}