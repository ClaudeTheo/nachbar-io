import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nachbar.io — Dein digitaler Dorfplatz",
  description:
    "Nachbarschaftshilfe, lokale Informationen und soziale Interaktion für Ihr Quartier in Bad Säckingen.",
  manifest: "/manifest.json",
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
  maximumScale: 1,
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
