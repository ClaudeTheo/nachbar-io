import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t bg-white py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-bold text-[#2D3142]">Produkt</h3>
            <ul className="mt-3 space-y-2">
              {[
                { label: "Für Bewohner", href: "#zielgruppen" },
                { label: "Für Angehörige", href: "#zielgruppen" },
                { label: "Für Pflege", href: "#zielgruppen" },
                { label: "Für Kommunen", href: "#zielgruppen" },
                { label: "Für Ärzte", href: "#zielgruppen" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-[#2D3142] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#2D3142]">Rechtliches</h3>
            <ul className="mt-3 space-y-2">
              {[
                { label: "Impressum", href: "/impressum" },
                { label: "Datenschutz", href: "/datenschutz" },
                { label: "AGB", href: "/agb" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-[#2D3142] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#2D3142]">Kontakt</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li>
                <a
                  href="mailto:thomasth@gmx.de"
                  className="hover:text-[#2D3142] transition-colors"
                >
                  thomasth@gmx.de
                </a>
              </li>
              <li>Bad Säckingen, Deutschland</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-100 pt-6 text-center">
          <p className="text-xs text-gray-400">
            © 2026 QuartierApp. Alle Rechte vorbehalten.
          </p>
        </div>
      </div>
    </footer>
  );
}
