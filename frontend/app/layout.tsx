import "./globals.css";
import AppFooter from "@/components/AppFooter";

export const metadata = {
  title: "Friseur App",
  description: "Terminbuchung",
  appleWebApp: {
    capable: true,
  },
  other: {
    "apple-itunes-app": "app-id=6762065140",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <div className="page">
          {children}
          <AppFooter />
        </div>
      </body>
    </html>
  );
}