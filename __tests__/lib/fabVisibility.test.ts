import { describe, expect, it } from "vitest";
import {
  COMPACT_FAB_REVEAL_SCROLL_Y,
  resolveFabVisibility,
} from "@/lib/ui/fabVisibility";

describe("resolveFabVisibility", () => {
  it("zeigt FABs auf Desktop immer an", () => {
    expect(
      resolveFabVisibility({
        currentY: 0,
        previousY: 0,
        innerWidth: 1024,
        currentVisible: false,
      }),
    ).toBe(true);
  });

  it("versteckt FABs im ersten Mobile-Screen", () => {
    expect(
      resolveFabVisibility({
        currentY: COMPACT_FAB_REVEAL_SCROLL_Y - 1,
        previousY: 0,
        innerWidth: 390,
        currentVisible: true,
      }),
    ).toBe(false);
  });

  it("versteckt FABs beim Herunterscrollen auf Mobile", () => {
    expect(
      resolveFabVisibility({
        currentY: 420,
        previousY: 360,
        innerWidth: 390,
        currentVisible: true,
      }),
    ).toBe(false);
  });

  it("zeigt FABs beim Zurückscrollen aus tieferen Mobile-Bereichen", () => {
    expect(
      resolveFabVisibility({
        currentY: 360,
        previousY: 420,
        innerWidth: 390,
        currentVisible: false,
      }),
    ).toBe(true);
  });

  it("behält den aktuellen Zustand, wenn kein signifikanter Scroll-Impuls vorliegt", () => {
    expect(
      resolveFabVisibility({
        currentY: 360,
        previousY: 366,
        innerWidth: 390,
        currentVisible: false,
      }),
    ).toBe(false);
  });
});
