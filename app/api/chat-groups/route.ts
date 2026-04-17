// GET /api/chat-groups — Liste eigener Chat-Gruppen
// POST /api/chat-groups — Neue Chat-Gruppe erstellen (User wird Admin)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listMyGroups,
  createGroup,
} from "@/modules/chat/services/chat-groups.service";

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
    const groups = await listMyGroups(supabase, user.id);
    return NextResponse.json(groups);
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
    const body = (await request.json()) as {
      name?: string;
      description?: string;
    };
    if (!body.name) {
      return NextResponse.json({ error: "name erforderlich" }, { status: 400 });
    }
    const group = await createGroup(
      supabase,
      user.id,
      body.name,
      body.description,
    );
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
