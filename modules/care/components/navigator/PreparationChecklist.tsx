// modules/care/components/navigator/PreparationChecklist.tsx
// 7 Tipps zur Vorbereitung auf die offizielle MD-Begutachtung
"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Lightbulb } from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "diary",
    title: "Pflegetagebuch 2 Wochen führen",
    description:
      "Notieren Sie täglich, welche Hilfe benötigt wird und wie lange. Nutzen Sie dafür unsere PDF-Vorlage.",
  },
  {
    id: "meds",
    title: "Alle Medikamente und Hilfsmittel bereithalten",
    description:
      "Legen Sie alle Medikamentenpläne, Hilfsmittel (Rollator, Inkontinenzmaterial etc.) und Arztberichte bereit.",
  },
  {
    id: "bad_day",
    title: "Typischen (schlechten) Tag beschreiben",
    description:
      "Beschreiben Sie dem Gutachter einen typischen schwierigen Tag — nicht den besten Tag.",
  },
  {
    id: "honest",
    title: "Nicht den besten Tag zeigen",
    description:
      "Viele Menschen neigen dazu, sich zusammenzureißen. Zeigen Sie ehrlich, wo es schwierig ist.",
  },
  {
    id: "companion",
    title: "Angehörige beim Termin dabei haben",
    description:
      "Bitten Sie eine vertraute Person, beim Begutachtungstermin anwesend zu sein. Diese kann ergänzen, was Sie vergessen.",
  },
  {
    id: "appeal",
    title: "Widerspruch einlegen bei Ablehnung",
    description:
      "Bei Ablehnung oder zu niedrigem Pflegegrad haben Sie 4 Wochen Zeit für einen Widerspruch. Lassen Sie sich beraten.",
  },
  {
    id: "support",
    title: "Pflegestützpunkt kontaktieren für kostenlose Beratung",
    description:
      "Pflegestützpunkte beraten kostenlos und unabhängig. Telefon: 030 340 60 66-02 (bundesweit).",
  },
];

export function PreparationChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-amber-500" />
        <h3 className="text-base font-semibold text-anthrazit">
          Vorbereitung auf die MD-Begutachtung
        </h3>
      </div>

      {/* Fortschritt */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          {checkedCount} von {CHECKLIST_ITEMS.length} erledigt
        </span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-quartier-green rounded-full transition-all duration-300"
            style={{ width: `${(checkedCount / CHECKLIST_ITEMS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Checkliste */}
      <div className="space-y-2">
        {CHECKLIST_ITEMS.map((item) => {
          const isChecked = checked[item.id] ?? false;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              className={`
                w-full text-left p-4 rounded-xl border-2 transition-all duration-150
                min-h-[64px]
                ${
                  isChecked
                    ? "border-quartier-green/30 bg-quartier-green/5"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }
              `}
            >
              <div className="flex items-start gap-3">
                {isChecked ? (
                  <CheckCircle2 className="h-5 w-5 text-quartier-green shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${isChecked ? "text-quartier-green line-through" : "text-anthrazit"}`}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
