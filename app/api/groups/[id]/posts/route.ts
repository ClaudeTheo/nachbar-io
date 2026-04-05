import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listPosts,
  createPost,
} from "@/modules/gruppen/services/gruppen-posts.service";

// GET /api/groups/[id]/posts — Beitraege (paginiert)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  try {
    const page = parseInt(request.nextUrl.searchParams.get("page") ?? "0", 10);
    const data = await listPosts(supabase, id, page);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/groups/[id]/posts — Neuer Beitrag
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungueltiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const data = await createPost(
      supabase,
      user.id,
      id,
      body as unknown as Parameters<typeof createPost>[3],
    );
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
