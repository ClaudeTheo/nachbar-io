import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Community-Richtlinien — QuartierApp',
  description: 'Verhaltensregeln und Richtlinien für die QuartierApp-Community',
};

export default function RichtlinienPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-anthrazit mb-6">Community-Richtlinien</h1>
      <p className="text-muted-foreground mb-8">
        QuartierApp lebt von gegenseitigem Respekt und Vertrauen. Diese Richtlinien gelten
        für alle Bereiche der App — Schwarzes Brett, Marktplatz, Chat und Kommentare.
      </p>

      {/* Verhaltensregeln */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-anthrazit mb-3">1. Verhaltensregeln</h2>
        <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
          <li><strong>Respektvoll:</strong> Behandeln Sie andere so, wie Sie selbst behandelt werden möchten. Auch bei Meinungsverschiedenheiten bleibt der Ton sachlich.</li>
          <li><strong>Ehrlich:</strong> Geben Sie wahrheitsgemäße Informationen an. Keine irreführenden Angaben zu Produkten, Dienstleistungen oder Personen.</li>
          <li><strong>Hilfsbereit:</strong> Unsere Community lebt von Nachbarschaftshilfe. Unterstützen Sie sich gegenseitig.</li>
          <li><strong>Lokal:</strong> QuartierApp ist für Ihr Quartier. Beiträge sollten einen lokalen Bezug haben.</li>
        </ul>
      </section>

      {/* Verbotene Inhalte */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-anthrazit mb-3">2. Verbotene Inhalte</h2>
        <p className="text-sm text-muted-foreground mb-3">Folgende Inhalte führen zur sofortigen Entfernung und können zu einer Sperre führen:</p>
        <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
          <li><strong>Hassrede und Diskriminierung:</strong> Beleidigungen, Hetze oder Diskriminierung aufgrund von Herkunft, Religion, Geschlecht, Alter oder Behinderung.</li>
          <li><strong>Bedrohungen und Gewalt:</strong> Drohungen, Einschüchterung oder Aufrufe zu Gewalt.</li>
          <li><strong>Betrug und Scam:</strong> Betrügerische Angebote, Phishing oder Identitätsdiebstahl.</li>
          <li><strong>Spam:</strong> Unerwünschte Werbung, Kettenbriefe oder wiederholte Beiträge.</li>
          <li><strong>Illegale Inhalte:</strong> Inhalte, die gegen geltendes Recht verstoßen.</li>
          <li><strong>Unangemessene Inhalte:</strong> Pornografische, extrem verstörende oder jugendgefährdende Inhalte.</li>
        </ul>
      </section>

      {/* Marktplatz-Regeln */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-anthrazit mb-3">3. Marktplatz-Regeln</h2>
        <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
          <li>Nur legale Waren und Dienstleistungen anbieten.</li>
          <li>Ehrliche Beschreibungen und faire Preise.</li>
          <li>Keine Versuche, Transaktionen außerhalb der App abzuwickeln, um den Käuferschutz zu umgehen.</li>
          <li>Keine verbotenen Waren: Waffen, Drogen, verschreibungspflichtige Medikamente, gestohlene Gegenstände.</li>
          <li>Angebote müssen einen lokalen Bezug haben (Abholung im Quartier).</li>
        </ul>
      </section>

      {/* Chat-Regeln */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-anthrazit mb-3">4. Chat-Regeln</h2>
        <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
          <li>Keine Belästigung oder unerwünschte Kontaktaufnahme.</li>
          <li>Kein Spam oder wiederholtes Senden identischer Nachrichten.</li>
          <li>Private Gespräche bleiben vertraulich — keine Screenshots ohne Einwilligung teilen.</li>
        </ul>
      </section>

      {/* Meldeprozess */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-anthrazit mb-3">5. So melden Sie Verstöße</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Wenn Sie einen Verstoß gegen diese Richtlinien bemerken:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-sm text-muted-foreground">
          <li>Tippen Sie auf das Drei-Punkte-Menü (⋮) beim betreffenden Beitrag oder Profil.</li>
          <li>Wählen Sie &quot;Melden&quot; und den passenden Grund aus.</li>
          <li>Optional: Ergänzen Sie Details zur Meldung.</li>
          <li>Unser Moderationsteam prüft die Meldung innerhalb von 24 Stunden.</li>
        </ol>
        <p className="text-sm text-muted-foreground mt-3">
          Bei akuter Gefahr für Leib und Leben rufen Sie bitte sofort <strong>110</strong> (Polizei) oder <strong>112</strong> (Notruf) an.
        </p>
      </section>

      {/* Konsequenzen */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-anthrazit mb-3">6. Konsequenzen bei Verstößen</h2>
        <p className="text-sm text-muted-foreground mb-3">Je nach Schwere des Verstoßes:</p>
        <ol className="list-decimal pl-6 space-y-2 text-sm text-muted-foreground">
          <li><strong>Verwarnung:</strong> Hinweis auf den Regelverstoß mit Aufforderung zur Verhaltensänderung.</li>
          <li><strong>Temporäre Sperre:</strong> Vorübergehende Einschränkung der Nutzung (7-30 Tage).</li>
          <li><strong>Permanente Sperre:</strong> Dauerhafte Sperrung des Accounts bei schweren oder wiederholten Verstößen.</li>
        </ol>
      </section>

      {/* Einspruch */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-anthrazit mb-3">7. Einspruch einlegen</h2>
        <p className="text-sm text-muted-foreground">
          Sie sind mit einer Moderationsentscheidung nicht einverstanden? Schreiben Sie uns an{' '}
          <a href="mailto:support@quartierapp.de" className="text-quartier-green underline">
            support@quartierapp.de
          </a>{' '}
          mit Ihrer Begründung. Wir prüfen jeden Einspruch innerhalb von 48 Stunden.
        </p>
      </section>

      {/* Footer-Links */}
      <div className="border-t pt-6 mt-8 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <Link href="/datenschutz" className="underline hover:text-anthrazit">Datenschutz</Link>
        <Link href="/agb" className="underline hover:text-anthrazit">AGB</Link>
        <Link href="/support" className="underline hover:text-anthrazit">Support</Link>
        <Link href="/impressum" className="underline hover:text-anthrazit">Impressum</Link>
      </div>

      <p className="text-xs text-muted-foreground mt-6">Stand: März 2026</p>
    </main>
  );
}
