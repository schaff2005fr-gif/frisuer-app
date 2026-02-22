import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header style={{ borderBottom: "1px solid #eee", background: "#fff" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", padding: 16 }}>
          <Link href="/" style={{ fontWeight: 900, textDecoration: "none", color: "#111" }}>
            Friseur
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1020, margin: "0 auto", padding: 16 }}>{children}</main>
    </div>
  );
}
