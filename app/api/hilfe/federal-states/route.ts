// GET /api/hilfe/federal-states — Öffentliche Bundesland-Regeln
import { NextResponse } from 'next/server';
import { getAllStates } from '@/lib/hilfe/federal-states';

export async function GET() {
  // Öffentliche Referenzdaten, keine Auth erforderlich
  return NextResponse.json(getAllStates());
}
