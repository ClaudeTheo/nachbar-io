import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";
import { getUserQuarterId } from "@/lib/quarters/helpers";
import type { Database } from "@/lib/supabase/database.types";

type Provider = "nina" | "dwd" | "uba";
type WarningRow =
  Database["public"]["Tables"]["external_warning_cache"]["Row"];

const FLAG_BY_PROVIDER: Record<Provider, string> = {
  nina: "NINA_WARNINGS_ENABLED",
  dwd: "DWD_WEATHER_WARNINGS_ENABLED",
  uba: "UBA_AIR_QUALITY_ENABLED",
};

const SEVERITY_RANK: Record<WarningRow["severity"], number> = {
  extreme: 4,
  severe: 3,
  moderate: 2,
  minor: 1,
  unknown: 0,
};

export async function listWarnings(provider: Provider) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json([], { status: 401 });
  }

  const allowed = await isFeatureEnabledServer(supabase, FLAG_BY_PROVIDER[provider]);
  if (!allowed) {
    return NextResponse.json([]);
  }

  const quarterId = await getUserQuarterId(supabase, user.id);
  if (!quarterId) {
    return NextResponse.json([]);
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("external_warning_cache")
    .select(
      "id, provider, headline, description, instruction, severity, event_code, onset_at, expires_at, sent_at, attribution_text, attribution_url",
    )
    .eq("provider", provider)
    .eq("status", "active")
    .eq("quarter_id", quarterId)
    .or(`expires_at.is.null,expires_at.gte.${nowIso}`);

  if (error) {
    console.error(`[warnings/${provider}]`, error);
    return NextResponse.json([], { status: 500 });
  }

  const sorted = [...(data ?? [])].sort((a, b) => {
    const aSeverity = (a.severity ?? "unknown") as WarningRow["severity"];
    const bSeverity = (b.severity ?? "unknown") as WarningRow["severity"];
    const severityDiff = SEVERITY_RANK[bSeverity] - SEVERITY_RANK[aSeverity];
    if (severityDiff !== 0) return severityDiff;

    const aSent = a.sent_at ? Date.parse(a.sent_at) : 0;
    const bSent = b.sent_at ? Date.parse(b.sent_at) : 0;
    return bSent - aSent;
  });

  return NextResponse.json(sorted);
}
