// Nachbar.io — Test-Login API (nur fuer E2E-Tests)
// Loggt einen Nutzer via Passwort ein und setzt die Session-Cookies korrekt.
// Wird von loginAgent() in den E2E-Tests aufgerufen.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Nur verfuegbar wenn E2E-Secret gesetzt ist
  const testSecret = process.env.E2E_TEST_SECRET;
  if (!testSecret) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const body = await request.json();
  const { email, password, secret } = body;

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

  // Session-Cookies werden automatisch durch den Supabase-Server-Client gesetzt
  return NextResponse.json({
    ok: true,
    userId: data.user?.id,
    redirectTo:
      data.user?.user_metadata?.ui_mode === "senior"
        ? "/senior/home"
        : "/dashboard",
  });
}
