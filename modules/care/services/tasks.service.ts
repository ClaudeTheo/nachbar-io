// modules/care/services/tasks.service.ts
// Nachbar.io — Aufgabentafel Business-Logik: Auflisten, Erstellen, Status-Übergänge, Löschen

import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/care/audit";
import { sendCareNotification } from "@/lib/care/notifications";
import { ServiceError } from "@/lib/services/service-error";

// --- Konstanten ---

const VALID_CATEGORIES = [
  "transport",
  "shopping",
  "companionship",
  "garden",
  "tech_help",
  "pet_care",
  "household",
  "other",
] as const;

type TaskCategory = (typeof VALID_CATEGORIES)[number];

const VALID_URGENCIES = ["low", "normal", "high", "urgent"] as const;

type TaskAction =
  | "claim"
  | "unclaim"
  | "start"
  | "complete"
  | "confirm"
  | "cancel";

// Erlaubte Status-Übergänge: action → [erlaubte Quell-Status]
const TRANSITIONS: Record<TaskAction, string[]> = {
  claim: ["open"],
  unclaim: ["claimed"],
  start: ["claimed"],
  complete: ["claimed", "in_progress"],
  confirm: ["done"],
  cancel: ["open", "claimed"],
};

const AUDIT_EVENT_MAP: Record<TaskAction, string> = {
  claim: "task_claimed",
  unclaim: "task_unclaimed",
  start: "task_started",
  complete: "task_completed",
  confirm: "task_confirmed",
  cancel: "task_cancelled",
};

// --- listTasks ---

interface ListTasksParams {
  status?: string;
  category?: string;
}

export async function listTasks(
  supabase: SupabaseClient,
  params: ListTasksParams,
) {
  const { status = "open", category } = params;

  // Kategorie validieren falls angegeben
  if (category && !VALID_CATEGORIES.includes(category as TaskCategory)) {
    throw new ServiceError(
      `Ungültige Kategorie: ${category}. Erlaubt: ${VALID_CATEGORIES.join(", ")}`,
      400,
    );
  }

  let query = supabase
    .from("care_tasks")
    .select(
      "*, creator:users!creator_id(display_name), claimer:users!claimed_by(display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[care/tasks] GET fehlgeschlagen:", error);
    throw new ServiceError("Aufgaben konnten nicht geladen werden", 500);
  }

  return data ?? [];
}

// --- createTask ---

interface CreateTaskParams {
  userId: string;
  title?: string;
  description?: string;
  category?: string;
  urgency?: string;
  preferred_date?: string;
  preferred_time_from?: string;
  preferred_time_to?: string;
}

export async function createTask(
  supabase: SupabaseClient,
  params: CreateTaskParams,
) {
  const {
    userId,
    title,
    description,
    category,
    urgency,
    preferred_date,
    preferred_time_from,
    preferred_time_to,
  } = params;

  // Dringlichkeit validieren
  if (urgency && !(VALID_URGENCIES as readonly string[]).includes(urgency)) {
    throw new ServiceError(
      `Ungültige Dringlichkeit: ${urgency}. Erlaubt: ${VALID_URGENCIES.join(", ")}`,
      400,
    );
  }

  // Pflichtfeld: title (3-200 Zeichen)
  if (!title || title.trim().length < 3 || title.trim().length > 200) {
    throw new ServiceError(
      "Titel muss zwischen 3 und 200 Zeichen lang sein",
      400,
    );
  }

  // Beschreibung max 1000 Zeichen
  if (description && description.length > 1000) {
    throw new ServiceError(
      "Beschreibung darf maximal 1000 Zeichen lang sein",
      400,
    );
  }

  // Kategorie validieren
  if (category && !VALID_CATEGORIES.includes(category as TaskCategory)) {
    throw new ServiceError(
      `Ungültige Kategorie: ${category}. Erlaubt: ${VALID_CATEGORIES.join(", ")}`,
      400,
    );
  }

  // Quarter-ID über household_members → households ermitteln
  const { data: membership, error: memberError } = await supabase
    .from("household_members")
    .select("household:households!inner(quarter_id)")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (memberError || !membership?.household) {
    console.error("[care/tasks] Quartier nicht gefunden:", memberError);
    throw new ServiceError("Sie sind keinem Quartier zugeordnet", 403);
  }

  const household = Array.isArray(membership.household)
    ? membership.household[0]
    : membership.household;
  const quarterId = (household as { quarter_id: string }).quarter_id;

  const { data: task, error: insertError } = await supabase
    .from("care_tasks")
    .insert({
      creator_id: userId,
      quarter_id: quarterId,
      title: title.trim(),
      description: description?.trim() ?? null,
      category: category ?? "other",
      urgency: urgency ?? "normal",
      preferred_date: preferred_date ?? null,
      preferred_time_from: preferred_time_from ?? null,
      preferred_time_to: preferred_time_to ?? null,
    })
    .select("*, creator:users!creator_id(display_name)")
    .single();

  if (insertError || !task) {
    console.error("[care/tasks] Erstellung fehlgeschlagen:", insertError);
    throw new ServiceError("Aufgabe konnte nicht erstellt werden", 500);
  }

  // Audit-Log schreiben
  await writeAuditLog(supabase, {
    seniorId: userId,
    actorId: userId,
    eventType: "task_created",
    referenceType: "care_tasks",
    referenceId: task.id,
    metadata: { title: task.title, category: task.category },
  }).catch(() => {});

  return task;
}

// --- updateTaskStatus ---

interface UpdateTaskStatusParams {
  taskId: string;
  userId: string;
  action?: string;
}

export async function updateTaskStatus(
  supabase: SupabaseClient,
  params: UpdateTaskStatusParams,
) {
  const { taskId, userId, action } = params;

  if (!action || !Object.keys(TRANSITIONS).includes(action)) {
    throw new ServiceError(
      `Ungültige Aktion: ${action}. Erlaubt: ${Object.keys(TRANSITIONS).join(", ")}`,
      400,
    );
  }

  const typedAction = action as TaskAction;

  // Aufgabe laden
  const { data: task, error: fetchError } = await supabase
    .from("care_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (fetchError || !task) {
    if (fetchError?.code === "PGRST116") {
      throw new ServiceError("Aufgabe nicht gefunden", 404);
    }
    throw new ServiceError("Aufgabe konnte nicht geladen werden", 500);
  }

  // Status-Übergang prüfen
  const allowedFrom = TRANSITIONS[typedAction];
  if (!allowedFrom.includes(task.status)) {
    throw new ServiceError(
      `Aktion '${action}' ist im Status '${task.status}' nicht erlaubt`,
      409,
    );
  }

  // Berechtigungsprüfung
  const isCreator = task.creator_id === userId;
  const isClaimer = task.claimed_by === userId;

  // confirm/cancel: nur Ersteller
  if ((typedAction === "confirm" || typedAction === "cancel") && !isCreator) {
    throw new ServiceError(
      "Nur der Ersteller kann diese Aktion ausführen",
      403,
    );
  }

  // unclaim/start/complete: nur derjenige, der die Aufgabe übernommen hat
  if (
    (typedAction === "unclaim" ||
      typedAction === "start" ||
      typedAction === "complete") &&
    !isClaimer
  ) {
    throw new ServiceError(
      "Nur die Person, die die Aufgabe übernommen hat, kann diese Aktion ausführen",
      403,
    );
  }

  // Update-Daten je nach Aktion zusammenstellen
  const updates: Record<string, unknown> = {};
  let newStatus: string;

  switch (typedAction) {
    case "claim":
      newStatus = "claimed";
      updates.claimed_by = userId;
      updates.claimed_at = new Date().toISOString();
      break;
    case "unclaim":
      newStatus = "open";
      updates.claimed_by = null;
      updates.claimed_at = null;
      break;
    case "start":
      newStatus = "in_progress";
      break;
    case "complete":
      newStatus = "done";
      updates.completed_at = new Date().toISOString();
      break;
    case "confirm":
      newStatus = "confirmed";
      updates.confirmed_at = new Date().toISOString();
      break;
    case "cancel":
      newStatus = "cancelled";
      break;
  }

  updates.status = newStatus!;

  const { data: updated, error: updateError } = await supabase
    .from("care_tasks")
    .update(updates)
    .eq("id", taskId)
    .select(
      "*, creator:users!creator_id(display_name), claimer:users!claimed_by(display_name)",
    )
    .single();

  if (updateError || !updated) {
    console.error("[care/tasks] Update fehlgeschlagen:", updateError);
    throw new ServiceError("Aktualisierung fehlgeschlagen", 500);
  }

  // Audit-Log schreiben
  await writeAuditLog(supabase, {
    seniorId: task.creator_id,
    actorId: userId,
    eventType: AUDIT_EVENT_MAP[typedAction] as "task_claimed",
    referenceType: "care_tasks",
    referenceId: taskId,
    metadata: {
      action: typedAction,
      from_status: task.status,
      to_status: newStatus!,
    },
  }).catch(() => {});

  // Push-Benachrichtigungen
  if (typedAction === "claim") {
    await sendCareNotification(supabase, {
      userId: task.creator_id,
      type: "care_task_claimed",
      title: "Aufgabe übernommen",
      body: `Ihre Aufgabe "${task.title}" wurde übernommen.`,
      referenceType: "care_tasks",
      referenceId: taskId,
      url: "/care/tasks",
      channels: ["push", "in_app"],
    }).catch(() => {});
  }

  if (typedAction === "complete") {
    await sendCareNotification(supabase, {
      userId: task.creator_id,
      type: "care_task_completed",
      title: "Aufgabe erledigt",
      body: `Ihre Aufgabe "${task.title}" wurde als erledigt markiert. Bitte bestätigen Sie die Erledigung.`,
      referenceType: "care_tasks",
      referenceId: taskId,
      url: "/care/tasks",
      channels: ["push", "in_app"],
    }).catch(() => {});
  }

  return updated;
}

// --- deleteTask ---

interface DeleteTaskParams {
  taskId: string;
  userId: string;
}

export async function deleteTask(
  supabase: SupabaseClient,
  params: DeleteTaskParams,
) {
  const { taskId, userId } = params;

  // Aufgabe laden für Berechtigungsprüfung
  const { data: task, error: fetchError } = await supabase
    .from("care_tasks")
    .select("creator_id, status, title")
    .eq("id", taskId)
    .single();

  if (fetchError || !task) {
    if (fetchError?.code === "PGRST116") {
      throw new ServiceError("Aufgabe nicht gefunden", 404);
    }
    throw new ServiceError("Aufgabe konnte nicht geladen werden", 500);
  }

  if (task.creator_id !== userId) {
    throw new ServiceError("Nur der Ersteller kann die Aufgabe löschen", 403);
  }

  if (task.status !== "open") {
    throw new ServiceError("Nur offene Aufgaben können gelöscht werden", 409);
  }

  const { error: deleteError } = await supabase
    .from("care_tasks")
    .delete()
    .eq("id", taskId);

  if (deleteError) {
    console.error("[care/tasks] Löschen fehlgeschlagen:", deleteError);
    throw new ServiceError("Aufgabe konnte nicht gelöscht werden", 500);
  }

  // Audit-Log
  await writeAuditLog(supabase, {
    seniorId: userId,
    actorId: userId,
    eventType: "task_deleted",
    referenceType: "care_tasks",
    referenceId: taskId,
    metadata: { title: task.title },
  }).catch(() => {});

  return { success: true };
}
