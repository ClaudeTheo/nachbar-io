import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";

// Onboarding-Status pruefen
export async function isOnboardingCompleted(): Promise<boolean> {
  const supabase = createClient();
  const { user } = await getCachedUser(supabase);
  if (!user) return true;

  const { data } = await supabase
    .from("users")
    .select("settings")
    .eq("id", user.id)
    .single();

  const settings = data?.settings as Record<string, unknown> | null;
  return settings?.onboarding_completed === true;
}

// Onboarding als abgeschlossen markieren
export async function completeOnboarding(): Promise<void> {
  const supabase = createClient();
  const { user } = await getCachedUser(supabase);
  if (!user) return;

  // Bestehende Settings lesen und mergen
  const { data: profile } = await supabase
    .from("users")
    .select("settings")
    .eq("id", user.id)
    .single();

  const currentSettings = (profile?.settings as Record<string, unknown>) ?? {};

  await supabase
    .from("users")
    .update({
      settings: { ...currentSettings, onboarding_completed: true },
    })
    .eq("id", user.id);
}
