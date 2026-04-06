// lib/security/risk-scorer.ts
// Zentraler Risk-Scorer — Redis als Source of Truth
// 3 Dimensionen (IP, User, Session), differenzierter Decay, effectiveScore-Berechnung
// Fail-open: Bei Redis-Fehler → Score 0, kein Nutzer ausgesperrt

import { getSecurityRedis } from "./redis";
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
function decayedValue(
  points: number,
  ageMs: number,
  halfLifeMs: number,
): number {
  return points * Math.pow(2, -ageMs / halfLifeMs);
}

// Score aus Redis Sorted Set berechnen (mit Decay)
async function computeScore(
  redis: NonNullable<ReturnType<typeof getSecurityRedis>>,
  key: string,
): Promise<{ score: number; trapTypes: Set<string> }> {
  const now = Date.now();
  const trapTypes = new Set<string>();

  // Alle Member mit Scores laden (Score = Timestamp)
  // Upstash: zrange mit byScore + withScores ersetzt zrangebyscore WITHSCORES
  const members = await redis.zrange<string[]>(key, 0, now, {
    byScore: true,
    withScores: true,
  });
  if (!members || members.length === 0) return { score: 0, trapTypes };

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
      effectiveScore: 0,
      stage: 0,
      trapTypes: new Set(),
      elevatedDimensions: 0,
    };
  }

  try {
    const allTrapTypes = new Set<string>();

    // 3 Dimensionen parallel laden
    const [ipResult, userResult, sessionResult] = await Promise.all([
      computeScore(redis, `${REDIS_KEY_PREFIX}:ip:${keys.ipHash}`),
      keys.userId
        ? computeScore(redis, `${REDIS_KEY_PREFIX}:user:${keys.userId}`)
        : Promise.resolve({ score: 0, trapTypes: new Set<string>() }),
      keys.sessionHash
        ? computeScore(redis, `${REDIS_KEY_PREFIX}:sess:${keys.sessionHash}`)
        : Promise.resolve({ score: 0, trapTypes: new Set<string>() }),
    ]);

    // Trap-Types zusammenfuehren
    for (const t of ipResult.trapTypes) allTrapTypes.add(t);
    for (const t of userResult.trapTypes) allTrapTypes.add(t);
    for (const t of sessionResult.trapTypes) allTrapTypes.add(t);

    // effectiveScore = max + 0.25 * secondHighest
    const scores = [ipResult.score, userResult.score, sessionResult.score].sort(
      (a, b) => b - a,
    );
    const effectiveScore = Math.round(scores[0] + 0.25 * scores[1]);

    // Elevated Dimensions zaehlen (Score > 20 = Stufe-1-Schwelle)
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
      effectiveScore,
      stage,
      trapTypes: allTrapTypes,
      elevatedDimensions,
    };
  } catch (err) {
    console.error("[security] Redis-Fehler bei Score-Abfrage:", err);
    // Fail-open
    return {
      ipScore: 0,
      userScore: 0,
      sessionScore: 0,
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
  dimensions: ("ip" | "user" | "session")[] = ["ip", "session"],
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
    console.error("[security] Redis-Fehler bei Event-Aufzeichnung:", err);
    // Fail-open: Event geht verloren, aber System laeuft weiter
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
  pipeline.del(`${REDIS_KEY_PREFIX}:meta:${keys.ipHash}:traps`);
  await pipeline.exec();
}
