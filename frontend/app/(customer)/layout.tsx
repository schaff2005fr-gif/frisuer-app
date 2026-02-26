"use client";

import CustomerNav from "./CustomerNav";
import CustomerBottomNav from "./CustomerBottomNav";
import Brand from "@/components/Brand";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page">
      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #fff;
        }

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
          align-items: center;
          justify-content: space-between;

          flex-wrap: nowrap;
          gap: 12px;
        }

        .main {
          max-width: 1020px;
          margin: 0 auto;
        }

        .navDesktop {
          display: block;
          flex: 0 0 auto;
        }

        /* ✅ Mobile */
        @media (max-width: 520px) {
          .wrap {
            padding: 12px 14px;
          }

          .navDesktop {
            display: none;
          }

          .main {
            padding-bottom: calc(84px + env(safe-area-inset-bottom));
          }
        }
      `}</style>

      <header className="header">
        <div className="wrap">
          {/* 🔥 Zentrale Brand-Komponente */}
          <Brand />

          <div className="navDesktop">
            <CustomerNav />
          </div>
        </div>
      </header>

      <main className="main">{children}</main>

      <CustomerBottomNav />
    </div>
  );
}