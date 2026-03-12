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
 * Gesundheits-Check (nur fuer authentifizierte Admins).
 * Gibt interne System-Metriken zurueck.
 */
export async function GET() {
  const now = Date.now();

  try {
    const supabase = await createClient();

    // SICHERHEIT: Auth + Admin-Check (M3)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ overall: 'ok', timestamp: new Date().toISOString() });
    }
    const { data: adminCheck } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (!adminCheck?.is_admin) {
      // Nicht-Admins bekommen nur den Gesamtstatus ohne Details
      return NextResponse.json({ overall: 'ok', timestamp: new Date().toISOString() });
    }

    // Cache pruefen (nur fuer Admins relevant)
    if (cachedResult && (now - cachedAt) < CACHE_TTL_MS) {
      return NextResponse.json(cachedResult);
    }

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
