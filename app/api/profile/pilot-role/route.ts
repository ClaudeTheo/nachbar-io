// POST /api/profile/pilot-role — Pilot-Selbstauskunft im Profil aendern (W4b-2)
//
// Cookie-Auth fuer „wer aendert"; das eigentliche Schreiben von settings.pilot_role
// laeuft im Service ueber den Admin-Client (service_role), weil Mig 198 den Key fuer
// Client-Schreibzugriffe sticky-schuetzt. Die userId stammt aus der Session
// (getUser), NICHT aus dem Body -> IDOR-sicher. Validierung auf {resident,caregiver,
// helper} (test_user ist keine Selbst-Auswahl). Audit im Service.
//
// Rate-Limit: middleware-Default /api/ (kein Token-/Code-Lookup -> kein eigenes Limit).
// Authentifizierte Route -> bewusst NICHT in der Closed-Pilot-Whitelist.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import {
  isSelfSelectablePilotRole,
  setPilotRoleServer,
} from "@/lib/services/profile.service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  let body: { pilotRole?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges Anfrage-Format" }, { status: 400 });
  }

  if (!isSelfSelectablePilotRole(body.pilotRole)) {
    return NextResponse.json({ error: "Ungültige Rolle" }, { status: 400 });
  }

  try {
    const admin = getAdminSupabase();
    const pilotRole = await setPilotRoleServer(admin, user.id, body.pilotRole);
    return NextResponse.json({ pilotRole });
  } catch (error) {
    return handleServiceError(error);
  }
}
