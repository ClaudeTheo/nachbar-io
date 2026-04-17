// GET /api/conversations — Liste eigener 1:1-Konversationen
// POST /api/conversations — Konversation mit Peer holen/erstellen (idempotent)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listConversations,
  getOrCreateConversation,
} from "@/modules/chat/services/conversations.service";

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
    const conversations = await listConversations(supabase, user.id);
    return NextResponse.json(conversations);
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
    const body = (await request.json()) as { peer_id?: string };
    if (!body.peer_id) {
      return NextResponse.json(
        { error: "peer_id erforderlich" },
        { status: 400 },
      );
    }
    const conversation = await getOrCreateConversation(
      supabase,
      user.id,
      body.peer_id,
    );
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
