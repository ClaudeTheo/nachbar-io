import Link from "next/link";

// Landing-Page / Splash-Screen
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-warmwhite px-4 text-center">
      {/* Logo */}
      <div className="mb-8">
        <div className="mb-4 text-6xl">🏘️</div>
        <h1 className="text-3xl font-bold text-anthrazit">nachbar.io</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Ihr digitaler Dorfplatz
        </p>
      </div>

      {/* Beschreibung */}
      <p className="mb-8 max-w-sm text-muted-foreground">
        Nachbarschaftshilfe, lokale Informationen und Vertrauen für Ihr
        Quartier in Bad Säckingen.
      </p>

      {/* Buttons */}
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-quartier-green px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-quartier-green-dark"
        >
          Anmelden
        </Link>
        <Link
          href="/register"
          className="rounded-lg border-2 border-anthrazit px-6 py-3 text-center font-semibold text-anthrazit transition-colors hover:bg-anthrazit hover:text-white"
        >
          Registrieren
        </Link>
      </div>

      {/* Footer */}
      <p className="mt-12 text-xs text-muted-foreground">
        Exklusiv für Bewohner des Quartiers
        <br />
        Purkersdorfer Str. · Sanarystr. · Oberer Rebberg
      </p>
    </div>
  );
}
