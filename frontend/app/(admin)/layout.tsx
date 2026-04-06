"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Brand from "@/components/Brand";
import AdminBottomNav from "./admin/AdminBottomNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/admin";

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
          marginBottom: isDashboard ? 8 : 14,
        }}
      >
        <Link href="/admin" style={{ textDecoration: "none", color: "inherit", display: "inline-block" }}>
          <Brand />
        </Link>
      </div>

      {isDashboard ? null : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#111" }}>Admin</div>
          <div style={{ marginTop: 4, color: "#666", wordBreak: "break-word" }}>{pathname}</div>
        </div>
      )}

      <div>{children}</div>

      <AdminBottomNav />
    </div>
  );
}