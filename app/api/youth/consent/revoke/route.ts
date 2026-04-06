// app/api/youth/consent/revoke/route.ts
// Jugend-Modul: Elternfreigabe widerrufen
// Auth-Check: Nur der Jugendliche selbst ODER ein Admin darf widerrufen
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { revokeYouthConsent } from "@/modules/youth/services/youth-routes.service";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Feature-Flag-Guard: YOUTH_MODULE muss aktiv sein
  const moduleEnabled = await isFeatureEnabledServer(supabase, "YOUTH_MODULE");
  if (!moduleEnabled) {
    return NextResponse.json(
      { error: "Jugend-Modul nicht verfügbar" },
      { status: 404 },
    );
  }

  // Auth-Check: Nutzer muss eingeloggt sein
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { youth_user_id } = body;

    if (!youth_user_id) {
      return NextResponse.json(
        { error: "youth_user_id erforderlich" },
        { status: 400 },
      );
    }

    // Autorisierung: Nur eigener Consent ODER Admin
    const isOwnConsent = user.id === youth_user_id;

    if (!isOwnConsent) {
      // Admin-Check: Pruefe is_admin in users (NICHT profiles)
      const { data: adminProfile } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!adminProfile?.is_admin) {
        return NextResponse.json(
          {
            error:
              "Nur der Jugendliche selbst oder ein Admin kann die Freigabe widerrufen",
          },
          { status: 403 },
        );
      }
    }

    const headers = {
      ip: request.headers.get("x-forwarded-for") || "",
      userAgent: request.headers.get("user-agent") || "",
    };
    // Admin-Pfad: Service-Client (umgeht RLS), eigener Pfad: request-scoped Client
    const dbClient = isOwnConsent ? supabase : getAdminSupabase();
    const result = await revokeYouthConsent(dbClient, body, headers);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }
    return handleServiceError(error);
  }
}
