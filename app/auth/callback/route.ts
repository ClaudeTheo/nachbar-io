// Nachbar.io — Auth Callback Route (PKCE Code Exchange)
// Wird aufgerufen, wenn ein Nutzer den Magic Link in der E-Mail klickt.
// Supabase leitet hierher mit ?code=xxx weiter.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSafeRedirectUrl } from "@/lib/auth/safe-redirect-url";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Task B-4: /after-login dispatcht basierend auf ui_mode.
  // Aeltere Magic-Links ohne ?next fallen automatisch auf den Dispatcher.
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(
        buildSafeRedirectUrl(origin, next, "/after-login"),
      );
    }

    console.error(
      "Auth Callback: Code-Exchange fehlgeschlagen:",
      error.message,
    );
  }

  // Fehlerfall: Zurueck zum Login
  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", origin),
  );
}
