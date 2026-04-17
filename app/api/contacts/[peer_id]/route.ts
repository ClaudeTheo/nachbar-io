// PATCH /api/contacts/[peer_id] — Status aendern (accept/reject/block)
// DELETE /api/contacts/[peer_id] — Kontakt entfernen
//
// peer_id ist die andere User-ID. Die contact_link-Richtung wird
// dynamisch ermittelt (user als requester ODER addressee).
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError, ServiceError } from "@/lib/services/service-error";
import {
  updateContactStatus,
  deleteContact,
  type ContactStatus,
} from "@/modules/chat/services/contacts.service";

const VALID_STATUS: ContactStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "blocked",
];

async function findContactDirection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  peerId: string,
): Promise<{ requester_id: string; addressee_id: string } | null> {
  const { data } = await supabase
    .from("contact_links")
    .select("requester_id, addressee_id")
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${peerId}),and(requester_id.eq.${peerId},addressee_id.eq.${userId})`,
    )
    .maybeSingle();

  return data ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ peer_id: string }> },
) {
  const { peer_id: peerId } = await params;
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
    const body = (await request.json()) as { status?: string };
    if (!body.status || !(VALID_STATUS as string[]).includes(body.status)) {
      return NextResponse.json(
        { error: "Ungueltiger status" },
        { status: 400 },
      );
    }

    const direction = await findContactDirection(supabase, user.id, peerId);
    if (!direction) {
      throw new ServiceError("Kontakt nicht gefunden", 404, "not_found");
    }

    const updated = await updateContactStatus(
      supabase,
      user.id,
      direction.requester_id,
      direction.addressee_id,
      body.status as ContactStatus,
    );
    return NextResponse.json(updated);
  } catch (error) {
    return handleServiceError(error, request, "/api/contacts/[peer_id]");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ peer_id: string }> },
) {
  const { peer_id: peerId } = await params;
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
    const direction = await findContactDirection(supabase, user.id, peerId);
    if (!direction) {
      throw new ServiceError("Kontakt nicht gefunden", 404, "not_found");
    }

    await deleteContact(
      supabase,
      user.id,
      direction.requester_id,
      direction.addressee_id,
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, request, "/api/contacts/[peer_id]");
  }
}
