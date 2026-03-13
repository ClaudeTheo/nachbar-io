"use client";

import { useTerminal } from "@/lib/terminal/TerminalContext";
import NightModeOverlay from "./NightModeOverlay";

/**
 * NightModeGate: Rendert das Nachtmodus-Overlay nur wenn isNightMode aktiv ist.
 * Muss innerhalb von TerminalProvider verwendet werden.
 */
export function NightModeGate() {
  const { isNightMode } = useTerminal();

  if (!isNightMode) return null;

  return <NightModeOverlay />;
}
