"use client";

import { useMemo, useState } from "react";
import type { Leistung } from "@/lib/leistungen/types";
import { KantonsSchalter, type KantonsSchalterValue } from "./KantonsSchalter";
import { LeistungsKarte } from "./LeistungsKarte";
import { CURATED_CANTONS } from "@/lib/leistungen/types";

interface Props {
  leistungen: readonly Leistung[];
  initialCanton: KantonsSchalterValue;
  otherCanton: string | null;
}

// Client-Wrapper fuer die Leistungsliste.
// Nur nuetzlich fuer CH: Der Kantons-Schalter waehlt die richtige Variante fuer EL-KuBK.
export function LeistungenClient({
  leistungen,
  initialCanton,
  otherCanton,
}: Props) {
  const [canton, setCanton] = useState<KantonsSchalterValue>(initialCanton);
  const isCH = useMemo(
    () => leistungen.some((l) => l.country === "CH"),
    [leistungen],
  );

  return (
    <div>
      {isCH ? (
        <div className="mb-6">
          <KantonsSchalter
            value={canton}
            onChange={setCanton}
            otherCanton={otherCanton ?? undefined}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-5">
        {leistungen.map((l) => {
          const useVariant =
            l.cantonVariants &&
            canton !== "OTHER" &&
            CURATED_CANTONS.includes(canton)
              ? l.cantonVariants[canton]
              : undefined;
          return (
            <LeistungsKarte
              key={l.slug}
              leistung={l}
              cantonVariant={useVariant}
            />
          );
        })}
      </div>
    </div>
  );
}
