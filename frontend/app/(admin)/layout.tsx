"use client";

import { usePathname, useRouter } from "next/navigation";
import AdminNav from "./admin/AdminNav";
import Brand from "@/components/Brand";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
    router.refresh();
  }

  return (
    <div
      style={{
        padding: 16,
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

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-end",
            width: "100%",
            maxWidth: 560,
          }}
        >
          <div style={{ flex: "1 1 320px", minWidth: 240 }}>
            <AdminNav />
          </div>

          <button
            type="button"
            onClick={logout}
            style={{
              flex: "0 0 auto",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#111",
              fontWeight: 900,
              cursor: "pointer",
              width: "100%",
              maxWidth: 160,
            }}
          >
            Ausloggen
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
    
  );
}