import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { broadcastPush } from "@/lib/services/push-notifications.service";
import { handleServiceError } from "@/lib/services/service-error";

// POST /api/push/send — Push-Notification an Quartiersmitglieder senden
// Nur intern aufrufbar (per INTERNAL_API_SECRET)
export async function POST(request: NextRequest) {
  // Internes Secret prüfen — nur andere API-Routes dürfen Push senden
  const internalSecret = request.headers.get("x-internal-secret");
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  if (!expectedSecret || internalSecret !== expectedSecret) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
  }

  const supabase = await createClient();

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
    const result = await broadcastPush(supabase, {
      title: body.title,
      body: body.body,
      url: body.url,
      tag: body.tag,
      urgent: body.urgent,
      excludeUserId: body.excludeUserId,
    });

    // Kompatibilitaet: Wenn keine Empfaenger, Nachricht zurueckgeben
    if (result.sent === 0 && result.failed === 0) {
      return NextResponse.json({
        sent: 0,
        message: "Keine Empfänger gefunden",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
