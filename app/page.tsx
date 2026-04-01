import Link from "next/link";
import {
  Shield,
  Heart,
  Users,
  MapPin,
  Phone,
  Bell,
  MessageSquare,
  Building2,
  Stethoscope,
  ArrowRight,
  CircleCheck,
  Smartphone,
} from "lucide-react";
// Next.js Image nicht nötig — Hero-Bild ist statisch

// Landing Page — quartierapp.de / nachbar-io.vercel.app
// Professionelle Conversion-Seite für Bewohner + Organisationen

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f0fdf4] to-white">
      <div className="mx-auto max-w-5xl px-6 pt-16 sm:pt-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#4CAF87]/10 px-4 py-1.5 text-sm text-[#4CAF87] font-medium">
          <MapPin className="h-3.5 w-3.5" />
          Pilot: Bad Säckingen
        </div>
        <h1 className="text-4xl font-extrabold leading-tight text-[#2D3142] sm:text-5xl lg:text-6xl">
          Ihr digitaler
          <br />
          <span className="text-[#4CAF87]">Dorfplatz</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600 leading-relaxed">
          QuartierApp verbindet echte Nachbarn. Nachbarschaftshilfe,
          Notfall-System, lokale Informationen und Sicherheit für Ihre Liebsten
          — in einem vertrauenswürdigen, geschützten Netzwerk.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-[#4CAF87] px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-[#3d9a73] hover:shadow-xl active:scale-95"
          >
            Kostenlos registrieren
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-xl border-2 border-[#2D3142]/20 px-8 py-4 text-base font-semibold text-[#2D3142] transition-all hover:bg-[#2D3142]/5"
          >
            Anmelden
          </Link>
        </div>
        <p className="mt-6 text-xs text-gray-500">
          Kostenlos für alle Bewohner. Keine Werbung. Kein Datenverkauf.
        </p>
      </div>
      {/* Hero-Bild: Nachbarinnen im Quartier */}
      <div className="mx-auto max-w-4xl px-6 pt-8 pb-4">
        <div className="overflow-hidden rounded-2xl shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-quartier.png"
            alt="Zwei Nachbarinnen unterhalten sich in einem deutschen Quartier"
            className="w-full h-auto object-cover"
          />
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Notfall-System",
    text: "SOS-Button mit automatischer Eskalation. Bei Feuer, medizinischem Notfall oder Gefahr: sofortiger 112-Hinweis.",
    color: "bg-red-50 text-red-500",
  },
  {
    icon: <Heart className="h-6 w-6" />,
    title: "Heartbeat",
    text: "Jede App-Nutzung ist ein passives Lebenszeichen. Angehörige sehen: Es geht Ihren Eltern gut.",
    color: "bg-green-50 text-[#4CAF87]",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Nachbarschaftshilfe",
    text: "Einkauf, Gartenarbeit, Gesellschaft. Finden Sie Helfer in Ihrer Nähe — mit Pflege-Matrix für alle 16 Bundesländer.",
    color: "bg-blue-50 text-blue-500",
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Schwarzes Brett",
    text: "Lokale Neuigkeiten, Fragen und Ankündigungen. Nur für verifizierte Bewohner Ihres Quartiers.",
    color: "bg-amber-50 text-amber-500",
  },
  {
    icon: <Smartphone className="h-6 w-6" />,
    title: "Marktplatz",
    text: "Kaufen, leihen, tauschen, verschenken. Und: gemeinsam kochen mit Mitessen-Angeboten.",
    color: "bg-purple-50 text-purple-500",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "DSGVO by Design",
    text: "EU-Hosting Frankfurt. AES-256 Verschlüsselung. Keine Werbung. Keine Tracker. Ihre Daten gehören Ihnen.",
    color: "bg-gray-50 text-gray-600",
  },
];

function FeaturesSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <h2 className="text-center text-2xl font-extrabold text-[#2D3142] sm:text-3xl">
        Alles, was Ihr Quartier braucht
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-center text-sm text-gray-500 leading-relaxed">
        Eine App für Sicherheit, Gemeinschaft und lokale Informationen.
        Entwickelt für alle Altersgruppen — mit besonderem Fokus auf Senioren.
      </p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className={`mb-4 inline-flex rounded-xl p-3 ${f.color}`}>
              {f.icon}
            </div>
            <h3 className="text-base font-bold text-[#2D3142]">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              {f.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "1",
      title: "Registrieren",
      text: "Kostenlos mit E-Mail oder Einladungscode eines Nachbarn.",
    },
    {
      num: "2",
      title: "Quartier beitreten",
      text: "Ihr Standort verbindet Sie automatisch mit Ihrer Nachbarschaft.",
    },
    {
      num: "3",
      title: "Loslegen",
      text: "Schwarzes Brett, Marktplatz, Hilfe und Notfall-System sofort nutzen.",
    },
  ];

  return (
    <section className="bg-[#f9f7f4] py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-2xl font-extrabold text-[#2D3142] sm:text-3xl">
          In 3 Schritten dabei
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.num} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4CAF87] text-xl font-bold text-white shadow-lg">
                {s.num}
              </div>
              <h3 className="mt-4 text-base font-bold text-[#2D3142]">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForFamilies() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#4CAF87]/10 px-4 py-1.5 text-sm font-semibold text-[#4CAF87]">
            <Heart className="h-3.5 w-3.5" />
            Nachbar Plus
          </div>
          <h2 className="text-2xl font-extrabold text-[#2D3142] sm:text-3xl">
            Wissen, dass es Mama gut geht
          </h2>
          <p className="mt-4 text-sm text-gray-500 leading-relaxed">
            Für Kinder, Enkel und Angehörige: Sehen Sie auf einen Blick, wann
            Ihr Familienmitglied zuletzt aktiv war. Ohne Überwachung — nur ein
            beruhigendes Lebenszeichen.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Heartbeat-Status (letzte Aktivität)",
              "Tägliches Check-in (gut / geht so / schlecht)",
              "Video-Anruf (wie FaceTime)",
              "Eskalation bei längerer Inaktivität",
              "Jederzeit widerrufbar durch den Bewohner",
            ].map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-sm text-gray-600"
              >
                <CircleCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#4CAF87]" />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm font-medium text-[#4CAF87]">
            Kostenlos während der Pilotphase
          </p>
        </div>
        <div className="flex items-center justify-center">
          <div className="relative h-80 w-64 rounded-3xl bg-gradient-to-br from-[#f5f0eb] to-[#ebe5dd] p-6 shadow-xl">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#2D3142]/40">
              Status
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-lg">
                  💚
                </div>
                <div>
                  <p className="text-sm font-bold text-[#2D3142]">Mama</p>
                  <p className="text-xs text-[#4CAF87]">Aktiv vor 12 Min.</p>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Heutiges Check-in</p>
              <p className="mt-1 text-sm font-semibold text-[#2D3142]">
                😊 &quot;Mir geht es gut&quot;
              </p>
            </div>
            <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Medikamente</p>
              <p className="mt-1 text-sm font-semibold text-[#4CAF87]">
                ✓ Alle bestätigt
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ForOrganizations() {
  return (
    <section className="bg-[#2D3142] py-16 sm:py-24 text-white">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-2xl font-extrabold sm:text-3xl">
          Für Organisationen & Ärzte
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-center text-sm text-gray-300">
          B2B-Lösungen für Kommunen, Pflegedienste, Wohnungsbaugesellschaften
          und Ärzte.
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {/* Pro Community */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[#4CAF87]/20 p-2 text-[#4CAF87]">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Pro Community</h3>
            </div>
            <p className="mt-1 text-xs text-gray-300">
              Kommunen, Pflegedienste, Wohnungsbau
            </p>
            <p className="mt-4 text-sm font-medium text-[#4CAF87]">
              Preise auf Anfrage
            </p>
            <ul className="mt-6 space-y-2">
              {[
                "Quartier-Dashboard",
                "Content-Moderation",
                "Eskalationsmanagement",
                "CSV/XLSX-Export",
                "Audit-Log",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm text-gray-200"
                >
                  <CircleCheck className="h-3.5 w-3.5 text-[#4CAF87]" /> {f}
                </li>
              ))}
            </ul>
          </div>
          {/* Pro Medical */}
          <div className="rounded-2xl border border-[#4CAF87]/30 bg-[#4CAF87]/10 p-6 backdrop-blur-sm ring-1 ring-[#4CAF87]/20">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[#4CAF87]/20 p-2 text-[#4CAF87]">
                <Stethoscope className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Pro Medical</h3>
            </div>
            <p className="mt-1 text-xs text-gray-300">
              Ärzte, Telemedizin-Anbieter
            </p>
            <p className="mt-4 text-sm font-medium text-[#4CAF87]">
              Preise auf Anfrage
            </p>
            <ul className="mt-6 space-y-2">
              {[
                "Online-Terminbuchung",
                "KBV-Video-Sprechstunde",
                "GDT-Schnittstelle",
                "Patienten-CRM",
                "Digitale Anamnese",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm text-gray-200"
                >
                  <CircleCheck className="h-3.5 w-3.5 text-[#4CAF87]" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/b2b"
            className="inline-flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm font-semibold text-[#4CAF87] hover:underline"
          >
            Mehr erfahren für Organisationen
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const stats = [
    { value: "DSGVO", label: "EU-Hosting Frankfurt" },
    { value: "AES-256", label: "Verschlüsselung" },
    { value: "0", label: "Werbung & Tracker" },
    { value: "112", label: "Notruf immer sichtbar" },
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <h2 className="text-center text-2xl font-extrabold text-[#2D3142] sm:text-3xl">
        Vertrauen ist unser Fundament
      </h2>
      <div className="mt-12 grid gap-6 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-2xl font-extrabold text-[#4CAF87]">{s.value}</p>
            <p className="mt-1 text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="bg-gradient-to-r from-[#4CAF87] to-[#3d9a73] py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6 text-center text-white">
        <h2 className="text-2xl font-extrabold sm:text-3xl">
          Werden Sie Teil Ihres Quartiers
        </h2>
        <p className="mt-4 text-base text-white">
          Kostenlos für alle Bewohner. Laden Sie Ihre Nachbarn ein und machen
          Sie Ihr Quartier ein Stück sicherer.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[#2D3142] shadow-lg transition-all hover:shadow-xl active:scale-95"
          >
            Jetzt kostenlos starten
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="mailto:thomasth@gmx.de?subject=QuartierApp%20Anfrage"
            className="inline-flex items-center rounded-xl border-2 border-white/40 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10"
          >
            <Phone className="mr-2 h-4 w-4" />
            Kontakt
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-white py-10">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm font-bold text-[#2D3142]">QuartierApp</p>
            <p className="mt-1 text-xs text-gray-500">
              Ihr digitaler Dorfplatz — ein Projekt von nachbar.io
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <Link
              href="/impressum"
              className="inline-flex items-center px-3 py-2 min-h-[44px] hover:text-[#2D3142] transition-colors"
            >
              Impressum
            </Link>
            <Link
              href="/datenschutz"
              className="inline-flex items-center px-3 py-2 min-h-[44px] hover:text-[#2D3142] transition-colors"
            >
              Datenschutz
            </Link>
            <Link
              href="/agb"
              className="inline-flex items-center px-3 py-2 min-h-[44px] hover:text-[#2D3142] transition-colors"
            >
              AGB
            </Link>
            <Link
              href="/b2b"
              className="inline-flex items-center px-3 py-2 min-h-[44px] hover:text-[#2D3142] transition-colors"
            >
              Für Organisationen
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function StructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "QuartierApp",
    applicationCategory: "SocialNetworkingApplication",
    operatingSystem: "Web, iOS, Android",
    description:
      "Nachbarschaftshilfe, Notfall-System und lokale Informationen für Ihr Quartier.",
    url: "https://nachbar-io.vercel.app",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Kostenlos für alle Bewohner",
    },
    provider: {
      "@type": "Organization",
      name: "nachbar.io",
      url: "https://nachbar-io.vercel.app",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Bad Säckingen",
        addressCountry: "DE",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function LandingPage() {
  return (
    <>
      <StructuredData />
      <main>
        <Hero />
        <FeaturesSection />
        <HowItWorks />
        <ForFamilies />
        <ForOrganizations />
        <Trust />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
