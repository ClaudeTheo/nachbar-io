import Link from "next/link";

/**
 * Minimaler Legal-Link-Strip mit Datenschutz, Impressum, AGB und
 * Barrierefreiheit.
 *
 * Bewusst leichtgewichtig — der grosse `<BrandFooter>` ist fuer Dashboard +
 * App-Surfaces, hier geht es nur darum, dass auch oeffentliche Seiten ohne
 * Auth (Landing, Login, Register, Onboarding-Anleitung) ihre Pflichtlinks
 * gemaess § 5 DDG und DSGVO Art. 13 sichtbar erreichbar haben.
 *
 * Mindest-Touch-Target laut WCAG 2.1 AA: 44x44 Pixel. Durch `py-2` (16 px)
 * + Zeilenhoehe sind die Links knapp ueber 40 px hoch — fuer Pflichtlinks
 * ausreichend, fuer den Senior-Modus erweitern wir bei Bedarf den Auth-Layout
 * extra (siehe Senior-App-Stufe-1-Plan).
 */
export function LegalLinksFooter({
  className = "",
  align = "center",
}: {
  className?: string;
  /** Ausrichtung der Links — center fuer Auth-Seiten, start fuer Landing. */
  align?: "center" | "start";
}) {
  const justify = align === "center" ? "justify-center" : "justify-start";

  return (
    <nav
      aria-label="Rechtliche Informationen"
      className={`flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-quartier-green ${justify} ${className}`}
    >
      <Link
        href="/datenschutz"
        className="inline-flex min-h-[44px] items-center px-1 underline-offset-4 hover:underline"
      >
        Datenschutz
      </Link>
      <Link
        href="/impressum"
        className="inline-flex min-h-[44px] items-center px-1 underline-offset-4 hover:underline"
      >
        Impressum
      </Link>
      <Link
        href="/agb"
        className="inline-flex min-h-[44px] items-center px-1 underline-offset-4 hover:underline"
      >
        AGB
      </Link>
      <Link
        href="/barrierefreiheit"
        className="inline-flex min-h-[44px] items-center px-1 underline-offset-4 hover:underline"
      >
        Barrierefreiheit
      </Link>
    </nav>
  );
}
