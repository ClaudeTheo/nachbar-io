// POST /api/quarter/residents/request
// Kontaktanfrage senden (Chat-Anfrage-Browser)
// Business-Logik in quarter-residents.service.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createResidentRequest } from "@/lib/services/quarter-residents.service";
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

  let body: { hashedId?: string; householdId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges JSON-Format" },
      { status: 400 },
    );
  }

  try {
    const { connectionId, targetUserId } = await createResidentRequest(
      supabase,
      user.id,
      {
        hashedId: body.hashedId ?? "",
        householdId: body.householdId ?? "",
        message: body.message ?? "",
      },
    );

    // Notification senden (fire-and-forget) — bleibt in der Route wegen request.headers
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${appUrl}/api/notifications/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        userId: targetUserId,
        type: "connection_request",
        title: "Neue Kontaktanfrage",
        body: "Ein Nachbar möchte mit Ihnen in Kontakt treten",
        referenceId: connectionId,
        referenceType: "neighbor_connection",
      }),
    }).catch(() => {
      // Notification-Fehler ignorieren — Hauptaktion war erfolgreich
    });

    return NextResponse.json({ success: true, connectionId }, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
