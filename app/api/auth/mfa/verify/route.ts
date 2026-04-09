// POST /api/auth/mfa/verify — TOTP Code verifizieren
// Body: { factor_id: string, code: string }

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/care/api-helpers";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const body = await request.json();
  if (!body.factor_id || !body.code) {
    return NextResponse.json(
      { error: "factor_id und code sind erforderlich" },
      { status: 400 },
    );
  }

  // Challenge erstellen
  const { data: challenge, error: challengeError } =
    await auth.supabase.auth.mfa.challenge({ factorId: body.factor_id });

  if (challengeError) {
    return NextResponse.json(
      { error: challengeError.message, code: "MFA_CHALLENGE_FAILED" },
      { status: 400 },
    );
  }

  // Code verifizieren
  const { error: verifyError } = await auth.supabase.auth.mfa.verify({
    factorId: body.factor_id,
    challengeId: challenge.id,
    code: body.code,
  });

  if (verifyError) {
    return NextResponse.json(
      { error: verifyError.message, code: "MFA_VERIFY_FAILED" },
      { status: 400 },
    );
  }

  return NextResponse.json({ verified: true, assurance_level: "aal2" });
}
