import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Clock, HelpCircle, Shield, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Support — QuartierApp',
  description: 'Hilfe und Kontakt für QuartierApp',
};

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-anthrazit mb-2">Hilfe & Support</h1>
      <p className="text-muted-foreground mb-8">
        Wir helfen Ihnen gerne bei Fragen rund um QuartierApp.
      </p>

      {/* Kontakt */}
      <section className="mb-8 rounded-xl border bg-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-icon-bg-blue">
            <Mail className="h-5 w-5 text-info-blue" />
          </div>
          <div>
            <h2 className="font-semibold text-anthrazit">Kontakt</h2>
            <p className="text-sm text-muted-foreground">Schreiben Sie uns — wir melden uns zurück.</p>
          </div>
        </div>
        <a
          href="mailto:support@quartierapp.de"
          className="inline-flex items-center gap-2 rounded-lg bg-quartier-green px-4 py-2.5 text-sm font-medium text-white hover:bg-quartier-green-dark transition-colors"
        >
          <Mail className="h-4 w-4" />
          support@quartierapp.de
        </a>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Antwort innerhalb von 48 Stunden
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-anthrazit mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Häufige Fragen
        </h2>
        <div className="space-y-4">
          <FaqItem
            question="Wie melde ich einen Beitrag?"
            answer="Tippen Sie auf das Drei-Punkte-Menü (⋮) neben dem Beitrag und wählen Sie 'Melden'. Unser Moderationsteam prüft die Meldung innerhalb von 24 Stunden."
          />
          <FaqItem
            question="Wie lösche ich mein Konto?"
            answer="Gehen Sie zu Profil → Konto & Daten → Konto löschen. Sie können vorher Ihre Daten exportieren (DSGVO Art. 20)."
          />
          <FaqItem
            question="Wie lade ich Nachbarn ein?"
            answer="Gehen Sie zu Profil → Quartier → Nachbarn einladen. Sie erhalten einen persönlichen Einladungscode, den Sie mit Ihren Nachbarn teilen können."
          />
          <FaqItem
            question="Ist QuartierApp kostenlos?"
            answer="Die Grundfunktionen (Schwarzes Brett, Marktplatz, Notfall-System, Quartierskarte) sind dauerhaft kostenlos. Erweiterte Funktionen für Angehörige und Organisationen sind kostenpflichtig."
          />
        </div>
      </section>

      {/* Links */}
      <section className="border-t pt-6">
        <h2 className="text-sm font-semibold text-anthrazit mb-3">Weitere Informationen</h2>
        <div className="grid gap-2">
          <SupportLink href="/datenschutz" icon={Shield} label="Datenschutzerklärung" />
          <SupportLink href="/agb" icon={FileText} label="Allgemeine Geschäftsbedingungen" />
          <SupportLink href="/richtlinien" icon={Shield} label="Community-Richtlinien" />
          <SupportLink href="/impressum" icon={FileText} label="Impressum" />
        </div>
      </section>

      <p className="text-xs text-muted-foreground mt-8 text-center">
        QuartierApp — Ihr digitaler Dorfplatz
      </p>
    </main>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium text-anthrazit text-sm mb-1">{question}</h3>
      <p className="text-sm text-muted-foreground">{answer}</p>
    </div>
  );
}

function SupportLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg p-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
