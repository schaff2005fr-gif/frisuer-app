"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
    <div className="navWrap">
      <style jsx>{`
        .navWrap {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .navLink {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
          font-weight: 900;
          text-decoration: none;
          font-size: 12px;
          transition: all 0.15s ease;
        }

        .navLinkActive {
          border: 1px solid #111;
          background: #111;
          color: #fff;
        }

        .logout {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #ddd;
          background: #fff;
          font-weight: 900;
          cursor: pointer;
          font-size: 12px;
        }

        /* ✅ Mobile */
        @media (max-width: 520px) {
          .navWrap {
            width: 100%;
            gap: 6px;
          }

          .navLink,
          .logout {
            flex: 1 1 calc(50% - 6px);
            text-align: center;
          }
        }
      `}</style>

      <Link
        href="/"
        className={`navLink ${pathname === "/" ? "navLinkActive" : ""}`}
      >
        Home
      </Link>

      <Link
        href="/book"
        className={`navLink ${pathname === "/book" ? "navLinkActive" : ""}`}
      >
        Buchen
      </Link>

      <Link
        href="/my-bookings"
        className={`navLink ${pathname === "/my-bookings" ? "navLinkActive" : ""}`}
      >
        Meine Termine
      </Link>

      <Link
        href="/notifications"
        className={`navLink ${pathname === "/notifications" ? "navLinkActive" : ""}`}
      >
        Nachrichten
      </Link>

      <Link
        href="/settings"
        className={`navLink ${pathname === "/settings" ? "navLinkActive" : ""}`}
      >
        Einstellungen
      </Link>

      <button type="button" onClick={logout} className="logout">
        Ausloggen
      </button>
    </div>
  );
}