"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pausen", label: "Pausen" },
  { href: "/admin/einstellungen", label: "Einstellungen" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
        width: "100%",
      }}
    >
      {ITEMS.map((it) => {
        const active = isActive(pathname, it.href);

        return (
          <Link
            key={it.href}
            href={it.href}
            style={{
              flex: "1 1 140px",
              textAlign: "center",
              padding: "10px 12px",
              borderRadius: 10,
              border: active ? "1px solid #111" : "1px solid #ddd",
              background: active ? "#111" : "#fff",
              color: active ? "#fff" : "#111",
              fontWeight: 900,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}