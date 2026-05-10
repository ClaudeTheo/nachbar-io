// Welle K2 — POST /api/admin/amtsblatt/reprocess
//
// Manueller Re-Trigger fuer einzelne Amtsblatt-Issues. Loescht existing
// announcements, laedt PDF erneut, ruft KI-Extract, inserted neu.
//
// Use-Cases:
// - Issue ist `error` durch alten KI-Truncate-Bug (vor robust-parse-Fix)
// - Issue ist `done` aber 0 announcements (z.B. nach Pilot-Reset)
// - Manuelle Daten-Wiederherstellung aus dem Admin-UI

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { reprocessAmtsblattIssue } from "@/lib/services/amtsblatt-sync.service";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }),
    };
  }
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return {
      error: NextResponse.json({ error: "Nur Admins" }, { status: 403 }),
    };
  }
  return { user };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body muss JSON sein." },
      { status: 400 },
    );
  }

  const issueId = (body as { issueId?: unknown })?.issueId;
  if (typeof issueId !== "string" || issueId.trim().length === 0) {
    return NextResponse.json(
      { error: "issueId ist Pflicht." },
      { status: 400 },
    );
  }

  try {
    const result = await reprocessAmtsblattIssue(getAdminSupabase(), issueId);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
