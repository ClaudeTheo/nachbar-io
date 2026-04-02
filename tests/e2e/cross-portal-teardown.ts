// Nachbar.io — Cross-Portal Teardown
// Raeumt Testdaten auf — laeuft auch bei Test-Failures
import { test as teardown } from "@playwright/test";
import { supabaseAdmin } from "./helpers/supabase-admin";

teardown("Cross-Portal Testdaten aufraumen", async () => {
  console.log("[TEARDOWN] Raeume Cross-Portal-Testdaten auf...");

  // Eskalations-Events von Cross-Portal-Tests loeschen
  const { error: escError } = await supabaseAdmin(
    "escalation_events",
    "DELETE",
    undefined,
    "details=like.*E2E-CROSS*"
  );
  if (escError) console.warn("[TEARDOWN] escalation_events:", escError);

  // Test-Termine loeschen
  const { error: aptError } = await supabaseAdmin(
    "appointments",
    "DELETE",
    undefined,
    "notes_encrypted=like.*E2E-CROSS*"
  );
  if (aptError) console.warn("[TEARDOWN] appointments:", aptError);

  console.log("[TEARDOWN] Cross-Portal-Daten aufgeraeumt.");
});
