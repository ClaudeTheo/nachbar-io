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

// Landing Page — quartierapp.de / nachbar-io.vercel.app
// Professionelle Conversion-Seite fuer Bewohner + Organisationen

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#2D3142] via-[#363b52] to-[#2D3142]">
      <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm">
          <MapPin className="h-3.5 w-3.5" />
          Pilot: Bad Saeckingen
        </div>
        <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
          Ihr digitaler
          <br />
          <span className="text-[#4CAF87]">Dorfplatz</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-gray-300 leading-relaxed">
          QuartierApp verbindet echte Nachbarn. Nachbarschaftshilfe,
          Notfall-System, lokale Informationen und Sicherheit fuer Ihre Liebsten
          — in einem vertrauenswuerdigen, geschuetzten Netzwerk.
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
            className="inline-flex items-center rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
          >
            Anmelden
          </Link>
        </div>
        <p className="mt-6 text-xs text-gray-400">
          Kostenlos fuer alle Bewohner. Keine Werbung. Kein Datenverkauf.
        </p>
      </div>
      {/* Dekorative Elemente */}
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#4CAF87]/8 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#4CAF87]/5 blur-2xl" />
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
    text: "Jede App-Nutzung ist ein passives Lebenszeichen. Angehoerige sehen: Es geht Ihren Eltern gut.",
    color: "bg-green-50 text-[#4CAF87]",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Nachbarschaftshilfe",
    text: "Einkauf, Gartenarbeit, Gesellschaft. Finden Sie Helfer in Ihrer Naehe — mit Pflege-Matrix fuer alle 16 Bundeslaender.",
    color: "bg-blue-50 text-blue-500",
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Schwarzes Brett",
    text: "Lokale Neuigkeiten, Fragen und Ankuendigungen. Nur fuer verifizierte Bewohner Ihres Quartiers.",
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
    text: "EU-Hosting Frankfurt. AES-256 Verschluesselung. Keine Werbung. Keine Tracker. Ihre Daten gehoeren Ihnen.",
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
        Eine App fuer Sicherheit, Gemeinschaft und lokale Informationen.
        Entwickelt fuer alle Altersgruppen — mit besonderem Fokus auf Senioren.
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
            Fuer Kinder, Enkel und Angehoerige: Sehen Sie auf einen Blick, wann
            Ihr Familienmitglied zuletzt aktiv war. Ohne Ueberwachung — nur ein
            beruhrigendes Lebenszeichen.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Heartbeat-Status (letzte Aktivitaet)",
              "Taegliches Check-in (gut / geht so / schlecht)",
              "Video-Anruf (wie FaceTime)",
              "Eskalation bei laengerer Inaktivitaet",
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
          <p className="mt-6 text-lg font-bold text-[#2D3142]">
            8,90 EUR{" "}
            <span className="text-sm font-normal text-gray-400">/ Monat</span>
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
              <p className="text-xs text-gray-400">Heutiges Check-in</p>
              <p className="mt-1 text-sm font-semibold text-[#2D3142]">
                😊 &quot;Mir geht es gut&quot;
              </p>
            </div>
            <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-400">Medikamente</p>
              <p className="mt-1 text-sm font-semibold text-[#4CAF87]">
                ✓ Alle bestaetigt
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
          Fuer Organisationen & Aerzte
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-center text-sm text-gray-400">
          B2B-Loesungen fuer Kommunen, Pflegedienste, Wohnungsbaugesellschaften
          und Aerzte.
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
            <p className="mt-1 text-xs text-gray-400">
              Kommunen, Pflegedienste, Wohnungsbau
            </p>
            <p className="mt-4 text-3xl font-bold">
              79 EUR{" "}
              <span className="text-sm font-normal text-gray-400">
                / Quartier / Monat
              </span>
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
                  className="flex items-center gap-2 text-sm text-gray-300"
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
            <p className="mt-1 text-xs text-gray-400">
              Aerzte, Telemedizin-Anbieter
            </p>
            <p className="mt-4 text-3xl font-bold">
              89 EUR{" "}
              <span className="text-sm font-normal text-gray-400">
                / Monat + 5 EUR / Termin
              </span>
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
                  className="flex items-center gap-2 text-sm text-gray-300"
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
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#4CAF87] hover:underline"
          >
            Mehr erfahren fuer Organisationen
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
    { value: "AES-256", label: "Verschluesselung" },
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
        <p className="mt-4 text-base text-white/80">
          Kostenlos fuer alle Bewohner. Laden Sie Ihre Nachbarn ein und machen
          Sie Ihr Quartier ein Stueck sicherer.
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
            <p className="mt-1 text-xs text-gray-400">
              Ihr digitaler Dorfplatz — ein Projekt von nachbar.io
            </p>
          </div>
          <div className="flex gap-6 text-xs text-gray-400">
            <Link
              href="/impressum"
              className="hover:text-[#2D3142] transition-colors"
            >
              Impressum
            </Link>
            <Link
              href="/datenschutz"
              className="hover:text-[#2D3142] transition-colors"
            >
              Datenschutz
            </Link>
            <Link
              href="/agb"
              className="hover:text-[#2D3142] transition-colors"
            >
              AGB
            </Link>
            <Link
              href="/b2b"
              className="hover:text-[#2D3142] transition-colors"
            >
              Fuer Organisationen
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <>
      <Hero />
      <FeaturesSection />
      <HowItWorks />
      <ForFamilies />
      <ForOrganizations />
      <Trust />
      <CTASection />
      <Footer />
    </>
  );
}
