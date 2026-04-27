import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { completeRegistration } from "@/lib/services/registration.service";
import { ServiceError } from "@/lib/services/service-error";
import { checkHoneypotField } from "@/lib/security/traps/honeypot-field";
import { buildClientKeysNode } from "@/lib/security/traps/trap-utils";

// Whitelist erlaubter Werte fuer das KI-Assistenz-Stufen-Feld am Submit-Boundary.
// "personal" ist im Onboarding aktuell ausgegraut und darf nicht als Submit-Wert
// durchrutschen — sonst koennte der Service einen unbekannten Wert persistieren.
const VALID_AI_ASSISTANCE_LEVELS = new Set([
  "off",
  "basic",
  "everyday",
  "later",
] as const);

/**
 * POST /api/register/complete
 * Komplette Registrierung serverseitig — Logik in registration.service.ts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Honeypot-Check: Bot-Erkennung via verstecktes "website"-Feld
    const keys = buildClientKeysNode(request);
    if (await checkHoneypotField(body, keys, "/api/register/complete")) {
      // Bot erkannt — 200 zurueckgeben (Bot merkt nichts), Daten verwerfen
      return NextResponse.json({ success: true });
    }

    // Whitelist-Validierung fuer aiAssistanceLevel: vor dem Service ablehnen,
    // damit unbekannte Werte keinen Auth-User anlegen und keinen DB-Write triggern.
    const aiAssistanceLevelRaw = (body as { aiAssistanceLevel?: unknown })
      .aiAssistanceLevel;
    if (
      aiAssistanceLevelRaw !== undefined &&
      aiAssistanceLevelRaw !== null &&
      !VALID_AI_ASSISTANCE_LEVELS.has(
        String(aiAssistanceLevelRaw) as
          | "off"
          | "basic"
          | "everyday"
          | "later",
      )
    ) {
      return NextResponse.json(
        {
          error:
            "aiAssistanceLevel ungueltig. Erlaubt: off, basic, everyday, later.",
        },
        { status: 400 },
      );
    }

    const result = await completeRegistration(getAdminSupabase(), body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Registrierung-Complete Fehler:", err);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 },
    );
  }
}
