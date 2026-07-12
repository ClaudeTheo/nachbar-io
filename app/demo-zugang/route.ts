// Nachbar.io — Investoren-Demo-Zugang
// GET /demo-zugang?t=<DEMO_ACCESS_TOKEN>
//
// Oeffnet eine Session fuer den fest angelegten Demo-Account (synthetische
// Daten, eigenes Demo-Quartier) — fuer Demo-Termine auf fremden Geraeten,
// ohne Einladungscode und ohne E-Mail-Versand.
//
// Schutzschichten:
// - Feature aus (404), solange DEMO_ACCESS_TOKEN / DEMO_USER_EMAIL /
//   DEMO_USER_PASSWORD nicht als Env-Variablen gesetzt sind
// - Token-Vergleich timing-safe (sha256 + timingSafeEqual)
// - Rate-Limit 5/min pro IP (Kategorie "demo-login" in lib/rate-limit.ts);
//   der Proxy-Rate-Limiter greift hier nicht, weil Closed-Pilot-Public-Paths
//   frueh durchgereicht werden — deshalb prueft die Route selbst
// - Credentials liegen NUR server-seitig (Env), nie in der URL
// - Audit-Log-Eintrag je Demo-Login (admin-Client, nicht-blockierend)
//
// Session-Cookie-Muster wie app/api/test/login (GET): Cookies werden direkt
// auf die Redirect-Response geschrieben.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { verifyCronSecretValue } from "@/lib/security/cron-secret";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const expectedToken = process.env.DEMO_ACCESS_TOKEN;
  const email = process.env.DEMO_USER_EMAIL;
  const password = process.env.DEMO_USER_PASSWORD;

  if (!expectedToken || !email || !password) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  // Rate-Limit VOR dem Token-Vergleich (Brute-Force-Schutz)
  const rate = checkRateLimit(request.nextUrl.pathname, getClientKey(request));
  if (rate && !rate.allowed) {
    return NextResponse.json(
      { error: "Zu viele Versuche. Bitte warten Sie eine Minute." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rate.resetMs / 1000)) },
      },
    );
  }

  // Generischer timing-safe Secret-Vergleich (gleicher Helper wie CRON_SECRET)
  const token = request.nextUrl.searchParams.get("t");
  if (!verifyCronSecretValue(token, expectedToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect-Response vorab erstellen — Session-Cookies werden darauf geschrieben
  const redirectUrl = new URL("/dashboard", request.nextUrl.origin);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, { ...options, path: "/" });
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session || !data.user) {
    console.error("[demo-zugang] Demo-Login fehlgeschlagen:", error?.message);
    return NextResponse.json(
      { error: "Die Demo ist derzeit nicht verfuegbar." },
      { status: 503 },
    );
  }

  // Audit-Trail (nicht-blockierend): jeder Demo-Login wird protokolliert
  try {
    const admin = getAdminSupabase();
    const { error: auditErr } = await admin.from("audit_log").insert({
      action: "demo_login",
      actor_id: data.user.id,
      target_type: "user",
      target_id: data.user.id,
      metadata: { via: "demo-zugang" },
    });
    if (auditErr) {
      console.error("[demo-zugang] Audit fehlgeschlagen:", auditErr.message);
    }
  } catch (auditEx) {
    console.error("[demo-zugang] Audit fehlgeschlagen:", auditEx);
  }

  return response;
}
