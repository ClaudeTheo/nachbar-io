// app/api/youth/consent/verify/route.ts
// Jugend-Modul: Elternfreigabe verifizieren (Thin Wrapper)
// WICHTIG: Guardian ist NICHT authentifiziert — nutzt Service-Client (getAdminSupabase)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { verifyYouthConsent } from "@/modules/youth/services/youth-routes.service";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";

export async function POST(request: NextRequest) {
  // Feature-Flag mit normalem Client pruefen (kein Auth noetig)
  const supabase = await createClient();
  const moduleEnabled = await isFeatureEnabledServer(supabase, "YOUTH_MODULE");
  if (!moduleEnabled) {
    return NextResponse.json({ error: "Jugend-Modul nicht verfügbar" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const headers = {
      ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "",
      userAgent: request.headers.get("user-agent") || "",
    };
    // Service-Client: umgeht RLS, da Guardian nicht eingeloggt ist
    const adminDb = getAdminSupabase();
    const result = await verifyYouthConsent(adminDb, body, headers);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }
    return handleServiceError(error);
  }
}
