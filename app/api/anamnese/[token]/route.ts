// app/api/anamnese/[token]/route.ts
// Nachbar.io — Anamnese-Bogen per Token laden + ausfuellen (Thin Wrapper)
// GET: Formular-Felder laden (kein Login noetig, Token-basiert)
// POST: Antworten speichern (verschluesselt via AES-256-GCM)

import { getAdminSupabase } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import {
  getAnamneseForm,
  submitAnamneseForm,
} from "@/lib/services/anamnese.service";
import { handleServiceError } from "@/lib/services/service-error";

interface RouteContext {
  params: Promise<{ token: string }>;
}

// GET: Formular-Felder laden (kein Login noetig)
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const adminSupabase = getAdminSupabase();
    const result = await getAnamneseForm(adminSupabase, token);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST: Antworten speichern (verschluesselt)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const adminSupabase = getAdminSupabase();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ungültiger Request-Body." },
        { status: 400 },
      );
    }

    const result = await submitAnamneseForm(adminSupabase, token, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
