// lib/messaging/schreiben-contacts.ts
// Task H-1: Transformer fuer den /schreiben-Senior-Screen.
//
// Nimmt die bereits entschluesselten Notfall-/Vertrauenskontakte eines Seniors
// (aus CareProfile.emergency_contacts) und liefert die View-Struktur fuer
// die Schreiben-Kacheln: Name, Beziehung, wa.me-Link (oder null, wenn die
// Nummer nicht verwertbar ist).
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
  whatsappUrl: string | null;
}

export function toSchreibenContacts(
  contacts: EmergencyContact[],
): SchreibenContact[] {
  // Stabile Sortierung nach priority (1 = wichtigste zuerst).
  // Array.prototype.sort ist seit ES2019 garantiert stabil — gleiche priority
  // behaelt die Eingabe-Reihenfolge, was fuer manuell gepflegte Kontaktlisten
  // das erwartete Verhalten ist.
  const sorted = [...contacts].sort((a, b) => a.priority - b.priority);

  return sorted.map((c) => ({
    name: c.name,
    relationship: c.relationship,
    whatsappUrl: buildWhatsAppLink(c.phone),
  }));
}
