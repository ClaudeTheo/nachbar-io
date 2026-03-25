import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Datenschutzerklärung gemäß DSGVO Art. 13, 14
// TDDDG-konform, Stand: März 2026
export default function DatenschutzPage() {
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
          Datenschutzerklärung
        </h1>

        <div className="space-y-8 text-sm leading-relaxed text-anthrazit/80">
          {/* 1. Verantwortlicher */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              1. Verantwortlicher
            </h2>
            <p>
              Verantwortlich für die Datenverarbeitung auf dieser Plattform ist:
            </p>
            <p className="mt-2">
              Thomas Theobald<br />
              Purkersdorfer Straße 35<br />
              79713 Bad Säckingen<br />
              E-Mail: ThomasTh@gmx.de
            </p>
          </section>

          {/* 2. Geltungsbereich */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              2. Geltungsbereich
            </h2>
            <p>
              Diese Datenschutzerklärung gilt für alle Zugangswege zu QuartierApp:
              die Web-App (nachbar-io.vercel.app), das Arzt-Portal
              (nachbar-arzt.vercel.app) sowie das Pi-Kiosk-Terminal im Quartier.
              Alle Zugangswege nutzen dieselbe Datenbank und unterliegen denselben
              Datenschutzgrundsätzen.
            </p>
          </section>

          {/* 3. Überblick */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              3. Überblick der Verarbeitung
            </h2>
            <p>
              QuartierApp ist eine Kommunikationsplattform für Nachbarschaftshilfe
              und Quartiersvernetzung. Wir verarbeiten personenbezogene Daten nur,
              soweit dies zur Bereitstellung der Plattform erforderlich ist oder
              Sie ausdrücklich eingewilligt haben.
            </p>
          </section>

          {/* 4. Rechtsgrundlagen */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              4. Rechtsgrundlagen
            </h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> — Vertragserfüllung:
                Registrierung, Nutzung der Plattform, Abwicklung kostenpflichtiger
                Funktionen
              </li>
              <li>
                <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> — Berechtigtes Interesse:
                Sicherheit der Plattform, Missbrauchsverhinderung, Nachrichtenaufbereitung
              </li>
              <li>
                <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> — Einwilligung:
                Push-Benachrichtigungen, optionale Profilangaben, Freigabe von
                Statusdaten an Angehörige
              </li>
            </ul>
            <p className="mt-3">
              Soweit Nutzerinnen und Nutzer in bestimmten Funktionen
              gesundheitsbezogene Angaben machen oder daraus besondere Kategorien
              personenbezogener Daten im Sinne von Art. 9 Abs. 1 DSGVO
              hervorgehen, erfolgt die Verarbeitung ausschließlich auf Grundlage
              einer gesonderten, ausdrücklichen Einwilligung gemäß
              Art. 9 Abs. 2 lit. a DSGVO. Diese Einwilligung wird vor der
              erstmaligen Nutzung der betreffenden Funktion eingeholt und kann
              jederzeit widerrufen werden.
            </p>
          </section>

          {/* 5. Erhobene Daten */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              5. Welche Daten wir erheben
            </h2>

            <h3 className="mt-3 font-semibold">5.1 Registrierung</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>E-Mail-Adresse (für Anmeldung via Magic Link)</li>
              <li>Anzeigename (frei wählbar, kein Klarname erforderlich)</li>
              <li>Haushaltszuordnung via Einladungscode oder Standortangabe</li>
            </ul>

            <h3 className="mt-3 font-semibold">5.2 Biometrische Anmeldung (Passkeys)</h3>
            <p className="mb-1">
              Sie können optional eine biometrische Anmeldung (Face ID, Touch ID,
              Windows Hello) aktivieren. Dabei werden <strong>keine biometrischen
              Daten</strong> an unseren Server übermittelt. Die Prüfung von
              Fingerabdruck oder Gesicht erfolgt ausschließlich auf Ihrem Gerät.
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Gespeichert wird nur ein kryptographischer Schlüssel (Public Key), ein Gerätename und ein Signatur-Zähler</li>
              <li>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragsdurchführung) — die Aktivierung erfolgt freiwillig durch Sie</li>
              <li>Löschung: Jederzeit in den Profileinstellungen unter &bdquo;Biometrische Anmeldung&ldquo;</li>
              <li>Bei Kontolöschung werden alle Passkey-Daten automatisch mitgelöscht</li>
            </ul>

            <h3 className="mt-3 font-semibold">5.3 Nutzung der Plattform</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>Hilfeanfragen und -antworten</li>
              <li>Marktplatz-Einträge und Leihbörse</li>
              <li>Veranstaltungsteilnahmen</li>
              <li>Direktnachrichten (nur zwischen Sender und Empfänger sichtbar)</li>
              <li>Umfragen und Abstimmungen</li>
              <li>Kompetenzen (Skills) — nur wenn als öffentlich markiert</li>
              <li>Bewertungen und Empfehlungen</li>
              <li>Reputationsdaten (aggregierte Statistiken Ihrer Aktivitäten)</li>
            </ul>

            <h3 className="mt-3 font-semibold">5.4 Koordinationsfunktionen</h3>
            <p className="mb-1">
              Die folgenden Funktionen sind optional und werden nur bei aktiver
              Nutzung durch Sie erhoben:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>Tagescheck:</strong> Statusmeldung (gut / geht so / schlecht),
                Zeitstempel
              </li>
              <li>
                <strong>Aktivitätssignal (Heartbeat):</strong> Zeitpunkt der letzten
                Interaktion mit der App — kein Inhalt, nur Zeitstempel
              </li>
              <li>
                <strong>Erinnerungen:</strong> Von Ihnen eingegebene Erinnerungstexte,
                Zeitpunkte, Bestätigungen
              </li>
              <li>
                <strong>Angehörigen-Verknüpfung:</strong> Auf Ihre Einladung hin
                können Angehörige Ihren Aktivitätsstatus und Tagescheck-Status
                einsehen — nicht jedoch Nachrichteninhalte, Standort oder Details
              </li>
              <li>
                <strong>Einkaufshilfe:</strong> Einkaufslisten, Zuweisungen an Helfer
              </li>
            </ul>

            <h3 className="mt-3 font-semibold">5.5 Video-Anrufe</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>Angehörigen-Videoanrufe:</strong> Peer-to-Peer-Verbindung
                (WebRTC). Audio- und Videodaten werden direkt zwischen den
                Teilnehmern übertragen und nicht auf unseren Servern gespeichert.
              </li>
              <li>
                <strong>Ärztliche Videosprechstunde:</strong> Über einen
                KBV-zertifizierten Drittanbieter (sprechstunde.online). Für die Datenverarbeitung
                innerhalb der Videosprechstunde gelten die Datenschutzhinweise des
                Anbieters.
              </li>
            </ul>

            <h3 className="mt-3 font-semibold">5.6 Arzt-Portal</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>Arztprofil (Fachrichtung, Beschreibung, Quartierszuordnung)</li>
              <li>Terminbuchungen (Datum, Uhrzeit, Status)</li>
              <li>Anamnese-Bögen (verschlüsselt gespeichert)</li>
              <li>Patientenbewertungen</li>
            </ul>

            <h3 className="mt-3 font-semibold">5.7 Zahlungsdaten</h3>
            <p>
              Für kostenpflichtige Funktionen (Plus, Pro) werden Zahlungsdaten
              ausschließlich durch unseren Zahlungsdienstleister Stripe verarbeitet.
              Wir speichern keine Kreditkarten- oder Bankdaten. Wir erhalten von
              Stripe lediglich eine Referenz-ID sowie den Zahlungsstatus.
            </p>

            <h3 className="mt-3 font-semibold">5.8 Technische Daten</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>IP-Adresse (temporär, für Sicherheitszwecke)</li>
              <li>Push-Subscription-Daten (Endpoint, Schlüssel) für Benachrichtigungen</li>
              <li>Gerätetyp und Browser (für Kompatibilität, nicht für Tracking)</li>
            </ul>

            <h4 className="mt-3 text-sm font-semibold">5.9 Standortdaten bei Hilferufen</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Bei der Erstellung eines Hilferufs können Sie freiwillig Ihren GPS-Standort
              (Breitengrad, Längengrad) teilen. Die Erfassung erfolgt über die Geolocation-API
              Ihres Browsers.
            </p>
            <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)</li>
              <li><strong>Zweck:</strong> Nachbarschaftliche Koordination bei Hilferufen</li>
              <li><strong>Speicherdauer:</strong> Bis der Hilferuf als erledigt markiert wird, dann sofortige automatische Löschung</li>
              <li><strong>Empfänger:</strong> Je nach Abo-Stufe — Angehörige (Plus) sehen den genauen Standort, Organisationen (Pro Community) und Ärzte (Pro Medical) sehen zunächst einen ungefähren Bereich (~50m), nach Helfer-Bestätigung den genauen Standort</li>
              <li><strong>Freie Nutzer:</strong> Sehen keinen Standort, nur den Straßennamen</li>
              <li><strong>Widerruf:</strong> Jederzeit in den Profileinstellungen oder per Checkbox bei jedem einzelnen Hilferuf. Alternativ genügt eine E-Mail an ThomasTh@gmx.de</li>
              <li><strong>Fallback:</strong> Wenn Sie GPS verweigern, wird die hinterlegte Haushaltsadresse als ungefährer Standort verwendet (sofern Standortfreigabe aktiv)</li>
            </ul>
          </section>

          {/* 5.10 Einwilligungsmanagement Care-Modul */}
          <section>
            <h3 className="mb-1 font-semibold text-anthrazit">
              5.10 Einwilligungsmanagement im Care-Modul
            </h3>
            <p>
              Das Care-Modul verarbeitet besondere Kategorien personenbezogener Daten
              (Gesundheitsdaten) gemäß Art. 9 Abs. 1 DSGVO. Die Verarbeitung erfolgt
              ausschließlich auf Grundlage Ihrer ausdrücklichen Einwilligung
              (Art. 9 Abs. 2 lit. a DSGVO).
            </p>
            <p className="mt-2">
              Sie können für folgende Bereiche einzeln einwilligen oder die Einwilligung
              widerrufen:
            </p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li><strong>SOS-Hilferufe:</strong> Kategorie, Freitext-Notizen, GPS-Standort</li>
              <li><strong>Täglicher Check-in:</strong> Stimmungsabfrage, persönliche Notizen</li>
              <li><strong>Medikamenten-Verwaltung:</strong> Medikamentennamen, Dosierungen, Einnahmezeiten</li>
              <li><strong>Pflegeprofil:</strong> Pflegegrad, medizinische Notizen, Versicherungsnummer</li>
              <li><strong>Notfallkontakte:</strong> Telefonnummern und Beziehungen (erfordert SOS-Einwilligung)</li>
            </ul>
            <p className="mt-2">
              <strong>Widerruf:</strong> Sie können jede Einwilligung jederzeit unter
              „Care-Modul → Einwilligungen" widerrufen. Der Widerruf gilt ab sofort
              und berührt nicht die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung
              (Art. 7 Abs. 3 DSGVO). Bei Widerruf können Sie optional auch die
              zugehörigen Daten löschen lassen.
            </p>
            <p className="mt-2">
              <strong>Nachweispflicht:</strong> Zeitpunkt und Version jeder Einwilligung
              werden protokolliert (Art. 7 Abs. 1 DSGVO). Die Protokolle werden
              10 Jahre aufbewahrt.
            </p>
          </section>

          {/* 6. Empfänger und Datenweitergabe */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              6. Empfänger und Datenweitergabe
            </h2>

            <h3 className="mt-3 font-semibold">6.1 Kategorien von Empfängern</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>Andere Nutzer im Quartier:</strong> Nur Inhalte, die Sie
                bewusst veröffentlichen (Einträge, Hilfeanfragen, Bewertungen)
              </li>
              <li>
                <strong>Verknüpfte Angehörige:</strong> Nur Aktivitätsstatus und
                Tagescheck-Status, keine Nachrichteninhalte (nur nach Ihrer
                ausdrücklichen Einladung)
              </li>
              <li>
                <strong>Quartiers-Organisationen (Pro):</strong> Nur anonymisierte
                Statistiken und aggregierte Daten, keine personenbezogenen
                Einzeldaten
              </li>
              <li>
                <strong>Ärzte (Pro Medical):</strong> Nur Daten eigener Patienten
                im Rahmen der Terminbuchung
              </li>
            </ul>

            <h3 className="mt-3 font-semibold">6.2 Auftragsverarbeiter</h3>

            <h4 className="mt-2 font-medium">Supabase (Datenbank & Authentifizierung)</h4>
            <p>
              Supabase Inc., EU-Region Frankfurt. Alle Daten verbleiben in der EU.
              Es gilt ein Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO.
            </p>

            <h4 className="mt-2 font-medium">Vercel (Frontend-Hosting)</h4>
            <p>
              Vercel Inc. Es gilt ein Data Processing Agreement (DPA). Über Vercel
              werden Seitenzugriffe ausgeliefert; personenbezogene Nutzerdaten
              werden nicht an Vercel übermittelt.
            </p>

            <h4 className="mt-2 font-medium">Twilio (SMS & Sprachanrufe)</h4>
            <p>
              Twilio Inc., USA. Wird für den Versand von SMS (Magic-Link-Fallback)
              und Sprachanrufe (SOS-Eskalation) genutzt. Die Übermittlung erfolgt
              auf Grundlage von EU-Standardvertragsklauseln (SCCs) gemäß
              Art. 46 Abs. 2 lit. c DSGVO.
            </p>

            <h4 className="mt-2 font-medium">Stripe (Zahlungsabwicklung)</h4>
            <p>
              Stripe Inc., USA/Irland. Verarbeitet Zahlungsdaten für kostenpflichtige
              Funktionen. Stripe ist als eigenständiger Verantwortlicher für die
              Zahlungsverarbeitung tätig und unterliegt dem EU-US Data Privacy
              Framework sowie eigenen Datenschutzrichtlinien.
            </p>

            <h4 className="mt-2 font-medium">Anthropic (KI-Nachrichtenzusammenfassung)</h4>
            <p>
              Anthropic PBC, USA. Wird für die Zusammenfassung öffentlich
              zugänglicher Nachrichtentexte der Stadt Bad Säckingen verwendet.
              Es werden <strong>ausschließlich öffentliche Nachrichtentexte</strong>
              verarbeitet — keine personenbezogenen Daten, keine Nutzerdaten.
              Übermittlung auf Grundlage von SCCs.
            </p>

            <h4 className="mt-2 font-medium">Anthropic (KI-gestützte Inhaltsmoderation)</h4>
            <p>
              Anthropic PBC, USA. Texte von Beiträgen, Marktplatzanzeigen und
              Chat-Nachrichten werden zur automatisierten Erkennung von
              Regelverstoßen (Spam, Belästigung, Betrug) an Anthropic übermittelt.
              Die Prüfung erfolgt in Echtzeit; Inhalte werden von Anthropic
              <strong> nicht dauerhaft gespeichert</strong> und nicht zum Training
              von KI-Modellen verwendet (Auftragsverarbeitung gemäß Art. 28 DSGVO).
              Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
              an Community-Schutz). Übermittlung auf Grundlage von SCCs.
            </p>

            <h4 className="mt-2 font-medium">Metered Networks (TURN-Server)</h4>
            <p>
              Metered Networks Inc. Stellt TURN-Server für die Verbindungsherstellung
              bei Video-Anrufen bereit, falls eine direkte Peer-to-Peer-Verbindung
              nicht möglich ist. Es werden nur Verbindungsdaten (IP-Adressen)
              temporär verarbeitet, keine Gesprächsinhalte.
            </p>

            <h3 className="mt-3 font-semibold">6.3 Keine weiteren Drittanbieter</h3>
            <p>
              Wir nutzen <strong>kein Google Analytics</strong>, keine Tracking-Pixel,
              keine Social-Media-Plugins und keine Werbedienste.
            </p>
          </section>

          {/* 7. Drittlandtransfer */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              7. Datenübermittlung in Drittländer
            </h2>
            <p>
              Einige unserer Auftragsverarbeiter haben ihren Sitz in den USA
              (Twilio, Stripe, Anthropic, Metered Networks). Die Übermittlung
              personenbezogener Daten erfolgt auf Grundlage von:
            </p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>
                EU-Standardvertragsklauseln (SCCs) gemäß Art. 46 Abs. 2 lit. c DSGVO
              </li>
              <li>
                Teilnahme am EU-US Data Privacy Framework (soweit zutreffend)
              </li>
            </ul>
            <p className="mt-2">
              Die Kerndatenbank (Supabase) befindet sich ausschließlich in der
              EU-Region Frankfurt. Personenbezogene Nutzerdaten verlassen die EU
              nur in dem oben beschriebenen, begrenzten Umfang.
            </p>
          </section>

          {/* 8. Speicherfristen */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              8. Speicherfristen
            </h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>Kontodaten:</strong> Bis zur Löschung Ihres Kontos
              </li>
              <li>
                <strong>Aktivitätssignale (Heartbeats):</strong> 90 Tage,
                danach automatische Löschung
              </li>
              <li>
                <strong>Tagescheck-Historie:</strong> 30 Tage (für Angehörige
                einsehbar), danach automatische Löschung
              </li>
              <li>
                <strong>Audit-Log (Pro-Organisationen):</strong> 12 Monate
              </li>
              <li>
                <strong>Zahlungsdaten (Stripe-Referenzen):</strong> Gemäß
                gesetzlichen Aufbewahrungspflichten (6 bzw. 10 Jahre)
              </li>
              <li>
                <strong>IP-Adressen:</strong> Maximal 7 Tage
              </li>
            </ul>
            <p className="mt-2">
              Nach Ablauf der jeweiligen Frist werden die Daten automatisch
              gelöscht oder anonymisiert.
            </p>
          </section>

          {/* 9. Cookies und lokale Speicherung */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              9. Cookies und lokale Speicherung
            </h2>
            <p>
              QuartierApp verwendet ausschließlich <strong>technisch notwendige
              Cookies</strong> für die Authentifizierung (Supabase Auth Session).
              Diese sind für den Betrieb der Plattform zwingend erforderlich und
              benötigen keine Einwilligung (§ 25 Abs. 2 TDDDG / ePrivacy-Ausnahme).
            </p>
            <p className="mt-2">
              Zusätzlich werden lokale Speicherwerte (localStorage) verwendet,
              um Einstellungen wie den PWA-Installationshinweis oder die
              Bestätigung von Hinweisdialogen zu speichern. Diese Werte enthalten
              keine personenbezogenen Daten.
            </p>
          </section>

          {/* 10. Ihre Rechte */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              10. Ihre Rechte
            </h2>
            <p>Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li><strong>Auskunft</strong> (Art. 15 DSGVO) — Welche Daten wir über Sie speichern</li>
              <li><strong>Berichtigung</strong> (Art. 16 DSGVO) — Korrektur unrichtiger Daten</li>
              <li><strong>Löschung</strong> (Art. 17 DSGVO) — Löschung Ihrer Daten und Ihres Kontos</li>
              <li><strong>Einschränkung</strong> (Art. 18 DSGVO) — Einschränkung der Verarbeitung</li>
              <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO) — Export Ihrer Daten in maschinenlesbarem Format</li>
              <li><strong>Widerspruch</strong> (Art. 21 DSGVO) — Widerspruch gegen Verarbeitung auf Basis berechtigter Interessen</li>
            </ul>
            <p className="mt-3 font-medium text-anthrazit">
              Widerruf von Einwilligungen:
            </p>
            <p>
              Soweit die Verarbeitung auf Ihrer Einwilligung beruht, können Sie
              diese jederzeit mit Wirkung für die Zukunft widerrufen. Die
              Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt
              unberührt. Den Widerruf können Sie in den App-Einstellungen vornehmen
              oder per E-Mail an ThomasTh@gmx.de mitteilen.
            </p>
          </section>

          {/* 11. Kontolöschung und Datenlöschung */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              11. Kontolöschung und Datenlöschung
            </h2>
            <p>
              Sie können Ihr Konto jederzeit in den Profileinstellungen unter
              &bdquo;Konto löschen&ldquo; selbständig löschen. Bei Löschung Ihres Kontos werden
              alle personenbezogenen Daten innerhalb von 30 Tagen unwiderruflich
              gelöscht. Dies umfasst:
            </p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>Nutzerprofil und Einstellungen</li>
              <li>Haushaltszuordnung und Angehörigen-Verknüpfungen</li>
              <li>Alle erstellten Einträge (Hilfeanfragen, Marktplatz, Veranstaltungen)</li>
              <li>Alle Nachrichten</li>
              <li>Tagescheck-Historie und Aktivitätssignale</li>
              <li>Erinnerungen und Einkaufslisten</li>
              <li>Bewertungen und Empfehlungen</li>
              <li>Push-Subscriptions</li>
              <li>Reputationsdaten</li>
            </ul>
            <p className="mt-2">
              Anonymisierte, aggregierte Statistiken (z. B. Gesamtzahl der
              Hilfeanfragen) können zu Analysezwecken beibehalten werden, da
              sie keinen Personenbezug mehr aufweisen.
            </p>
            <p className="mt-2">
              Alternativ können Sie die Löschung Ihrer Daten per E-Mail an
              ThomasTh@gmx.de beantragen.
            </p>
          </section>

          {/* 12. Datensicherheit */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              12. Datensicherheit
            </h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>Verschlüsselung aller Daten während der Übertragung (TLS/HTTPS)</li>
              <li>Verschlüsselung ruhender Daten in der Datenbank (AES-256)</li>
              <li>Zusätzliche Feldverschlüsselung (AES-256-GCM) für besonders sensible Daten</li>
              <li>Row Level Security (RLS) auf allen Datenbanktabellen</li>
              <li>Einladungscode-basierter Zugang (kein offener Zugriff)</li>
              <li>Keine Speicherung von Klartext-Passwörtern</li>
              <li>Regelmäßige Sicherheitsupdates und Security-Audits</li>
            </ul>
          </section>

          {/* 13. Reputationssystem */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              13. Reputationssystem
            </h2>
            <p>
              QuartierApp berechnet ein Reputationslevel basierend auf Ihrer
              Aktivität in der Nachbarschaft (z. B. Hilfeanfragen beantwortet,
              Artikel geteilt, Veranstaltungen besucht). Diese Berechnung erfolgt
              ausschließlich aus bereits vorhandenen Interaktionsdaten.
            </p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>Keine zusätzlichen Daten werden für die Reputation erhoben</li>
              <li>Die detaillierte Statistik ist nur für Sie selbst sichtbar</li>
              <li>Andere Nutzer sehen nur ein kleines Level-Symbol</li>
              <li>Es gibt kein Ranking und keinen Wettbewerb</li>
              <li>Die Reputation wird bei Kontolöschung vollständig gelöscht</li>
            </ul>
          </section>

          {/* 14. Automatisierte Entscheidungsfindung */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              14. Automatisierte Entscheidungsfindung
            </h2>
            <p>
              Es findet keine automatisierte Entscheidungsfindung einschließlich
              Profiling im Sinne von Art. 22 DSGVO statt. Die Berechnung des
              Reputationslevels dient ausschließlich der Anzeige und hat keine
              rechtlichen oder vergleichbar erheblichen Auswirkungen.
            </p>
          </section>

          {/* 15. Minderjährige */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              15. Minderjährige
            </h2>
            <p>
              QuartierApp richtet sich nicht an Kinder. Soweit eine Nutzung durch
              Minderjährige erfolgt, darf dies nur mit Zustimmung der
              Erziehungsberechtigten geschehen, soweit gesetzlich erforderlich.
            </p>
          </section>

          {/* 16. Beschwerderecht */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              16. Beschwerderecht
            </h2>
            <p>
              Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde
              zu beschweren (Art. 77 DSGVO). Zuständig ist:
            </p>
            <p className="mt-2">
              Der Landesbeauftragte für den Datenschutz und die
              Informationsfreiheit Baden-Württemberg<br />
              Lautenschlagerstraße 20<br />
              70173 Stuttgart<br />
              poststelle@lfdi.bwl.de
            </p>
          </section>

          {/* 17. Änderungen */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              17. Änderungen dieser Erklärung
            </h2>
            <p>
              Diese Datenschutzerklärung kann bei Bedarf aktualisiert werden.
              Die aktuelle Version ist stets auf dieser Seite abrufbar. Bei
              wesentlichen Änderungen werden registrierte Nutzer per
              Push-Benachrichtigung oder E-Mail informiert.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Stand: März 2026
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 flex gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <Link href="/impressum" className="hover:text-anthrazit hover:underline">
            Impressum
          </Link>
          <Link href="/datenschutz" className="font-medium text-anthrazit">
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
