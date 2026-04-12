// app/api/sos/notify-family/route.ts
// Nachbar.io — SOS-Familienbenachrichtigung (Thin Route)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyFamily } from "@/lib/sos/notify-family";

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  try {
    const result = await notifyFamily(supabase, user.id);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Benachrichtigung fehlgeschlagen" },
      { status: 500 },
    );
  }
}
