"use client";

// Welle SP1-3 — Tagesimpuls-Karte fuer den Tagesueberblick (my-day).
// Eine kleine Denkpause auf dem Erwachsenen-Dashboard: wiederverwendet die
// Tagesraetsel-Komponente + getDailyQuestions (DRY, EINE Quelle). Keine
// Persistenz, kein Score-Speichern. failureFree leitet der Aufrufer aus dem
// ui_mode ab (simple -> ohne Falsch-Markierung).

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tagesraetsel } from "@/modules/spiele/components/Tagesraetsel";
import { getDailyQuestions } from "@/modules/spiele/services/tagesraetsel.service";
import { TAGESRAETSEL_FRAGEN } from "@/modules/spiele/data/tagesraetsel-fragen";

export function TagesimpulsCard({
  failureFree = false,
  count = 3,
}: {
  failureFree?: boolean;
  count?: number;
}) {
  // Nur client-seitig gemountet (my-day rendert erst nach dem Laden) ->
  // keine Hydration-Diskrepanz durch new Date(). Tagesauswahl einmal fixieren.
  const [fragen] = useState(() =>
    getDailyQuestions(new Date(), TAGESRAETSEL_FRAGEN, count),
  );

  return (
    <Card data-testid="tagesimpuls-card">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-quartier-green" />
          <h2 className="text-base font-semibold text-anthrazit">
            Tagesimpuls
          </h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Eine kleine Denkpause — ganz ohne Eile.
        </p>
        <Tagesraetsel fragen={fragen} failureFree={failureFree} />
      </CardContent>
    </Card>
  );
}
