// POST /api/vouching — Nachbar-Vouching: 2 Nachbarn bestaetigen Identitaet
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { target_user_id } = await request.json();
  if (!target_user_id || target_user_id === user.id) {
    return NextResponse.json({ error: "Ungueltiger Ziel-Nutzer" }, { status: 400 });
  }

  // Pruefen: Voucher muss mindestens 'verified' sein
  const { data: voucher } = await supabase
    .from("users")
    .select("trust_level")
    .eq("id", user.id)
    .single();

  if (!voucher || !["verified", "trusted", "lotse", "admin"].includes(voucher.trust_level)) {
    return NextResponse.json(
      { error: "Sie muessen selbst verifiziert sein, um andere zu bestaetigen" },
      { status: 403 }
    );
  }

  // Quartier des Vouchers ermitteln
  const { data: voucherHm } = await supabase
    .from("household_members")
    .select("households(quarter_id)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const voucherQuarterId = (voucherHm?.households as { quarter_id: string } | null)?.quarter_id;

  if (!voucherQuarterId) {
    return NextResponse.json({ error: "Kein Quartier zugeordnet" }, { status: 400 });
  }

  // Pruefen: Ziel-Nutzer muss im selben Quartier sein
  const { data: targetHm } = await supabase
    .from("household_members")
    .select("households(quarter_id)")
    .eq("user_id", target_user_id)
    .limit(1)
    .single();

  const targetQuarterId = (targetHm?.households as { quarter_id: string } | null)?.quarter_id;

  if (targetQuarterId !== voucherQuarterId) {
    return NextResponse.json(
      { error: "Der Nutzer ist nicht in Ihrem Quartier" },
      { status: 403 }
    );
  }

  // Pruefen: Bereits gevoucht?
  const { data: existing } = await supabase
    .from("neighbor_vouches")
    .select("id")
    .eq("voucher_id", user.id)
    .eq("target_id", target_user_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Sie haben diesen Nachbarn bereits bestaetigt" }, { status: 409 });
  }

  // Vouch eintragen
  const { error: insertError } = await supabase
    .from("neighbor_vouches")
    .insert({
      voucher_id: user.id,
      target_id: target_user_id,
      quarter_id: voucherQuarterId,
    });

  if (insertError) {
    return NextResponse.json({ error: "Bestaetigung fehlgeschlagen" }, { status: 500 });
  }

  // Zaehlen: Hat der Ziel-Nutzer jetzt 2 Vouches?
  const { count } = await supabase
    .from("neighbor_vouches")
    .select("id", { count: "exact", head: true })
    .eq("target_id", target_user_id);

  if (count && count >= 2) {
    // Automatisch verifizieren
    await supabase
      .from("users")
      .update({ trust_level: "verified" })
      .eq("id", target_user_id)
      .eq("trust_level", "new");

    // verified_at auf household_member setzen
    await supabase
      .from("household_members")
      .update({ verified_at: new Date().toISOString() })
      .eq("user_id", target_user_id)
      .is("verified_at", null);
  }

  return NextResponse.json({
    success: true,
    vouch_count: count ?? 1,
    verified: (count ?? 0) >= 2,
  });
}

// GET /api/vouching — Unverifizierte Nachbarn im eigenen Quartier laden
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  // Quartier des Users
  const { data: hm } = await supabase
    .from("household_members")
    .select("households(quarter_id)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const quarterId = (hm?.households as { quarter_id: string } | null)?.quarter_id;
  if (!quarterId) {
    return NextResponse.json([]);
  }

  // Unverifizierte Nutzer im selben Quartier
  const { data: unverified } = await supabase
    .from("household_members")
    .select(`
      user_id,
      households!inner(quarter_id, street_name, house_number),
      users!inner(id, display_name, trust_level)
    `)
    .eq("households.quarter_id", quarterId)
    .eq("users.trust_level", "new");

  if (!unverified) return NextResponse.json([]);

  // Eigene Vouches laden
  const { data: myVouches } = await supabase
    .from("neighbor_vouches")
    .select("target_id")
    .eq("voucher_id", user.id);

  const vouchedIds = new Set((myVouches ?? []).map((v) => v.target_id));

  // Vouch-Counts pro User laden
  const targetIds = unverified.map((u) => u.user_id).filter((id) => id !== user.id);
  const { data: vouchCounts } = await supabase
    .from("neighbor_vouches")
    .select("target_id")
    .in("target_id", targetIds);

  const countMap = new Map<string, number>();
  (vouchCounts ?? []).forEach((v) => {
    countMap.set(v.target_id, (countMap.get(v.target_id) ?? 0) + 1);
  });

  const result = unverified
    .filter((u) => u.user_id !== user.id)
    .map((u) => {
      const household = u.households as { street_name: string; house_number: string };
      const userInfo = u.users as { id: string; display_name: string };
      return {
        id: userInfo.id,
        display_name: userInfo.display_name,
        street: household.street_name,
        house_number: household.house_number,
        vouch_count: countMap.get(userInfo.id) ?? 0,
        already_vouched: vouchedIds.has(userInfo.id),
      };
    });

  return NextResponse.json(result);
}
