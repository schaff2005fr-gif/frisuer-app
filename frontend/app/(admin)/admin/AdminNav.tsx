"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock3, Settings } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
};

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: CalendarDays },
  { href: "/admin/pausen", label: "Pausen", icon: Clock3 },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      <style jsx>{`
        .adminNavDesktop {
          display: none;
          width: 100%;
        }

        .adminNavRow {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          flex-wrap: wrap;
        }

        .adminNavItem {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          padding: 0 16px;
          border-radius: 14px;
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
          text-decoration: none;
          font-weight: 900;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .adminNavItem:hover {
          border-color: #cfcfcf;
          background: #fafafa;
        }

        .adminNavItemActive {
          border-color: #111;
          background: #111;
          color: #fff;
        }

        @media (min-width: 769px) {
          .adminNavDesktop {
            display: block;
          }
        }
      `}</style>

      <nav className="adminNavDesktop" aria-label="Admin navigation">
        <div className="adminNavRow">
          {ITEMS.map((it) => {
            const active = isActive(pathname, it.href);
            const Icon = it.icon;

            return (
              <Link
                key={it.href}
                href={it.href}
                className={`adminNavItem ${active ? "adminNavItemActive" : ""}`}
              >
                <Icon size={18} strokeWidth={2.3} />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}