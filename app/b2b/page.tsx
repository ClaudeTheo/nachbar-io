// app/b2b/page.tsx
// Nachbar.io — B2B-Landingpage für Organisationen und Ärzte
import Link from 'next/link';
import {
  Heart, Shield, BarChart3, Users, Phone,
  Building2, Stethoscope, CircleCheck, ArrowRight,
} from 'lucide-react';

// --- Hero Section ---
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#2D3142] to-[#3d4157] text-white">
      <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          Digitale Quartiersvernetzung
          <br />
          <span className="text-[#4CAF87]">für Ihre Organisation</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-gray-200">
          QuartierApp verbindet Bewohner, Angehörige und Organisationen in einem sicheren,
          DSGVO-konformen System. Heartbeat-Monitoring, Einsamkeits-Prävention und
          anonymisierte Quartier-Statistiken — alles in einer Plattform.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="mailto:thomasth@gmx.de?subject=QuartierApp%20B2B%20Anfrage"
            className="inline-flex items-center rounded-lg bg-[#4CAF87] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3d9a73] transition-colors"
          >
            Kontakt aufnehmen
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            App kennenlernen
          </Link>
        </div>
      </div>
      {/* Dekorative Elemente */}
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#4CAF87]/10 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-[#4CAF87]/5 blur-2xl" />
    </section>
  );
}

// --- Vorteile Section ---
const BENEFITS = [
  {
    icon: <Heart className="h-6 w-6" />,
    title: 'Heartbeat-Monitoring',
    description: 'Passive Lebenszeichen durch App-Nutzung. Automatische Eskalation bei Inaktivität — von Erinnerung bis Notfall-Alert.',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Einsamkeits-Prävention',
    description: 'Frühwarnsystem für soziale Isolation. Anonymisierte Inaktivitäts-Daten helfen, gefährdete Bewohner frühzeitig zu erkennen.',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Anonymisierte Statistiken',
    description: 'Quartier-Dashboard mit aggregierten KPIs: Aktivität, Heartbeat-Abdeckung, Check-in-Frequenz. CSV/XLSX-Export inklusive.',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Content-Moderation',
    description: 'Beiträge moderieren, Nutzer stummschalten oder sperren. Vollständiger Audit-Log für alle administrativen Aktionen.',
  },
  {
    icon: <Phone className="h-6 w-6" />,
    title: 'Video-Sprechstunde',
    description: 'KBV-zertifizierte Telemedizin für Ärzte im Quartier. Online-Terminbuchung, digitale Anamnesebögen, GDT-Schnittstelle.',
  },
  {
    icon: <CircleCheck className="h-6 w-6" />,
    title: 'DSGVO-konform',
    description: 'Hosting in Frankfurt (EU). AES-256-Verschlüsselung für sensible Daten. Row-Level Security auf allen Tabellen. AVV verfügbar.',
  },
];

function BenefitsSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <h2 className="text-center text-2xl font-bold text-[#2D3142] sm:text-3xl">
        Warum Organisationen QuartierApp wählen
      </h2>
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((b) => (
          <div key={b.title} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-lg bg-[#4CAF87]/10 p-3 text-[#4CAF87]">
              {b.icon}
            </div>
            <h3 className="text-base font-semibold text-[#2D3142]">{b.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">{b.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Pricing Section ---
const PLANS = [
  {
    name: 'Pro Community',
    icon: <Building2 className="h-5 w-5" />,
    price: '79',
    unit: '/ Quartier / Monat',
    target: 'Kommunen, Pflegedienste, Wohnungsbau',
    features: [
      'Quartier-Dashboard mit Statistiken',
      'Content-Moderation + Audit-Log',
      'Eskalationsmanagement',
      'CSV/XLSX-Export',
      'Nutzer stummschalten / sperren',
      'Anonymisierte Einsamkeits-Indikatoren',
    ],
  },
  {
    name: 'Pro Medical',
    icon: <Stethoscope className="h-5 w-5" />,
    price: '89',
    unit: '/ Monat + 5 / Termin',
    target: 'Ärzte, Telemedizin-Anbieter',
    features: [
      'Online-Terminbuchung (Self-Service)',
      'KBV-zertifizierte Video-Sprechstunde',
      'Patienten-CRM + Anamnese',
      'GDT-Schnittstelle (bidirektional)',
      'Quartiers-Integration (Check-in-Status)',
      'Arzt-Profil + Bewertungen',
    ],
    highlight: true,
  },
];

function PricingSection() {
  return (
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-2xl font-bold text-[#2D3142] sm:text-3xl">
          Transparente Preise
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm text-gray-500">
          Alle Preise netto zzgl. USt. Vertragslaufzeit: monatlich kündbar.
          Voraussetzung: Handelsregister-/Vereinsregister-Nachweis + AVV.
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border bg-white p-6 shadow-sm ${
                plan.highlight ? 'border-[#4CAF87] ring-2 ring-[#4CAF87]/20' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 text-[#2D3142]">
                <div className="rounded-lg bg-[#4CAF87]/10 p-2 text-[#4CAF87]">{plan.icon}</div>
                <h3 className="text-lg font-bold">{plan.name}</h3>
              </div>
              <p className="mt-1 text-xs text-gray-500">{plan.target}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-[#2D3142]">{plan.price} EUR</span>
                <span className="text-sm text-gray-500 ml-1">{plan.unit}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CircleCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#4CAF87]" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:thomasth@gmx.de?subject=QuartierApp%20B2B%20Anfrage%20-%20${plan.name}"
                className="mt-6 block w-full rounded-lg bg-[#2D3142] py-2.5 text-center text-sm font-semibold text-white hover:bg-[#3d4157] transition-colors"
              >
                Kontakt aufnehmen
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Footer ---
function B2BFooter() {
  return (
    <footer className="border-t bg-white py-8">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="text-sm text-gray-500">
          QuartierApp — Ein Projekt von nachbar.io
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Kontakt: thomasth@gmx.de | nachbar.io
        </p>
        <div className="mt-4 flex justify-center flex-wrap gap-2 text-xs text-gray-500">
          <Link href="/impressum" className="inline-flex items-center px-3 py-2 min-h-[44px] hover:text-[#2D3142]">Impressum</Link>
          <Link href="/datenschutz" className="inline-flex items-center px-3 py-2 min-h-[44px] hover:text-[#2D3142]">Datenschutz</Link>
          <Link href="/" className="inline-flex items-center px-3 py-2 min-h-[44px] hover:text-[#2D3142]">Zur App</Link>
        </div>
      </div>
    </footer>
  );
}

// --- Page ---
export default function B2BPage() {
  return (
    <>
      <main>
        <HeroSection />
        <BenefitsSection />
        <PricingSection />
      </main>
      <B2BFooter />
    </>
  );
}
