// Nachbar.io — Global Teardown: Testdaten aufraeumen nach allen Tests
import { test as teardown } from "@playwright/test";
import { cleanupAll } from "./helpers/db-seeder";

teardown("Testdaten aufraeumen", async () => {
  // Nur aufraeumen wenn Supabase-Zugang vorhanden
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Im CI: Testdaten loeschen. Lokal: optional (fuer Debugging hilfreich)
    if (process.env.CI || process.env.E2E_CLEANUP === "true") {
      await cleanupAll();
    } else {
      console.log("[TEARDOWN] Lokal: Testdaten bleiben erhalten (E2E_CLEANUP=true zum Loeschen)");
    }
  }
});
