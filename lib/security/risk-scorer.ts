// lib/security/risk-scorer.ts
// Zentraler Risk-Scorer — Redis als Source of Truth
// 3 Dimensionen (IP, User, Session), differenzierter Decay, effectiveScore-Berechnung
// Fail-open: Bei Redis-Fehler → Score 0, kein Nutzer ausgesperrt

import { getSecurityRedis, reportRedisFailure } from "./redis";
import {
  REDIS_KEY_PREFIX,
  REDIS_KEY_TTL_SECONDS,
  DECAY_HALF_LIFE,
  TRAP_DECAY_CATEGORY,
  STAGE4_THRESHOLD,
  STAGE4_MIN_TRAP_TYPES,
  STAGE4_MIN_DIMENSIONS,
  type TrapType,
} from "./config";
import type { ClientKeys } from "./client-key";

export interface ScoreResult {
  ipScore: number;
  userScore: number;
  sessionScore: number;
  deviceScore: number;
  effectiveScore: number;
  stage: number; // 0-4 (ohne Route-Differenzierung, die kommt in der Middleware)
  trapTypes: Set<string>;
  elevatedDimensions: number;
}

// Nonce fuer Redis-Member-Eindeutigkeit
function nonce(): string {
  return Math.random().toString(36).slice(2, 6);
}

// Decay-Faktor berechnen: Wert * 2^(-t/halfLife)
export function decayedValue(
  points: number,
  ageMs: number,
  halfLifeMs: number,
): number {
  return points * Math.pow(2, -ageMs / halfLifeMs);
}

// Maximales Alter fuer Events (4h, passend zur Redis TTL)
const MAX_EVENT_AGE_MS = REDIS_KEY_TTL_SECONDS * 1000;

// Score aus Redis Sorted Set berechnen (mit Decay + Pruning)
async function computeScore(
  redis: NonNullable<ReturnType<typeof getSecurityRedis>>,
  key: string,
): Promise<{ score: number; trapTypes: Set<string> }> {
  const now = Date.now();
  const trapTypes = new Set<string>();

  // Nur Events der letzten 4h laden (nicht ab Timestamp 0)
  const minTimestamp = now - MAX_EVENT_AGE_MS;
  const members = await redis.zrange<string[]>(key, minTimestamp, now, {
    byScore: true,
    withScores: true,
  });
  if (!members || members.length === 0) return { score: 0, trapTypes };

  // Async Pruning: Alte Events entfernen (fire-and-forget)
  redis
    .zremrangebyscore(key, 0, minTimestamp - 1)
    .catch((err) =>
      console.warn("[security] Redis-Pruning fehlgeschlagen:", err),
    );

  let total = 0;

  // members kommt als [member, score, member, score, ...]
  for (let i = 0; i < members.length; i += 2) {
    const member = String(members[i]);
    const timestamp = Number(members[i + 1]);

    // Member-Format: {ts}:{trapType}:{points}:{nonce}
    const parts = member.split(":");
    if (parts.length < 3) continue;

    const trapType = parts[1];
    const points = parseInt(parts[2], 10);
    if (isNaN(points)) continue;

    trapTypes.add(trapType);

    // Decay basierend auf Event-Kategorie
    const decayCategory = TRAP_DECAY_CATEGORY[trapType as TrapType] ?? "bot";
    const halfLife = DECAY_HALF_LIFE[decayCategory] ?? DECAY_HALF_LIFE.bot;
    const ageMs = now - timestamp;

    total += decayedValue(points, ageMs, halfLife);
  }

  return { score: Math.round(total), trapTypes };
}

/** Alle 3 Score-Dimensionen laden und effectiveScore berechnen */
export async function getScores(keys: ClientKeys): Promise<ScoreResult> {
  const redis = getSecurityRedis();

  // Fail-open: Kein Redis → Score 0
  if (!redis) {
    return {
      ipScore: 0,
      userScore: 0,
      sessionScore: 0,
      deviceScore: 0,
      effectiveScore: 0,
      stage: 0,
      trapTypes: new Set(),
      elevatedDimensions: 0,
    };
  }

  try {
    const allTrapTypes = new Set<string>();

    // 4 Dimensionen parallel laden (Device ist NEU)
    const [ipResult, userResult, sessionResult, deviceResult] =
      await Promise.all([
        computeScore(redis, `${REDIS_KEY_PREFIX}:ip:${keys.ipHash}`),
        keys.userId
          ? computeScore(redis, `${REDIS_KEY_PREFIX}:user:${keys.userId}`)
          : Promise.resolve({ score: 0, trapTypes: new Set<string>() }),
        keys.sessionHash
          ? computeScore(redis, `${REDIS_KEY_PREFIX}:sess:${keys.sessionHash}`)
          : Promise.resolve({ score: 0, trapTypes: new Set<string>() }),
        keys.deviceHash
          ? computeScore(redis, `${REDIS_KEY_PREFIX}:dev:${keys.deviceHash}`)
          : Promise.resolve({ score: 0, trapTypes: new Set<string>() }),
      ]);

    // Trap-Types zusammenfuehren
    for (const t of ipResult.trapTypes) allTrapTypes.add(t);
    for (const t of userResult.trapTypes) allTrapTypes.add(t);
    for (const t of sessionResult.trapTypes) allTrapTypes.add(t);
    for (const t of deviceResult.trapTypes) allTrapTypes.add(t);

    // baseScore = max(IP, Session) + 0.25 * secondHighest (ohne Device)
    const baseScores = [
      ipResult.score,
      userResult.score,
      sessionResult.score,
    ].sort((a, b) => b - a);
    const baseScore = Math.round(baseScores[0] + 0.25 * baseScores[1]);

    // Kontextabhaengige Device-Gewichtung:
    // baseScore < 10 → Device ignorieren (normaler Nutzer)
    // baseScore 10-49 → Device anteilig (0.3)
    // baseScore >= 50 → Device voll (0.5)
    let deviceWeight = 0;
    if (baseScore >= 50) deviceWeight = 0.5;
    else if (baseScore >= 10) deviceWeight = 0.3;

    const effectiveScore = Math.round(
      baseScore + deviceWeight * deviceResult.score,
    );

    // Elevated Dimensions zaehlen (Score > 20 = Stufe-1-Schwelle)
    // Device ist NICHT als unabhaengige Dimension gezaehlt — nur Verstaerker,
    // keine harte Bestaetigung fuer Stage-4 High-Confidence-Gate
    const elevatedDimensions = [
      ipResult.score,
      userResult.score,
      sessionResult.score,
    ].filter((s) => s >= 20).length;

    // Stage bestimmen (globale Stufe, Route-Differenzierung kommt in Middleware)
    let stage = 0;
    if (effectiveScore >= 20) stage = 1;
    if (effectiveScore >= 50) stage = 2;
    if (effectiveScore >= 80) stage = 3;

    // Stage 4: High-Confidence-Gate
    if (
      effectiveScore >= STAGE4_THRESHOLD &&
      allTrapTypes.size >= STAGE4_MIN_TRAP_TYPES &&
      elevatedDimensions >= STAGE4_MIN_DIMENSIONS
    ) {
      stage = 4;
    }

    return {
      ipScore: ipResult.score,
      userScore: userResult.score,
      sessionScore: sessionResult.score,
      deviceScore: deviceResult.score,
      effectiveScore,
      stage,
      trapTypes: allTrapTypes,
      elevatedDimensions,
    };
  } catch (err) {
    reportRedisFailure("getScores", err);
    // Fail-open
    return {
      ipScore: 0,
      userScore: 0,
      sessionScore: 0,
      deviceScore: 0,
      effectiveScore: 0,
      stage: 0,
      trapTypes: new Set(),
      elevatedDimensions: 0,
    };
  }
}

/** Security-Event aufzeichnen: Punkte zu einer oder mehreren Dimensionen hinzufuegen */
export async function recordEvent(
  keys: ClientKeys,
  trapType: TrapType,
  points: number,
  dimensions: ("ip" | "user" | "session" | "device")[] = ["ip", "session"],
): Promise<void> {
  const redis = getSecurityRedis();
  if (!redis) return;

  try {
    const now = Date.now();
    const member = `${now}:${trapType}:${points}:${nonce()}`;

    const pipeline = redis.pipeline();

    for (const dim of dimensions) {
      let key: string | null = null;

      if (dim === "ip") key = `${REDIS_KEY_PREFIX}:ip:${keys.ipHash}`;
      if (dim === "user" && keys.userId)
        key = `${REDIS_KEY_PREFIX}:user:${keys.userId}`;
      if (dim === "session" && keys.sessionHash)
        key = `${REDIS_KEY_PREFIX}:sess:${keys.sessionHash}`;
      if (dim === "device" && keys.deviceHash)
        key = `${REDIS_KEY_PREFIX}:dev:${keys.deviceHash}`;

      if (key) {
        pipeline.zadd(key, { score: now, member });
        pipeline.expire(key, REDIS_KEY_TTL_SECONDS);
      }
    }

    // Meta-Key: Trap-Typen tracken (fuer Stage-4-Check)
    const metaKey = `${REDIS_KEY_PREFIX}:meta:${keys.ipHash}`;
    pipeline.sadd(`${metaKey}:traps`, trapType);
    pipeline.expire(`${metaKey}:traps`, REDIS_KEY_TTL_SECONDS);

    await pipeline.exec();
  } catch (err) {
    reportRedisFailure("recordEvent", err);
    // Fail-open: Event geht verloren, aber System laeuft weiter
  }
}

// --- Device Fingerprint Stabilitaet ---

// FP-Aenderungsrate pruefen: Viele verschiedene Device-Hashes von derselben IP
// in kurzer Zeit → Bot der Header rotiert
// Fenster: 5 Minuten, gestaffelte Score-Punkte
const FP_HISTORY_TTL = 5 * 60; // 5 Min in Sekunden
const FP_HISTORY_WINDOW_MS = 5 * 60 * 1000;

// Gestaffelte Bewertung: Anzahl verschiedener Hashes → Score-Punkte
export function fpInstabilityPoints(uniqueHashes: number): number {
  if (uniqueHashes <= 1) return 0;
  if (uniqueHashes === 2) return 5;
  if (uniqueHashes === 3) return 15;
  if (uniqueHashes === 4) return 20;
  return 30; // 5+
}

// Fingerprint-Stabilitaet pruefen: Gleiche IP, wechselnder Device-Hash
export async function checkFingerprintStability(
  keys: ClientKeys,
): Promise<{ uniqueHashes: number; points: number }> {
  const redis = getSecurityRedis();
  if (!redis || !keys.deviceHash) return { uniqueHashes: 0, points: 0 };

  const historyKey = `${REDIS_KEY_PREFIX}:fphist:${keys.ipHash}`;
  const now = Date.now();
  const minTimestamp = now - FP_HISTORY_WINDOW_MS;

  try {
    const pipeline = redis.pipeline();
    // Aktuellen Device-Hash mit Timestamp einfuegen
    pipeline.zadd(historyKey, {
      score: now,
      member: `${keys.deviceHash}:${now}`,
    });
    pipeline.expire(historyKey, FP_HISTORY_TTL);
    // Alte Eintraege aufraemen
    pipeline.zremrangebyscore(historyKey, 0, minTimestamp - 1);
    // Alle aktuellen Eintraege laden
    pipeline.zrange(historyKey, minTimestamp, now, { byScore: true });
    const results = await pipeline.exec();

    // Pipeline: [0]=zadd, [1]=expire, [2]=zremrangebyscore, [3]=zrange
    const members = (results?.[3] as string[] | null) ?? [];
    // Eindeutige Device-Hashes extrahieren (Format: {hash}:{timestamp})
    const uniqueSet = new Set<string>();
    for (const m of members) {
      const hash = String(m).split(":")[0];
      if (hash) uniqueSet.add(hash);
    }

    const points = fpInstabilityPoints(uniqueSet.size);
    return { uniqueHashes: uniqueSet.size, points };
  } catch (err) {
    reportRedisFailure("checkFingerprintStability", err);
    return { uniqueHashes: 0, points: 0 };
  }
}

// Session+Device Drift: Gleiche Session-ID, verschiedene Device-Hashes
// → Proxy-Rotation oder Bot-Farm
const DRIFT_WINDOW_MS = 30 * 60 * 1000; // 30 Min
const DRIFT_TTL = 30 * 60; // 30 Min in Sekunden

export function sessionDriftPoints(uniqueHashes: number): number {
  if (uniqueHashes <= 1) return 0;
  if (uniqueHashes === 2) return 10;
  if (uniqueHashes === 3) return 25;
  return 40; // 4+
}

export async function checkSessionDeviceDrift(
  keys: ClientKeys,
): Promise<{ uniqueHashes: number; points: number }> {
  const redis = getSecurityRedis();
  if (!redis || !keys.sessionHash || !keys.deviceHash)
    return { uniqueHashes: 0, points: 0 };

  const driftKey = `${REDIS_KEY_PREFIX}:drift:${keys.sessionHash}`;
  const now = Date.now();
  const minTimestamp = now - DRIFT_WINDOW_MS;

  try {
    const pipeline = redis.pipeline();
    pipeline.zadd(driftKey, {
      score: now,
      member: `${keys.deviceHash}:${now}`,
    });
    pipeline.expire(driftKey, DRIFT_TTL);
    pipeline.zremrangebyscore(driftKey, 0, minTimestamp - 1);
    pipeline.zrange(driftKey, minTimestamp, now, { byScore: true });
    const results = await pipeline.exec();

    // Pipeline: [0]=zadd, [1]=expire, [2]=zremrangebyscore, [3]=zrange
    const members = (results?.[3] as string[] | null) ?? [];
    const uniqueSet = new Set<string>();
    for (const m of members) {
      const hash = String(m).split(":")[0];
      if (hash) uniqueSet.add(hash);
    }

    const points = sessionDriftPoints(uniqueSet.size);
    return { uniqueHashes: uniqueSet.size, points };
  } catch (err) {
    reportRedisFailure("checkSessionDeviceDrift", err);
    return { uniqueHashes: 0, points: 0 };
  }
}

/** Admin-Funktion: Score fuer einen Key zuruecksetzen */
export async function resetScore(keys: ClientKeys): Promise<void> {
  const redis = getSecurityRedis();
  if (!redis) return;

  const pipeline = redis.pipeline();
  pipeline.del(`${REDIS_KEY_PREFIX}:ip:${keys.ipHash}`);
  if (keys.userId) pipeline.del(`${REDIS_KEY_PREFIX}:user:${keys.userId}`);
  if (keys.sessionHash)
    pipeline.del(`${REDIS_KEY_PREFIX}:sess:${keys.sessionHash}`);
  if (keys.deviceHash)
    pipeline.del(`${REDIS_KEY_PREFIX}:dev:${keys.deviceHash}`);
  pipeline.del(`${REDIS_KEY_PREFIX}:meta:${keys.ipHash}:traps`);
  // Auch FP-History und Drift-Daten loeschen
  pipeline.del(`${REDIS_KEY_PREFIX}:fphist:${keys.ipHash}`);
  if (keys.sessionHash)
    pipeline.del(`${REDIS_KEY_PREFIX}:drift:${keys.sessionHash}`);
  await pipeline.exec();
}
