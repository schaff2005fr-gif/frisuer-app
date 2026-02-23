"use client";

import Link from "next/link";
import CustomerNav from "./CustomerNav";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <style jsx>{`
        .header {
          border-bottom: 1px solid #eee;
          background: #fff;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .wrap {
          max-width: 1020px;
          margin: 0 auto;
          padding: 16px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
        }

        .brand {
          font-weight: 900;
          text-decoration: none;
          color: #111;
          white-space: nowrap;
        }

        .main {
          max-width: 1020px;
          margin: 0 auto;
          padding: 16px;
        }

        /* ✅ Mobile */
        @media (max-width: 520px) {
          .wrap {
            padding: 12px 14px;
            gap: 10px;
          }

          .main {
            padding: 12px 14px;
          }
        }
      `}</style>

      <header className="header">
        <div className="wrap">
          <Link href="/" className="brand">
            Friseur
          </Link>
          <CustomerNav />
        </div>
      </header>

      <main className="main">{children}</main>
    </div>
  );
}