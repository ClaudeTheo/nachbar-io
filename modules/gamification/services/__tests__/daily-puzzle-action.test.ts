import { describe, expect, it } from "vitest";
import { POINTS_CONFIG, ACTION_LABELS } from "@/modules/gamification";

// Welle SP1-4: Teilnahme-Punkte fuers Tagesraetsel. Nur Mitmachen, 1x/Tag,
// kein Ergebnis. Die Aktion muss in der Punkte-Konfiguration existieren, sonst
// vergibt awardPoints nichts (unbekannte Aktion -> awarded:false).

describe("daily_puzzle Punkte-Aktion (SP1-4)", () => {
  it("ist mit 5 Punkten und Tageslimit 1 konfiguriert", () => {
    expect(POINTS_CONFIG.daily_puzzle).toEqual({ points: 5, dailyLimit: 1 });
  });

  it("hat ein lesbares Label fuers UI", () => {
    expect(ACTION_LABELS.daily_puzzle).toBe("Tagesrätsel ausprobiert");
  });
});
