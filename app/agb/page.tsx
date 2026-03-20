import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Allgemeine Geschäftsbedingungen (AGB)
// Stand: März 2026
export default function AGBPage() {
  return (
    <div className="min-h-screen bg-warmwhite px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-anthrazit"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>

        <h1 className="mb-8 text-2xl font-bold text-anthrazit">
          Allgemeine Geschäftsbedingungen (AGB)
        </h1>

        <div className="space-y-8 text-sm leading-relaxed text-anthrazit/80">
          {/* 1. Geltungsbereich */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              1. Geltungsbereich
            </h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen regeln die Nutzung der
              Plattform QuartierApp (quartierapp.de), betrieben von Thomas Theobald,
              Purkersdorfer Straße 35, 79713 Bad Säckingen (nachfolgend
              &bdquo;Betreiber&ldquo;). Sie gelten für alle Zugangswege: Web-App,
              Arzt-Portal und Pi-Kiosk-Terminal.
            </p>
            <p className="mt-2">
              Mit der Registrierung und Nutzung von QuartierApp erklären Sie sich
              mit diesen AGB einverstanden.
            </p>
          </section>

          {/* 2. Leistungsbeschreibung */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              2. Leistungsbeschreibung
            </h2>
            <p>
              QuartierApp ist eine Kommunikationsplattform zur Förderung der
              Nachbarschaftshilfe und des Quartierslebens. Die Plattform bietet
              je nach Nutzungsmodell folgende Funktionen:
            </p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>
                <strong>Nachbar Free</strong> (kostenlos): Schwarzes Brett,
                Marktplatz, Quartierskarte, Hilfeanfragen, Veranstaltungen,
                lokale Nachrichten, optionale Koordinationsfunktionen (Tagescheck,
                Erinnerungen)
              </li>
              <li>
                <strong>Nachbar Plus</strong> (kostenpflichtig): Angehörigen-Verknüpfung,
                Statuseinsicht, Video-Anrufe mit Angehörigen, Chat
              </li>
              <li>
                <strong>Nachbar Pro Community</strong> (B2B, kostenpflichtig):
                Quartiers-Dashboard, Content-Moderation, Statistiken, Export
              </li>
              <li>
                <strong>Nachbar Pro Medical</strong> (B2B, kostenpflichtig):
                Online-Terminbuchung, ärztliche Videosprechstunde, Patienten-CRM,
                digitale Anamnese
              </li>
            </ul>
            <p className="mt-2">
              Der genaue Funktionsumfang kann sich im Rahmen der Weiterentwicklung
              ändern. Wesentliche Einschränkungen bestehender Funktionen werden
              vorab angekündigt.
            </p>
          </section>

          {/* 3. Registrierung und Zugang */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              3. Registrierung und Zugang
            </h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                Die Registrierung erfolgt per Einladungscode oder Standortangabe
                mit anschließender Verifizierung per E-Mail (Magic Link).
              </li>
              <li>
                Pro Person ist ein Nutzerkonto zulässig.
              </li>
              <li>
                Die Nutzung setzt die Zugehörigkeit zu einem teilnehmenden
                Quartier voraus.
              </li>
              <li>
                Der Betreiber behält sich vor, Registrierungen ohne Angabe von
                Gründen abzulehnen, insbesondere bei Verdacht auf Missbrauch.
              </li>
            </ul>
          </section>

          {/* 4. Nutzerpflichten */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              4. Nutzerpflichten
            </h2>
            <p>Sie verpflichten sich:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>
                wahrheitsgemäße Angaben bei der Registrierung zu machen
              </li>
              <li>
                Ihre Zugangsdaten vertraulich zu behandeln
              </li>
              <li>
                keine rechtswidrigen, beleidigenden, diskriminierenden oder
                gewaltverherrlichenden Inhalte zu veröffentlichen
              </li>
              <li>
                die Plattform nicht für kommerzielle Werbung, Spam oder
                betrügerische Zwecke zu nutzen
              </li>
              <li>
                die Privatsphäre anderer Nutzer zu respektieren und keine
                personenbezogenen Daten Dritter ohne deren Einwilligung zu
                veröffentlichen
              </li>
              <li>
                die Plattform nicht zur Verbreitung von Falschinformationen
                im Zusammenhang mit Notfällen zu missbrauchen
              </li>
            </ul>
          </section>

          {/* 5. Haftungsausschluss und Zweckbestimmung */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              5. Haftungsausschluss und Zweckbestimmung
            </h2>

            <h3 className="mt-3 font-semibold">5.1 Kein Medizinprodukt</h3>
            <p>
              QuartierApp ist keine Plattform zur Diagnose, Behandlung,
              Überwachung oder Verhütung von Krankheiten und{" "}
              <strong>kein Medizinprodukt</strong> im Sinne der
              Verordnung (EU) 2017/745 (MDR).
            </p>
            <p className="mt-2">
              Die optionalen Koordinationsfunktionen (Erinnerungen, Tagescheck,
              Helfer-Übersicht) sind organisatorische Hilfsmittel zur
              Alltagsunterstützung. Sie ersetzen weder professionelle Pflege,
              ärztliche Beratung noch medizinische Notrufsysteme.
            </p>

            <h3 className="mt-3 font-semibold">5.2 Keine Notrufleistung</h3>
            <p>
              QuartierApp ist <strong>kein Ersatz für den Notruf 112/110</strong>.
              In medizinischen Notfällen, bei Feuer oder Straftaten ist immer
              zuerst der offizielle Notruf zu wählen. Die Hilfeanfrage-Funktion
              der App dient ausschließlich der nachbarschaftlichen Koordination
              im Alltag.
            </p>

            <h3 className="mt-3 font-semibold">5.3 Haftungsbegrenzung</h3>
            <p>
              Der Betreiber haftet nur für Schäden, die auf Vorsatz oder grobe
              Fahrlässigkeit zurückzuführen sind. Die Haftung für leichte
              Fahrlässigkeit ist — soweit gesetzlich zulässig — auf die
              Verletzung wesentlicher Vertragspflichten beschränkt und auf den
              vorhersehbaren, vertragstypischen Schaden begrenzt.
            </p>
            <p className="mt-2">
              Der Betreiber übernimmt keine Haftung für:
            </p>
            <ul className="ml-4 mt-1 list-disc space-y-1">
              <li>die Richtigkeit, Vollständigkeit oder Aktualität nutzergenerierter Inhalte</li>
              <li>das Zustandekommen oder die Qualität von Nachbarschaftshilfe-Vereinbarungen</li>
              <li>Schäden durch Nichtbeachtung des Hinweises, in Notfällen den offiziellen Notruf zu nutzen</li>
              <li>vorübergehende Nichterreichbarkeit der Plattform (siehe §6)</li>
            </ul>

            <h3 className="mt-4 text-base font-semibold">5.4 Standortdaten bei Hilferufen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bei Erstellung eines Hilferufs können Sie optional Ihren Standort teilen. Dieser dient
              ausschließlich der nachbarschaftlichen Koordination und wird automatisch gelöscht, sobald
              der Hilferuf als erledigt markiert wird. Die Standortfreigabe ersetzt nicht die Ortung
              durch Rettungsdienste (112/110). Die Sichtbarkeit Ihres Standorts richtet sich nach der
              Abo-Stufe der Empfänger: Angehörige (Plus) sehen den genauen Standort, Organisationen
              (Pro) sehen zunächst nur einen ungefähren Bereich. Sie können die Standortfreigabe
              jederzeit in Ihren Profileinstellungen oder bei jedem einzelnen Hilferuf deaktivieren.
            </p>
          </section>

          {/* 5.5 Einwilligung Care-Modul */}
          <section>
            <h3 className="mb-1 font-semibold text-anthrazit">
              5.5 Einwilligung für das Care-Modul
            </h3>
            <p>
              Die Nutzung des Care-Moduls (Pflege & Seniorenhilfe) erfordert Ihre
              ausdrückliche Einwilligung in die Verarbeitung von Gesundheitsdaten
              gemäß Art. 9 DSGVO. Sie können für einzelne Bereiche
              (SOS-Hilferufe, Check-in, Medikamente, Pflegeprofil, Notfallkontakte)
              getrennt einwilligen. Details finden Sie in unserer{' '}
              <a href="/datenschutz" className="text-quartier-green underline">
                Datenschutzerklärung §5.9
              </a>.
            </p>
          </section>

          {/* 6. Verfügbarkeit */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              6. Verfügbarkeit
            </h2>
            <p>
              Der Betreiber bemüht sich um eine möglichst unterbrechungsfreie
              Verfügbarkeit der Plattform. Ein Anspruch auf ununterbrochene
              Verfügbarkeit besteht nicht. Wartungsarbeiten, technische Störungen
              oder höhere Gewalt können zu vorübergehenden Einschränkungen führen.
            </p>
          </section>

          {/* 7. Inhalte und Moderation */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              7. Inhalte und Moderation
            </h2>
            <p>
              Nutzer sind für ihre veröffentlichten Inhalte selbst verantwortlich.
              Der Betreiber behält sich vor, Inhalte zu entfernen oder Nutzer
              vorübergehend stummzuschalten oder zu sperren, wenn diese gegen
              geltendes Recht oder diese AGB verstoßen.
            </p>
            <p className="mt-2">
              Bei wiederholten oder schwerwiegenden Verstößen kann der Zugang
              dauerhaft gesperrt werden. Betroffene Nutzer werden über die
              getroffene Maßnahme informiert.
            </p>
          </section>

          {/* 8. Zahlungen und Kündigung */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              8. Zahlungen und Kündigung
            </h2>

            <h3 className="mt-3 font-semibold">8.1 Kostenfreie Nutzung</h3>
            <p>
              Nachbar Free ist dauerhaft kostenfrei. Der Betreiber behält sich
              vor, Funktionen weiterzuentwickeln, zu ändern oder neu zu
              strukturieren. Wesentliche Änderungen bestehender Funktionen
              werden vorab angekündigt.
            </p>

            <h3 className="mt-3 font-semibold">8.2 Kostenpflichtige Funktionen</h3>
            <p>
              Nachbar Plus, Pro Community und Pro Medical sind kostenpflichtige
              Abonnements. Die Zahlung erfolgt über den Zahlungsdienstleister
              Stripe. Die aktuellen Preise werden vor Vertragsabschluss
              transparent angezeigt.
            </p>

            <h3 className="mt-3 font-semibold">8.3 Kündigung</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>Durch den Nutzer:</strong> Jederzeit zum Ende des
                laufenden Abrechnungszeitraums. Die Kündigung kann in den
                Profileinstellungen oder per E-Mail erfolgen.
              </li>
              <li>
                <strong>Durch den Betreiber:</strong> Bei schwerwiegenden
                Verstößen gegen diese AGB kann der Betreiber das
                Nutzungsverhältnis fristlos kündigen.
              </li>
            </ul>
            <p className="mt-2">
              Bei Kündigung werden Ihre Daten gemäß der Datenschutzerklärung
              gelöscht (siehe{" "}
              <Link href="/datenschutz" className="text-quartier-green underline">
                Datenschutzerklärung §11
              </Link>).
            </p>
          </section>

          {/* 9. Pilotbetrieb */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              9. Pilotbetrieb
            </h2>
            <p>
              QuartierApp befindet sich derzeit im <strong>Pilotbetrieb</strong>,
              insbesondere im Pilotgebiet Bad Säckingen. Im Rahmen des
              Pilotbetriebs gilt:
            </p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>
                Funktionsumfang, Preise und Nutzungsbedingungen können sich
                ändern. Wesentliche Änderungen werden vorab angekündigt.
              </li>
              <li>
                Während der Pilotphase können kostenpflichtige Funktionen
                vorübergehend kostenfrei angeboten werden.
              </li>
              <li>
                Feedback der Pilotteilnehmer fließt aktiv in die
                Weiterentwicklung ein.
              </li>
            </ul>
          </section>

          {/* 10. Schlussbestimmungen */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              10. Schlussbestimmungen
            </h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                Es gilt das Recht der Bundesrepublik Deutschland.
              </li>
              <li>
                Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder
                werden, bleibt die Wirksamkeit der übrigen Bestimmungen
                unberührt.
              </li>
              <li>
                Änderungen dieser AGB werden den Nutzern in geeigneter Form
                mitgeteilt. Soweit eine ausdrückliche Zustimmung rechtlich
                erforderlich ist, wird diese gesondert eingeholt.
              </li>
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Stand: März 2026
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 flex gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <Link href="/impressum" className="hover:text-anthrazit hover:underline">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-anthrazit hover:underline">
            Datenschutz
          </Link>
          <Link href="/agb" className="font-medium text-anthrazit">
            AGB
          </Link>
        </div>
      </div>
    </div>
  );
}
