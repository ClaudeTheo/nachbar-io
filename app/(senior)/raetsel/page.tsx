// app/(senior)/raetsel/page.tsx — Welle SP1-3
// Tagesrätsel für den Senior-Bildschirm: failure-free „kleine Denkpause".
// Die Tagesauswahl (5 Fragen) wird server-seitig deterministisch berechnet und
// an die Client-Komponente übergeben (keine Hydration-Diskrepanz). Keine
// Persistenz, kein Score, kein Ergebnis wird gespeichert.

import { getDailyQuestions } from "@/modules/spiele/services/tagesraetsel.service";
import { TAGESRAETSEL_FRAGEN } from "@/modules/spiele/data/tagesraetsel-fragen";
import { Tagesraetsel } from "@/modules/spiele/components/Tagesraetsel";

export const metadata = {
  title: "Tagesrätsel",
};

export default function SeniorRaetselPage() {
  const fragen = getDailyQuestions(new Date(), TAGESRAETSEL_FRAGEN, 5);

  return (
    <section aria-label="Tagesrätsel">
      <h1 className="mb-2 text-2xl font-bold text-anthrazit">
        Tagesrätsel — kleine Denkpause
      </h1>
      <p className="mb-6 text-base text-anthrazit/70">
        Ganz ohne Eile und ohne Punkte. Nach jeder Antwort gibt es eine kleine
        Geschichte zum Schmunzeln.
      </p>
      <Tagesraetsel fragen={fragen} failureFree />
    </section>
  );
}
