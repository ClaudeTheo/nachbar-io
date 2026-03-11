import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// Service-Role Client fuer Admin-Operationen
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert");
  }
  return createClient(url, key);
}

/**
 * POST /api/admin/verify-address
 *
 * Admin genehmigt oder lehnt eine Verifizierungsanfrage ab.
 * Body: { requestId, action: 'approve' | 'reject', note? }
 */
export async function POST(request: NextRequest) {
  // 1. Admin-Check
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
  }

  // 2. Body parsen
  const body = await request.json();
  const { requestId, action, note } = body;

  if (!requestId || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "requestId und action (approve/reject) erforderlich" },
      { status: 400 }
    );
  }

  const adminSupabase = getAdminSupabase();

  // 3. Anfrage laden
  const { data: vRequest, error: fetchError } = await adminSupabase
    .from("verification_requests")
    .select("*, user:users(display_name)")
    .eq("id", requestId)
    .single();

  if (fetchError || !vRequest) {
    return NextResponse.json(
      { error: "Verifizierungsanfrage nicht gefunden" },
      { status: 404 }
    );
  }

  if (vRequest.status !== "pending") {
    return NextResponse.json(
      { error: "Anfrage wurde bereits bearbeitet" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  if (action === "approve") {
    // 4a. Genehmigen: Status + verified_at setzen
    await adminSupabase
      .from("verification_requests")
      .update({
        status: "approved",
        admin_note: note || null,
        reviewed_at: now,
        reviewed_by: user.id,
      })
      .eq("id", requestId);

    // Household-Member verifizieren
    await adminSupabase
      .from("household_members")
      .update({ verified_at: now })
      .eq("user_id", vRequest.user_id)
      .eq("household_id", vRequest.household_id);

    // Trust-Level auf verified setzen
    await adminSupabase
      .from("users")
      .update({ trust_level: "verified" })
      .eq("id", vRequest.user_id);

    // Benachrichtigung senden
    await adminSupabase.from("notifications").insert({
      user_id: vRequest.user_id,
      type: "verification_approved",
      title: "Verifizierung bestätigt",
      body: "Ihre Zugehörigkeit zum Quartier wurde bestätigt. Sie haben nun vollen Zugang.",
    });
  } else {
    // 4b. Ablehnen
    await adminSupabase
      .from("verification_requests")
      .update({
        status: "rejected",
        admin_note: note || null,
        reviewed_at: now,
        reviewed_by: user.id,
      })
      .eq("id", requestId);

    // Benachrichtigung senden
    await adminSupabase.from("notifications").insert({
      user_id: vRequest.user_id,
      type: "verification_rejected",
      title: "Verifizierung nicht bestätigt",
      body: note
        ? `Ihre Verifizierung konnte nicht bestätigt werden: ${note}`
        : "Ihre Verifizierung konnte nicht bestätigt werden. Bitte wenden Sie sich an einen Admin.",
    });
  }

  return NextResponse.json({
    success: true,
    action,
    userId: vRequest.user_id,
  });
}
