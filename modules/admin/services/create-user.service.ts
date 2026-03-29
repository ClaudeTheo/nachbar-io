// Nachbar.io — Service-Logik fuer Admin-Nutzer-Erstellung
// Extrahiert aus app/api/admin/create-user/route.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { generateTempPassword } from "@/lib/invite-codes";

export interface CreateUserParams {
  displayName: string;
  street: string;
  houseNumber: string;
  email?: string;
  uiMode?: string;
  verified?: boolean;
  quarter_id?: string;
}

export interface CreateUserResult {
  success: true;
  userId: string;
  email: string;
  tempPassword: string;
  displayName: string;
  household: string;
  warning?: string;
}

export async function createUserByAdmin(
  adminSupabase: SupabaseClient,
  params: CreateUserParams
): Promise<CreateUserResult> {
  const {
    displayName,
    street,
    houseNumber,
    email,
    uiMode = "senior",
    verified = true,
    quarter_id,
  } = params;

  // Haushalt pruefen (optional mit quarter_id filtern)
  let householdQuery = adminSupabase
    .from("households")
    .select("id, quarter_id")
    .eq("street_name", street)
    .eq("house_number", houseNumber);

  if (quarter_id) {
    householdQuery = householdQuery.eq("quarter_id", quarter_id);
  }

  const { data: household, error: householdError } = await householdQuery.maybeSingle();

  if (householdError) {
    throw new ServiceError(`Haushalt-Suche fehlgeschlagen: ${householdError.message}`, 500);
  }

  if (!household) {
    throw new ServiceError(`Haushalt ${street} ${houseNumber} nicht gefunden`, 404);
  }

  // Temporaeres Passwort + E-Mail generieren
  const tempPassword = generateTempPassword();
  const userEmail = email || `${displayName.toLowerCase().replace(/[^a-z0-9]/g, "")}.${Date.now()}@quartierapp.de`;

  // Auth-User erstellen (Service-Role = Admin-Rechte)
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: userEmail,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError) {
    throw new ServiceError(`Konto konnte nicht erstellt werden: ${authError.message}`, 500);
  }

  if (!authData.user) {
    throw new ServiceError("Konto-Erstellung fehlgeschlagen", 500);
  }

  // User-Profil erstellen
  const { error: profileError } = await adminSupabase.from("users").insert({
    id: authData.user.id,
    email_hash: "",
    display_name: displayName.trim(),
    ui_mode: uiMode,
    trust_level: verified ? "verified" : "new",
  });

  if (profileError) {
    console.error("Profil-Fehler:", profileError);
    // Rollback: Auth-User loeschen, da Konto ohne Profil unbenutzbar
    const { error: rollbackError } = await adminSupabase.auth.admin.deleteUser(authData.user.id);
    if (rollbackError) {
      console.error("Rollback Auth-User-Loeschung fehlgeschlagen:", rollbackError);
    }
    throw new ServiceError(`Profil konnte nicht erstellt werden: ${profileError.message}`, 500);
  }

  // Haushalt-Zuordnung erstellen
  const { error: memberError } = await adminSupabase.from("household_members").insert({
    household_id: household.id,
    user_id: authData.user.id,
    verification_method: "admin_created",
  });

  if (memberError) {
    console.error("Mitglied-Fehler:", memberError);
    // Kein Rollback — Konto existiert, Admin wird ueber fehlende Zuordnung informiert
    return {
      success: true,
      userId: authData.user.id,
      email: userEmail,
      tempPassword,
      displayName: displayName.trim(),
      household: `${street} ${houseNumber}`,
      warning: `Haushalt-Zuordnung fehlgeschlagen: ${memberError.message}`,
    };
  }

  return {
    success: true,
    userId: authData.user.id,
    email: userEmail,
    tempPassword,
    displayName: displayName.trim(),
    household: `${street} ${houseNumber}`,
  };
}
