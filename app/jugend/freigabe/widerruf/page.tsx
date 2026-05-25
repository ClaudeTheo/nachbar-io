import Link from "next/link";

// Oeffentliche Widerrufs-Info: kein direkter Widerruf nur anhand einer Telefonnummer.
// Der produktive Guardian-Widerruf braucht einen verifizierten Token- oder Support-Prozess.
export default function WiderrufSeite() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-warmwhite p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-anthrazit">QuartierApp</h1>
          <p className="mt-1 text-gray-500">Elternfreigabe widerrufen</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Sicherer Widerruf</p>
          <p className="mt-2">
            Aus Sicherheitsgruenden widerrufen wir eine Jugendfreigabe nicht
            allein ueber eine frei eingegebene Telefonnummer im Browser.
          </p>
        </div>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-700">
          <p>
            Schreiben Sie uns bitte kurz mit dem Namen des Jugendlichen und der
            Telefonnummer, ueber die die Freigabe erteilt wurde. Wir pruefen die
            Zuordnung und setzen die erweiterten Jugendfunktionen danach
            zurueck.
          </p>
          <p>
            Wenn der Jugendliche selbst eingeloggt ist, kann die Freigabe auch
            ueber das eigene Profil oder durch einen Admin widerrufen werden.
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          <a
            href="mailto:thomasth@gmx.de?subject=Widerruf%20Elternfreigabe%20QuartierApp"
            className="flex min-h-14 items-center justify-center rounded-xl bg-red-600 px-4 text-center text-base font-semibold text-white transition-colors hover:bg-red-700"
          >
            Widerruf per E-Mail starten
          </a>
          <Link
            href="/datenschutz"
            className="flex min-h-12 items-center justify-center rounded-xl border border-gray-200 px-4 text-center text-sm font-medium text-anthrazit hover:border-quartier-green/50"
          >
            Datenschutz ansehen
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Die Freigabe ist freiwillig und kann jederzeit mit Wirkung fuer die
          Zukunft widerrufen werden.
        </p>
      </div>
    </main>
  );
}
