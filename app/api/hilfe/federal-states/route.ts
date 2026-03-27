// GET /api/hilfe/federal-states — Oeffentliche Bundesland-Regeln
import { NextResponse } from 'next/server';
import { getAllStates } from '@/lib/hilfe/federal-states';

export async function GET() {
  // Oeffentliche Referenzdaten, keine Auth erforderlich
  return NextResponse.json(getAllStates());
}
