import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invalidateFlagCache } from "@/lib/feature-flags-cache";
import {
  FEATURE_FLAG_PHASE_CONFIRM_WORDS,
  FEATURE_FLAG_PHASE_PRESETS,
  type FeatureFlagPresetPhase,
} from "@/lib/feature-flags-presets";

type PresetRequest = {
  phase?: unknown;
  confirm?: unknown;
};

function isPresetPhase(value: unknown): value is FeatureFlagPresetPhase {
  return value === "phase_0" || value === "phase_1" || value === "phase_2";
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
  }

  let body: PresetRequest;
  try {
    body = (await request.json()) as PresetRequest;
  } catch {
    return NextResponse.json(
      { error: "Ungueltiges Anfrage-Format" },
      { status: 400 },
    );
  }

  if (!isPresetPhase(body.phase)) {
    return NextResponse.json({ error: "Ungueltige Phase" }, { status: 400 });
  }

  const expectedConfirm = FEATURE_FLAG_PHASE_CONFIRM_WORDS[body.phase];
  if (body.confirm !== expectedConfirm) {
    return NextResponse.json(
      { error: "Bestaetigungswort stimmt nicht" },
      { status: 400 },
    );
  }

  const preset = FEATURE_FLAG_PHASE_PRESETS[body.phase];
  const reason = `phase-preset:${body.phase}`;
  const rows = Object.entries(preset).map(([key, enabled]) => ({
    key,
    enabled,
    last_change_reason: reason,
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("feature_flags")
      .upsert(rows, { onConflict: "key" });

    if (error) {
      return NextResponse.json(
        { error: "Feature-Flags konnten nicht gesetzt werden" },
        { status: 500 },
      );
    }
  }

  invalidateFlagCache();

  return NextResponse.json({
    phase: body.phase,
    changed: rows.length,
  });
}
