import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Impressum",
};

// Impressum gemäß § 5 DDG / § 18 MStV
export default function ImpressumPage() {
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

        <h1 className="mb-8 text-2xl font-bold text-anthrazit">Impressum</h1>

        <div className="space-y-8 text-sm leading-relaxed text-anthrazit/80">
          {/* Angaben gemäß § 5 DDG */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Angaben gemäß § 5 DDG
            </h2>
            <p>
              Theobase GmbH
              <br />
              Purkersdorfer Straße 35
              <br />
              79713 Bad Säckingen
              <br />
              Deutschland
            </p>
            <p className="mt-2">
              Vertreten durch den Geschäftsführer: Thomas Walter Theobald
              <br />
              Registergericht: Amtsgericht Freiburg im Breisgau
              <br />
              Registernummer: HRB 735685
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Hinweis zum Pilotbetrieb
            </h2>
            <p>
              Verantwortlich im Sinne von § 5 DDG und Art. 4 Nr. 7 DSGVO:
              Theobase GmbH, vertreten durch den Geschäftsführer Thomas Walter
              Theobald, Purkersdorfer Straße 35, 79713 Bad Säckingen,
              E-Mail: thomasth@gmx.de.
            </p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>Es findet derzeit kein entgeltlicher Vertragsbetrieb statt.</li>
              <li>
                Über diese öffentliche Pilotseite werden keine Zahlungen
                entgegengenommen.
              </li>
              <li>
                Der Pilotbetrieb ist eine geschlossene, freiwillige Erprobung
                mit ausgewählten Familien aus Bad Säckingen.
              </li>
            </ul>
          </section>

          {/* Kontakt */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Kontakt
            </h2>
            <p>
              E-Mail: thomasth@gmx.de
              <br />
              Telefon: +49 7761 5599557
            </p>
          </section>

          {/* Umsatzsteuer */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Umsatzsteuer
            </h2>
            <p>
              Der geschlossene Pilotbetrieb ist derzeit kostenfrei; über diese
              öffentliche Pilotseite werden keine Zahlungen entgegengenommen.
              Eine Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG wurde
              noch nicht erteilt. Diese Angabe wird hier ergänzt, sobald sie
              vorliegt.
            </p>
          </section>

          {/* Verantwortlich für den Inhalt */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <p>
              Theobase GmbH, vertreten durch den Geschäftsführer Thomas Walter
              Theobald
              <br />
              Purkersdorfer Straße 35, 79713 Bad Säckingen
            </p>
          </section>

          {/* EU-Streitschlichtung */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              EU-Streitschlichtung
            </h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur
              Online-Streitbeilegung (OS) bereit:{" "}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-quartier-green underline"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
            <p className="mt-2">
              Wir sind nicht bereit oder verpflichtet, an
              Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
              teilzunehmen.
            </p>
          </section>

          {/* Haftung für Inhalte */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Haftung für Inhalte
            </h2>
            <p>
              Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten
              nach den allgemeinen Gesetzen verantwortlich. Eine allgemeine
              Pflicht, übermittelte oder gespeicherte fremde Informationen zu
              überwachen oder nach Umständen zu forschen, die auf eine
              rechtswidrige Tätigkeit hinweisen, besteht nur im gesetzlich
              vorgesehenen Umfang.
            </p>
            <p className="mt-2">
              Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
              Informationen nach den allgemeinen Gesetzen bleiben hiervon
              unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem
              Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich.
              Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir
              diese Inhalte umgehend entfernen.
            </p>
          </section>

          {/* Haftung für Links */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Haftung für Links
            </h2>
            <p>
              Unser Angebot enthält Links zu externen Websites Dritter, auf
              deren Inhalte wir keinen Einfluss haben. Deshalb können wir für
              diese fremden Inhalte auch keine Gewähr übernehmen. Für die
              Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
              oder Betreiber der Seiten verantwortlich.
            </p>
          </section>

          {/* Urheberrecht */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Urheberrecht
            </h2>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
              diesen Seiten unterliegen dem deutschen Urheberrecht. Die
              Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
              Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
              schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </section>

          {/* Plattform-Hinweis */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Hinweis zur Plattform
            </h2>
            <p>
              QuartierApp ist im aktuellen Pilot eine geschlossene,
              kostenfreie Erprobung für Nachbarschaft und Quartiersleben in Bad
              Säckingen. Kostenpflichtige Module werden erst angeboten, wenn sie
              ausdrücklich freigeschaltet und vor Vertragsschluss transparent
              beschrieben werden.
            </p>
          </section>

          {/* Zweckbestimmung gemäß EU MDR 2017/745 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Zweckbestimmung
            </h2>
            <p>
              QuartierApp ist eine Kommunikationsplattform zur Förderung der
              Nachbarschaftshilfe im Quartier. Die App dient der Koordination
              von Alltagshilfe, dem Austausch lokaler Informationen und der
              freiwilligen sozialen Vernetzung von Bewohnerinnen und Bewohnern.
            </p>
            <p className="mt-2">
              Die optionalen Koordinationsfunktionen (Erinnerungen, Tagescheck,
              Helfer-Übersicht) sind organisatorische Hilfsmittel zur
              Alltagsunterstützung. Sie ersetzen weder professionelle Pflege,
              ärztliche Beratung noch den offiziellen Notruf 112/110.
            </p>
            <p className="mt-2">
              Die Erinnerungsfunktion dient der Alltagsorganisation und stellt
              keine medizinische Dosierungs-, Diagnose- oder Therapieempfehlung
              dar.
            </p>
            <p className="mt-2">
              QuartierApp ist kein Hausnotruf, keine Leitstelle und garantiert
              keine Reaktionszeit.
            </p>
            <p className="mt-2 font-medium text-anthrazit">
              QuartierApp ist kein Medizinprodukt im Sinne der Verordnung (EU)
              2017/745. Die Software erhebt keinen diagnostischen,
              therapeutischen oder klinischen Überwachungszweck.
            </p>
          </section>

          <p className="text-xs text-muted-foreground">Stand: Mai 2026</p>
        </div>

        {/* Footer */}
        <div className="mt-12 flex gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <Link href="/impressum" className="font-medium text-anthrazit">
            Impressum
          </Link>
          <Link
            href="/datenschutz"
            className="hover:text-anthrazit hover:underline"
          >
            Datenschutz
          </Link>
          <Link href="/agb" className="hover:text-anthrazit hover:underline">
            AGB
          </Link>
          <Link
            href="/barrierefreiheit"
            className="hover:text-anthrazit hover:underline"
          >
            Barrierefreiheit
          </Link>
        </div>
      </div>
    </main>
  );
}
