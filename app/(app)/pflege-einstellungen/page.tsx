// Pflege-Einstellungen Seite: Server Component mit Auth-Check + Care-Connection-Pruefung
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PflegeSettings } from "./PflegeSettings";

export const metadata = {
  title: "Pflege-Einstellungen | nachbar.io",
};

export default async function PflegeEinstellungenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Pruefen ob User eine aktive Pflege-Verbindung hat (als Bewohner oder Angehoeriger)
  const [caregiverResult, orgResult] = await Promise.all([
    supabase
      .from("caregiver_links")
      .select("id", { count: "exact", head: true })
      .or(`resident_id.eq.${user.id},caregiver_id.eq.${user.id}`)
      .is("revoked_at", null),
    supabase
      .from("org_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const hasCareConnection =
    (caregiverResult.count ?? 0) > 0 || (orgResult.count ?? 0) > 0;

  // Keine Pflege-Verbindung: Weiterleitung zum Dashboard
  if (!hasCareConnection) {
    redirect("/dashboard?info=keine-pflege-verbindung");
  }

  // Vorhandene Pflege-Einstellungen laden
  const { data: settings } = await supabase
    .from("user_memory_facts")
    .select("key, value")
    .eq("user_id", user.id)
    .eq("category", "preference")
    .eq("source", "care_settings");

  const existingSettings: Record<string, string> = {};
  for (const s of settings ?? []) {
    existingSettings[s.key] = s.value;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-2 text-2xl font-bold text-[#2D3142]">
        Pflege-Einstellungen
      </h1>
      <p className="mb-6 text-gray-500">
        Legen Sie fest, welche Informationen Sie mit Ihrem Pflegeteam und
        Angehörigen teilen möchten.
      </p>

      <PflegeSettings userId={user.id} initialSettings={existingSettings} />
    </div>
  );
}
