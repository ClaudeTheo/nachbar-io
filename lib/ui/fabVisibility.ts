const MOBILE_BREAKPOINT = 640;
export const COMPACT_FAB_REVEAL_SCROLL_Y = 320;

interface ResolveFabVisibilityOptions {
  currentY: number;
  previousY: number;
  innerWidth: number;
  currentVisible: boolean;
  revealScrollY?: number;
}

export function resolveFabVisibility({
  currentY,
  previousY,
  innerWidth,
  currentVisible,
  revealScrollY = COMPACT_FAB_REVEAL_SCROLL_Y,
}: ResolveFabVisibilityOptions): boolean {
  if (innerWidth >= MOBILE_BREAKPOINT) {
    return true;
  }

  if (currentY < revealScrollY) {
    return false;
  }

  if (currentY > previousY + 10) {
    return false;
  }

  if (currentY < previousY - 10) {
    return true;
  }

  return currentVisible;
}
