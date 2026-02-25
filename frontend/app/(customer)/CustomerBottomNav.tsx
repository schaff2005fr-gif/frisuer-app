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
    <nav
      className="bottomNav"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Customer bottom navigation"
    >
      <style jsx>{`
        .bottomNav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid #eee;
  backdrop-filter: blur(10px);

  padding: 12px 24px;   /* 🔥 exakt gleich links & rechts */

  display: none;
  box-sizing: border-box;
}

        .row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

        .item {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 56px;
          color: #888;
          position: relative;
          transition: all 0.15s ease;
        }

        .itemActive {
          color: #111;
        }

        .badge {
          position: absolute;
          top: 6px;
          right: 18px;
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
          .bottomNav {
            display: block;
          }
        }
      `}</style>

      <div className="row">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(pathname, it.href);

          return (
            <Link
              key={it.href}
              href={it.href}
              className={`item ${active ? "itemActive" : ""}`}
            >
              <Icon size={30} strokeWidth={2.2} />

              {it.badge != null && it.badge > 0 ? (
                <span className="badge">
                  {it.badge > 99 ? "99+" : it.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}