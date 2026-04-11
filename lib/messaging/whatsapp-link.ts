// lib/messaging/whatsapp-link.ts
// Task H-1: Pure Helper fuer den /schreiben-Screen (Senior-UI).
//
// Baut aus einer rohen Telefonnummer einen wa.me-Link, damit der Senior
// mit einem Tap die vertraute WhatsApp-Oberflaeche an seinem Geraet
// oeffnet — ohne dass die App selbst Messaging-Backend haben muss.
//
// Warum eine pure Funktion?
//   - Testbar ohne DOM/Fetch/Supabase
//   - Wiederverwendbar in Server- und Client-Komponenten
//   - Single Source of Truth fuer Nummern-Normalisierung
//
// Annahme: Default-Country = DE. Nummern die mit "0" beginnen werden als
// DE-Nummer interpretiert und zu "49..." umgeschrieben. Schon internationale
// Nummern (mit "+" oder Laendercode 49) werden unveraendert uebernommen.

const MIN_DIGITS = 6;

export function buildWhatsAppLink(
  phone: string | null | undefined,
  text?: string,
): string | null {
  if (phone == null) return null;

  // Alle Nicht-Ziffern raus (Leerzeichen, +, -, Klammern, ...)
  const digitsRaw = phone.replace(/\D/g, "");
  if (digitsRaw.length < MIN_DIGITS) return null;

  // Deutsche Nationalformate: fuehrende 0 durch Laendercode 49 ersetzen.
  // Bei "+49..." liefert der Strip-Schritt bereits "49...", also unveraendert.
  const digits = digitsRaw.startsWith("0")
    ? `49${digitsRaw.slice(1)}`
    : digitsRaw;

  const base = `https://wa.me/${digits}`;
  if (text && text.trim().length > 0) {
    return `${base}?text=${encodeURIComponent(text)}`;
  }
  return base;
}
