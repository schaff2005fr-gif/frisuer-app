"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function pill(active: boolean) {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: active ? "1px solid #111" : "1px solid #ddd",
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#111",
    fontWeight: 900,
    textDecoration: "none",
    fontSize: 12,
  } as const;
}

export default function CustomerNav() {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Link href="/" style={pill(pathname === "/")}>Home</Link>
      <Link href="/book" style={pill(pathname === "/book")}>Buchen</Link>
      <Link href="/my-bookings" style={pill(pathname === "/my-bookings")}>Meine Termine</Link>
      <Link href="/notifications" style={pill(pathname === "/notifications")}>Nachrichten</Link>
      <Link href="/settings" style={pill(pathname === "/settings")}>Einstellungen</Link>

      <button
        type="button"
        onClick={logout}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #ddd",
          background: "#fff",
          fontWeight: 900,
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        Ausloggen
      </button>
    </div>
  );
}