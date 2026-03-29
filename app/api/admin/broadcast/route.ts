import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { sendBroadcast, getBroadcastHistory } from "@/modules/admin/services/broadcast.service";

/**
 * POST /api/admin/broadcast
 *
 * Push-Broadcast senden und persistieren.
 * Nur fuer Admins. Speichert den Broadcast als Notification fuer alle Nutzer.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Admin-Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges Anfrage-Format" }, { status: 400 });
  }

  try {
    const baseUrl = request.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "https://quartierapp.de";
    const result = await sendBroadcast(supabase, {
      title: body.title,
      body: body.body,
      audience: body.audience,
      street: body.street,
      urgency: body.urgency,
      baseUrl,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * GET /api/admin/broadcast
 *
 * Broadcast-History laden (letzte 50).
 */
export async function GET() {
  const supabase = await createClient();

  // Admin-Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
  }

  try {
    const history = await getBroadcastHistory(supabase);
    return NextResponse.json({ history });
  } catch (error) {
    return handleServiceError(error);
  }
}
