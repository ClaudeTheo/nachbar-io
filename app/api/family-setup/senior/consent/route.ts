// POST /api/family-setup/senior/consent — Senior bestätigt die Begleitungs-Einwilligung (W5 / A2:4)
//
// Cookie-Auth für „wer bestätigt"; das Setzen von consent_status='active' läuft im
// Service über den Admin-Client (service_role), weil der CL-1-Trigger (Mig 20260618130000)
// consent_status für Client-Schreibzugriffe sticky macht. Die seniorUserId stammt aus der
// Session (getUser), NICHT aus dem Body -> IDOR-sicher; Ownership + Pending-Check im Service.
//
// Rate-Limit: middleware-Default /api/ (kein Token-/Code-Lookup hier — der ist im Claim).
// Authentifizierte Route -> bewusst NICHT in der Closed-Pilot-Whitelist.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { confirmSeniorConsent } from "@/lib/family-setup/senior-consent.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  let body: { caregiverLinkId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { caregiverLinkId } = body;
  if (typeof caregiverLinkId !== "string" || !UUID_REGEX.test(caregiverLinkId)) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  try {
    const admin = getAdminSupabase();
    const result = await confirmSeniorConsent(admin, user.id, caregiverLinkId);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
