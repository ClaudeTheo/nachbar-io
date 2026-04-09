// POST /api/auth/mfa/enroll — TOTP MFA Enrollment starten
// Gibt QR-Code URI + Secret zurueck fuer Authenticator-App

import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/care/api-helpers";

export async function POST() {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const { data, error } = await auth.supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "QuartierApp Authenticator",
  });

  if (error) {
    return NextResponse.json(
      { error: error.message, code: "MFA_ENROLL_FAILED" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    factor_id: data.id,
    totp_uri: data.totp.uri,
    qr_code: data.totp.qr_code,
    secret: data.totp.secret,
  });
}
