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
  const { token, alertId } = body;

  if (!token || !alertId) {
    return NextResponse.json({ error: "Token oder alertId fehlt" }, { status: 400 });
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

  // Alert als gesehen markieren
  const { error: ackError } = await supabase
    .from("alert_responses")
    .insert({
      alert_id: alertId,
      household_id: device.household_id,
      response_type: "seen",
      note: "Gesehen via reTerminal E1001",
    });

  if (ackError) {
    return NextResponse.json({ error: "Bestätigung fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
