import type { SupabaseClient } from "@supabase/supabase-js";
import { getCareProfile } from "@/modules/care/services/profile.service";
import { sendSms } from "@/modules/care/services/channels/sms";

export interface NotifyFamilyResult {
  notified: number;
  failed: number;
}

/**
 * Benachrichtigt alle Notfallkontakte eines Seniors per SMS.
 * Laedt das CareProfile, holt den Anzeigenamen und sendet SMS
 * an jeden Kontakt mit gueltige Telefonnummer.
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

  // 2. Anzeigename des Seniors holen
  const { data: userData } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", userId)
    .single();

  const seniorName = userData?.display_name ?? "Ihr Angehöriger";

  // 3. SMS an alle Kontakte mit Telefonnummer senden
  const message = `${seniorName} hat den Notfall-Knopf gedrückt und braucht Ihre Hilfe. Bitte melden Sie sich umgehend.`;

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
