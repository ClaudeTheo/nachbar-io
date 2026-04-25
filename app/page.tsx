export const dynamic = "force-static";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#23262f]">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#3b6f58]">
          Nachbar.io · Bad Säckingen
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Geschlossener Pilot in Vorbereitung
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4b5563]">
          Diese Testversion ist noch nicht öffentlich freigeschaltet. Wir
          bereiten den Familienkreis für einen kleinen, kontrollierten Pilot vor
          und nehmen hier aktuell keine Registrierungen oder echten
          personenbezogenen Daten an.
        </p>
        <div className="mt-8 grid gap-4 text-sm text-[#374151] sm:grid-cols-3">
          <div className="border-l-4 border-[#3b6f58] bg-white p-4 shadow-sm">
            <h2 className="font-bold">Nur Vorbereitung</h2>
            <p className="mt-2">Kein öffentlicher Start und keine Werbung.</p>
          </div>
          <div className="border-l-4 border-[#3b6f58] bg-white p-4 shadow-sm">
            <h2 className="font-bold">Keine echten Daten</h2>
            <p className="mt-2">Tests laufen nur intern und mit Testdaten.</p>
          </div>
          <div className="border-l-4 border-[#3b6f58] bg-white p-4 shadow-sm">
            <h2 className="font-bold">Freigabe folgt</h2>
            <p className="mt-2">
              Der Pilot startet erst nach rechtlicher und technischer Freigabe.
            </p>
          </div>
        </div>
        <nav className="mt-10 flex flex-wrap gap-4 text-sm font-semibold">
          <a className="text-[#2f684e] underline" href="/datenschutz">
            Datenschutz
          </a>
          <a className="text-[#2f684e] underline" href="/impressum">
            Impressum
          </a>
          <a className="text-[#2f684e] underline" href="/agb">
            AGB
          </a>
        </nav>
      </section>
    </main>
  );
}
