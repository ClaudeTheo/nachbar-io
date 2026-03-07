import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Seniorenmodus Layout
 *
 * Design-Regeln:
 * - Große Schrift (22px+ Body, 24px+ Buttons)
 * - Hoher Kontrast (min. 4.5:1, Ziel: 7:1)
 * - Keine kleine Navigation — nur Zurück-Button
 * - Viel Weißraum
 */
export default function SeniorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-warmwhite">
      {/* Einfacher Header mit Zurück-Button */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-lg items-center px-4">
          <Link
            href="/senior/home"
            className="flex items-center gap-2 rounded-lg p-2 text-anthrazit hover:bg-muted"
            style={{ minHeight: "44px", minWidth: "44px" }}
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="senior-text">Zurück</span>
          </Link>
        </div>
      </header>

      {/* Hauptinhalt — großzügiges Padding */}
      <main className="mx-auto max-w-lg px-6 py-6">{children}</main>
    </div>
  );
}
