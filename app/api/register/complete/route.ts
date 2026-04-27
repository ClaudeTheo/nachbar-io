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

    // Type-Guard: nur string oder undefined/null erlaubt
    if (
      aiAssistanceLevelRaw !== undefined &&
      aiAssistanceLevelRaw !== null &&
      typeof aiAssistanceLevelRaw !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "aiAssistanceLevel muss ein String sein (off, basic, everyday, later).",
        },
        { status: 400 },
      );
    }

    // Whitelist: bekannter Stufen-Wert
    if (
      typeof aiAssistanceLevelRaw === "string" &&
      !VALID_AI_ASSISTANCE_LEVELS.has(aiAssistanceLevelRaw as never)
    ) {
      return NextResponse.json(
        {
          error:
            "aiAssistanceLevel ungueltig. Erlaubt: off, basic, everyday, later.",
        },
        { status: 400 },
      );
    }

    // Konsistenz-Check zwischen aiConsentChoice und aiAssistanceLevel
    // Erlaubte Paare:
    //   yes  -> basic | everyday
    //   no   -> off
    //   later -> later
    //   undefined level: erlaubt (Service derived dann aus choice)
    if (typeof aiAssistanceLevelRaw === "string") {
      const choice = (body as { aiConsentChoice?: unknown }).aiConsentChoice;
      const level = aiAssistanceLevelRaw;
      const consistent =
        (choice === "yes" && (level === "basic" || level === "everyday")) ||
        (choice === "no" && level === "off") ||
        (choice === "later" && level === "later");
      if (!consistent) {
        return NextResponse.json(
          {
            error:
              "aiConsentChoice und aiAssistanceLevel passen nicht zusammen. Erlaubt: yes->basic|everyday, no->off, later->later.",
          },
          { status: 400 },
        );
      }
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
