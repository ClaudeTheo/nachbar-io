// __tests__/lib/rate-limit.test.ts
// Sicherheitskritisch: Rate Limiting schuetzt alle API-Routes vor Abuse

import { describe, it, expect } from 'vitest'
import { getRouteCategory, getClientKey, checkRateLimit } from '@/lib/rate-limit'

describe('rate-limit', () => {
  // --- getRouteCategory ---

  describe('getRouteCategory', () => {
    it('ueberspringt Cron-Jobs (gibt null zurueck)', () => {
      expect(getRouteCategory('/api/cron/digest')).toBeNull()
      expect(getRouteCategory('/api/care/cron/escalation')).toBeNull()
      expect(getRouteCategory('/api/news/scrape')).toBeNull()
    })

    it('erkennt Auth-Routes (5/min)', () => {
      const cat = getRouteCategory('/api/register/complete')
      expect(cat).toMatchObject({ name: 'auth', limit: 5, windowMs: 60_000 })
    })

    it('erkennt teure Operationen (3/min)', () => {
      const cat = getRouteCategory('/api/user/delete')
      expect(cat).toMatchObject({ name: 'expensive', limit: 3 })
    })

    it('erkennt Device-Endpoints (30/min)', () => {
      const cat = getRouteCategory('/api/device/status')
      expect(cat).toMatchObject({ name: 'device', limit: 30 })
    })

    it('erkennt Admin-Endpoints (20/min)', () => {
      const cat = getRouteCategory('/api/admin/health')
      expect(cat).toMatchObject({ name: 'admin', limit: 20 })
    })

    it('Standard fuer andere API-Routes (60/min)', () => {
      const cat = getRouteCategory('/api/alerts')
      expect(cat).toMatchObject({ name: 'default', limit: 60 })
    })

    it('gibt null fuer Nicht-API-Pfade zurueck', () => {
      expect(getRouteCategory('/dashboard')).toBeNull()
      expect(getRouteCategory('/')).toBeNull()
    })
  })

  // --- getClientKey ---

  describe('getClientKey', () => {
    it('extrahiert IP aus x-forwarded-for', () => {
      const req = {
        headers: { get: (name: string) => name === 'x-forwarded-for' ? '1.2.3.4, 5.6.7.8' : null },
      }
      expect(getClientKey(req)).toBe('ip:1.2.3.4')
    })

    it('nutzt x-real-ip als Fallback', () => {
      const req = {
        headers: { get: (name: string) => name === 'x-real-ip' ? '10.0.0.1' : null },
      }
      expect(getClientKey(req)).toBe('ip:10.0.0.1')
    })

    it('nutzt Device-Token fuer /api/device/ Pfade', () => {
      const req = {
        headers: { get: () => null },
        nextUrl: {
          pathname: '/api/device/status',
          searchParams: { get: (n: string) => n === 'token' ? 'abcdefghijklmnopqrstuvwxyz' : null },
        },
      }
      expect(getClientKey(req)).toBe('device:abcdefghijklmnop')
    })

    it('gibt "unknown" zurueck wenn keine IP vorhanden', () => {
      const req = { headers: { get: () => null } }
      expect(getClientKey(req)).toBe('ip:unknown')
    })
  })

  // --- checkRateLimit ---

  describe('checkRateLimit', () => {
    it('erlaubt Requests innerhalb des Limits', () => {
      const result = checkRateLimit('/api/alerts', 'test-key-1')
      expect(result).not.toBeNull()
      expect(result!.allowed).toBe(true)
      expect(result!.remaining).toBeGreaterThan(0)
    })

    it('blockiert nach Ueberschreitung des Limits', () => {
      // Auth-Limit: 5/min
      for (let i = 0; i < 5; i++) {
        checkRateLimit('/api/register/test', 'brute-force-key')
      }
      const blocked = checkRateLimit('/api/register/test', 'brute-force-key')
      expect(blocked).not.toBeNull()
      expect(blocked!.allowed).toBe(false)
      expect(blocked!.remaining).toBe(0)
    })

    it('gibt null fuer Cron-Routes zurueck (kein Limiting)', () => {
      expect(checkRateLimit('/api/cron/digest', 'any-key')).toBeNull()
    })
  })
})
