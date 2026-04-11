// app/(app)/quartier/page.tsx
// Phase-1 Task B-5: Drift-Aufloesung `/quartier` vs. `/quartier-info`.
//
// Entscheidung (siehe docs/plans/phase1-quartier-route-decision.md im Parent-Repo):
//   - Gewinner: /quartier-info  (Wetter, Muell, NINA, OePNV, Apotheken — passt zur
//     HIER-BEI-MIR-Kachel auf /kreis-start)
//   - Verlierer: /quartier      (Navigations-Hub zu Legacy-Community-Features)
//
// Diese Route leitet deshalb per Default auf /quartier-info um. Der alte Hub bleibt
// als Rollback-Pfad erreichbar, wenn das Feature-Flag `legacy_quartier_hub` in
// Supabase manuell auf enabled=true gesetzt wird. Default-Verhalten ohne
// DB-Eintrag: fail-closed → Redirect.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";
import { QuartierHubLegacy } from "./QuartierHubLegacy";

export default async function QuartierPage() {
  const supabase = await createClient();
  const legacyHubEnabled = await isFeatureEnabledServer(
    supabase,
    "legacy_quartier_hub",
  );

  if (!legacyHubEnabled) {
    redirect("/quartier-info");
  }

  return <QuartierHubLegacy />;
}
