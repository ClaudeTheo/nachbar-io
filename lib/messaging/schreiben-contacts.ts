// lib/messaging/schreiben-contacts.ts
// Task H-1: Transformer fuer den /schreiben-Senior-Screen.
//
// Nimmt die bereits entschluesselten Notfall-/Vertrauenskontakte eines Seniors
// (aus CareProfile.emergency_contacts) und liefert die View-Struktur fuer
// die Schreiben-Kacheln: Name, Beziehung, Telefonnummer und Index.
//
// Der Index wird fuer die Navigation zur Mikrofon-Seite benoetigt
// (/schreiben/mic/:index). Die Telefonnummer dient zur Validierung
// (null = keine gueltige Nummer = ausgegraut).
//
// Warum eine pure Funktion?
//   - Testbar ohne Supabase-Mock
//   - Sortier- und URL-Logik einmalig an einem Ort
//   - Page kann sich auf Daten-Laden + Rendern konzentrieren

import type { EmergencyContact } from "@/lib/care/types";
import { buildWhatsAppLink } from "@/lib/messaging/whatsapp-link";

export interface SchreibenContact {
  name: string;
  relationship: string;
  phone: string | null;
  index: number;
}

export function toSchreibenContacts(
  contacts: EmergencyContact[],
): SchreibenContact[] {
  // Stabile Sortierung nach priority (1 = wichtigste zuerst).
  // Array.prototype.sort ist seit ES2019 garantiert stabil — gleiche priority
  // behaelt die Eingabe-Reihenfolge, was fuer manuell gepflegte Kontaktlisten
  // das erwartete Verhalten ist.
  const sorted = [...contacts].sort((a, b) => a.priority - b.priority);

  return sorted.map((c, i) => {
    // buildWhatsAppLink gibt null zurueck wenn die Nummer ungueltig ist —
    // wir nutzen das als Validierung fuer das phone-Feld.
    const validatedUrl = buildWhatsAppLink(c.phone);
    return {
      name: c.name,
      relationship: c.relationship,
      phone: validatedUrl !== null ? c.phone : null,
      index: i,
    };
  });
}
