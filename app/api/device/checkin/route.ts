import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert");
  }
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token } = body;

  if (!token || typeof token !== "string" || token.length < 16 || token.length > 128 || !/^[a-f0-9]+$/i.test(token)) {
    return NextResponse.json({ error: "Ungueltiges Token-Format" }, { status: 401 });
  }

  const supabase = getSupabase();

  // Token validieren
  const { data: device, error: tokenError } = await supabase
    .from("device_tokens")
    .select("id, household_id")
    .eq("token", token)
    .single();

  if (tokenError || !device) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 401 });
  }

  // Check-in erstellen (senior_checkins Tabelle)
  const { error: checkinError } = await supabase
    .from("senior_checkins")
    .insert({
      user_id: device.household_id,
      checked_in_at: new Date().toISOString(),
    });

  if (checkinError) {
    return NextResponse.json({ error: "Check-in fehlgeschlagen" }, { status: 500 });
  }

  // Last-seen aktualisieren
  await supabase
    .from("device_tokens")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", device.id);

  return NextResponse.json({ success: true, checkedInAt: new Date().toISOString() });
}
