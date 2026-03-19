import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { sendVerificationResultEmail } from "@/lib/email";
import { safeInsertNotification } from "@/lib/notifications-server";

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

  // 3. Anfrage laden (kein FK-Join auf users, da FK auf auth.users zeigt)
  const { data: vRequest, error: fetchError } = await adminSupabase
    .from("verification_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !vRequest) {
    return NextResponse.json(
      { error: "Verifizierungsanfrage nicht gefunden" },
      { status: 404 }
    );
  }

  // Display-Name separat aus public.users laden
  const { data: reqUser } = await adminSupabase
    .from("users")
    .select("display_name")
    .eq("id", vRequest.user_id)
    .single();
  // An vRequest anhängen für spätere Verwendung
  (vRequest as Record<string, unknown>).user = reqUser || { display_name: "Nachbar" };

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

    // Benachrichtigung senden (In-App, mit Constraint-Fallback)
    await safeInsertNotification(adminSupabase, {
      user_id: vRequest.user_id,
      type: "verification_approved",
      title: "Verifizierung bestätigt",
      body: "Ihre Zugehörigkeit zum Quartier wurde bestätigt. Sie haben nun vollen Zugang.",
    });

    // Push-Notification senden (fire-and-forget)
    try {
      const baseUrl = request.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "https://quartierapp.de";
      await fetch(`${baseUrl}/api/push/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "",
        },
        body: JSON.stringify({
          userId: vRequest.user_id,
          title: "Willkommen im Quartier!",
          body: "Ihre Adresse wurde verifiziert. Sie haben nun vollen Zugang zur Nachbarschaft.",
          url: "/dashboard",
          tag: "verification_approved",
        }),
      });
    } catch {
      console.error("Push-Benachrichtigung (Approve) fehlgeschlagen");
    }

    // E-Mail-Benachrichtigung senden (fire-and-forget)
    try {
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(vRequest.user_id);
      if (authUser?.user?.email) {
        await sendVerificationResultEmail({
          to: authUser.user.email,
          userName: vRequest.user?.display_name || "Nachbar",
          approved: true,
        });
      }
    } catch {
      console.error("E-Mail-Benachrichtigung (Approve) fehlgeschlagen");
    }
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

    const rejectBody = note
      ? `Ihre Verifizierungsanfrage wurde leider abgelehnt: ${note}`
      : "Ihre Verifizierungsanfrage wurde leider abgelehnt. Bitte wenden Sie sich an einen Admin.";

    // Benachrichtigung senden (In-App, mit Constraint-Fallback)
    await safeInsertNotification(adminSupabase, {
      user_id: vRequest.user_id,
      type: "verification_rejected",
      title: "Verifizierung nicht bestätigt",
      body: rejectBody,
    });

    // Push-Notification senden (fire-and-forget)
    try {
      const baseUrl = request.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "https://quartierapp.de";
      await fetch(`${baseUrl}/api/push/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "",
        },
        body: JSON.stringify({
          userId: vRequest.user_id,
          title: "Verifizierung nicht bestätigt",
          body: rejectBody,
          url: "/profile",
          tag: "verification_rejected",
        }),
      });
    } catch {
      console.error("Push-Benachrichtigung (Reject) fehlgeschlagen");
    }

    // E-Mail-Benachrichtigung senden (fire-and-forget)
    try {
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(vRequest.user_id);
      if (authUser?.user?.email) {
        await sendVerificationResultEmail({
          to: authUser.user.email,
          userName: vRequest.user?.display_name || "Nachbar",
          approved: false,
          adminNote: note,
        });
      }
    } catch {
      console.error("E-Mail-Benachrichtigung (Reject) fehlgeschlagen");
    }
  }

  return NextResponse.json({
    success: true,
    action,
    userId: vRequest.user_id,
  });
}
