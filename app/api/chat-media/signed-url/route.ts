// POST /api/chat-media/signed-url — Signed Upload URL fuer Chat-Media-Bucket
//
// Body: { scope: 'direct'|'chat', owner_id: uuid, mime_type: string }
// Die RLS-Policy im Bucket verhindert Uploads von nicht-berechtigten Usern.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  createSignedUploadUrl,
  type ChatMediaScope,
} from "@/modules/chat/services/media-upload.service";

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
      scope?: string;
      owner_id?: string;
      mime_type?: string;
    };

    if (!body.scope || (body.scope !== "direct" && body.scope !== "chat")) {
      return NextResponse.json(
        { error: "scope muss 'direct' oder 'chat' sein" },
        { status: 400 },
      );
    }
    if (!body.owner_id) {
      return NextResponse.json(
        { error: "owner_id erforderlich" },
        { status: 400 },
      );
    }
    if (!body.mime_type) {
      return NextResponse.json(
        { error: "mime_type erforderlich" },
        { status: 400 },
      );
    }

    const result = await createSignedUploadUrl(supabase, {
      scope: body.scope as ChatMediaScope,
      ownerId: body.owner_id,
      mimeType: body.mime_type,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
