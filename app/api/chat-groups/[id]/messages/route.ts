// GET /api/chat-groups/[id]/messages — Gruppen-Nachrichten (Pagination: ?before=&limit=)
// POST /api/chat-groups/[id]/messages — Gruppen-Nachricht senden
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listGroupMessages,
  sendGroupMessage,
  type SendGroupMessageInput,
} from "@/modules/chat/services/chat-groups.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: groupId } = await params;
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
    const messages = await listGroupMessages(supabase, groupId, {
      limit: Number.isFinite(limit) ? limit : undefined,
      before: beforeParam ?? undefined,
    });
    return NextResponse.json(messages);
  } catch (error) {
    return handleServiceError(error, request, "/api/chat-groups/[id]/messages");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: groupId } = await params;
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
    const body = (await request.json()) as SendGroupMessageInput;
    const message = await sendGroupMessage(supabase, user.id, groupId, body);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return handleServiceError(error, request, "/api/chat-groups/[id]/messages");
  }
}
