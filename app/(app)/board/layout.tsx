// Serverseitiges Feature-Gate fuer /board (Schwarzes Brett).
// Liegt das DB-Flag BOARD_ENABLED auf false (oder fehlt es / DB-Fehler),
// wird der gesamte /board-Subtree auf /dashboard umgeleitet. isFeatureEnabledServer
// ist fail-closed (default-deny) — so ist die Route ein echter Schalter, nicht nur
// eine Client-Render-Illusion.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";

export default async function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const enabled = await isFeatureEnabledServer(supabase, "BOARD_ENABLED");

  if (!enabled) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
