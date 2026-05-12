import Link from "next/link";

import { QuartierAppLogo } from "@/components/brand/QuartierAppLogo";

/**
 * Visual-Polish v7 Bundle 1 / Welle 3 — Warm-Dark Brand-Footer.
 *
 * Magazin-Abschluss als dritte Surface der App
 * (cream-canvas → lifted-cream → warm-dark). Eyebrow + Magazin-Sig
 * ("Ein digitales Quartier fuer Bad Saeckingen.") + voller
 * Logo-Lockup + Meta-Zeile mit Datenschutz/Impressum/AGB.
 *
 * Wird derzeit nur auf dem Dashboard eingesetzt (groesster
 * Wow-Effekt). Folge-Wellen koennen ihn schrittweise auf weitere
 * App-Pages ausdehnen (aerzte/city-services/quartier-info haben
 * heute noch die kleine Logo-Signature).
 */
export function BrandFooter() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "1.0";
  const versionShort = version.split(".").slice(0, 2).join(".");

  return (
    <footer
      data-testid="app-brand-footer"
      // Full-bleed Trick: positioniert relativ und zieht via
      // left/right + margin-x: -50vw aus dem max-w-lg-Container heraus,
      // damit der dunkle Streifen die volle Viewport-Breite einnimmt.
      // Funktioniert in allen modernen Browsern, kein JS noetig.
      className="relative left-1/2 right-1/2 -mx-[50vw] mt-16 w-screen bg-footer-dark bg-[#2a2a38] px-6 py-12 text-warmwhite"
    >
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center">
        <p
          data-testid="brand-footer-eyebrow"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-quartier-green-light"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-quartier-green-light"
            aria-hidden="true"
          />
          Ein digitales Quartier
        </p>
        <h2 className="font-serif text-2xl font-medium leading-snug tracking-[-0.01em] text-warmwhite sm:text-3xl">
          Ein digitales Quartier für Bad Säckingen.
        </h2>
        <div className="pt-2">
          <QuartierAppLogo variant="full" size={76} />
        </div>
        <p className="text-xs text-warmwhite/60">
          <span>v{versionShort}</span>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <Link
            href="/datenschutz"
            className="hover:text-warmwhite hover:underline"
          >
            Datenschutz
          </Link>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <Link
            href="/impressum"
            className="hover:text-warmwhite hover:underline"
          >
            Impressum
          </Link>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <Link href="/agb" className="hover:text-warmwhite hover:underline">
            AGB
          </Link>
        </p>
      </div>
    </footer>
  );
}
