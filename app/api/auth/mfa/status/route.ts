// GET /api/auth/mfa/status — MFA-Status des aktuellen Nutzers abfragen

import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/care/api-helpers";
import { checkMfaStatus } from "@/lib/auth/mfa-check";

export async function GET() {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const status = await checkMfaStatus(auth.supabase);
  return NextResponse.json(status);
}
