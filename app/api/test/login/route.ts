// Nachbar.io — Test-Login API (nur für E2E-Tests)
// Loggt einen Nutzer via Passwort ein und setzt die Session-Cookies korrekt.
// Wird von loginAgent() in den E2E-Tests aufgerufen.
// GET: Redirect-basiert (fuer Browser-Tests) — Cookies direkt auf Redirect-Response
// POST: JSON-basiert (fuer Playwright/Script-Tests)
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";

function isProductionLikeEnvironment(): boolean {
  const vercelEnv =
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "";
  if (vercelEnv === "production" || vercelEnv === "preview") return true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const isLocalSupabase =
    supabaseUrl.startsWith("http://127.0.0.1:") ||
    supabaseUrl.startsWith("http://localhost:");

  // CI startet den gebauten Server via `next start`; das setzt NODE_ENV=production.
  if (process.env.NODE_ENV === "production" && isLocalSupabase) return false;

  return process.env.NODE_ENV === "production";
}

function blockProductionLikeEnvironment(): NextResponse | null {
  if (!isProductionLikeEnvironment()) return null;
  return NextResponse.json({ error: "Not available" }, { status: 404 });
}

function validateSecret(secret: string): NextResponse | null {
  const testSecret = process.env.E2E_TEST_SECRET;
  if (!testSecret) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  if (secret !== testSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function sanitizeNextPath(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

// GET /api/test/login?email=...&password=...&secret=...&next=/dashboard
// Setzt Session-Cookies DIREKT auf die Redirect-Response (nicht via cookieStore)
export async function GET(request: NextRequest) {
  const environmentErr = blockProductionLikeEnvironment();
  if (environmentErr) return environmentErr;

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") || "";
  const password = searchParams.get("password") || "";
  const secret = searchParams.get("secret") || "";
  const next = sanitizeNextPath(searchParams.get("next") || "/dashboard");

  const secretErr = validateSecret(secret);
  if (secretErr) return secretErr;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email und Passwort erforderlich" },
      { status: 400 },
    );
  }

  // Redirect-Response vorab erstellen — Cookies werden darauf geschrieben
  const baseUrl = request.nextUrl.origin;
  const redirectUrl = new URL(next, baseUrl);
  const response = NextResponse.redirect(redirectUrl);

  // Supabase-Client der Cookies direkt auf die Redirect-Response setzt
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

  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message || "Login fehlgeschlagen" },
      { status: 401 },
    );
  }

  return response;
}

// POST /api/test/login — JSON-basiert (bestehende E2E-Tests)
export async function POST(request: NextRequest) {
  const environmentErr = blockProductionLikeEnvironment();
  if (environmentErr) return environmentErr;

  const body = await request.json();
  const { email, password, secret } = body;

  const secretErr = validateSecret(secret);
  if (secretErr) return secretErr;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email und Passwort erforderlich" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message || "Login fehlgeschlagen" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    userId: data.user?.id,
    redirectTo:
      data.user?.user_metadata?.ui_mode === "senior"
        ? "/senior/home"
        : "/dashboard",
  });
}
