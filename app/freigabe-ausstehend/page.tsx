import Link from "next/link";

export default function PendingApprovalPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12 text-anthrazit">
      <p className="text-sm font-semibold uppercase tracking-wide text-quartier-green">
        Geschlossener Pilot
      </p>
      <h1 className="mt-3 text-3xl font-bold">Freigabe wird geprueft</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        Ihr Konto wurde angelegt und muss manuell freigeschaltet werden. Bis
        dahin bleiben Dashboard, Marktplatz und persoenliche Funktionen
        gesperrt.
      </p>
      <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed">
        In diesem Pilot liegen nur Testdaten. Bitte tragen Sie keine echten
        Daten anderer Menschen ein.
      </div>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-quartier-green px-5 font-semibold text-white hover:bg-quartier-green-dark"
      >
        Zur Startseite
      </Link>
    </main>
  );
}
