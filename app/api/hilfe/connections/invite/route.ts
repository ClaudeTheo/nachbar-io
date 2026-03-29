// POST /api/hilfe/connections/invite — Einladungs-Code generieren (Senior)
// PUT /api/hilfe/connections/invite — Code einlösen (Helfer)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  generateInviteCode,
  redeemInviteCode,
} from "@/modules/hilfe/services/hilfe-connections.service";

// Senior generiert Einladungs-Code
export async function POST() {
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

  try {
    const result = generateInviteCode(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

// Helfer löst Einladungs-Code ein
export async function PUT(request: NextRequest) {
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

  try {
    const { code, resident_id } = await request.json();
    const connection = await redeemInviteCode(
      supabase,
      user.id,
      code,
      resident_id,
    );
    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
