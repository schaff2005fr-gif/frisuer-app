"use client";

import Link from "next/link";
import CustomerNav from "./CustomerNav";
import CustomerBottomNav from "./CustomerBottomNav";
import Image from "next/image";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
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
          gap: 12px;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
        }

        .brandLogo {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #111;
        }

        .main {
          max-width: 1020px;
          margin: 0 auto;
          /* Seiten paddings kommen aus den Pages */
        }

        .navDesktop {
          display: block;
        }

        /* ✅ Mobile */
        @media (max-width: 520px) {
          .wrap {
            padding: 12px 14px;
            gap: 10px;
          }

          /* oben keine Button-Leiste mehr auf Mobile */
          .navDesktop {
            display: none;
          }

          /* Platz für BottomNav */
          .main {
            padding-bottom: calc(84px + env(safe-area-inset-bottom));
          }
        }
      `}</style>

      <header className="header">
        <div className="wrap">
          <Link href="/" className="brandLogo" aria-label="Salora">
            <Image src="/logo-s.png" alt="Salora" width={24} height={24} priority />
          </Link>

          {/* Desktop: dein altes Menü komplett */}
          <div className="navDesktop">
            <CustomerNav />
          </div>
        </div>
      </header>

      <main className="main">{children}</main>

      {/* Mobile: neue Icon-Bottomnav */}
      <CustomerBottomNav />
    </div>
  );
}