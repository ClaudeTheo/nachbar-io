// Nachbar Hilfe — Pflege-Profil Seite
// Pflegegrad, Pflegekasse und Versichertennummer verwalten + Jahresabrechnung

import { Heart } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CareProfileForm } from "@/modules/hilfe/components/CareProfileForm";
import { YearlyReport } from "./YearlyReport";
import { createClient } from "@/lib/supabase/server";

export default async function HilfeCareProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isHelper = false;
  let isResident = false;
  let availableYears: number[] = [];

  if (user) {
    // Helfer-Status pruefen
    const { data: helperRow } = await supabase
      .from("neighborhood_helpers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    isHelper = !!helperRow;

    // Bewohner-Status pruefen (Care-Profil vorhanden)
    const { data: careRow } = await supabase
      .from("care_profiles_hilfe")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    isResident = !!careRow;

    // Verfuegbare Jahre ermitteln (aus abgeschlossenen Sitzungen)
    if (isHelper || isResident) {
      const query = supabase
        .from("help_sessions")
        .select("completed_at")
        .not("completed_at", "is", null);

      // Helfer sieht Jahre seiner Sitzungen, Bewohner seine
      if (isHelper && !isResident) {
        query.eq("helper_id", user.id);
      } else if (isResident && !isHelper) {
        query.eq("resident_id", user.id);
      } else {
        // Beides — alle Sitzungen wo Nutzer beteiligt ist
        query.or(`helper_id.eq.${user.id},resident_id.eq.${user.id}`);
      }

      const { data: sessions } = await query;
      if (sessions && sessions.length > 0) {
        const yearSet = new Set<number>();
        for (const s of sessions) {
          if (s.completed_at) {
            yearSet.add(new Date(s.completed_at).getFullYear());
          }
        }
        availableYears = Array.from(yearSet).sort((a, b) => b - a);
      }
    }
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Seitenkopf */}
      <PageHeader
        title={
          <>
            <Heart className="h-6 w-6 text-[#4CAF87]" /> Mein Pflege-Profil
          </>
        }
        subtitle="Verwalten Sie hier Ihren Pflegegrad und Ihre Kassendaten. Diese Informationen werden fuer die Abrechnung Ihrer Entlastungsleistungen benoetigt."
        backHref="/hilfe"
      />

      {/* Formular */}
      <CareProfileForm />

      {/* Jahresabrechnung */}
      <YearlyReport
        availableYears={availableYears}
        isHelper={isHelper}
        isResident={isResident}
      />
    </div>
  );
}
