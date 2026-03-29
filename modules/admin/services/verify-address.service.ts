// Nachbar.io — Service-Logik fuer Admin-Adress-Verifizierung
// Extrahiert aus app/api/admin/verify-address/route.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { sendVerificationResultEmail } from "@/lib/email";
import { safeInsertNotification } from "@/lib/notifications-server";

export interface VerifyAddressParams {
  requestId: string;
  action: "approve" | "reject";
  note?: string;
  reviewedBy: string;
  baseUrl: string;
}

export async function processVerification(
  adminSupabase: SupabaseClient,
  params: VerifyAddressParams
): Promise<{ success: true; action: string; userId: string }> {
  const { requestId, action, note, reviewedBy, baseUrl } = params;

  // Anfrage laden (kein FK-Join auf users, da FK auf auth.users zeigt)
  const { data: vRequest, error: fetchError } = await adminSupabase
    .from("verification_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !vRequest) {
    throw new ServiceError("Verifizierungsanfrage nicht gefunden", 404);
  }

  // Display-Name separat aus public.users laden
  const { data: reqUser } = await adminSupabase
    .from("users")
    .select("display_name")
    .eq("id", vRequest.user_id)
    .single();
  // An vRequest anhaengen fuer spaetere Verwendung
  (vRequest as Record<string, unknown>).user = reqUser || { display_name: "Nachbar" };

  if (vRequest.status !== "pending") {
    throw new ServiceError("Anfrage wurde bereits bearbeitet", 400);
  }

  const now = new Date().toISOString();

  if (action === "approve") {
    // Genehmigen: Status + verified_at setzen
    await adminSupabase
      .from("verification_requests")
      .update({
        status: "approved",
        admin_note: note || null,
        reviewed_at: now,
        reviewed_by: reviewedBy,
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
    // Ablehnen
    await adminSupabase
      .from("verification_requests")
      .update({
        status: "rejected",
        admin_note: note || null,
        reviewed_at: now,
        reviewed_by: reviewedBy,
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

  return { success: true, action, userId: vRequest.user_id };
}
