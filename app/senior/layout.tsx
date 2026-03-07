"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";

/**
 * Seniorenmodus Layout
 *
 * Design-Regeln:
 * - Große Schrift (22px+ Body, 24px+ Buttons)
 * - Hoher Kontrast (min. 4.5:1, Ziel: 7:1)
 * - Keine kleine Navigation — nur Zurück-Button + Home
 * - Viel Weißraum
 * - 80px Touch-Targets
 */
export default function SeniorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/senior/home";

  return (
    <div className="min-h-screen bg-warmwhite">
      {/* Einfacher Header — Zurück + App-Name + Home */}
      <header className="sticky top-0 z-40 border-b-2 border-gray-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4" style={{ minHeight: "64px" }}>
          <Link
            href={isHome ? "/dashboard" : "/senior/home"}
            className="flex items-center gap-2 rounded-xl p-3 text-anthrazit hover:bg-gray-100 active:bg-gray-200"
            style={{ minHeight: "56px", minWidth: "56px" }}
            aria-label={isHome ? "Zum Dashboard" : "Zurück zur Startseite"}
          >
            <ArrowLeft className="h-7 w-7" />
            <span className="text-lg font-semibold">{isHome ? "Dashboard" : "Zurück"}</span>
          </Link>
          <span className="text-lg font-bold text-quartier-green">Nachbar.io</span>
        </div>
      </header>

      {/* Hauptinhalt — großzügiges Padding */}
      <main className="mx-auto max-w-lg px-6 py-8">{children}</main>

      {/* Notfall-Leiste unten — immer sichtbar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-red-200 bg-white safe-bottom">
        <div className="mx-auto max-w-lg px-4 py-3">
          <a
            href="tel:112"
            className="flex items-center justify-center gap-3 rounded-xl bg-emergency-red px-6 text-white"
            style={{ minHeight: "60px", fontSize: "1.25rem", fontWeight: 700 }}
          >
            📞 Notruf 112
          </a>
        </div>
      </div>

      {/* Platzhalter für die fixierte Notruf-Leiste */}
      <div style={{ height: "90px" }} />
    </div>
  );
}
