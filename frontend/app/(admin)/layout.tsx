"use client";

import { usePathname } from "next/navigation";
import Brand from "@/components/Brand";
import AdminBottomNav from "./admin/AdminBottomNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      style={{
        padding: 16,
        paddingBottom: 90,
        maxWidth: 1020,
        margin: "0 auto",
      }}
    >
      <Brand />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div style={{ minWidth: 220 }}>
          <h1 style={{ margin: 0 }}>Admin</h1>
          <div style={{ marginTop: 6, color: "#666", wordBreak: "break-word" }}>{pathname}</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>{children}</div>

      <AdminBottomNav />
    </div>
  );
}