// GET /api/chat-groups/[id]/members — Mitglieder-Liste
// POST /api/chat-groups/[id]/members — Mitglied hinzufuegen (Admin)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listGroupMembers,
  addGroupMember,
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

  try {
    const members = await listGroupMembers(supabase, groupId);
    return NextResponse.json(members);
  } catch (error) {
    return handleServiceError(error, request, "/api/chat-groups/[id]/members");
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
    const body = (await request.json()) as {
      user_id?: string;
      role?: "admin" | "member";
    };
    if (!body.user_id) {
      return NextResponse.json(
        { error: "user_id erforderlich" },
        { status: 400 },
      );
    }
    const member = await addGroupMember(
      supabase,
      groupId,
      body.user_id,
      body.role,
    );
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return handleServiceError(error, request, "/api/chat-groups/[id]/members");
  }
}
