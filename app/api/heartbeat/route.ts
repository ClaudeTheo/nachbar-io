// app/api/heartbeat/route.ts
// Nachbar.io — Heartbeat API: Passives Check-in bei App-Oeffnung (Thin Wrapper)

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/care/api-helpers";
import { recordHeartbeat } from "@/lib/services/heartbeat.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
    const { supabase, user } = authResult;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ungültiges Anfrage-Format" },
        { status: 400 },
      );
    }

    const result = await recordHeartbeat(supabase, user.id, body);

    return NextResponse.json(result, {
      status: result.deduped ? 200 : 201,
    });
  } catch (error) {
    return handleServiceError(error);
  }
}
