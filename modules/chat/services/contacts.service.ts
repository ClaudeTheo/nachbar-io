// Contacts-Service: Kreis-Beziehungen verwalten (contact_links)
// Cross-Quartier-faehig (auch CH/AT) — keine quarter_id-Pruefung.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { fetchDisplayNames } from "./display-names";

export type ContactStatus = "pending" | "accepted" | "rejected" | "blocked";

export interface ContactLink {
  requester_id: string;
  addressee_id: string;
  status: ContactStatus;
  note: string | null;
  created_at: string;
  accepted_at: string | null;
}

export interface ContactWithProfile extends ContactLink {
  other_user_id: string;
  other_display_name: string | null;
  direction: "outgoing" | "incoming";
}

const MAX_NOTE_LENGTH = 280;

/**
 * Liste aller Kontakte des Users (sowohl requester- als auch addressee-seitig).
 * Optional nach status filtern.
 */
export async function listContacts(
  supabase: SupabaseClient,
  userId: string,
  statusFilter?: ContactStatus,
): Promise<ContactWithProfile[]> {
  let query = supabase
    .from("contact_links")
    .select("requester_id, addressee_id, status, note, created_at, accepted_at")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    throw new ServiceError(
      "Kontakte konnten nicht geladen werden",
      500,
      "list_contacts_failed",
      {
        details: error.message,
      },
    );
  }

  const rows = data ?? [];
  const otherIds = rows.map((row) =>
    row.requester_id === userId ? row.addressee_id : row.requester_id,
  );
  const names = await fetchDisplayNames(supabase, otherIds);

  return rows.map((row) => {
    const other =
      row.requester_id === userId ? row.addressee_id : row.requester_id;
    return {
      ...row,
      other_user_id: other,
      other_display_name: names.get(other) ?? null,
      direction: row.requester_id === userId ? "outgoing" : "incoming",
    };
  });
}

/**
 * Neue Kontaktanfrage senden. Prueft ob bereits eine Anfrage in die andere
 * Richtung besteht — falls ja, wird die bestehende "accepted" (symmetrisch).
 */
export async function sendContactRequest(
  supabase: SupabaseClient,
  requesterId: string,
  addresseeId: string,
  note?: string,
): Promise<ContactLink> {
  if (requesterId === addresseeId) {
    throw new ServiceError(
      "Man kann sich selbst nicht einladen",
      400,
      "self_contact_request",
    );
  }

  if (note && note.length > MAX_NOTE_LENGTH) {
    throw new ServiceError(
      `Nachricht zu lang (max ${MAX_NOTE_LENGTH} Zeichen)`,
      400,
      "note_too_long",
    );
  }

  // Reverse-Anfrage? Dann akzeptieren statt neue anlegen.
  const { data: reverse } = await supabase
    .from("contact_links")
    .select("requester_id, addressee_id, status")
    .eq("requester_id", addresseeId)
    .eq("addressee_id", requesterId)
    .maybeSingle();

  if (reverse) {
    if (reverse.status === "blocked") {
      throw new ServiceError(
        "Kontaktanfrage nicht moeglich",
        403,
        "contact_blocked",
      );
    }
    // Anfrage in die andere Richtung existiert — als accepted markieren
    const { data: updated, error: updateError } = await supabase
      .from("contact_links")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("requester_id", addresseeId)
      .eq("addressee_id", requesterId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new ServiceError(
        "Kontakt konnte nicht bestaetigt werden",
        500,
        "accept_reverse_failed",
        { details: updateError?.message },
      );
    }
    return updated;
  }

  const { data, error } = await supabase
    .from("contact_links")
    .insert({
      requester_id: requesterId,
      addressee_id: addresseeId,
      status: "pending",
      note: note ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ServiceError(
        "Kontaktanfrage existiert bereits",
        409,
        "duplicate_request",
      );
    }
    throw new ServiceError(
      "Kontaktanfrage konnte nicht gesendet werden",
      500,
      "send_request_failed",
      { details: error.message },
    );
  }

  return data;
}

/**
 * Status einer Kontaktanfrage aendern. Addressee kann accept/reject/block,
 * Requester kann eigene pending-Anfrage zuruecknehmen.
 */
export async function updateContactStatus(
  supabase: SupabaseClient,
  userId: string,
  requesterId: string,
  addresseeId: string,
  newStatus: ContactStatus,
): Promise<ContactLink> {
  const isAddressee = userId === addresseeId;
  const isRequester = userId === requesterId;

  if (!isAddressee && !isRequester) {
    throw new ServiceError("Keine Berechtigung", 403, "not_participant");
  }

  // Erlaubte Uebergaenge:
  // - Addressee: pending -> accepted|rejected|blocked, accepted -> blocked
  // - Requester: pending -> rejected (Ruecknahme)
  const allowedForAddressee: ContactStatus[] = [
    "accepted",
    "rejected",
    "blocked",
  ];
  const allowedForRequester: ContactStatus[] = ["rejected"];

  if (isAddressee && !allowedForAddressee.includes(newStatus)) {
    throw new ServiceError(
      "Ungueltiger Status-Uebergang",
      400,
      "invalid_transition",
    );
  }
  if (isRequester && !allowedForRequester.includes(newStatus)) {
    throw new ServiceError(
      "Ungueltiger Status-Uebergang",
      400,
      "invalid_transition",
    );
  }

  const updateData: Partial<ContactLink> = { status: newStatus };
  if (newStatus === "accepted") {
    updateData.accepted_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("contact_links")
    .update(updateData)
    .eq("requester_id", requesterId)
    .eq("addressee_id", addresseeId)
    .select()
    .single();

  if (error || !data) {
    throw new ServiceError(
      "Status konnte nicht geaendert werden",
      500,
      "update_status_failed",
      { details: error?.message },
    );
  }

  return data;
}

/**
 * Kontakt loeschen (RLS erlaubt beide Seiten).
 */
export async function deleteContact(
  supabase: SupabaseClient,
  userId: string,
  requesterId: string,
  addresseeId: string,
): Promise<void> {
  if (userId !== requesterId && userId !== addresseeId) {
    throw new ServiceError("Keine Berechtigung", 403, "not_participant");
  }

  const { error } = await supabase
    .from("contact_links")
    .delete()
    .eq("requester_id", requesterId)
    .eq("addressee_id", addresseeId);

  if (error) {
    throw new ServiceError(
      "Kontakt konnte nicht geloescht werden",
      500,
      "delete_failed",
      { details: error.message },
    );
  }
}
