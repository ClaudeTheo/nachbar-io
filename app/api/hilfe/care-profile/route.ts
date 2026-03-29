// app/api/hilfe/care-profile/route.ts
// Nachbar Hilfe — Pflege-Profil API (Pflegestufe, Kasse, Versichertennummer)
// Versichertennummer wird verschluesselt gespeichert (Art. 9 DSGVO)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  getCareProfile,
  updateCareProfile,
} from "@/modules/hilfe/services/hilfe-billing.service";

// GET /api/hilfe/care-profile — Pflege-Profil lesen
export async function GET() {
  try {
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

    const profile = await getCareProfile(supabase, user.id);
    return NextResponse.json(profile);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/hilfe/care-profile — Pflege-Profil erstellen oder aktualisieren
export async function POST(request: NextRequest) {
  try {
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

    // Request-Body einlesen
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ungueltiges Anfrage-Format" },
        { status: 400 },
      );
    }

    const profile = await updateCareProfile(supabase, user.id, body);
    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
