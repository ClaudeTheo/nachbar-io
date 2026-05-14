"use client";

import Link from "next/link";
import { useState } from "react";

type FamilySetupNeed = "child" | "senior";

interface SlideFamilySetupProps {
  selected?: FamilySetupNeed[];
  onToggle?: (need: FamilySetupNeed) => void;
}

export function SlideFamilySetup({
  selected = [],
  onToggle,
}: SlideFamilySetupProps) {
  const [localSelected, setLocalSelected] = useState<FamilySetupNeed[]>(selected);

  function toggle(need: FamilySetupNeed) {
    setLocalSelected((current) =>
      current.includes(need)
        ? current.filter((item) => item !== need)
        : [...current, need],
    );
    onToggle?.(need);
  }

  const hasChild = localSelected.includes("child");
  const hasSenior = localSelected.includes("senior");

  return (
    <div className="flex h-full flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-md space-y-5">
        <div>
          <p className="text-sm font-medium text-quartier-green">
            Familie & Betreuung
          </p>
          <h1 className="mt-2 text-2xl font-bold text-anthrazit">
            Möchten Sie Zugänge vorbereiten?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sie können einfach weitergehen oder später alles im Profil erledigen.
          </p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => toggle("child")}
            className={`rounded-xl border p-4 text-left transition-colors ${
              hasChild
                ? "border-quartier-green bg-quartier-green/10"
                : "border-[#ebe5dd] bg-white"
            }`}
          >
            <span className="font-semibold text-anthrazit">
              Kinder ab 13
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Kinder registrieren sich nicht selbst. Der Jugendbereich wird von
              Eltern vorbereitet und freigegeben.
            </span>
          </button>

          <button
            type="button"
            onClick={() => toggle("senior")}
            className={`rounded-xl border p-4 text-left transition-colors ${
              hasSenior
                ? "border-quartier-green bg-quartier-green/10"
                : "border-[#ebe5dd] bg-white"
            }`}
          >
            <span className="font-semibold text-anthrazit">
              Senior unterstützen
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Ein Senior-Zugang kann per QR-Code vorbereitet werden. Sensible
              Daten bleiben bis zur Zustimmung geschützt.
            </span>
          </button>
        </div>

        {(hasChild || hasSenior) && (
          <div className="space-y-3 rounded-xl border border-[#ebe5dd] bg-white p-4">
            {hasChild && (
              <Link
                href="/profile?familySetup=child"
                className="block rounded-lg bg-quartier-green px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Jetzt Kinderzugang vorbereiten
              </Link>
            )}
            {hasSenior && (
              <Link
                href="/profile?familySetup=senior"
                className="block rounded-lg bg-quartier-green px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Jetzt Senior-Zugang vorbereiten
              </Link>
            )}
            <p className="text-center text-sm text-muted-foreground">
              Später im Profil ist genauso möglich.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
