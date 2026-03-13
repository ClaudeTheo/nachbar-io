// app/api/notifications/create/route.ts
// Nachbar.io — Server-seitige Notification-Erstellung
// Umgeht RLS-Probleme, da der Service Role Key verwendet wird
// Client ruft diese Route auf statt direkt in die DB zu schreiben

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { safeInsertNotification } from "@/lib/notifications-server";

export async function POST(request: NextRequest) {
  // 1. Authentifizierung pruefen (normaler User-Client)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
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
    return NextResponse.json({ error: "Ungueltiges Format" }, { status: 400 });
  }

  const { userId, type, title, body: notifBody, referenceId, referenceType } = body;

  if (!userId || !type || !title) {
    return NextResponse.json({ error: "userId, type und title sind Pflichtfelder" }, { status: 400 });
  }

  // 3. Kein Self-Notify
  if (user.id === userId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // 4. Service-Role Client fuer INSERT (umgeht RLS)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 5. Notification einfuegen
  const result = await safeInsertNotification(serviceClient, {
    user_id: userId,
    type,
    title,
    body: notifBody || null,
    reference_id: referenceId || null,
    reference_type: referenceType || null,
  });

  if (!result.success) {
    console.error("[api/notifications/create] Fehlgeschlagen:", result.error);
    return NextResponse.json({ error: "Notification konnte nicht erstellt werden" }, { status: 500 });
  }

  // 6. Push-Notification senden (fire-and-forget)
  try {
    const TYPE_ROUTES: Record<string, string> = {
      message: "/messages",
      alert: "/alerts",
      help_match: "/help",
      connection_accepted: "/messages",
      event_participation: "/events",
    };
    const baseRoute = TYPE_ROUTES[type] || "/notifications";
    const pushUrl = referenceId && referenceType
      ? `${baseRoute}/${referenceId}`
      : baseRoute;

    // Interne Push-Route aufrufen
    const pushRes = await fetch(new URL("/api/push/notify", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        userId,
        title,
        body: notifBody,
        url: pushUrl,
        tag: type,
      }),
    });
    if (!pushRes.ok) {
      console.warn("[api/notifications/create] Push fehlgeschlagen:", pushRes.status);
    }
  } catch {
    // Push-Fehler ignorieren
  }

  return NextResponse.json({ ok: true, fallback: result.usedFallback });
}
