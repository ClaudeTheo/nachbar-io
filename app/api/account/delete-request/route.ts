import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Oeffentliche API-Route fuer Account-Loeschung via Web
// Google Play Store Policy: Account-Loeschung muss auch ohne App moeglich sein

// Rate Limiting: Max 3 Anfragen pro E-Mail pro Stunde (In-Memory, reicht fuer Pilot)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, action, otp } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });
    }

    if (!action || !["request", "confirm"].includes(action)) {
      return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
    }

    if (!checkRateLimit(email.toLowerCase())) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuchen Sie es in einer Stunde erneut." },
        { status: 429 },
      );
    }

    // Supabase Admin Client (Service Role fuer OTP-Versand und Loeschung)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    if (action === "request") {
      // OTP an die E-Mail senden via Supabase Auth
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
        },
      });

      if (otpError) {
        // Kein Hinweis ob E-Mail existiert (Anti-Enumeration)
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "confirm") {
      if (!otp || typeof otp !== "string" || otp.length !== 6) {
        return NextResponse.json({ error: "Ungültiger Bestätigungscode" }, { status: 400 });
      }

      // OTP verifizieren
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: "email",
      });

      if (verifyError || !verifyData?.user) {
        return NextResponse.json({ error: "Ungültiger oder abgelaufener Code" }, { status: 400 });
      }

      // Account zur Loeschung markieren (soft delete mit 30 Tage Frist)
      const userId = verifyData.user.id;

      // Profil als zur Loeschung markiert setzen
      await supabase
        .from("profiles")
        .update({
          deletion_requested_at: new Date().toISOString(),
          display_name: "Gelöschter Nutzer",
        })
        .eq("id", userId);

      // Audit-Log
      await supabase.from("org_audit_log").insert({
        user_id: userId,
        action: "account_deletion_requested",
        details: { source: "web", email: email.trim() },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
