// Haptic Feedback Utility fuer Mobile-Geraete
// Nutzt navigator.vibrate() — Fallback: nichts passiert

export function haptic(type: "light" | "medium" | "heavy" = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const patterns = { light: 10, medium: 20, heavy: 40 };
  navigator.vibrate(patterns[type]);
}
