// Nachbar.io — Vouching-Service
// Zentralisiert Nachbar-Bestätigungen (Vouching) und Verifikation
// Business-Logik aus: vouching/route.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";

// ============================================================
// Vouch fuer einen Nachbarn
// ============================================================

export interface VouchResult {
  success: true;
  vouch_count: number;
  verified: boolean;
}

/**
 * Bestätigt die Identitaet eines Nachbarn (Vouching).
 * Nach 2 Vouches wird der Nutzer automatisch verifiziert.
 */
export async function vouchForUser(
  supabase: SupabaseClient,
  voucherId: string,
  targetUserId: string,
): Promise<VouchResult> {
  if (!targetUserId || targetUserId === voucherId) {
    throw new ServiceError("Ungültiger Ziel-Nutzer", 400);
  }

  // Pruefen: Voucher muss mindestens 'verified' sein
  const { data: voucher } = await supabase
    .from("users")
    .select("trust_level")
    .eq("id", voucherId)
    .single();

  if (
    !voucher ||
    !["verified", "trusted", "lotse", "admin"].includes(voucher.trust_level)
  ) {
    throw new ServiceError(
      "Sie müssen selbst verifiziert sein, um andere zu bestätigen",
      403,
    );
  }

  // Quartier des Vouchers ermitteln
  const { data: voucherHm } = await supabase
    .from("household_members")
    .select("households(quarter_id)")
    .eq("user_id", voucherId)
    .limit(1)
    .single();

  const voucherQuarterId = (
    voucherHm?.households as unknown as { quarter_id: string } | null
  )?.quarter_id;

  if (!voucherQuarterId) {
    throw new ServiceError("Kein Quartier zugeordnet", 400);
  }

  // Pruefen: Ziel-Nutzer muss im selben Quartier sein
  const { data: targetHm } = await supabase
    .from("household_members")
    .select("households(quarter_id)")
    .eq("user_id", targetUserId)
    .limit(1)
    .single();

  const targetQuarterId = (
    targetHm?.households as unknown as { quarter_id: string } | null
  )?.quarter_id;

  if (targetQuarterId !== voucherQuarterId) {
    throw new ServiceError("Der Nutzer ist nicht in Ihrem Quartier", 403);
  }

  // Pruefen: Bereits gevoucht?
  const { data: existing } = await supabase
    .from("neighbor_vouches")
    .select("id")
    .eq("voucher_id", voucherId)
    .eq("target_id", targetUserId)
    .maybeSingle();

  if (existing) {
    throw new ServiceError("Sie haben diesen Nachbarn bereits bestätigt", 409);
  }

  // Vouch eintragen
  const { error: insertError } = await supabase
    .from("neighbor_vouches")
    .insert({
      voucher_id: voucherId,
      target_id: targetUserId,
      quarter_id: voucherQuarterId,
    });

  if (insertError) {
    throw new ServiceError("Bestätigung fehlgeschlagen", 500);
  }

  // Zaehlen: Hat der Ziel-Nutzer jetzt 2 Vouches?
  const { count } = await supabase
    .from("neighbor_vouches")
    .select("id", { count: "exact", head: true })
    .eq("target_id", targetUserId);

  if (count && count >= 2) {
    // Automatisch verifizieren
    await supabase
      .from("users")
      .update({ trust_level: "verified" })
      .eq("id", targetUserId)
      .eq("trust_level", "new");

    // verified_at auf household_member setzen
    await supabase
      .from("household_members")
      .update({ verified_at: new Date().toISOString() })
      .eq("user_id", targetUserId)
      .is("verified_at", null);
  }

  return {
    success: true,
    vouch_count: count ?? 1,
    verified: (count ?? 0) >= 2,
  };
}

// ============================================================
// Unverifizierte Nachbarn im Quartier laden
// ============================================================

export interface UnverifiedNeighbor {
  id: string;
  display_name: string;
  street: string;
  house_number: string;
  vouch_count: number;
  already_vouched: boolean;
}

/**
 * Laedt alle unverifizierten Nachbarn im eigenen Quartier.
 * Gibt leeres Array zurueck, wenn kein Quartier zugeordnet.
 */
export async function listUnverifiedNeighbors(
  supabase: SupabaseClient,
  userId: string,
): Promise<UnverifiedNeighbor[]> {
  // Quartier des Users
  const { data: hm } = await supabase
    .from("household_members")
    .select("households(quarter_id)")
    .eq("user_id", userId)
    .limit(1)
    .single();

  const quarterId = (hm?.households as unknown as { quarter_id: string } | null)
    ?.quarter_id;
  if (!quarterId) {
    return [];
  }

  // Unverifizierte Nutzer im selben Quartier
  const { data: unverified } = await supabase
    .from("household_members")
    .select(
      `
      user_id,
      households!inner(quarter_id, street_name, house_number),
      users!inner(id, display_name, trust_level)
    `,
    )
    .eq("households.quarter_id", quarterId)
    .eq("users.trust_level", "new");

  if (!unverified) return [];

  // Eigene Vouches laden
  const { data: myVouches } = await supabase
    .from("neighbor_vouches")
    .select("target_id")
    .eq("voucher_id", userId);

  const vouchedIds = new Set((myVouches ?? []).map((v) => v.target_id));

  // Vouch-Counts pro User laden
  const targetIds = unverified
    .map((u) => u.user_id)
    .filter((id) => id !== userId);
  const { data: vouchCounts } = await supabase
    .from("neighbor_vouches")
    .select("target_id")
    .in("target_id", targetIds);

  const countMap = new Map<string, number>();
  (vouchCounts ?? []).forEach((v) => {
    countMap.set(v.target_id, (countMap.get(v.target_id) ?? 0) + 1);
  });

  return unverified
    .filter((u) => u.user_id !== userId)
    .map((u) => {
      const householdRaw = Array.isArray(u.households)
        ? u.households[0]
        : u.households;
      const household = householdRaw as unknown as {
        street_name: string;
        house_number: string;
      };
      const userRaw = Array.isArray(u.users) ? u.users[0] : u.users;
      const userInfo = userRaw as unknown as {
        id: string;
        display_name: string;
      };
      return {
        id: userInfo.id,
        display_name: userInfo.display_name,
        street: household.street_name,
        house_number: household.house_number,
        vouch_count: countMap.get(userInfo.id) ?? 0,
        already_vouched: vouchedIds.has(userInfo.id),
      };
    });
}
