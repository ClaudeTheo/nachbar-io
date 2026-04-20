// Nachbar.io — Auth Callback Route (PKCE Code Exchange)
// Wird aufgerufen, wenn ein Nutzer den Magic Link in der E-Mail klickt.
// Supabase leitet hierher mit ?code=xxx weiter.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSafeRedirectPath } from "@/lib/auth/post-login-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Task B-4: /after-login dispatcht basierend auf ui_mode.
  // Aeltere Magic-Links ohne ?next fallen automatisch auf den Dispatcher.
  const next = resolveSafeRedirectPath(
    searchParams.get("next"),
    "/after-login",
  );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error(
      "Auth Callback: Code-Exchange fehlgeschlagen:",
      error.message,
    );
  }

  // Fehlerfall: Zurueck zum Login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
