// Nachbar.io — Global Setup: Testdaten seeden vor allen Tests
import { test as setup } from "@playwright/test";
import { seedAll, seedViaApi } from "./helpers/db-seeder";

setup("Testdaten seeden", async () => {
  console.log("[SETUP] Starte globales Setup...");

  // Strategie 1: Direktes Seeding via Supabase Admin API
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const userMap = await seedAll();
    console.log(`[SETUP] Direkt-Seeding: ${userMap.size} Agenten`);
    return;
  }

  // Strategie 2: Seeding via Test-API-Route
  const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
  const success = await seedViaApi(baseUrl);
  if (success) {
    console.log("[SETUP] API-Seeding erfolgreich");
    return;
  }

  // Strategie 3: Kein Seeding — Tests nutzen UI-basierte Registrierung
  console.warn("[SETUP] Kein Seeding moeglich — Tests registrieren Nutzer via UI");
  console.warn("[SETUP] Setze NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fuer direktes Seeding");
});
