"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MemoryFactItem } from "./MemoryFactItem";
import type { MemoryFact, MemoryCategory } from "../types";

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  profile: "Profil",
  routine: "Routinen",
  preference: "Vorlieben",
  contact: "Kontakte",
  care_need: "Alltagsbedürfnisse",
  personal: "Private Notizen",
};

const CATEGORY_ORDER: MemoryCategory[] = [
  "profile", "routine", "preference", "contact", "care_need", "personal",
];

interface MemoryFactListProps {
  facts: MemoryFact[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, value: string) => void;
  onReset: (scope: "basis" | "care_need" | "personal" | "all") => void;
}

export function MemoryFactList({ facts, onDelete, onUpdate, onReset }: MemoryFactListProps) {
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Fakten nach Kategorie gruppieren
  const grouped = new Map<MemoryCategory, MemoryFact[]>();
  for (const fact of facts) {
    if (!grouped.has(fact.category)) grouped.set(fact.category, []);
    grouped.get(fact.category)!.push(fact);
  }

  if (facts.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
        <p className="text-lg font-medium text-anthrazit">Noch keine Einträge</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ihr Assistent wird sich im Chat automatisch Dinge über Sie merken —
          wenn Sie es erlauben.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.map((category) => {
        const categoryFacts = grouped.get(category);
        if (!categoryFacts || categoryFacts.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="space-y-2">
              {categoryFacts.map((fact) => (
                <MemoryFactItem
                  key={fact.id}
                  fact={fact}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="border-t pt-4">
        {showResetDialog ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="mb-3 text-sm font-medium text-red-800">
              Welche Einträge möchten Sie löschen?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => { onReset("basis"); setShowResetDialog(false); }}
              >
                Basis-Einträge
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => { onReset("all"); setShowResetDialog(false); }}
              >
                Alles löschen
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowResetDialog(false)}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="text-sm text-muted-foreground hover:text-red-500"
            onClick={() => setShowResetDialog(true)}
          >
            Alle Einträge löschen…
          </Button>
        )}
      </div>
    </div>
  );
}
