// __tests__/api/hilfe/federal-states.test.ts
// API-Tests fuer GET /api/hilfe/federal-states

import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/hilfe/federal-states/route';

describe('GET /api/hilfe/federal-states', () => {
  it('gibt 200 mit Array zurueck', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('enthaelt BW mit korrekten Daten', async () => {
    const response = await GET();
    const data = await response.json();

    const bw = data.find((s: { state_code: string }) => s.state_code === 'BW');
    expect(bw).toBeDefined();
    expect(bw.state_name).toBe('Baden-Wuerttemberg');
    expect(bw.is_available).toBe(true);
    expect(bw.max_concurrent_clients).toBe(2);
  });

  it('enthaelt HB mit is_available=false', async () => {
    const response = await GET();
    const data = await response.json();

    const hb = data.find((s: { state_code: string }) => s.state_code === 'HB');
    expect(hb).toBeDefined();
    expect(hb.is_available).toBe(false);
  });
});
