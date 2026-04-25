import type { Metadata, Viewport } from "next";
import { Nunito, Nunito_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { CapacitorInit } from "@/components/CapacitorInit";
import { isClosedPilotMode } from "@/lib/closed-pilot";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://nachbar-io.vercel.app";

export const metadata: Metadata = {
  title: "Nachbar.io — Geschlossener Pilot",
  description:
    "Nachbar.io ist noch nicht öffentlich freigeschaltet. Der geschlossene Pilot wird lokal vorbereitet und nimmt aktuell keine Registrierungen an.",
  manifest: "/manifest.json",
  metadataBase: new URL(siteUrl),
  robots: isClosedPilotMode()
    ? {
        index: false,
        follow: false,
        nocache: true,
      }
    : undefined,
  alternates: {
    canonical: "./",
  },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: siteUrl,
    siteName: "QuartierApp",
    title: "Nachbar.io — Geschlossener Pilot",
    description:
      "Nachbar.io ist noch nicht öffentlich freigeschaltet.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Nachbar.io — Geschlossener Pilot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nachbar.io — Geschlossener Pilot",
    description:
      "Nachbar.io ist noch nicht öffentlich freigeschaltet.",
    images: ["/opengraph-image"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QuartierApp",
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
      <body
        className={`${nunito.variable} ${nunitoSans.variable} font-sans antialiased`}
      >
        {children}
        <Toaster position="top-center" />
        <ServiceWorkerRegistration />
        <CapacitorInit />
      </body>
    </html>
  );
}
