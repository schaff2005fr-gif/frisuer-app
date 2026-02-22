"use client";

import Link from "next/link";
import CustomerNav from "./CustomerNav";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header style={{ borderBottom: "1px solid #eee", background: "#fff" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", padding: 16, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ fontWeight: 900, textDecoration: "none", color: "#111" }}>
            Friseur
          </Link>
          <CustomerNav />
        </div>
      </header>

      <main style={{ maxWidth: 1020, margin: "0 auto", padding: 16 }}>{children}</main>
    </div>
  );
}