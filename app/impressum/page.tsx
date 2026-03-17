import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Impressum gemaess § 5 TMG / § 18 MStV
export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-warmwhite px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-anthrazit"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck
        </Link>

        <h1 className="mb-8 text-2xl font-bold text-anthrazit">Impressum</h1>

        <div className="space-y-8 text-sm leading-relaxed text-anthrazit/80">
          {/* Angaben gemaess § 5 TMG */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Angaben gemaess § 5 TMG
            </h2>
            <p>
              Thomas Theobald<br />
              Purkersdorfer Strasse 35<br />
              79713 Bad Saeckingen<br />
              Deutschland
            </p>
          </section>

          {/* Kontakt */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">Kontakt</h2>
            <p>
              E-Mail: ThomasTh@gmx.de<br />
              Telefon: auf Anfrage
            </p>
          </section>

          {/* Verantwortlich fuer den Inhalt */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Verantwortlich fuer den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <p>
              Thomas Theobald<br />
              Purkersdorfer Strasse 35, 79713 Bad Saeckingen
            </p>
          </section>

          {/* EU-Streitschlichtung */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              EU-Streitschlichtung
            </h2>
            <p>
              Die Europaeische Kommission stellt eine Plattform zur
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
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
              vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          {/* Haftung fuer Inhalte */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Haftung fuer Inhalte
            </h2>
            <p>
              Als Diensteanbieter sind wir gemaess § 7 Abs. 1 TMG fuer eigene
              Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
              Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
              verpflichtet, uebermittelte oder gespeicherte fremde Informationen zu
              ueberwachen oder nach Umstaenden zu forschen, die auf eine rechtswidrige
              Taetigkeit hinweisen.
            </p>
            <p className="mt-2">
              Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
              Informationen nach den allgemeinen Gesetzen bleiben hiervon unberuehrt.
              Eine diesbezuegliche Haftung ist jedoch erst ab dem Zeitpunkt der
              Kenntnis einer konkreten Rechtsverletzung moeglich. Bei Bekanntwerden
              von entsprechenden Rechtsverletzungen werden wir diese Inhalte
              umgehend entfernen.
            </p>
          </section>

          {/* Haftung fuer Links */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Haftung fuer Links
            </h2>
            <p>
              Unser Angebot enthaelt Links zu externen Websites Dritter, auf deren
              Inhalte wir keinen Einfluss haben. Deshalb koennen wir fuer diese
              fremden Inhalte auch keine Gewaehr uebernehmen. Fuer die Inhalte der
              verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
              Seiten verantwortlich.
            </p>
          </section>

          {/* Urheberrecht */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Urheberrecht
            </h2>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
              Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfaeltigung,
              Bearbeitung, Verbreitung und jede Art der Verwertung ausserhalb der
              Grenzen des Urheberrechtes beduerfen der schriftlichen Zustimmung des
              jeweiligen Autors bzw. Erstellers.
            </p>
          </section>

          {/* Plattform-Hinweis */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Hinweis zur Plattform
            </h2>
            <p>
              nachbar.io ist ein nichtkommerzielles Community-Projekt fuer die
              Nachbarschaft in Bad Saeckingen. Die Nutzung ist kostenlos. Die
              Plattform wird ehrenamtlich betrieben und dient der Foerderung des
              nachbarschaftlichen Zusammenhalts.
            </p>
          </section>

          {/* Zweckbestimmung gemaess EU MDR 2017/745 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Zweckbestimmung
            </h2>
            <p>
              Nachbar.io ist eine Kommunikationsplattform zur Foerderung der
              Nachbarschaftshilfe im Quartier. Die App dient der Koordination von
              Alltagshilfe, dem Austausch lokaler Informationen und der freiwilligen
              sozialen Vernetzung von Bewohnerinnen und Bewohnern.
            </p>
            <p className="mt-2">
              Die optionalen Koordinationsfunktionen (Erinnerungen,
              Tagescheck, Helfer-Uebersicht) sind organisatorische Hilfsmittel zur
              Alltagsunterstuetzung. Sie ersetzen weder professionelle Pflege,
              aerztliche Beratung noch medizinische Notrufsysteme (112/110).
            </p>
            <p className="mt-2">
              Die Erinnerungsfunktion dient der Alltagsorganisation und stellt
              keine medizinische Dosierungs-, Diagnose- oder Therapieempfehlung dar.
            </p>
            <p className="mt-2 font-medium text-anthrazit">
              Nachbar.io ist kein Medizinprodukt im Sinne der Verordnung (EU)
              2017/745. Die Software erhebt keinen diagnostischen, therapeutischen
              oder klinischen Ueberwachungszweck.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 flex gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <Link href="/impressum" className="font-medium text-anthrazit">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-anthrazit hover:underline">
            Datenschutz
          </Link>
          <Link href="/agb" className="hover:text-anthrazit hover:underline">
            AGB
          </Link>
        </div>
      </div>
    </div>
  );
}
