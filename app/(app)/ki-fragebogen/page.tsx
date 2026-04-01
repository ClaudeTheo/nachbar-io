// KI-Fragebogen Seite: Server Component mit Auth-Check
// Laedt vorhandene memory_facts + Consent-Status
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SeniorQuestionnaire } from "@/modules/care/components/questionnaire/SeniorQuestionnaire";

export const metadata = {
  title: "KI-Fragebogen | nachbar.io",
};

export default async function KiFragebogenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Consent-Status pruefen
  const { data: consent } = await supabase
    .from("user_memory_consents")
    .select("consent_type, granted_at, revoked_at")
    .eq("user_id", user.id)
    .eq("consent_type", "memory_basis")
    .is("revoked_at", null)
    .maybeSingle();

  const hasConsent = !!consent?.granted_at;

  // Vorhandene Memory-Facts laden
  const { data: facts } = await supabase
    .from("user_memory_facts")
    .select("category, key, value")
    .eq("user_id", user.id)
    .eq("source", "ki_fragebogen");

  const existingFacts: Record<string, string> = {};
  for (const f of facts ?? []) {
    existingFacts[`${f.category}:${f.key}`] = f.value;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-2 text-2xl font-bold text-[#2D3142]">KI-Fragebogen</h1>
      <p className="mb-6 text-gray-500">
        Helfen Sie der KI, Sie besser kennenzulernen. Beantworten Sie so viele
        Fragen wie Sie möchten.
      </p>

      <SeniorQuestionnaire
        userId={user.id}
        existingFacts={existingFacts}
        hasConsent={hasConsent}
      />
    </div>
  );
}
