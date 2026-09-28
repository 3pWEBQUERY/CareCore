import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import OfflineSync from "./components/offline-sync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareCore · Pflegearbeitsplatz",
  description: "Der persönliche digitale Arbeitsplatz für moderne Pflege.",
  appleWebApp: { capable: true, title: "CareCore", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

// Kein automatisches Hineinzoomen in Formularfelder auf Handys (iOS zoomt sonst bei Schrift < 16 px).
// Die Schriftgrössen der App bleiben unverändert.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b1f3a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <OfflineSync />
      </body>
    </html>
  );
}
