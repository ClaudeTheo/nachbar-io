// app/api/bug-reports/anonymous/route.ts
// Anonymer Bug-Report Endpoint (ohne Login)
// Spam-Schutz: Honeypot (Client) + Rate-Limit (Server) + Turnstile (vorbereitet)

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  submitAnonymousBugReport,
  computeFingerprint,
  computeIpHash,
} from "@/lib/services/misc-utilities.service";
import { handleServiceError } from "@/lib/services/service-error";
import { checkHoneypotField } from "@/lib/security/traps/honeypot-field";
import { buildClientKeysNode } from "@/lib/security/traps/trap-utils";

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  // Honeypot-Check: Bot-Erkennung via verstecktes "website"-Feld
  const secKeys = buildClientKeysNode(req);
  if (await checkHoneypotField(body, secKeys, "/api/bug-reports/anonymous")) {
    return NextResponse.json({ success: true }); // Bot merkt nichts
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "";
  const lang = req.headers.get("accept-language") || "";

  const fingerprint = computeFingerprint(ip, ua, lang);
  const ipHash = computeIpHash(ip);

  try {
    const admin = getAdminSupabase();
    const result = await submitAnonymousBugReport(
      admin,
      fingerprint,
      ipHash,
      body,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
