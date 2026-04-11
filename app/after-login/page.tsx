// app/after-login/page.tsx
// Task B-4: Dispatch-Seite nach erfolgreichem Login.
// Alle Login-Wege (Password, OTP-Code, Magic-Link-Callback) leiten hierher.
// Dieser Server-Component liest den ui_mode des Nutzers aus der Datenbank
// und leitet dann auf die passende Startseite weiter:
//   - Senior    → /kreis-start (4-Kachel-Screen aus B-2)
//   - Aktiv     → /dashboard
//   - No-Session → /login
//
// Warum als Server-Component?
//   - Kein Flash einer falschen Startseite vor dem clientseitigen Redirect
//   - Single Source of Truth fuer die Redirect-Regel (vgl. resolvePostLoginPath)
//   - Funktioniert gleichermassen fuer Magic-Link-Callback und client push()

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";
import type { UserUiMode } from "@/lib/supabase/types";

export default async function AfterLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("ui_mode")
    .eq("id", user.id)
    .single<{ ui_mode: UserUiMode }>();

  redirect(resolvePostLoginPath(profile?.ui_mode));
}
