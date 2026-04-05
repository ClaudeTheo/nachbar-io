// Nachbar.io — Heartbeat-Service: Passives Check-in bei App-Oeffnung
// Extrahiert aus app/api/heartbeat/route.ts [Wave 5g]

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "./service-error";
import { careLog } from "@/lib/care/api-helpers";
import type { HeartbeatSource, HeartbeatDeviceType } from "@/lib/care/types";

const VALID_SOURCES: HeartbeatSource[] = ["app", "kiosk", "web"];
const VALID_DEVICE_TYPES: HeartbeatDeviceType[] = [
  "mobile",
  "tablet",
  "kiosk",
  "desktop",
];

export interface HeartbeatBody {
  source?: string;
  device_type?: string;
}

// Rate-Limit: max 1 Heartbeat pro Minute pro User (In-Memory)
const heartbeatRateMap = new Map<string, number>();
const HEARTBEAT_COOLDOWN_MS = 60_000;

/**
 * Zeichnet einen Heartbeat auf (max 1 pro Minute pro User).
 * Validiert source + device_type, schreibt in heartbeats-Tabelle.
 */
export async function recordHeartbeat(
  supabase: SupabaseClient,
  userId: string,
  body: HeartbeatBody,
): Promise<{ ok: true }> {
  const { source, device_type } = body;

  // Validierung ZUERST (vor Rate-Limit Lock, damit ungueltige Requests keinen Cooldown auslösen)
  if (!source || !VALID_SOURCES.includes(source as HeartbeatSource)) {
    throw new ServiceError("Ungültiger source-Wert", 400);
  }
  if (
    device_type &&
    !VALID_DEVICE_TYPES.includes(device_type as HeartbeatDeviceType)
  ) {
    throw new ServiceError("Ungültiger device_type-Wert", 400);
  }

  // Rate-Limit: 1 Heartbeat pro Minute pro User
  // Lock VOR dem Insert (verhindert Race Condition bei parallelen Requests)
  const now = Date.now();
  const lastHeartbeat = heartbeatRateMap.get(userId);
  if (lastHeartbeat && now - lastHeartbeat < HEARTBEAT_COOLDOWN_MS) {
    throw new ServiceError("Maximal 1 Heartbeat pro Minute", 429);
  }
  heartbeatRateMap.set(userId, now);

  const { error } = await supabase.from("heartbeats").insert({
    user_id: userId,
    source,
    device_type: device_type || null,
  });

  if (error) {
    // Insert fehlgeschlagen → Rate-Limit-Lock zuruecksetzen
    heartbeatRateMap.delete(userId);
    throw new ServiceError("Heartbeat konnte nicht gespeichert werden", 500);
  }

  // Alte Eintraege aufraeumen (Memory-Leak-Schutz, alle 1000 Eintraege)
  if (heartbeatRateMap.size > 1000) {
    const cutoff = now - HEARTBEAT_COOLDOWN_MS;
    for (const [uid, ts] of heartbeatRateMap) {
      if (ts < cutoff) heartbeatRateMap.delete(uid);
    }
  }

  careLog("heartbeat", "created", { userId, source, device_type });

  return { ok: true };
}
