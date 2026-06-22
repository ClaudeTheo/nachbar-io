// Serverseitiges Feature-Gate fuer /events (inkl. [id] + /new).
// events hat ein DB-Flag (EVENTS_ENABLED), daher Flag-Gate statt Positivliste
// (Welle-1-Muster wie /board, /marketplace). Flag false (oder fehlt / DB-Fehler)
// ⇒ Redirect /dashboard. isFeatureEnabledServer ist fail-closed (default-deny).
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";

export default async function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const enabled = await isFeatureEnabledServer(supabase, "EVENTS_ENABLED");

  if (!enabled) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
