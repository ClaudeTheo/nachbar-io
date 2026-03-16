export type AppointmentStatus =
  | "proposed"
  | "counter_proposed"
  | "confirmed"
  | "active"
  | "completed"
  | "declined"
  | "cancelled";

export type AppointmentAction =
  | "confirm"
  | "counter_propose"
  | "decline"
  | "cancel"
  | "start"
  | "join"
  | "complete";

export type ActorRole = "doctor" | "patient";

// Erlaubte Uebergaenge: [vonStatus, nachStatus, wer darf]
// "other" = nur die Gegenseite, "doctor" = nur Arzt, "both" = beide
const TRANSITIONS: Array<[AppointmentStatus, AppointmentStatus, "other" | "doctor" | "both"]> = [
  ["proposed", "confirmed", "other"],
  ["proposed", "counter_proposed", "other"],
  ["proposed", "declined", "other"],
  ["counter_proposed", "confirmed", "other"],
  ["counter_proposed", "counter_proposed", "other"],
  ["counter_proposed", "declined", "other"],
  ["confirmed", "active", "doctor"],
  ["confirmed", "cancelled", "both"],
  ["active", "completed", "doctor"],
];

export function canTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
  actor: ActorRole,
  proposedBy: ActorRole
): boolean {
  const rule = TRANSITIONS.find(([f, t]) => f === from && t === to);
  if (!rule) return false;

  const [, , who] = rule;
  if (who === "both") return true;
  if (who === "doctor") return actor === "doctor";
  // "other" = Gegenseite
  return actor !== proposedBy;
}

export function getAvailableActions(
  status: AppointmentStatus,
  actor: ActorRole,
  proposedBy: ActorRole
): AppointmentAction[] {
  const actions: AppointmentAction[] = [];

  if (canTransition(status, "confirmed", actor, proposedBy)) actions.push("confirm");
  if (canTransition(status, "counter_proposed", actor, proposedBy)) actions.push("counter_propose");
  if (canTransition(status, "declined", actor, proposedBy)) actions.push("decline");
  if (canTransition(status, "cancelled", actor, proposedBy)) actions.push("cancel");
  if (canTransition(status, "active", actor, proposedBy)) actions.push("start");
  if (status === "active" && actor === "patient") actions.push("join");
  if (canTransition(status, "completed", actor, proposedBy)) actions.push("complete");

  return actions;
}
