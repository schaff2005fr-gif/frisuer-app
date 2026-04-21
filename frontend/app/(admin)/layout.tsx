"use client";

import { usePathname } from "next/navigation";
import Brand from "@/components/Brand";
import AdminBottomNav from "./admin/AdminBottomNav";
import AdminNav from "./admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/admin";

  return (
    <>
      <style jsx>{`
        .adminShell {
          padding: 16px;
          padding-bottom: 92px;
          max-width: 1180px;
          margin: 0 auto;
        }

        .brandWrap {
          margin-bottom: 12px;
        }

        .desktopNavWrap {
          display: none;
          margin-bottom: 14px;
        }

        .pageIntro {
          margin-bottom: 12px;
        }

        .pageTitle {
          font-size: 28px;
          font-weight: 900;
          color: #111;
        }

        .pageSub {
          margin-top: 4px;
          color: #666;
          word-break: break-word;
        }

        @media (min-width: 769px) {
          .adminShell {
            padding-bottom: 28px;
          }

          .desktopNavWrap {
            display: block;
          }
        }
      `}</style>

      <div className="adminShell">
        <div className="brandWrap">
          <Brand href="/admin" />
        </div>

        <div className="desktopNavWrap">
          <AdminNav />
        </div>

        {isDashboard ? null : (
          <div className="pageIntro">
            <div className="pageTitle">Admin</div>
            <div className="pageSub">{pathname}</div>
          </div>
        )}

        <div>{children}</div>
      </div>

      <AdminBottomNav />
    </>
  );
}