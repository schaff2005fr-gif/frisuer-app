"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import AdminBottomNav from "./admin/AdminBottomNav";
import AdminNav from "./admin/AdminNav";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://frisuer-app-1.onrender.com";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isDashboard = pathname === "/admin";

  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function run() {
      const token = getToken();
      const user = getUser();

      if (!token || !user) {
        router.replace("/login");
        return;
      }

      if (user.role !== "BARBER") {
        router.replace("/");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/admin/subscription-status`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          router.replace("/barber/subscription");
          return;
        }

        const isPro = !!data?.subscription?.isPro;

        if (!isPro) {
          router.replace("/barber/subscription");
          return;
        }

        setAllowed(true);
      } catch {
        router.replace("/barber/subscription");
      } finally {
        setChecking(false);
      }
    }

    run();
  }, [router]);

  if (checking) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontWeight: 800,
        }}
      >
        Lade Admin...
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div
      style={{
        padding: 16,
        paddingBottom: 90,
        maxWidth: 1180,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          marginBottom: isDashboard ? 12 : 14,
          display: "grid",
          gap: 12,
        }}
      >
        <Brand href="/admin" />
        <div className="admin-top-desktop">
          <AdminNav />
        </div>
      </div>

      <style jsx>{`
        .admin-top-desktop {
          display: block;
        }

        @media (max-width: 520px) {
          .admin-top-desktop {
            display: none;
          }
        }
      `}</style>

      <div>{children}</div>

      <AdminBottomNav />
    </div>
  );
}