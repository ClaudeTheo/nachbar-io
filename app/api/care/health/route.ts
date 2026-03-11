// app/api/care/health/route.ts
// Nachbar.io — Care-Modul Gesundheits-Endpunkt

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runCareHealthChecks } from '@/lib/care/health';
import type { HealthCheck } from '@/lib/care/health';

// Einfacher In-Memory-Cache (5 Sekunden TTL)
let cachedResult: { checks: HealthCheck[]; overall: string; timestamp: string } | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5000;

/**
 * GET /api/care/health
 * Oeffentlicher Gesundheits-Check (kein Auth erforderlich).
 * Fuer Monitoring-Systeme und Status-Anzeigen.
 */
export async function GET() {
  const now = Date.now();

  // Cache pruefen
  if (cachedResult && (now - cachedAt) < CACHE_TTL_MS) {
    return NextResponse.json(cachedResult);
  }

  try {
    const supabase = await createClient();
    const checks = await runCareHealthChecks(supabase);

    const hasError = checks.some(c => c.status === 'error');
    const hasWarn = checks.some(c => c.status === 'warn');

    const result = {
      overall: hasError ? 'error' : hasWarn ? 'warn' : 'ok',
      checks,
      timestamp: new Date().toISOString(),
    };

    // Cache aktualisieren
    cachedResult = result;
    cachedAt = now;

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      overall: 'error',
      checks: [{ name: 'System', status: 'error' as const, detail: 'Gesundheitspruefung fehlgeschlagen' }],
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
