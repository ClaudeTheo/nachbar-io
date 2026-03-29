// POST /api/moderation/moderate — Inhalt per KI moderieren
// Business-Logik in moderation.service.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { moderateContentRoute } from "@/lib/services/moderation.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const result = await moderateContentRoute(supabase, user.id, {
      text: body.text,
      channel: body.channel,
      contentId: body.contentId,
      contentType: body.contentType,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
