import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/services/push-notifications.service";
import { handleServiceError } from "@/lib/services/service-error";

// POST /api/push/notify — Gezielte Push-Notification an einen bestimmten Nutzer
// Akzeptiert entweder INTERNAL_API_SECRET oder authentifizierte Supabase-Session
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth-Prüfung: Entweder internes Secret oder gültige Session
  const internalSecret = request.headers.get("x-internal-secret");
  const expectedSecret = process.env.INTERNAL_API_SECRET;
  const hasInternalSecret = expectedSecret && internalSecret === expectedSecret;

  if (!hasInternalSecret) {
    // Ohne internes Secret: Nur Admins dürfen Pushes an andere senden
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }
    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "Nur Admins oder internes API-Secret" },
        { status: 403 },
      );
    }
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
    const result = await notifyUser(supabase, {
      userId: body.userId,
      title: body.title,
      body: body.body,
      url: body.url,
      tag: body.tag,
    });

    // Kompatibilitaet: Wenn keine Subscriptions, Nachricht zurueckgeben
    if (result.sent === 0 && result.failed === 0) {
      return NextResponse.json({
        sent: 0,
        message: "Nutzer hat keine Push-Subscriptions",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
