"use client";

import { useState } from "react";
import {
  Users,
  Heart,
  Shield,
  Building2,
  Stethoscope,
  CircleCheck,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

const TABS = [
  {
    id: "bewohner",
    label: "Bewohner",
    icon: <Users className="h-5 w-5" />,
    tagline: "Ihr Quartier in der Hosentasche",
    cta: { text: "Kostenlos registrieren", href: "/register" },
    disclaimer: null,
    groups: [
      {
        title: "Kommunikation & Community",
        features: [
          "Schwarzes Brett — Aushänge und Mitteilungen",
          "Marktplatz — Kaufen, verschenken, tauschen",
          "Leihbörse — Werkzeuge, Haushalt, Garten teilen",
          "Mitess-Plätze — Gemeinsame Mahlzeiten koordinieren",
          "Verloren & Gefunden — Fundbüro fürs Quartier",
          "Nachrichten — Direktnachrichten an Nachbarn",
        ],
      },
      {
        title: "Information & Services",
        features: [
          "Quartierskarte — Interaktive Karte mit allen POIs",
          "Info-Hub — Wetter, Pollenflug, NINA-Warnungen, Apotheken, ÖPNV",
          "Müllkalender — Automatische Abfuhr-Erinnerungen",
          "KI-News — Quartiersnachrichten zusammengefasst",
          "Events — Veranstaltungskalender",
        ],
      },
      {
        title: "Sicherheit & Pflege",
        features: [
          "Notfall-System — SOS-Alerts mit 112/110 Banner",
          "Heartbeat — Passives Lebenszeichen bei jeder Nutzung",
          "Tägliches Check-in — Gut / Geht so / Nicht gut",
          "Mein Tag — Tagesübersicht mit Kalender und Schnellaktionen",
          "Medikamenten-Erinnerungen",
          "Notfallmappe — Verschlüsselte Kontakte und medizinische Daten",
        ],
      },
      {
        title: "Hilfe & Experten",
        features: [
          "Nachbar Hilfe — Hilfegesuche erstellen und annehmen",
          "Lokale Experten — Verifizierte Fachleute mit Bewertungen",
          "Handwerker & Betriebe — Sanitär, Elektro, Malerei",
          "Einkaufshilfe — Einkaufslisten koordinieren",
        ],
      },
    ],
  },
  {
    id: "angehoerige",
    label: "Angehörige",
    icon: <Heart className="h-5 w-5" />,
    tagline: "Sicherheit für Ihre Liebsten — aus der Ferne",
    cta: { text: "Kostenlos in der Pilot-Phase", href: "/register" },
    disclaimer: null,
    groups: [
      {
        title: "Status & Sicherheit",
        features: [
          "Heartbeat-Status — Letzte Aktivität des Bewohners sehen",
          "Check-in-Historie — 30-Tage-Verlauf (gut/geht so/schlecht)",
          "Eskalationskette — Automatische Benachrichtigung bei Inaktivität",
          "Medikamenten-Bestätigung — Einnahme bestätigt (ohne Namen)",
        ],
      },
      {
        title: "Kommunikation",
        features: [
          "Video-Call — 1:1 WebRTC P2P (wie FaceTime)",
          "Chat — Direktnachrichten mit dem Bewohner",
          "Kiosk-Fotos — Fotos vom Kiosk-Terminal sehen",
          "Kiosk-Erinnerungen — Erinnerungen auf dem Kiosk setzen",
        ],
      },
      {
        title: "Datenschutz",
        features: [
          "Einladung durch den Bewohner erforderlich (DSGVO-Einwilligung)",
          "Datenprinzip: Status sehen, nicht Inhalt",
          "Jederzeit widerrufbar durch den Bewohner",
        ],
      },
    ],
  },
  {
    id: "pflege",
    label: "Pflege",
    icon: <Shield className="h-5 w-5" />,
    tagline: "Koordination und Organisation für Ihren Pflegedienst",
    cta: {
      text: "Demo anfragen",
      href: "mailto:thomasth@gmx.de?subject=QuartierApp%20Pflege%20Demo",
    },
    disclaimer:
      "Kein Medizinprodukt — Organisations- und Kommunikationswerkzeug gemäß §1 MPG/MDR Abgrenzung",
    groups: [
      {
        title: "Eigenes Pflege-Portal",
        features: [
          "Bewohner-Dashboard — Alle Bewohner mit Ampel-Status",
          "Heartbeat-Überwachung — Letzte Aktivität pro Bewohner",
          "Check-in-Status — Tages-Befinden auf einen Blick",
          "Eskalations-Inbox — Stufe 3/4 in Echtzeit",
          "Quartier-Karte — Bewohner-Verteilung mit Statistiken",
        ],
      },
      {
        title: "Verwaltung & Team",
        features: [
          "Verordnungs-Tracker — Behandlungs-, Grund- und psychiatrische Pflege",
          "Team-Verwaltung — Rollen (Admin/Betrachter), Quartier-Zuweisung",
          "Team-Chat — Channels (allgemein, dringend, pro Quartier)",
          "Notfallmappe — AES-256-GCM verschlüsselt, 3 Ebenen, 72h Offline",
          "Pflegegrad-Navigator — Interaktive Beratung mit KI-Fragebogen",
        ],
      },
    ],
  },
  {
    id: "kommunen",
    label: "Kommunen",
    icon: <Building2 className="h-5 w-5" />,
    tagline: "Ihr Quartier professionell verwalten",
    cta: {
      text: "Kontakt aufnehmen",
      href: "mailto:thomasth@gmx.de?subject=QuartierApp%20Kommune",
    },
    disclaimer: null,
    groups: [
      {
        title: "Eigenes Rathaus-Portal",
        features: [
          "Dashboard — 8 KPI-Karten (Baustellen, Mängel, Warnungen etc.)",
          "Bekanntmachungen — Amtliche Mitteilungen mit Push-Versand",
          "Warnungen — NINA + DWD-Wetter + Hochwasser (PEGELONLINE)",
          "Krisen-Kommunikation — Schweregrade, vorgefertigte Vorlagen",
        ],
      },
      {
        title: "Bürgerbeteiligung & Verwaltung",
        features: [
          "Mängelmelder — 9 Kategorien, Prioritäten, Status-Tracking",
          "Baustellen-Management — Geplant / Aktiv / Abgeschlossen",
          "Bürger-Termine — Anfrage bis Abschluss",
          "Umfragen — Echtzeit-Ergebnisse, optional anonym",
          "Veranstaltungen — Kultur, Sport, Politik, Bildung",
          "Audit-Log + CSV/XLSX-Export",
        ],
      },
    ],
  },
  {
    id: "aerzte",
    label: "Ärzte",
    icon: <Stethoscope className="h-5 w-5" />,
    tagline: "Patientenkommunikation im Quartier",
    cta: {
      text: "Praxis verbinden",
      href: "mailto:thomasth@gmx.de?subject=QuartierApp%20Arztportal",
    },
    disclaimer:
      "Kein Medizinprodukt. Kein TI-Zugang, keine KV-Abrechnung, kein PVS-Ersatz.",
    groups: [
      {
        title: "Eigenes Arzt-Portal",
        features: [
          "Online-Terminbuchung — Patienten buchen selbst",
          "Video-Sprechstunde — KBV-zertifiziert via Sprechstunde.online",
          "Virtuelles Wartezimmer",
          "Patienten-Kontaktverwaltung — Kontaktdaten, Notizen, Historie",
          "Digitale Anamnese-Bögen — Vorlagen, Versand per Link",
        ],
      },
      {
        title: "Integration & Praxis",
        features: [
          "GDT-Schnittstelle — Bidirektionaler Datenaustausch mit PVS",
          "Recall-System — Vorsorge-Erinnerungen automatisch",
          "Praxis-News — Ankündigungen für Patienten",
          "Arzt-Profil + Bewertungen auf QuartierApp",
        ],
      },
    ],
  },
];

export function AudienceTabs() {
  const [activeTab, setActiveTab] = useState("bewohner");
  const [openAccordions, setOpenAccordions] = useState<string[]>(["bewohner"]);

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const activeData = TABS.find((t) => t.id === activeTab)!;

  return (
    <section id="zielgruppen" className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <h2 className="text-center text-2xl font-extrabold text-[#2D3142] sm:text-3xl">
        Für jede Rolle die passende Lösung
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-center text-sm text-gray-500">
        Wählen Sie Ihre Perspektive und entdecken Sie, was QuartierApp für Sie
        bereithält.
      </p>

      {/* Desktop: Tabs */}
      <div className="mt-12 hidden sm:block">
        <div className="flex justify-center gap-2 rounded-2xl bg-gray-100 p-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-white text-[#2D3142] shadow-sm"
                  : "text-gray-600 hover:text-[#2D3142]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-10">
          <div className="mb-6">
            <p className="text-lg font-bold text-[#2e7d5e]">
              {activeData.tagline}
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {activeData.groups.map((group) => (
              <div
                key={group.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <h3 className="text-sm font-bold text-[#2D3142] uppercase tracking-wider mb-4">
                  {group.title}
                </h3>
                <ul className="space-y-2.5">
                  {group.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <CircleCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#4CAF87]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {activeData.disclaimer && (
            <p className="mt-4 text-xs text-gray-400 italic">
              {activeData.disclaimer}
            </p>
          )}
          <div className="mt-8">
            {activeData.cta.href.startsWith("mailto:") ? (
              <a
                href={activeData.cta.href}
                className="inline-flex items-center gap-2 rounded-xl bg-[#357a5d] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#2e7d5e] active:scale-95"
              >
                {activeData.cta.text}
              </a>
            ) : (
              <Link
                href={activeData.cta.href}
                className="inline-flex items-center gap-2 rounded-xl bg-[#357a5d] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#2e7d5e] active:scale-95"
              >
                {activeData.cta.text}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Accordion */}
      <div className="mt-10 space-y-3 sm:hidden">
        {TABS.map((tab) => {
          const isOpen = openAccordions.includes(tab.id);
          return (
            <div
              key={tab.id}
              className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggleAccordion(tab.id)}
                className="flex w-full items-center justify-between p-4 min-h-[56px]"
              >
                <div className="flex items-center gap-3">
                  <div className="text-[#4CAF87]">{tab.icon}</div>
                  <span className="text-sm font-bold text-[#2D3142]">
                    {tab.label}
                  </span>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="border-t border-gray-50 px-4 pb-4">
                  <p className="mt-3 text-sm font-medium text-[#2e7d5e]">
                    {tab.tagline}
                  </p>
                  {tab.groups.map((group) => (
                    <div key={group.title} className="mt-4">
                      <h3 className="text-xs font-bold text-[#2D3142] uppercase tracking-wider mb-2">
                        {group.title}
                      </h3>
                      <ul className="space-y-2">
                        {group.features.map((f) => (
                          <li
                            key={f}
                            className="flex items-start gap-2 text-sm text-gray-600"
                          >
                            <CircleCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#4CAF87]" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {tab.disclaimer && (
                    <p className="mt-3 text-xs text-gray-400 italic">
                      {tab.disclaimer}
                    </p>
                  )}
                  <div className="mt-4">
                    {tab.cta.href.startsWith("mailto:") ? (
                      <a
                        href={tab.cta.href}
                        className="inline-flex items-center rounded-xl bg-[#357a5d] px-5 py-2.5 text-sm font-semibold text-white"
                      >
                        {tab.cta.text}
                      </a>
                    ) : (
                      <Link
                        href={tab.cta.href}
                        className="inline-flex items-center rounded-xl bg-[#357a5d] px-5 py-2.5 text-sm font-semibold text-white"
                      >
                        {tab.cta.text}
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
