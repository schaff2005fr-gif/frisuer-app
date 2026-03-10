"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
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

  const links = [
    { href: "/", label: "Home" },
    { href: "/my-bookings", label: "Meine Termine" },
    { href: "/notifications", label: "Nachrichten" },
    { href: "/settings", label: "Einstellungen" },
  ];

  return (
    <div className="topbar">
      <style jsx>{`
        .topbar {
          display: none;
        }

        /* ✅ Desktop/Tablet Topbar */
        @media (min-width: 521px) {
          .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;

            padding: 12px 14px;
            border: 1px solid #eee;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
          }
        }

        .left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 170px;
        }

        .brandDot {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          background: #111;
          color: #fff;
          display: grid;
          place-items: center;
          font-weight: 1000;
          letter-spacing: -0.6px;
        }

        .brandText {
          font-weight: 1000;
          letter-spacing: -0.3px;
          line-height: 1.1;
        }

        .brandSub {
          font-size: 12px;
          color: #666;
          font-weight: 800;
          margin-top: 2px;
        }

        .center {
          flex: 1;
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
        }

        .navLink {
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid #eee;
          background: #fff;
          color: #111;
          font-weight: 900;
          text-decoration: none;
          font-size: 12px;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .navLink:hover {
          border-color: #ddd;
          transform: translateY(-1px);
        }

        .navLinkActive {
          border: 1px solid #111;
          background: #111;
          color: #fff;
        }

        .right {
          display: flex;
          gap: 8px;
          align-items: center;
          min-width: 170px;
          justify-content: flex-end;
        }

        .logout {
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid #ddd;
          background: #fff;
          font-weight: 900;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .logout:hover {
          border-color: #bbb;
          transform: translateY(-1px);
        }
      `}</style>

      <div className="left">
        <div className="brandDot">S</div>
        <div>
          <div className="brandText">Salora</div>
          <div className="brandSub">Customer</div>
        </div>
      </div>

      <div className="center">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`navLink ${isActive(pathname, l.href) ? "navLinkActive" : ""}`}>
            {l.label}
          </Link>
        ))}
      </div>

      <div className="right">
        <button type="button" onClick={logout} className="logout">
          Ausloggen
        </button>
      </div>
    </div>
  );
}