// app/(app)/pflegegrad-navigator/page.tsx
// Pflegegrad-Navigator — NBA-basierte Selbsteinschaetzung
// KEIN Medizinprodukt — nur zur Orientierung

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PflegegradNavigator } from "@/modules/care/components/navigator/PflegegradNavigator";
import type { AssessmentRecord } from "@/modules/care/components/navigator/AssessmentHistory";

export const metadata = {
  title: "Pflegegrad-Navigator | nachbar.io",
  description: "Schätzen Sie Ihren Pflegegrad mit dem NBA-Fragebogen ein. Kostenlos und unverbindlich.",
};

export default async function PflegegradNavigatorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fruehere Einschaetzungen laden
  let previousAssessments: AssessmentRecord[] = [];
  try {
    const { data } = await supabase
      .from("pflegegrad_assessments")
      .select("id, created_at, estimated_grade, total_weighted, module_scores, assessor_role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      previousAssessments = data as AssessmentRecord[];
    }
  } catch {
    // Tabelle existiert evtl. noch nicht — stilles Fallback
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <PageHeader
        title={
          <>
            <ClipboardCheck className="h-6 w-6 text-quartier-green" /> Pflegegrad-Navigator
          </>
        }
        subtitle="Schätzen Sie den Pflegegrad mit dem offiziellen NBA-System ein"
        backHref="/care"
        backLabel="Zurück zur Pflege"
      />

      <PflegegradNavigator
        userId={user.id}
        previousAssessments={previousAssessments}
      />
    </div>
  );
}
