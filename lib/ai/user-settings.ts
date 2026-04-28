import type { SupabaseClient } from "@supabase/supabase-js";
import { checkCareConsent } from "@/lib/care/consent";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";
import { ServiceError } from "@/lib/services/service-error";
import { updateConsents } from "@/modules/care/services/consent-routes.service";
import {
  deriveEnabledFromLevel,
  isAiAssistanceLevel,
  type AiAssistanceLevel,
} from "@/lib/ki-help/ai-assistance-levels";

export const AI_HELP_DISABLED_MESSAGE =
  "KI-Hilfe ist ausgeschaltet. Sie koennen die KI-Hilfe in den Einstellungen aktivieren, wenn Sie Vorlesen, Sprachverstehen oder den Assistenten nutzen moechten.";

type JsonObject = Record<string, unknown>;

export interface AiHelpState {
  enabled: boolean;
  assistanceLevel: AiAssistanceLevel;
}

function normalizeSettings(settings: unknown): JsonObject {
  return settings && typeof settings === "object" && !Array.isArray(settings)
    ? { ...(settings as JsonObject) }
    : {};
}

function normalizeAssistanceLevel(settings: JsonObject): AiAssistanceLevel {
  if (isAiAssistanceLevel(settings.ai_assistance_level)) {
    return settings.ai_assistance_level;
  }
  return settings.ai_enabled === true ? "basic" : "off";
}

export async function getAiHelpState(
  supabase: SupabaseClient,
  userId: string,
): Promise<AiHelpState> {
  const { data, error } = await supabase
    .from("users")
    .select("settings")
    .eq("id", userId)
    .single();

  if (error) {
    throw new ServiceError("KI-Einstellungen konnten nicht geladen werden.", 500);
  }

  const settings = normalizeSettings(data?.settings);
  const assistanceLevel = normalizeAssistanceLevel(settings);
  return {
    enabled: deriveEnabledFromLevel(assistanceLevel),
    assistanceLevel,
  };
}

export async function setAiAssistanceLevel(
  supabase: SupabaseClient,
  userId: string,
  level: AiAssistanceLevel,
  reason: string,
): Promise<AiHelpState> {
  const { data, error } = await supabase
    .from("users")
    .select("settings")
    .eq("id", userId)
    .single();

  if (error) {
    throw new ServiceError("KI-Einstellungen konnten nicht geladen werden.", 500);
  }

  const settings = normalizeSettings(data?.settings);
  const previousLevel = normalizeAssistanceLevel(settings);
  const previousEnabled = deriveEnabledFromLevel(previousLevel);
  const nextEnabled = deriveEnabledFromLevel(level);
  const existingLog = Array.isArray(settings.ai_audit_log)
    ? settings.ai_audit_log
    : [];

  const nextSettings = {
    ...settings,
    ai_enabled: nextEnabled,
    ai_assistance_level: level,
    ai_audit_log: [
      ...existingLog.slice(-49),
      {
        at: new Date().toISOString(),
        reason,
        from: previousLevel,
        to: level,
      },
    ],
  };

  const { error: updateError } = await supabase
    .from("users")
    .update({ settings: nextSettings })
    .eq("id", userId);

  if (updateError) {
    throw new ServiceError("KI-Einstellungen konnten nicht gespeichert werden.", 500);
  }

  if (previousEnabled !== nextEnabled) {
    await updateConsents(supabase, userId, { ai_onboarding: nextEnabled });
  }

  return { enabled: nextEnabled, assistanceLevel: level };
}

export async function setAiHelpEnabled(
  supabase: SupabaseClient,
  userId: string,
  enabled: boolean,
  source: string,
): Promise<AiHelpState> {
  return setAiAssistanceLevel(
    supabase,
    userId,
    enabled ? "basic" : "off",
    source,
  );
}

export async function canUsePersonalAi(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const state = await getAiHelpState(supabase, userId);
  if (!state.enabled) return false;

  const providerOff = await isFeatureEnabledServer(supabase, "AI_PROVIDER_OFF");
  if (providerOff) return false;

  return checkCareConsent(supabase, userId, "ai_onboarding");
}

export async function buildAiDisabledResponse(
  supabase: SupabaseClient | undefined,
  userId: string,
): Promise<Record<string, unknown> | null> {
  if (!supabase) return null;
  const allowed = await canUsePersonalAi(supabase, userId);
  if (allowed) return null;
  return {
    message: AI_HELP_DISABLED_MESSAGE,
    aiDisabled: true,
  };
}
