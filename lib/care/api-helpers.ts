// lib/care/api-helpers.ts
// Nachbar.io — Gemeinsame API-Hilfsfunktionen fuer das Care-Modul

import { NextResponse } from 'next/server';
import type { SupabaseClient, AuthUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { canAccessFeature } from './permissions';

/** Standardisierte Fehler-Antwort mit Logging */
export function errorResponse(message: string, status: number) {
  console.error(`[care/api] ${status}: ${message}`);
  return NextResponse.json({ error: message }, { status });
}

/** Erfolgs-Antwort */
export function successResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Auth-Guard: gibt Supabase-Client + User zurueck oder null */
export async function requireAuth(): Promise<{
  supabase: SupabaseClient;
  user: AuthUser;
} | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}

/** Feature-Gate: prueft ob Feature im Abo-Plan verfuegbar */
export async function requireFeature(
  supabase: SupabaseClient,
  seniorId: string,
  feature: string
): Promise<boolean> {
  return canAccessFeature(supabase, seniorId, feature);
}

/** Admin-Check: prueft ob User Admin ist */
export async function requireAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single();
  return data?.is_admin === true;
}

/** Strukturiertes Care-Logging */
export function careLog(
  module: string,
  action: string,
  details?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    module: `care/${module}`,
    action,
    ...details,
  };
  console.log(JSON.stringify(logEntry));
}

/** Fehler-Logging mit Stack-Trace */
export function careError(
  module: string,
  action: string,
  error: unknown,
  details?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const logEntry = {
    timestamp,
    module: `care/${module}`,
    action,
    error: message,
    stack,
    ...details,
  };
  console.error(JSON.stringify(logEntry));
}
