"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Home, Bell, User } from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE = "https://frisuer-app.onrender.com";

function getToken() {
  return localStorage.getItem("token") || "";
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function CustomerBottomNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState<number>(0);

  async function loadUnread() {
    try {
      const token = getToken();
      if (!token) return setUnread(0);

      const res = await fetch(`${API_BASE}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) setUnread(Number(data?.count ?? 0));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const items = [
    { href: "/", icon: Home },
    { href: "/my-bookings", icon: Calendar },
    { href: "/notifications", icon: Bell, badge: unread },
    { href: "/settings", icon: User },
  ];

  return (
    <nav className="cbn_wrap" aria-label="Customer bottom navigation">
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

          /* ✅ exakt gleicher Rand links/rechts */
          padding: 12px 22px;
          padding-bottom: calc(12px + env(safe-area-inset-bottom));

          box-sizing: border-box;
          display: none;
        }

        /* ✅ GARANTIERT nebeneinander */
        .cbn_row {
          width: 100%;
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 10px !important;
          box-sizing: border-box;
        }

        .cbn_item {
          flex: 1 1 0px !important;
          min-width: 0 !important;

          display: flex !important;
          align-items: center !important;
          justify-content: center !important;

          height: 58px !important;
          border-radius: 16px;

          color: #888;
          text-decoration: none;

          position: relative;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }

        .cbn_active {
          color: #111;
          background: #f4f4f4;
        }

        .cbn_badge {
          position: absolute;
          top: 7px;
          right: 16px;

          min-width: 18px;
          height: 18px;
          padding: 0 6px;

          border-radius: 999px;
          background: #111;
          color: #fff;

          font-size: 11px;
          font-weight: 900;

          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
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
              key={it.href}
              href={it.href}
              className={`cbn_item ${active ? "cbn_active" : ""}`}
            >
              <Icon size={32} strokeWidth={2.2} />
              {it.badge != null && it.badge > 0 ? (
                <span className="cbn_badge">{it.badge > 99 ? "99+" : it.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}