// Serverseitiges Feature-Gate fuer /marketplace (Marktplatz, inkl. [id] + /new).
// Liegt das DB-Flag MARKETPLACE_ENABLED auf false (oder fehlt es / DB-Fehler),
// wird der gesamte /marketplace-Subtree auf /dashboard umgeleitet.
// isFeatureEnabledServer ist fail-closed (default-deny) — echter Schalter statt
// Client-Render-Illusion.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const enabled = await isFeatureEnabledServer(supabase, "MARKETPLACE_ENABLED");

  if (!enabled) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
