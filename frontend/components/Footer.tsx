import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 40,
        padding: "20px 16px 30px",
        borderTop: "1px solid #e5e5e5",
        display: "flex",
        gap: 16,
        justifyContent: "center",
        flexWrap: "wrap",
        fontSize: 14,
      }}
    >
      <Link href="/impressum">Impressum</Link>
      <Link href="/datenschutz">Datenschutz</Link>
    </footer>
  );
}