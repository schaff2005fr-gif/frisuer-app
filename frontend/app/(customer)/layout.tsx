"use client";

import Link from "next/link";
import Image from "next/image";
import CustomerNav from "./CustomerNav";
import CustomerBottomNav from "./CustomerBottomNav";
import Brand from "@/components/Brand";

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
          align-items: center;
          justify-content: space-between;

          /* ✅ WICHTIG: kein wrap, sonst bricht Branding um */
          flex-wrap: nowrap;
          gap: 12px;
        }

        .brand {
  text-decoration: none;
  color: #111;
  flex: 0 0 auto;
}

.brandInner {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 10px !important;
  white-space: nowrap !important;
}

.brandIcon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #111;

  display: flex !important;
  align-items: center !important;
  justify-content: center !important;

  flex: 0 0 auto !important;
}

.brandText {
  font-weight: 900;
  font-size: 18px;
  letter-spacing: -0.4px;
  display: inline-block !important;
}

        .main {
          max-width: 1020px;
          margin: 0 auto;
          /* Seiten paddings kommen aus den Pages */
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

          .brandText {
            font-size: 17px;
          }

          .brandIcon {
            width: 38px;
            height: 38px;
          }
        }
      `}</style>

      <header className="header">
        <Brand />
        <div className="wrap">
          <Link href="/" className="brand" aria-label="Salora">
  <div className="brandInner">
    <div className="brandIcon">
      <Image src="/logo-s.png" alt="Salora" width={22} height={22} priority />
    </div>
    <div className="brandText">Salora</div>
  </div>
</Link>

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