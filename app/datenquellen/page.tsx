import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DatenquellenPage() {
  return (
    <main className="min-h-screen bg-warmwhite px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-anthrazit"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>

        <h1 className="mb-8 text-2xl font-bold text-anthrazit">Datenquellen</h1>

        <p className="mb-8 text-sm leading-relaxed text-anthrazit/80">
          QuartierApp bezieht amtliche Warn- und Umweltdaten aus den folgenden
          oeffentlichen Quellen. Die Daten werden in regelmaessigen Abstaenden
          automatisch abgerufen und in der App angezeigt.
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-anthrazit/80">
          {/* NINA / BBK */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              NINA — Notfall-Informations- und Nachrichten-App
            </h2>
            <p>Katastrophenwarnungen und Bevoelkerungsschutz-Meldungen.</p>
            <dl className="mt-3 space-y-1">
              <div className="flex gap-2">
                <dt className="font-medium">Datenhalter:</dt>
                <dd>
                  Bundesamt fuer Bevoelkerungsschutz und Katastrophenhilfe (BBK)
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">Website:</dt>
                <dd>
                  <a
                    href="https://www.bbk.bund.de"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    www.bbk.bund.de
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">Nutzungsbedingungen:</dt>
                <dd>
                  <a
                    href="https://www.bbk.bund.de/DE/Infothek/Nutzungsbedingungen/nutzungsbedingungen_node.html"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    BBK Nutzungsbedingungen
                  </a>
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              Quellenangabe: &quot;Quelle: Bundesamt fuer Bevoelkerungsschutz
              und Katastrophenhilfe (BBK)&quot;
            </p>
          </section>

          {/* DWD */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Deutscher Wetterdienst (DWD)
            </h2>
            <p>Unwetter-, Hitze- und Pollenwarnungen.</p>
            <dl className="mt-3 space-y-1">
              <div className="flex gap-2">
                <dt className="font-medium">Datenhalter:</dt>
                <dd>Deutscher Wetterdienst (DWD)</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">Website:</dt>
                <dd>
                  <a
                    href="https://www.dwd.de"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    www.dwd.de
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">Lizenz:</dt>
                <dd>
                  Verordnung zur Festlegung der Nutzungsbedingungen fuer die
                  Bereitstellung von Geodaten des Bundes (GeoNutzV, BGBl. I 2013
                  S. 362)
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              Quellenangabe: &quot;Quelle: Deutscher Wetterdienst&quot;
            </p>
          </section>

          {/* UBA */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Umweltbundesamt (UBA)
            </h2>
            <p>Luftqualitaetsdaten (PM10, PM2.5, NO2, O3).</p>
            <dl className="mt-3 space-y-1">
              <div className="flex gap-2">
                <dt className="font-medium">Datenhalter:</dt>
                <dd>Umweltbundesamt</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">Website:</dt>
                <dd>
                  <a
                    href="https://www.umweltbundesamt.de"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    www.umweltbundesamt.de
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">Lizenz:</dt>
                <dd>
                  <a
                    href="https://www.govdata.de/dl-de/by-2-0"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    Datenlizenz Deutschland — Namensnennung — Version 2.0
                    (dl-de/by-2-0)
                  </a>
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              Quellenangabe: &quot;Quelle: Umweltbundesamt, dl-de/by-2-0&quot;
            </p>
          </section>

          {/* Haftungsausschluss */}
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Haftungsausschluss
            </h2>
            <p>
              Alle Warnungen und Messdaten sind amtliche Fremdinhalte.
              QuartierApp uebernimmt keine Gewaehr fuer Vollstaendigkeit,
              Aktualitaet oder Richtigkeit der dargestellten Informationen. Bei
              konkreter Gefahrenlage pruefen Sie bitte zusaetzlich die
              offiziellen Kanaele der jeweiligen Quelle.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 flex gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <Link
            href="/impressum"
            className="hover:text-anthrazit hover:underline"
          >
            Impressum
          </Link>
          <Link
            href="/datenschutz"
            className="hover:text-anthrazit hover:underline"
          >
            Datenschutz
          </Link>
          <Link href="/datenquellen" className="font-medium text-anthrazit">
            Datenquellen
          </Link>
        </div>
      </div>
    </main>
  );
}
