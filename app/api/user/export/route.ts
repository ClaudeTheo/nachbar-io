import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/user/export
 *
 * DSGVO Art. 20 — Recht auf Datenportabilitaet
 * Exportiert alle personenbezogenen Daten des Nutzers als JSON.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const userId = user.id;

  try {
    // Parallele Abfragen aller Nutzerdaten
    const [
      profileResult,
      membershipResult,
      skillsResult,
      alertsResult,
      alertResponsesResult,
      helpRequestsResult,
      marketplaceResult,
      eventsCreatedResult,
      eventParticipationsResult,
      messagesResult,
      notificationsResult,
      invitationsResult,
      reputationResult,
      tipsResult,
      reviewsResult,
      endorsementsResult,
      vacationsResult,
    ] = await Promise.all([
      // Profil
      supabase.from("users").select("id, display_name, bio, phone, avatar_url, trust_level, ui_mode, created_at").eq("id", userId).single(),
      // Haushaltsmitgliedschaft
      supabase.from("household_members").select("household_id, role, verification_method, joined_at, household:households(street_name, house_number)").eq("user_id", userId),
      // Kompetenzen
      supabase.from("skills").select("category, description, created_at").eq("user_id", userId),
      // Soforthilfe-Alerts
      supabase.from("alerts").select("id, category, urgency, title, description, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      // Alert-Antworten
      supabase.from("alert_responses").select("alert_id, message, created_at").eq("responder_user_id", userId).order("created_at", { ascending: false }),
      // Hilfe-Anfragen
      supabase.from("help_requests").select("id, category, title, description, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      // Marktplatz-Inserate
      supabase.from("marketplace_items").select("id, type, category, title, description, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      // Erstellte Events
      supabase.from("events").select("id, title, description, event_date, location, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      // Event-Teilnahmen
      supabase.from("event_participants").select("event_id, status, created_at").eq("user_id", userId),
      // Nachrichten
      supabase.from("messages").select("id, conversation_id, content, created_at").eq("sender_id", userId).order("created_at", { ascending: false }).limit(100),
      // Benachrichtigungen (letzte 50)
      supabase.from("notifications").select("type, title, body, read, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      // Einladungen
      supabase.from("neighbor_invitations").select("invite_method, status, created_at, accepted_at").eq("inviter_id", userId),
      // Reputation
      supabase.from("reputation_points").select("points, reason, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      // Nachbarschafts-Tipps
      supabase.from("community_tips").select("id, category, title, description, status, created_at").eq("user_id", userId),
      // Bewertungen erhalten
      supabase.from("expert_reviews").select("rating, comment, created_at").eq("expert_user_id", userId),
      // Empfehlungen erhalten
      supabase.from("expert_endorsements").select("category, created_at").eq("expert_user_id", userId),
      // Urlaubsmodus
      supabase.from("vacation_modes").select("start_date, end_date, note, created_at").eq("user_id", userId),
    ]);

    // Daten zusammenstellen
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        service: "Nachbar.io",
        description: "Vollständiger Export Ihrer personenbezogenen Daten gemäß DSGVO Art. 20",
      },
      profile: profileResult.data,
      household: membershipResult.data,
      skills: skillsResult.data ?? [],
      alerts: alertsResult.data ?? [],
      alertResponses: alertResponsesResult.data ?? [],
      helpRequests: helpRequestsResult.data ?? [],
      marketplaceItems: marketplaceResult.data ?? [],
      eventsCreated: eventsCreatedResult.data ?? [],
      eventParticipations: eventParticipationsResult.data ?? [],
      messages: messagesResult.data ?? [],
      notifications: notificationsResult.data ?? [],
      invitations: invitationsResult.data ?? [],
      reputationPoints: reputationResult.data ?? [],
      communityTips: tipsResult.data ?? [],
      reviewsReceived: reviewsResult.data ?? [],
      endorsementsReceived: endorsementsResult.data ?? [],
      vacations: vacationsResult.data ?? [],
    };

    // Als JSON-Download zurueckgeben
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="nachbar-io-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (err) {
    console.error("Datenexport fehlgeschlagen:", err);
    return NextResponse.json(
      { error: "Fehler beim Datenexport" },
      { status: 500 }
    );
  }
}
