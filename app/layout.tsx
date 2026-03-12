import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nachbar-io.vercel.app";

export const metadata: Metadata = {
  title: "Nachbar.io — Dein digitaler Dorfplatz",
  description:
    "Nachbarschaftshilfe, lokale Informationen und soziale Interaktion für Ihr Quartier in Bad Säckingen.",
  manifest: "/manifest.json",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: siteUrl,
    siteName: "Nachbar.io",
    title: "Nachbar.io — Dein digitaler Dorfplatz",
    description:
      "Nachbarschaftshilfe, lokale Informationen und Quartiersleben in Bad Säckingen. Jetzt mitmachen!",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Nachbar.io — Dein digitaler Dorfplatz",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nachbar.io — Dein digitaler Dorfplatz",
    description:
      "Nachbarschaftshilfe, lokale Informationen und Quartiersleben in Bad Säckingen.",
    images: ["/og-image.svg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nachbar.io",
  },
};

export const viewport: Viewport = {
  themeColor: "#4CAF87",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-center" />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
