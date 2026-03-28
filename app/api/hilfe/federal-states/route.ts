// GET /api/hilfe/federal-states — Öffentliche Bundesland-Regeln
import { NextResponse } from 'next/server';
import { getAllStates } from '@/modules/hilfe/services/federal-states';

export async function GET() {
  // Öffentliche Referenzdaten, keine Auth erforderlich
  return NextResponse.json(getAllStates());
}
