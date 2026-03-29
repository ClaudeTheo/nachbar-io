import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  subscribePush,
  unsubscribePush,
} from "@/lib/services/push-notifications.service";
import { handleServiceError } from "@/lib/services/service-error";

// POST /api/push/subscribe — Push-Subscription speichern
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
    const result = await subscribePush(supabase, user.id, {
      endpoint: body.endpoint,
      keys: body.keys,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

// DELETE /api/push/subscribe — Push-Subscription entfernen
export async function DELETE(request: NextRequest) {
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
    const result = await unsubscribePush(supabase, user.id, body.endpoint);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
