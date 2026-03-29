// modules/care/services/shopping.service.ts
// Nachbar.io — Einkaufshilfe Business-Logik: Auflisten, Erstellen, Status-Übergänge, Löschen

import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/care/audit";
import { sendCareNotification } from "@/lib/care/notifications";
import { ServiceError } from "@/lib/services/service-error";

// --- Konstanten ---

// Gültige Status-Übergänge
const TRANSITIONS: Record<
  string,
  { from: string[]; field_updates: Record<string, unknown> }
> = {
  claim: {
    from: ["open"],
    field_updates: { status: "claimed" },
  },
  unclaim: {
    from: ["claimed"],
    field_updates: { status: "open", claimed_by: null, claimed_at: null },
  },
  shopping: {
    from: ["claimed"],
    field_updates: { status: "shopping" },
  },
  deliver: {
    from: ["claimed", "shopping"],
    field_updates: { status: "delivered" },
  },
  confirm: {
    from: ["delivered"],
    field_updates: { status: "confirmed" },
  },
  cancel: {
    from: ["open", "claimed"],
    field_updates: { status: "cancelled" },
  },
};

// --- listShoppingRequests ---

interface ListShoppingRequestsParams {
  status?: string;
  quarterId?: string;
}

export async function listShoppingRequests(
  supabase: SupabaseClient,
  params: ListShoppingRequestsParams,
) {
  const { status = "open", quarterId } = params;

  let query = supabase
    .from("care_shopping_requests")
    .select(
      "*, requester:users!requester_id(display_name), claimer:users!claimed_by(display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (quarterId) {
    query = query.eq("quarter_id", quarterId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[care/shopping] GET Fehler:", error);
    throw new ServiceError(
      "Einkaufsanfragen konnten nicht geladen werden",
      500,
    );
  }

  return data ?? [];
}

// --- createShoppingRequest ---

interface CreateShoppingRequestParams {
  userId: string;
  items?: { name?: string; quantity?: string }[];
  note?: string;
  due_date?: string;
}

export async function createShoppingRequest(
  supabase: SupabaseClient,
  params: CreateShoppingRequestParams,
) {
  const { userId, items, note, due_date } = params;

  // Validierung: items Array
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ServiceError("Bitte geben Sie mindestens einen Artikel an", 400);
  }
  if (items.length > 30) {
    throw new ServiceError("Maximal 30 Artikel pro Einkaufsanfrage", 400);
  }

  // Validierung: Einzelne Artikel
  for (const item of items) {
    if (
      !item.name ||
      typeof item.name !== "string" ||
      item.name.trim().length === 0
    ) {
      throw new ServiceError("Jeder Artikel muss einen Namen haben", 400);
    }
    if (item.name.length > 200) {
      throw new ServiceError(
        "Artikelname darf maximal 200 Zeichen lang sein",
        400,
      );
    }
  }

  // Validierung: Notiz
  if (note && note.length > 500) {
    throw new ServiceError("Notiz darf maximal 500 Zeichen lang sein", 400);
  }

  // Quarter-ID aus Haushaltsmitgliedschaft ermitteln
  const { data: membership, error: memberError } = await supabase
    .from("household_members")
    .select("household:households!inner(quarter_id)")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (memberError || !membership?.household) {
    throw new ServiceError("Sie sind keinem Quartier zugeordnet", 400);
  }

  const household = Array.isArray(membership.household)
    ? membership.household[0]
    : membership.household;
  const quarterId = (household as { quarter_id: string }).quarter_id;

  // Items sanitisieren
  const sanitizedItems = items.map((item) => ({
    name: item.name!.trim(),
    quantity: item.quantity?.trim() ?? "",
    checked: false,
  }));

  // Einkaufsanfrage erstellen
  const { data: shopping, error: insertError } = await supabase
    .from("care_shopping_requests")
    .insert({
      requester_id: userId,
      quarter_id: quarterId,
      items: sanitizedItems,
      note: note?.trim() || null,
      due_date: due_date || null,
      status: "open",
    })
    .select("*, requester:users!requester_id(display_name)")
    .single();

  if (insertError || !shopping) {
    console.error("[care/shopping] POST Insert-Fehler:", insertError);
    throw new ServiceError("Einkaufsanfrage konnte nicht erstellt werden", 500);
  }

  // Audit-Log
  await writeAuditLog(supabase, {
    seniorId: userId,
    actorId: userId,
    eventType: "visit_logged",
    referenceType: "care_shopping_requests",
    referenceId: shopping.id,
    metadata: { action: "created", item_count: sanitizedItems.length },
  }).catch(() => {});

  return shopping;
}

// --- updateShoppingStatus ---

interface UpdateShoppingStatusParams {
  requestId: string;
  userId: string;
  action?: string;
  items?: { name: string; quantity?: string; checked?: boolean }[];
}

export async function updateShoppingStatus(
  supabase: SupabaseClient,
  params: UpdateShoppingStatusParams,
) {
  const { requestId, userId, action, items } = params;

  // Bestehende Anfrage laden
  const { data: existing, error: fetchError } = await supabase
    .from("care_shopping_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !existing) {
    if (fetchError?.code === "PGRST116") {
      throw new ServiceError("Einkaufsanfrage nicht gefunden", 404);
    }
    throw new ServiceError("Einkaufsanfrage konnte nicht geladen werden", 500);
  }

  const updates: Record<string, unknown> = {};

  // Items-Update (optional, kann zusammen mit action gesendet werden)
  if (items) {
    if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
      throw new ServiceError("Items: 1-30 Artikel erforderlich", 400);
    }
    for (const item of items) {
      if (
        !item.name ||
        typeof item.name !== "string" ||
        item.name.trim().length === 0
      ) {
        throw new ServiceError("Jeder Artikel muss einen Namen haben", 400);
      }
      if (item.name.length > 200) {
        throw new ServiceError(
          "Artikelname darf maximal 200 Zeichen lang sein",
          400,
        );
      }
    }
    updates.items = items.map((item) => ({
      name: item.name.trim(),
      quantity: item.quantity?.trim() ?? "",
      checked: item.checked ?? false,
    }));
  }

  // Status-Übergang (wenn action angegeben)
  if (action) {
    const transition = TRANSITIONS[action];
    if (!transition) {
      throw new ServiceError(
        `Ungültige Aktion: ${action}. Erlaubt: ${Object.keys(TRANSITIONS).join(", ")}`,
        400,
      );
    }

    // Aktueller Status prüfen
    if (!transition.from.includes(existing.status)) {
      throw new ServiceError(
        `Aktion '${action}' ist im Status '${existing.status}' nicht möglich`,
        409,
      );
    }

    // Berechtigungsprüfung
    const isRequester = existing.requester_id === userId;
    const isClaimer = existing.claimed_by === userId;

    // confirm und cancel: nur Ersteller
    if (["confirm", "cancel"].includes(action) && !isRequester) {
      throw new ServiceError(
        "Nur der Ersteller kann diese Aktion ausführen",
        403,
      );
    }

    // unclaim, shopping, deliver: nur der Übernehmende
    if (["unclaim", "shopping", "deliver"].includes(action) && !isClaimer) {
      throw new ServiceError(
        "Nur die übernehmende Person kann diese Aktion ausführen",
        403,
      );
    }

    // Feld-Updates aus Transition übernehmen
    Object.assign(updates, transition.field_updates);

    // Zusätzliche Felder je nach Aktion
    if (action === "claim") {
      updates.claimed_by = userId;
      updates.claimed_at = new Date().toISOString();
    } else if (action === "deliver") {
      updates.delivered_at = new Date().toISOString();
    } else if (action === "confirm") {
      updates.confirmed_at = new Date().toISOString();
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ServiceError("Keine aenderbaren Felder angegeben", 400);
  }

  // Update ausführen
  const { data: updated, error: updateError } = await supabase
    .from("care_shopping_requests")
    .update(updates)
    .eq("id", requestId)
    .select(
      "*, requester:users!requester_id(display_name), claimer:users!claimed_by(display_name)",
    )
    .single();

  if (updateError || !updated) {
    console.error("[care/shopping] PATCH Update-Fehler:", updateError);
    throw new ServiceError("Aktualisierung fehlgeschlagen", 500);
  }

  // Audit-Log
  await writeAuditLog(supabase, {
    seniorId: existing.requester_id,
    actorId: userId,
    eventType: "visit_logged",
    referenceType: "care_shopping_requests",
    referenceId: requestId,
    metadata: {
      action: action ?? "items_updated",
      from_status: existing.status,
      to_status: updated.status,
    },
  }).catch(() => {});

  // Push-Benachrichtigungen bei bestimmten Aktionen
  if (action === "claim") {
    await sendCareNotification(supabase, {
      userId: existing.requester_id,
      type: "care_sos_response",
      title: "Einkaufshilfe übernommen",
      body: "Jemand hat Ihre Einkaufsanfrage übernommen.",
      referenceId: requestId,
      referenceType: "care_shopping_requests",
      url: "/care/shopping",
      channels: ["push", "in_app"],
    }).catch(() => {});
  } else if (action === "deliver") {
    await sendCareNotification(supabase, {
      userId: existing.requester_id,
      type: "care_sos_response",
      title: "Einkauf geliefert",
      body: "Ihr Einkauf wurde als geliefert markiert. Bitte bestätigen Sie den Empfang.",
      referenceId: requestId,
      referenceType: "care_shopping_requests",
      url: "/care/shopping",
      channels: ["push", "in_app"],
    }).catch(() => {});
  }

  return updated;
}

// --- deleteShoppingRequest ---

interface DeleteShoppingRequestParams {
  requestId: string;
  userId: string;
}

export async function deleteShoppingRequest(
  supabase: SupabaseClient,
  params: DeleteShoppingRequestParams,
) {
  const { requestId, userId } = params;

  // Anfrage laden
  const { data: existing, error: fetchError } = await supabase
    .from("care_shopping_requests")
    .select("requester_id, status")
    .eq("id", requestId)
    .single();

  if (fetchError || !existing) {
    if (fetchError?.code === "PGRST116") {
      throw new ServiceError("Einkaufsanfrage nicht gefunden", 404);
    }
    throw new ServiceError("Einkaufsanfrage konnte nicht geladen werden", 500);
  }

  // Nur Ersteller darf löschen
  if (existing.requester_id !== userId) {
    throw new ServiceError("Nur der Ersteller kann diese Anfrage löschen", 403);
  }

  // Nur offene Anfragen löschen
  if (existing.status !== "open") {
    throw new ServiceError("Nur offene Anfragen können gelöscht werden", 409);
  }

  const { error: deleteError } = await supabase
    .from("care_shopping_requests")
    .delete()
    .eq("id", requestId);

  if (deleteError) {
    console.error("[care/shopping] DELETE Fehler:", deleteError);
    throw new ServiceError("Löschen fehlgeschlagen", 500);
  }

  // Audit-Log
  await writeAuditLog(supabase, {
    seniorId: userId,
    actorId: userId,
    eventType: "visit_logged",
    referenceType: "care_shopping_requests",
    referenceId: requestId,
    metadata: { action: "deleted" },
  }).catch(() => {});

  return { success: true };
}
