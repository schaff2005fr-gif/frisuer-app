"use client";

import { usePathname, useRouter } from "next/navigation";
import AdminNav from "./admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
    router.refresh();
  }

  // Optional: Guard hier zentral (statt in jeder Admin-Seite)
  // Du kannst ihn später aus den Pages entfernen, wenn hier aktiv.
  // useEffect(() => { ... }, [pathname]);

  return (
    <div style={{ padding: 20, maxWidth: 1020, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin</h1>
          <div style={{ marginTop: 6, color: "#666" }}>{pathname}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <AdminNav />
          <button
            type="button"
            onClick={logout}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#111",
              fontWeight: 900,
              cursor: "pointer",
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