"use client";

import Link from "next/link";
import Image from "next/image";

type BrandProps = {
  href?: string;
  ariaLabel?: string;
};

export default function Brand({ href = "/", ariaLabel = "Salora" }: BrandProps) {
  return (
    <>
      <style jsx>{`
        .brand {
          text-decoration: none;
          color: #111;
          display: inline-block;
        }

        .brand:focus-visible {
          outline: 2px solid #111;
          outline-offset: 4px;
          border-radius: 14px;
        }

        .brandInner {
          display: inline-flex;
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
          flex-shrink: 0;
        }

        .brandText {
          font-weight: 900;
          font-size: 18px;
          letter-spacing: -0.4px;
          line-height: 1;
        }
      `}</style>

      <Link href={href} className="brand" aria-label={ariaLabel}>
        <span className="brandInner">
          <span className="brandIcon" aria-hidden="true">
            <Image src="/logo-s.png" alt="" width={22} height={22} priority />
          </span>
          <span className="brandText">Salora</span>
        </span>
      </Link>
    </>
  );
}