// POST /api/senior/auto-answer-consent — Senior-Einwilligung in die Auto-Annahme (Welle AA-3)
//
// Cookie-Auth fuer „wer willigt ein"; die eigentliche Autorisierung (Ownership)
// + das Setzen von auto_answer_senior_consented_at laeuft im Service via
// Admin-Client (Mini-Audit AA-RLS-3: kein Vertrauen in die spaltenlose RLS-Policy).
// Jeder Consent-Wechsel wird auditiert (AA-AUDIT-1). Rate-Limit: middleware-Default
// /api/ (60/min) — kein Token-/Code-Lookup, daher kein eigenes Limit noetig.
//
// Authentifizierte Route -> bewusst NICHT in der Closed-Pilot-Whitelist
// (die ist nur fuer User-lose Cron/Webhook-Routen; siehe SP1-4-Lehre).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { setAutoAnswerConsent } from "@/modules/care/services/senior-auto-answer.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  let body: { caregiverLinkId?: string; consent?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  const { caregiverLinkId, consent } = body;
  if (
    !caregiverLinkId ||
    !UUID_REGEX.test(caregiverLinkId) ||
    typeof consent !== "boolean"
  ) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  try {
    const admin = getAdminSupabase();
    const result = await setAutoAnswerConsent(
      admin,
      user.id,
      caregiverLinkId,
      consent,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
