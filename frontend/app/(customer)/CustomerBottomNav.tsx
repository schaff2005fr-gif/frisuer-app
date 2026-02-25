"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Home, Bell, User } from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE = "https://frisuer-app.onrender.com";

function getToken() {
  return localStorage.getItem("token") || "";
}

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
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
    // reload count when route changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/my-bookings", label: "Termine", icon: Calendar },
    { href: "/notifications", label: "News", icon: Bell, badge: unread },
    { href: "/settings", label: "Profil", icon: User },
  ];

  return (
    <nav
      className="bottom"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Customer bottom navigation"
    >
      <style jsx>{`
        .bottom {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 60;
          background: rgba(255, 255, 255, 0.96);
          border-top: 1px solid #eee;
          backdrop-filter: blur(10px);
          padding: 8px 10px;
          padding-bottom: calc(8px + env(safe-area-inset-bottom));
          display: none;
        }

        .row {
          max-width: 520px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }

        .item {
          flex: 1;
          text-decoration: none;
          color: #888;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 0;
          border-radius: 14px;
          position: relative;
          transition: all 0.15s ease;
        }

        .active {
          color: #111;
          background: #f6f6f6;
        }

        .badge {
          position: absolute;
          top: 7px;
          right: 18px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
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

        .srOnly {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        /* ✅ Mobile only */
        @media (max-width: 520px) {
          .bottom {
            display: block;
          }
        }
      `}</style>

      <div className="row">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(pathname, it.href);

          return (
            <Link key={it.href} href={it.href} className={cx("item", active && "active")}>
              <Icon size={22} />
              {it.badge != null && it.badge > 0 ? (
                <span className="badge" aria-label={`${it.badge} ungelesen`}>
                  {it.badge > 99 ? "99+" : it.badge}
                </span>
              ) : null}
              <span className="srOnly">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}