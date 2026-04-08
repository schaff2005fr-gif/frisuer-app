import "./globals.css";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Friseur App",
  description: "Terminbuchung",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <div className="page">
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}