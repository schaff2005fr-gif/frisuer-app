"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock3, User } from "lucide-react";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminBottomNav() {
  const pathname = usePathname();

  const items = [
    { href: "/admin", icon: Home, key: "home" },
    { href: "/admin/pausen", icon: Clock3, key: "pausen" },
    { href: "/admin/einstellungen", icon: User, key: "settings" },
  ];

  return (
    <nav className="cbn_wrap" aria-label="Admin bottom navigation">
      <style jsx>{`
        .cbn_wrap {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 60;
          background: rgba(255, 255, 255, 0.96);
          border-top: 1px solid #eee;
          backdrop-filter: blur(10px);
          padding: 12px 22px;
          padding-bottom: calc(12px + env(safe-area-inset-bottom));
          box-sizing: border-box;
          display: none;
        }

        .cbn_row {
          width: 100%;
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          box-sizing: border-box;
        }

        .cbn_item {
          flex: 1 1 0px;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 58px;
          border-radius: 16px;
          color: #888;
          text-decoration: none;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }

        .cbn_active {
          color: #111;
          background: #f4f4f4;
        }

        .cbn_iconWrap {
          position: relative;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
        }

        @media (max-width: 520px) {
          .cbn_wrap {
            display: block;
          }
        }
      `}</style>

      <div className="cbn_row">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(pathname, it.href);

          return (
            <Link
              key={it.key}
              href={it.href}
              className={`cbn_item ${active ? "cbn_active" : ""}`}
            >
              <span className="cbn_iconWrap" aria-hidden="true">
                <Icon size={32} strokeWidth={2.2} />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}