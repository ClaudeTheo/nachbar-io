import { describe, it, expect } from 'vitest';

const CACHEABLE_API_PATHS = [
  '/api/care/medications',
  '/api/care/checkin/status',
  '/api/care/sos',
  '/api/alerts',
];

const API_CACHE_MAX_AGE_MS = 60 * 60 * 1000;
const API_CACHE_MAX_ENTRIES = 50;

function shouldCacheApiResponse(url: string): boolean {
  return CACHEABLE_API_PATHS.some(path => url.includes(path));
}

function isCacheExpired(cachedAt: number, now: number): boolean {
  return (now - cachedAt) > API_CACHE_MAX_AGE_MS;
}

describe('Service Worker API Caching Logic', () => {
  it('should cache medications API response', () => {
    expect(shouldCacheApiResponse('https://nachbar-io.vercel.app/api/care/medications')).toBe(true);
  });

  it('should cache checkin status API response', () => {
    expect(shouldCacheApiResponse('https://nachbar-io.vercel.app/api/care/checkin/status')).toBe(true);
  });

  it('should NOT cache cron or push API responses', () => {
    expect(shouldCacheApiResponse('https://nachbar-io.vercel.app/api/cron/dormancy')).toBe(false);
    expect(shouldCacheApiResponse('https://nachbar-io.vercel.app/api/push/send')).toBe(false);
  });

  it('should expire cache after 1 hour', () => {
    const cachedAt = Date.now();
    const oneHourLater = cachedAt + API_CACHE_MAX_AGE_MS + 1;
    expect(isCacheExpired(cachedAt, oneHourLater)).toBe(true);
  });

  it('should NOT expire cache within 1 hour', () => {
    const cachedAt = Date.now();
    const thirtyMinLater = cachedAt + 30 * 60 * 1000;
    expect(isCacheExpired(cachedAt, thirtyMinLater)).toBe(false);
  });

  it('should limit cache to 50 entries', () => {
    expect(API_CACHE_MAX_ENTRIES).toBe(50);
  });
});
