// GET /api/hilfe/connections — Liste eigener Verbindungen
// POST /api/hilfe/connections — Organische Verbindung erstellen (Senior bestätigt Match)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listConnections,
  createConnection,
} from "@/modules/hilfe/services/hilfe-connections.service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  try {
    const connections = await listConnections(supabase, user.id);
    return NextResponse.json(connections);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  try {
    const { helper_id } = await request.json();
    const connection = await createConnection(supabase, user.id, helper_id);
    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
