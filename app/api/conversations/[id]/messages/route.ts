// GET /api/conversations/[id]/messages — Nachrichten einer Konversation (Pagination: ?before=&limit=)
// POST /api/conversations/[id]/messages — Nachricht senden
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listMessages,
  sendMessage,
  type SendMessageInput,
} from "@/modules/chat/services/messages.service";

export async function GET(
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

  const limitParam = request.nextUrl.searchParams.get("limit");
  const beforeParam = request.nextUrl.searchParams.get("before");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  try {
    const messages = await listMessages(supabase, user.id, conversationId, {
      limit: Number.isFinite(limit) ? limit : undefined,
      before: beforeParam ?? undefined,
    });
    return NextResponse.json(messages);
  } catch (error) {
    return handleServiceError(
      error,
      request,
      "/api/conversations/[id]/messages",
    );
  }
}

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
    const body = (await request.json()) as SendMessageInput;
    const message = await sendMessage(supabase, user.id, conversationId, body);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return handleServiceError(
      error,
      request,
      "/api/conversations/[id]/messages",
    );
  }
}
