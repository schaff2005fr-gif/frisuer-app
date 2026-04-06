"use client";

import Link from "next/link";
import Image from "next/image";

export default function Brand({ href = "/" }: { href?: string }) {
  return (
    <>
      <style jsx>{`
        .brand {
          text-decoration: none;
          color: #111;
        }

        .brandInner {
          display: flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
        }

        .brandIcon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brandText {
          font-weight: 900;
          font-size: 18px;
          letter-spacing: -0.4px;
        }
      `}</style>

      <Link href={href} className="brand" aria-label="Salora">
        <div className="brandInner">
          <div className="brandIcon">
            <Image src="/logo-s.png" alt="Salora" width={22} height={22} priority />
          </div>
          <div className="brandText">Salora</div>
        </div>
      </Link>
    </>
  );
}