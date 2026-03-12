// Shared Device-Authentifizierung
// Extrahiert Token aus Request (Authorization-Header > Body > Query-Param)
// und hasht es mit SHA-256 fuer den DB-Abgleich

import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// SHA-256 Hash des Device-Tokens (fuer DB-Lookup)
export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Token-Format validieren: 16-128 Hex-Zeichen
function isValidTokenFormat(token: string): boolean {
  return token.length >= 16 && token.length <= 128 && /^[a-f0-9]+$/i.test(token);
}

// Token aus Request extrahieren (Prioritaet: Header > Body > Query)
export function extractToken(request: NextRequest, body?: Record<string, unknown>): string | null {
  // 1. Authorization-Header (bevorzugt)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  // 2. Body (fuer POST-Requests)
  if (body?.token && typeof body.token === "string") {
    return body.token;
  }

  // 3. Query-Parameter (Fallback, deprecated)
  const queryToken = request.nextUrl.searchParams.get("token");
  if (queryToken) {
    return queryToken;
  }

  return null;
}

// Service-Role Supabase Client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert");
  }
  return createClient(url, key);
}

// Ergebnis der Device-Authentifizierung
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DeviceAuthResult {
  device: { id: string; household_id: string };
  supabase: SupabaseClient<any, "public", any>;
}

// Device authentifizieren: Token extrahieren, validieren, hashen, DB-Lookup
export async function authenticateDevice(
  request: NextRequest,
  body?: Record<string, unknown>
): Promise<DeviceAuthResult | NextResponse> {
  const token = extractToken(request, body);

  if (!token || !isValidTokenFormat(token)) {
    return NextResponse.json({ error: "Ungueltiges Token-Format" }, { status: 401 });
  }

  const supabase = getSupabase();
  const tokenHash = hashDeviceToken(token);

  // Primaer: Lookup via token_hash (nach Migration 041)
  let device: { id: string; household_id: string } | null = null;

  const { data: hashMatch } = await supabase
    .from("device_tokens")
    .select("id, household_id")
    .eq("token_hash", tokenHash)
    .single();

  if (hashMatch) {
    device = hashMatch;
  } else {
    // Fallback: Klartext-Token (fuer Uebergangsphase vor Migration 041)
    const { data: plainMatch } = await supabase
      .from("device_tokens")
      .select("id, household_id")
      .eq("token", token)
      .single();

    if (plainMatch) {
      device = plainMatch;
      // Automatisch den Hash nachpflegen
      await supabase
        .from("device_tokens")
        .update({ token_hash: tokenHash })
        .eq("id", plainMatch.id);
    }
  }

  if (!device) {
    return NextResponse.json({ error: "Ungueltiger Token" }, { status: 401 });
  }

  // Last-seen aktualisieren
  await supabase
    .from("device_tokens")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", device.id);

  return { device, supabase };
}

// Type-Guard: Prueft ob das Ergebnis ein Fehler-Response ist
export function isAuthError(result: DeviceAuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
