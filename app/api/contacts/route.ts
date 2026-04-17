// GET /api/contacts — Liste eigener Kontakte (optional ?status=...)
// POST /api/contacts — Neue Kontaktanfrage senden
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listContacts,
  sendContactRequest,
  type ContactStatus,
} from "@/modules/chat/services/contacts.service";

const VALID_STATUS: ContactStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "blocked",
];

export async function GET(request: NextRequest) {
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

  const statusParam = request.nextUrl.searchParams.get("status");
  const statusFilter =
    statusParam && (VALID_STATUS as string[]).includes(statusParam)
      ? (statusParam as ContactStatus)
      : undefined;

  try {
    const contacts = await listContacts(supabase, user.id, statusFilter);
    return NextResponse.json(contacts);
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
      addressee_id?: string;
      note?: string;
    };
    if (!body.addressee_id) {
      return NextResponse.json(
        { error: "addressee_id erforderlich" },
        { status: 400 },
      );
    }
    const contact = await sendContactRequest(
      supabase,
      user.id,
      body.addressee_id,
      body.note,
    );
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
