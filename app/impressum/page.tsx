import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Impressum gemäß § 5 TMG / § 18 MStV
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
          {/* Angaben gemäß § 5 TMG */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Angaben gemäß § 5 TMG
            </h2>
            <p>
              Thomas Theobald
              <br />
              Purkersdorfer Straße 35
              <br />
              79713 Bad Säckingen
              <br />
              Deutschland
            </p>
          </section>

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Hinweis zur Rechtsform — vor Handelsregistereintragung
            </h2>
            <p>
              Die Theobase GmbH befindet sich in Gruendung. Die Beurkundung des
              Gesellschaftsvertrags erfolgte beim Notariat Stadler, Bad
              Saeckingen, am 27.04.2026. Die Eintragung beim zustaendigen
              Handelsregister ist beantragt; bis zur Eintragung firmiert die
              Gesellschaft als Theobase GmbH i.G.
            </p>
            <p className="mt-2">
              In dieser Uebergangsphase ist verantwortlich im Sinne von § 5 TMG
              und Art. 4 Nr. 7 DSGVO: Thomas Theobald, Purkersdorfer Strasse 35,
              79713 Bad Saeckingen, E-Mail: thomasth@gmx.de.
            </p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>Es findet kein entgeltlicher Vertragsbetrieb statt.</li>
              <li>Es werden keine Zahlungen entgegengenommen.</li>
              <li>
                Der Pilotbetrieb ist eine geschlossene, freiwillige Erprobung
                mit ausgewaehlten Familien aus Bad Saeckingen.
              </li>
            </ul>
            <p className="mt-2">
              Sobald die Handelsregistereintragung vorliegt, wird dieses
              Impressum um Firma, Rechtsform, Sitz, Vertretung,
              Handelsregisternummer und Umsatzsteuer-Identifikationsnummer
              aktualisiert.
            </p>
          </section>

          {/* Kontakt */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Kontakt
            </h2>
            <p>
              E-Mail: ThomasTh@gmx.de
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
              Derzeit wird keine gewerbliche Tätigkeit ausgeübt. Die Plattform
              befindet sich im nichtkommerziellen Pilotbetrieb. Eine
              Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG liegt nicht
              vor. Diese Angabe wird bei Aufnahme einer gewerblichen Tätigkeit
              aktualisiert.
            </p>
          </section>

          {/* Verantwortlich für den Inhalt */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <p>
              Thomas Theobald
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
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene
              Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
              verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter
              jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
              Informationen zu überwachen oder nach Umständen zu forschen, die
              auf eine rechtswidrige Tätigkeit hinweisen.
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
              QuartierApp ist ein nichtkommerzielles Community-Projekt für die
              Nachbarschaft in Bad Säckingen. Die Nutzung ist kostenlos. Die
              Plattform wird ehrenamtlich betrieben und dient der Förderung des
              nachbarschaftlichen Zusammenhalts.
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
              ärztliche Beratung noch medizinische Notrufsysteme (112/110).
            </p>
            <p className="mt-2">
              Die Erinnerungsfunktion dient der Alltagsorganisation und stellt
              keine medizinische Dosierungs-, Diagnose- oder Therapieempfehlung
              dar.
            </p>
            <p className="mt-2 font-medium text-anthrazit">
              QuartierApp ist kein Medizinprodukt im Sinne der Verordnung (EU)
              2017/745. Die Software erhebt keinen diagnostischen,
              therapeutischen oder klinischen Überwachungszweck.
            </p>
          </section>
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
