import { getAdminSupabase } from "@/lib/supabase/admin";

const TWILIO_FLAG_KEY = "TWILIO_ENABLED";

export async function isTwilioEnabled(): Promise<boolean> {
  try {
    const { data, error } = await getAdminSupabase()
      .from("feature_flags")
      .select("enabled")
      .eq("key", TWILIO_FLAG_KEY)
      .single();

    if (error) {
      console.warn("[care/twilio] Twilio gesperrt — Feature-Flag nicht lesbar", {
        flag: TWILIO_FLAG_KEY,
      });
      return false;
    }

    return data?.enabled === true;
  } catch {
    console.warn("[care/twilio] Twilio gesperrt — Feature-Flag-Pruefung fehlgeschlagen", {
      flag: TWILIO_FLAG_KEY,
    });
    return false;
  }
}
