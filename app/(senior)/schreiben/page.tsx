// app/(senior)/schreiben/page.tsx
// Task H-1: Senior-UI /schreiben-Screen.
//
// Phase 1 Design-Doc 2026-04-10 Abschnitt 3: Die "Schreiben"-Kachel auf
// /kreis-start zeigt hierher. Der Senior sieht seine Vertrauenskontakte
// (aus CareProfile.emergency_contacts) als >=80px grosse Kacheln und oeffnet
// mit einem Tap WhatsApp auf dem Geraet — keine App-interne Messaging-
// Oberflaeche, die der Senior neu lernen muesste.
//
// Datenquelle: CareProfile.emergency_contacts (Art. 9 DSGVO verschluesselt).
// getCareProfile entschluesselt serverseitig und prueft bei Self-Access
// (seniorId === userId) keinen Consent — der Senior liest sein eigenes
// Profil. Kein Profil / keine Kontakte → leerer Zustand mit Verweis auf
// /care/profile.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCareProfile } from "@/modules/care/services/profile.service";
import { toSchreibenContacts } from "@/lib/messaging/schreiben-contacts";
import { SchreibenView } from "@/components/senior/SchreibenView";
import type { EmergencyContact } from "@/lib/care/types";

export default async function SchreibenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let emergencyContacts: EmergencyContact[] = [];
  try {
    const profile = await getCareProfile(supabase, user.id, user.id);
    if (profile?.emergency_contacts) {
      emergencyContacts = profile.emergency_contacts as EmergencyContact[];
    }
  } catch {
    // Profil-Fehler fuehren zu leerem Zustand, nicht zu 500 — der Senior
    // sieht dann den "Kreis einrichten"-Hinweis. Fehler werden im
    // profile.service bereits geloggt.
    emergencyContacts = [];
  }

  const contacts = toSchreibenContacts(emergencyContacts);
  return <SchreibenView contacts={contacts} />;
}
