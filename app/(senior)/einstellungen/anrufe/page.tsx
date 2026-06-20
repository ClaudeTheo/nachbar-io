// app/(senior)/einstellungen/anrufe/page.tsx — Welle AA-3
// Senior-Opt-in fuer die automatische Anruf-Annahme, pro Angehoerigen-Verbindung.
// Server laedt die aktiven Verbindungen (resident-scoped, datensparsam: nur
// Anzeigename/Avatar) und uebergibt sie an die Client-Schalter.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listSeniorCallContacts } from "@/modules/care/services/senior-auto-answer.service";
import { AutoAnswerSettings } from "@/modules/care/components/senior/AutoAnswerSettings";

export const metadata = {
  title: "Anrufe",
};

export default async function SeniorAnrufeEinstellungenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const contacts = await listSeniorCallContacts(supabase, user.id);

  return (
    <section aria-label="Anruf-Einstellungen">
      <h1 className="mb-2 text-2xl font-bold text-anthrazit">
        Anrufe automatisch annehmen
      </h1>
      <p className="mb-6 text-base text-anthrazit/70">
        Hier entscheiden Sie selbst, von wem ein Videoanruf automatisch
        angenommen werden darf.
      </p>
      <AutoAnswerSettings contacts={contacts} />
    </section>
  );
}
