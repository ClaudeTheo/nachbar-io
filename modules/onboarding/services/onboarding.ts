import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { isUserUiMode, type UserUiMode } from "@/lib/user-modes";

interface CompleteOnboardingOptions {
  uiMode?: UserUiMode;
}

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
export async function completeOnboarding(
  options: CompleteOnboardingOptions = {},
): Promise<void> {
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
  const updatePayload: {
    settings: Record<string, unknown>;
    ui_mode?: UserUiMode;
  } = {
    settings: { ...currentSettings, onboarding_completed: true },
  };

  if (options.uiMode && isUserUiMode(options.uiMode)) {
    updatePayload.ui_mode = options.uiMode;
  }

  await supabase
    .from("users")
    .update(updatePayload)
    .eq("id", user.id);
}
