// app/(app)/quartier/QuartierHub.tsx
// "Mein Quartier"-Hub (App-Struktur Welle 3, Option C).
//
// Schlanker statischer Navigations-Hub fuer den Bottom-Tab "Mein Quartier".
// Buendelt alle oeffentlichen Quartier-Bereiche als Kacheln. Bewusst OHNE
// Datenabfragen (anders als der alte QuartierHubLegacy): keine Supabase-Counts,
// kein Feature-Flag, keine Loading-/Fehlerzustaende — damit wartbar und
// Senior-tauglich (grosse Touch-Ziele, klare Labels, schnelle Scanbarkeit).
//
// /quartier-info bleibt fachlich das Info-Modul (Wetter, NINA, OePNV, Apotheken)
// und ist hier nur EINE Kachel ("Wetter & Warnungen"). Die Task-B-5-Entscheidung
// gilt weiter fuer /hier-bei-mir und Voice-/Warnungs-Kontexte; Welle 3 aendert
// nur den Bottom-Tab.
import Link from "next/link";
import {
  Building2,
  Cloud,
  Landmark,
  CalendarDays,
  Map,
  Users,
  ClipboardList,
  Newspaper,
  Trash2,
  Wrench,
  GraduationCap,
  PackageSearch,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface QuartierTile {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
}

// Reihenfolge: Aktuelles/Warnungen zuerst, dann Gemeinschaft, dann Orte.
const tiles: QuartierTile[] = [
  {
    href: "/quartier-info",
    label: "Wetter & Warnungen",
    description: "Wetter, NINA, ÖPNV, Apotheken",
    icon: Cloud,
    iconColor: "text-sky-600",
  },
  {
    href: "/city-services",
    label: "Rathaus & Services",
    description: "Ämter und Behörden",
    icon: Landmark,
    iconColor: "text-blue-700",
  },
  {
    href: "/events",
    label: "Veranstaltungen",
    description: "Was ist los",
    icon: CalendarDays,
    iconColor: "text-violet-600",
  },
  {
    href: "/map",
    label: "Karte",
    description: "Quartier entdecken",
    icon: Map,
    iconColor: "text-emerald-600",
  },
  {
    href: "/gruppen",
    label: "Gruppen",
    description: "Gemeinschaft",
    icon: Users,
    iconColor: "text-quartier-green",
  },
  {
    href: "/board",
    label: "Schwarzes Brett",
    description: "Neuigkeiten",
    icon: ClipboardList,
    iconColor: "text-amber-600",
  },
  {
    href: "/news",
    label: "Nachrichten",
    description: "Aktuelles aus dem Quartier",
    icon: Newspaper,
    iconColor: "text-slate-600",
  },
  {
    href: "/waste-calendar",
    label: "Müllkalender",
    description: "Abfuhrtermine",
    icon: Trash2,
    iconColor: "text-green-700",
  },
  {
    href: "/handwerker",
    label: "Handwerker",
    description: "Betriebe in der Nähe",
    icon: Wrench,
    iconColor: "text-orange-600",
  },
  {
    href: "/experts",
    label: "Experten",
    description: "Rat und Wissen",
    icon: GraduationCap,
    iconColor: "text-indigo-600",
  },
  {
    href: "/lost-found",
    label: "Gefunden & Verloren",
    description: "Fundsachen",
    icon: PackageSearch,
    iconColor: "text-rose-600",
  },
  {
    href: "/polls",
    label: "Abstimmungen",
    description: "Mitentscheiden",
    icon: Vote,
    iconColor: "text-teal-600",
  },
];

export function QuartierHub() {
  return (
    <div className="px-4 py-6 space-y-6">
      <PageHeader
        title={
          <>
            <Building2 className="h-6 w-6 text-blue-700" /> Mein Quartier
          </>
        }
        subtitle="Alles Öffentliche vor Ort"
        backHref="/dashboard"
        backLabel="Zurück zum Dashboard"
      />

      <div className="grid grid-cols-2 gap-3">
        {tiles.map(({ href, label, description, icon: Icon, iconColor }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border shadow-sm p-4 min-h-[100px] flex flex-col justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${iconColor}`} />
              <span className="font-semibold text-anthrazit">{label}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
