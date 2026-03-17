import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice, isAuthError } from "@/lib/device/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const authResult = await authenticateDevice(request, body);
  if (isAuthError(authResult)) return authResult;
  const { device, supabase } = authResult;

  const { reminderId } = body;
  if (!reminderId) {
    return NextResponse.json(
      { error: "reminderId erforderlich" },
      { status: 400 }
    );
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(reminderId)) {
    return NextResponse.json(
      { error: "Ungültiges Format" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("kiosk_reminders")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", reminderId)
    .eq("household_id", device.household_id)
    .is("acknowledged_at", null)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Erinnerung nicht gefunden" },
      { status: 404 }
    );
  }

  return NextResponse.json({ acknowledged: true });
}
