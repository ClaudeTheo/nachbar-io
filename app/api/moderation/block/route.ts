// POST /api/moderation/block — Nutzer blockieren/stummschalten
// DELETE /api/moderation/block — Block aufheben
// Business-Logik in moderation.service.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { blockUser, unblockUser } from "@/lib/services/moderation.service";
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
    const result = await blockUser(
      supabase,
      user.id,
      body.blockedId,
      body.blockLevel,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

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
    const result = await unblockUser(supabase, user.id, body.blockedId);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
