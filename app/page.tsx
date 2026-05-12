import Image from "next/image";
import Link from "next/link";

import { QuartierAppLogo } from "@/components/brand/QuartierAppLogo";

// Closed-Pilot Landing — Visual-Polish v7 Iteration 2 (Landing).
// Aquarell-Hintergrund (Schwarzwald-Tanne + Haeuser + Sonne) dezent als
// Atmosphaere-Layer; Brand-Tokens statt hartcodierte Hex; Magazin-Hero
// mit Eyebrow + accent dot + grosser Logo-Anker + Hairline-Trenner.
export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-warmwhite text-anthrazit">
      {/* Variante C (Founder 2026-05-12): Quartier-Hero-Foto als unterste
          Atmosphaere-Schicht (Stadt-Silhouette + Strassen-Baeume +
          Nachbarinnen). Liegt im DOM VOR dem Aquarell-Symbol-Layer, damit
          das Symbol darueber rendert. Foto ist Landing-only — App-Shell
          nutzt weiterhin das Aquarell-Symbol. */}
      <div
        aria-hidden="true"
        data-testid="landing-bg-foto"
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.12]"
      >
        <Image
          src="/images/hero-quartier.webp"
          alt=""
          fill
          priority={false}
          sizes="100vw"
          className="select-none object-cover object-top"
          draggable={false}
        />
      </div>

      {/* Dezenter Aquarell-Hintergrund (Brand-Bibel: Tanne + Haeuser + Sonne).
          Absolut positioniert, opacity-18, decorative. Founder 2026-05-12:
          Symbol "ganz oben" statt rechts-oben, damit es ueber dem Hero-Logo
          atmosphaerisch sichtbar bleibt. Liegt im DOM NACH dem Foto-Layer,
          damit das Symbol als Brand-Anker darueber rendert. */}
      <div
        aria-hidden="true"
        data-testid="landing-bg-aquarell"
        className="pointer-events-none absolute inset-x-0 -top-24 z-0 hidden h-[120%] w-full opacity-[0.18] sm:block"
      >
        <Image
          src="/brand/quartierapp-symbol.png"
          alt=""
          fill
          priority={false}
          sizes="(min-width: 640px) 100vw, 0"
          className="select-none object-contain object-top"
          aria-hidden="true"
          draggable={false}
        />
      </div>

      {/* Mobile-Variante: zentriertes blasses Aquarell hinter dem Hero. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-8 z-0 flex justify-center opacity-[0.22] sm:hidden"
      >
        <Image
          src="/brand/quartierapp-symbol.png"
          alt=""
          width={520}
          height={368}
          priority={false}
          className="select-none object-contain"
          draggable={false}
        />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-16">
        {/* Hero-Logo: das volle Aquarell mit Wordmark als Magazin-Anker. */}
        <div className="mb-10 flex justify-start sm:mb-12">
          <QuartierAppLogo variant="full" size={120} priority />
        </div>

        {/* Eyebrow im Magazin-Stil (accent dot + uppercase tracking). */}
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-quartier-green">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-quartier-green"
            aria-hidden="true"
          />
          Nachbar.io · Bad Säckingen
        </p>

        <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-[1.1] tracking-[-0.02em] text-anthrazit sm:text-5xl">
          Geschlossener Pilot in Vorbereitung
        </h1>

        <div
          className="mt-5 h-px w-16 bg-anthrazit-light/30"
          aria-hidden="true"
        />

        <p className="mt-5 max-w-2xl text-lg leading-[1.65] text-anthrazit-light">
          Diese Testversion ist noch nicht öffentlich freigeschaltet. Wir
          bereiten den Familienkreis für einen kleinen, kontrollierten Pilot
          vor und nehmen hier aktuell keine Registrierungen oder echten
          personenbezogenen Daten an.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-quartier-green px-6 py-3 text-sm font-semibold text-warmwhite shadow-sm transition hover:bg-quartier-green-dark"
            href="/login"
          >
            Anmelden
          </Link>
          <span className="text-sm leading-6 text-anthrazit-light">
            Nur für eingeladene Testhaushalte.
          </span>
        </div>

        {/* Drei Info-Karten — Hairline-Border + Lifted-Cream-BG (Magazin-Style). */}
        <div className="mt-12 grid gap-4 text-sm text-anthrazit sm:grid-cols-3">
          <article className="border-l-2 border-quartier-green bg-lifted-cream p-5">
            <h2 className="text-base font-semibold text-anthrazit">
              Nur Vorbereitung
            </h2>
            <p className="mt-2 leading-[1.55] text-anthrazit-light">
              Kein öffentlicher Start und keine Werbung.
            </p>
          </article>
          <article className="border-l-2 border-quartier-green bg-lifted-cream p-5">
            <h2 className="text-base font-semibold text-anthrazit">
              Keine echten Daten
            </h2>
            <p className="mt-2 leading-[1.55] text-anthrazit-light">
              Tests laufen nur intern und mit Testdaten.
            </p>
          </article>
          <article className="border-l-2 border-quartier-green bg-lifted-cream p-5">
            <h2 className="text-base font-semibold text-anthrazit">
              Freigabe folgt
            </h2>
            <p className="mt-2 leading-[1.55] text-anthrazit-light">
              Der Pilot startet erst nach rechtlicher und technischer
              Freigabe.
            </p>
          </article>
        </div>

        <nav className="mt-12 flex flex-wrap gap-5 text-sm font-medium text-quartier-green">
          <Link className="underline-offset-4 hover:underline" href="/datenschutz">
            Datenschutz
          </Link>
          <Link className="underline-offset-4 hover:underline" href="/impressum">
            Impressum
          </Link>
          <Link className="underline-offset-4 hover:underline" href="/agb">
            AGB
          </Link>
        </nav>
      </section>
    </main>
  );
}
