// POST /api/notifications/create
// Server-seitige Notification-Erstellung (umgeht RLS via Service Role Key)
// Business-Logik in notifications.service.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/services/notifications.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function POST(request: NextRequest) {
  // 1. Authentifizierung prüfen (normaler User-Client)
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

  // 2. Body parsen
  let body: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    referenceId?: string;
    referenceType?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges Format" }, { status: 400 });
  }

  try {
    // 3. Service-Role Client fuer INSERT (umgeht RLS)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // 4. Notification erstellen
    const result = await createNotification(supabase, serviceClient, user.id, {
      userId: body.userId,
      type: body.type,
      title: body.title,
      body: body.body,
      referenceId: body.referenceId,
      referenceType: body.referenceType,
    });

    // 5. Push-Notification senden (fire-and-forget)
    if (!result.skipped && result.pushUrl) {
      try {
        const pushRes = await fetch(new URL("/api/push/notify", request.url), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
          },
          body: JSON.stringify({
            userId: body.userId,
            title: body.title,
            body: body.body,
            url: result.pushUrl,
            tag: body.type,
          }),
        });
        if (!pushRes.ok) {
          console.warn(
            "[api/notifications/create] Push fehlgeschlagen:",
            pushRes.status,
          );
        }
      } catch {
        // Push-Fehler ignorieren
      }
    }

    return NextResponse.json({
      ok: result.ok,
      skipped: result.skipped,
      fallback: result.fallback,
    });
  } catch (error) {
    return handleServiceError(error);
  }
}
