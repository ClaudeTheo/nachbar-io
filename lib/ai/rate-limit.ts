import { getSecurityRedis, reportRedisFailure } from "@/lib/security/redis";

export const AI_DAILY_USER_LIMIT = 100;
export const REALTIME_VOICE_HOURLY_LIMIT = 8;

const AI_DAILY_KEY_TTL_SECONDS = 2 * 24 * 60 * 60;
const REALTIME_VOICE_KEY_TTL_SECONDS = 60 * 60;

export interface AiRateLimitResult {
  allowed: boolean;
  unavailable?: boolean;
  limit: number;
  remaining: number;
}

export async function consumeAiDailyUserLimit({
  userId,
}: {
  userId: string;
}): Promise<AiRateLimitResult> {
  const redis = getSecurityRedis();
  if (!redis) {
    return {
      allowed: false,
      unavailable: true,
      limit: AI_DAILY_USER_LIMIT,
      remaining: 0,
    };
  }

  try {
    const key = `ai:daily:user:${userId}:${currentUtcDay()}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, AI_DAILY_KEY_TTL_SECONDS);
    }

    return {
      allowed: count <= AI_DAILY_USER_LIMIT,
      limit: AI_DAILY_USER_LIMIT,
      remaining: Math.max(0, AI_DAILY_USER_LIMIT - count),
    };
  } catch (error) {
    reportRedisFailure("ai-daily-user-rate-limit", error);
    return {
      allowed: false,
      unavailable: true,
      limit: AI_DAILY_USER_LIMIT,
      remaining: 0,
    };
  }
}

export async function consumeRealtimeVoiceSessionLimit({
  userId,
}: {
  userId: string;
}): Promise<AiRateLimitResult> {
  const redis = getSecurityRedis();
  if (!redis) {
    return {
      allowed: false,
      unavailable: true,
      limit: REALTIME_VOICE_HOURLY_LIMIT,
      remaining: 0,
    };
  }

  try {
    const key = `ai:realtime-voice:user:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, REALTIME_VOICE_KEY_TTL_SECONDS);
    }

    return {
      allowed: count <= REALTIME_VOICE_HOURLY_LIMIT,
      limit: REALTIME_VOICE_HOURLY_LIMIT,
      remaining: Math.max(0, REALTIME_VOICE_HOURLY_LIMIT - count),
    };
  } catch (error) {
    reportRedisFailure("realtime-voice-session-rate-limit", error);
    return {
      allowed: false,
      unavailable: true,
      limit: REALTIME_VOICE_HOURLY_LIMIT,
      remaining: 0,
    };
  }
}

function currentUtcDay(): string {
  return new Date().toISOString().slice(0, 10);
}
