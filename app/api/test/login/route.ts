// Nachbar.io — Test-Login API (nur für E2E-Tests)
// Loggt einen Nutzer via Passwort ein und setzt die Session-Cookies korrekt.
// Wird von loginAgent() in den E2E-Tests aufgerufen.
// GET: Redirect-basiert (fuer Browser-Tests)
// POST: JSON-basiert (fuer Playwright/Script-Tests)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function doLogin(
  email: string,
  password: string,
  secret: string,
  redirectAfter?: string,
) {
  const testSecret = process.env.E2E_TEST_SECRET;
  if (!testSecret) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  if (secret !== testSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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

  if (redirectAfter) {
    return NextResponse.redirect(
      new URL(
        redirectAfter,
        process.env.NEXT_PUBLIC_SITE_URL || "https://nachbar-io.vercel.app",
      ),
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

// GET /api/test/login?email=...&password=...&secret=...&next=/dashboard
// Setzt Session-Cookies und redirected — ideal fuer Browser-Tests
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") || "";
  const password = searchParams.get("password") || "";
  const secret = searchParams.get("secret") || "";
  const next = searchParams.get("next") || "/dashboard";
  return doLogin(email, password, secret, next);
}

// POST /api/test/login — JSON-basiert (bestehende E2E-Tests)
export async function POST(request: NextRequest) {
  const body = await request.json();
  return doLogin(body.email, body.password, body.secret);
}
