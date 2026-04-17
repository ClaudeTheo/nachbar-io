// POST /api/conversations/[id]/read — Nachrichten als gelesen markieren
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { markMessagesRead } from "@/modules/chat/services/messages.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;
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
    const marked = await markMessagesRead(supabase, user.id, conversationId);
    return NextResponse.json({ marked });
  } catch (error) {
    return handleServiceError(error, request, "/api/conversations/[id]/read");
  }
}
