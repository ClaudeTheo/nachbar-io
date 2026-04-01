import {
  Users,
  Heart,
  Shield,
  Building2,
  Stethoscope,
  CircleCheck,
} from "lucide-react";

const PLANS = [
  {
    name: "Free",
    audience: "Bewohner",
    icon: <Users className="h-6 w-6" />,
    badge: "Dauerhaft kostenlos",
    badgeColor: "bg-gray-100 text-gray-600",
    features: [
      "Schwarzes Brett, Marktplatz, Leihbörse",
      "Quartierskarte + Info-Hub",
      "Müllkalender mit Erinnerungen",
      "Notfall-System + Heartbeat",
      "Nachbar Hilfe + Experten",
      "Mein Tag + Check-in",
    ],
    highlighted: false,
  },
  {
    name: "Plus",
    audience: "Angehörige",
    icon: <Heart className="h-6 w-6" />,
    badge: "Kostenlos in der Pilot-Phase",
    badgeColor: "bg-[#4CAF87]/10 text-[#4CAF87]",
    features: [
      "Alles aus Free",
      "Heartbeat-Status des Bewohners",
      "Check-in-Historie (30 Tage)",
      "1:1 Video-Call (WebRTC)",
      "Chat mit dem Bewohner",
      "Automatische Eskalationskette",
    ],
    highlighted: false,
  },
  {
    name: "Pro Pflege",
    audience: "Pflegedienste",
    icon: <Shield className="h-6 w-6" />,
    badge: "Kostenlos in der Pilot-Phase",
    badgeColor: "bg-[#4CAF87]/10 text-[#4CAF87]",
    features: [
      "Eigenes Pflege-Portal",
      "Bewohner-Dashboard mit Ampel",
      "Eskalations-Inbox (Stufe 3/4)",
      "Verordnungs-Tracker",
      "Team-Verwaltung + Team-Chat",
      "Notfallmappe (AES-256-GCM)",
    ],
    highlighted: false,
  },
  {
    name: "Pro Community",
    audience: "Kommunen",
    icon: <Building2 className="h-6 w-6" />,
    badge: "Kostenlos in der Pilot-Phase",
    badgeColor: "bg-[#4CAF87]/10 text-[#4CAF87]",
    features: [
      "Eigenes Rathaus-Portal",
      "8-KPI-Dashboard",
      "Bekanntmachungen + Push",
      "NINA/DWD/Pegel-Warnungen",
      "Mängelmelder (9 Kategorien)",
      "Umfragen + Veranstaltungen",
    ],
    highlighted: false,
  },
  {
    name: "Pro Medical",
    audience: "Ärzte",
    icon: <Stethoscope className="h-6 w-6" />,
    badge: "Kostenlos in der Pilot-Phase",
    badgeColor: "bg-[#4CAF87]/10 text-[#4CAF87]",
    features: [
      "Eigenes Arzt-Portal",
      "Online-Terminbuchung",
      "Video-Sprechstunde (KBV)",
      "Digitale Anamnese-Bögen",
      "GDT-Schnittstelle (PVS)",
      "Recall-System",
    ],
    highlighted: true,
  },
];

export function PricingOverview() {
  return (
    <section className="bg-[#f9f7f4] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-2xl font-extrabold text-[#2D3142] sm:text-3xl">
          Fünf Versionen — eine Plattform
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-center text-sm text-gray-500">
          Aktuell kostenlos — Preise werden vor dem offiziellen Start bekanntgegeben.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
                plan.highlighted
                  ? "border-[#4CAF87] ring-1 ring-[#4CAF87]/20"
                  : "border-gray-100"
              }`}
            >
              <div className="text-[#4CAF87] mb-3">{plan.icon}</div>
              <h3 className="text-base font-bold text-[#2D3142]">{plan.name}</h3>
              <p className="text-xs text-gray-500">{plan.audience}</p>
              <div
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${plan.badgeColor}`}
              >
                {plan.badge}
              </div>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <CircleCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#4CAF87]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
