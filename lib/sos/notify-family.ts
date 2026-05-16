import type { SupabaseClient } from "@supabase/supabase-js";
import { getCareProfile } from "@/modules/care/services/profile.service";
import { sendSms } from "@/modules/care/services/channels/sms";

export interface NotifyFamilyResult {
  notified: number;
  failed: number;
}

/**
 * Benachrichtigt alle Notfallkontakte eines Seniors per SMS.
 * Laedt das CareProfile und sendet eine datensparsame SMS
 * an jeden Kontakt mit gueltiger Telefonnummer.
 */
export async function notifyFamily(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotifyFamilyResult> {
  const empty: NotifyFamilyResult = { notified: 0, failed: 0 };

  // 1. CareProfile laden
  const profile = await getCareProfile(supabase, userId, userId);
  if (!profile) return empty;

  const contacts = profile.emergency_contacts ?? [];
  if (contacts.length === 0) return empty;

  // 2. SMS an alle Kontakte mit Telefonnummer senden
  const message =
    "QuartierApp: Eine Person aus Ihrem hinterlegten Hilfekreis bittet um Rueckmeldung. Bitte oeffnen Sie die App oder melden Sie sich ueber den bekannten direkten Kontakt. Bei akuter Gefahr zuerst 112/110.";

  let notified = 0;
  let failed = 0;

  for (const contact of contacts) {
    if (!contact.phone) continue;

    const success = await sendSms({ phone: contact.phone, message });
    if (success) {
      notified++;
    } else {
      failed++;
    }
  }

  return { notified, failed };
}
