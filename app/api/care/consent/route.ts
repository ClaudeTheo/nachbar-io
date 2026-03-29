// app/api/care/consent/route.ts
// Art. 9 Einwilligungsmanagement — Consents lesen und erteilen

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  getConsents,
  updateConsents,
} from "@/modules/care/services/consent-routes.service";

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  try {
    const result = await getConsents(supabase, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  let body: { features?: Record<string, boolean> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const result = await updateConsents(
      supabase,
      user.id,
      body.features as Record<string, boolean>,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
