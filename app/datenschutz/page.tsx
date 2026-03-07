import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Datenschutzerklaerung gemaess DSGVO Art. 13, 14
// TMG-konform, Stand: Maerz 2026
export default function DatenschutzPage() {
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

        <h1 className="mb-8 text-2xl font-bold text-anthrazit">
          Datenschutzerklaerung
        </h1>

        <div className="space-y-8 text-sm leading-relaxed text-anthrazit/80">
          {/* 1. Verantwortlicher */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              1. Verantwortlicher
            </h2>
            <p>
              Verantwortlich fuer die Datenverarbeitung auf dieser Plattform ist:
            </p>
            <p className="mt-2">
              Thomas Theobald<br />
              Purkersdorfer Strasse 35<br />
              79713 Bad Saeckingen<br />
              E-Mail: kontakt@nachbar.io
            </p>
          </section>

          {/* 2. Ueberblick */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              2. Ueberblick der Verarbeitung
            </h2>
            <p>
              nachbar.io ist eine hyperlokale Community-App fuer das Quartier
              Purkersdorfer Strasse / Sanarystrasse / Oberer Rebberg in Bad Saeckingen.
              Wir verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung
              der Plattform erforderlich ist.
            </p>
          </section>

          {/* 3. Rechtsgrundlagen */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              3. Rechtsgrundlagen
            </h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> — Vertragseruellung:
                Registrierung und Nutzung der Plattform
              </li>
              <li>
                <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> — Berechtigtes Interesse:
                Sicherheit der Plattform, Missbrauchsverhinderung
              </li>
              <li>
                <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> — Einwilligung:
                Push-Benachrichtigungen, optionale Profilangaben
              </li>
            </ul>
          </section>

          {/* 4. Erhobene Daten */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              4. Welche Daten wir erheben
            </h2>

            <h3 className="mt-3 font-semibold">4.1 Registrierung</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>E-Mail-Adresse (gespeichert als Hash, nicht im Klartext in unserer Datenbank)</li>
              <li>Anzeigename (frei waehlbar, kein Klarname erforderlich)</li>
              <li>Haushaltszuordnung via Einladungscode</li>
            </ul>

            <h3 className="mt-3 font-semibold">4.2 Nutzung der Plattform</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>Hilfeanfragen und -antworten</li>
              <li>Marktplatz-Eintraege</li>
              <li>Veranstaltungsteilnahmen</li>
              <li>Direktnachrichten (nur zwischen Sender und Empfaenger sichtbar)</li>
              <li>Kompetenzen (Skills) — nur wenn als oeffentlich markiert</li>
              <li>Experten-Bewertungen und -Empfehlungen</li>
              <li>Reputationsdaten (aggregierte Statistiken Ihrer Aktivitaeten)</li>
            </ul>

            <h3 className="mt-3 font-semibold">4.3 Technische Daten</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>IP-Adresse (temporaer, fuer Sicherheit)</li>
              <li>Push-Subscription-Daten (Endpoint, Schluessel) fuer Benachrichtigungen</li>
              <li>Letzte Aktivitaetszeit (fuer Senioren-Check-In)</li>
            </ul>
          </section>

          {/* 5. Datenweitergabe */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              5. Datenweitergabe an Dritte
            </h2>

            <h3 className="mt-3 font-semibold">5.1 Supabase (Hosting & Datenbank)</h3>
            <p>
              Unsere Datenbank wird bei Supabase Inc. in der EU-Region Frankfurt gehostet.
              Es gilt ein Auftragsverarbeitungsvertrag (AVV) gemaess Art. 28 DSGVO.
              Alle Daten verbleiben in der EU.
            </p>

            <h3 className="mt-3 font-semibold">5.2 Vercel (Frontend-Hosting)</h3>
            <p>
              Das Frontend wird ueber Vercel Inc. ausgeliefert (Region Frankfurt).
              Es gilt ein DPA (Data Processing Agreement). Es werden keine
              personenbezogenen Daten an Vercel uebermittelt.
            </p>

            <h3 className="mt-3 font-semibold">5.3 Anthropic (KI-Nachrichtenzusammenfassung)</h3>
            <p>
              Fuer die Zusammenfassung oeffentlicher Nachrichtentexte der Stadt Bad Saeckingen
              nutzen wir die Claude API von Anthropic. Es werden <strong>ausschliesslich
              oeffentlich zugaengliche Nachrichtentexte</strong> verarbeitet —
              keine personenbezogenen Daten, keine Nutzerdaten, keine Adressdaten.
              Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO
              (berechtigtes Interesse an lokaler Nachrichtenaufbereitung).
            </p>

            <h3 className="mt-3 font-semibold">5.4 Keine weiteren Drittanbieter</h3>
            <p>
              Wir nutzen <strong>kein Google Analytics</strong>, keine Tracking-Pixel,
              keine Social-Media-Plugins und keine Werbedienste.
            </p>
          </section>

          {/* 6. Cookies */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              6. Cookies und lokale Speicherung
            </h2>
            <p>
              nachbar.io verwendet ausschliesslich <strong>technisch notwendige Cookies</strong>
              fuer die Authentifizierung (Supabase Auth Session). Diese sind fuer den
              Betrieb der Plattform zwingend erforderlich und benoetigen keine Einwilligung
              (§ 25 Abs. 2 TDDDG / ePrivacy-Ausnahme).
            </p>
            <p className="mt-2">
              Zusaetzlich wird ein lokaler Speicherwert (localStorage) verwendet,
              um zu merken, ob Sie den PWA-Installationshinweis geschlossen haben.
              Dieser Wert enthaelt keine personenbezogenen Daten.
            </p>
          </section>

          {/* 7. Betroffenenrechte */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              7. Ihre Rechte
            </h2>
            <p>Sie haben folgende Rechte bezueglich Ihrer personenbezogenen Daten:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li><strong>Auskunft</strong> (Art. 15 DSGVO) — Welche Daten wir ueber Sie speichern</li>
              <li><strong>Berichtigung</strong> (Art. 16 DSGVO) — Korrektur falscher Daten</li>
              <li><strong>Loeschung</strong> (Art. 17 DSGVO) — Loeschung Ihrer Daten und Ihres Kontos</li>
              <li><strong>Einschraenkung</strong> (Art. 18 DSGVO) — Einschraenkung der Verarbeitung</li>
              <li><strong>Datenuebertragbarkeit</strong> (Art. 20 DSGVO) — Export Ihrer Daten</li>
              <li><strong>Widerspruch</strong> (Art. 21 DSGVO) — Widerspruch gegen Verarbeitung</li>
              <li><strong>Widerruf</strong> (Art. 7 Abs. 3 DSGVO) — Widerruf erteilter Einwilligungen</li>
            </ul>
            <p className="mt-2">
              Zur Ausuebung Ihrer Rechte kontaktieren Sie uns unter kontakt@nachbar.io.
            </p>
          </section>

          {/* 8. Datenlöschung */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              8. Datenloesch-Konzept
            </h2>
            <p>
              Bei Loeschung Ihres Kontos werden alle personenbezogenen Daten
              innerhalb von 30 Tagen unwiderruflich geloescht. Dies umfasst:
            </p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>Nutzerprofil und Einstellungen</li>
              <li>Haushaltszuordnung</li>
              <li>Alle erstellten Eintraege (Alerts, Hilfe, Marktplatz, Events)</li>
              <li>Alle Nachrichten</li>
              <li>Alle Bewertungen und Empfehlungen</li>
              <li>Push-Subscriptions</li>
              <li>Reputationsdaten</li>
            </ul>
            <p className="mt-2">
              Anonymisierte, aggregierte Statistiken (z.B. Gesamtzahl der
              Hilfeanfragen) koennen zu Analysezwecken beibehalten werden.
            </p>
          </section>

          {/* 9. Sicherheit */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              9. Datensicherheit
            </h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>Verschluesselung aller Daten waehrend der Uebertragung (TLS/HTTPS)</li>
              <li>Verschluesselung ruhender Daten in der Datenbank (AES-256)</li>
              <li>Row Level Security (RLS) auf allen Datenbanktabellen</li>
              <li>Einladungscode-basierter Zugang (kein offener Zugriff)</li>
              <li>Keine Speicherung von Klartext-Passwoertern</li>
              <li>Regelmaessige Sicherheitsupdates</li>
            </ul>
          </section>

          {/* 10. Reputationssystem */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              10. Reputationssystem
            </h2>
            <p>
              nachbar.io berechnet ein Reputationslevel basierend auf Ihrer
              Aktivitaet in der Nachbarschaft (z.B. Hilfeanfragen beantwortet,
              Artikel geteilt, Events besucht). Diese Berechnung erfolgt
              ausschliesslich aus bereits vorhandenen Interaktionsdaten.
            </p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>Keine zusaetzlichen Daten werden fuer die Reputation erhoben</li>
              <li>Die detaillierte Statistik ist nur fuer Sie selbst sichtbar</li>
              <li>Andere Nutzer sehen nur ein kleines Level-Symbol</li>
              <li>Es gibt kein Ranking und keinen Wettbewerb</li>
              <li>Die Reputation wird bei Kontoloeschung vollstaendig geloescht</li>
            </ul>
          </section>

          {/* 11. Beschwerderecht */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              11. Beschwerderecht
            </h2>
            <p>
              Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehoerde
              zu beschweren (Art. 77 DSGVO). Zustaendig ist:
            </p>
            <p className="mt-2">
              Der Landesbeauftragte fuer den Datenschutz und die
              Informationsfreiheit Baden-Wuerttemberg<br />
              Lautenschlagerstrasse 20<br />
              70173 Stuttgart<br />
              poststelle@lfdi.bwl.de
            </p>
          </section>

          {/* 12. Aenderungen */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              12. Aenderungen dieser Erklaerung
            </h2>
            <p>
              Diese Datenschutzerklaerung kann bei Bedarf aktualisiert werden.
              Die aktuelle Version ist stets auf dieser Seite abrufbar.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Stand: Maerz 2026
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
        </div>
      </div>
    </div>
  );
}
