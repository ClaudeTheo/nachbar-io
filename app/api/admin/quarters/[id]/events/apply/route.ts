// Welle W10-Persist — POST /api/admin/quarters/[id]/events/apply
//
// Schreibt eine Liste von gecrawlten Events in municipal_config.crawled_events.
// Pendant zur Crawl-Route (W10) wie Welle I (Apply) Pendant zu Welle H ist.
// Voraussetzung: Migration 190 muss applied sein (Founder-Hand).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/services/service-error";
import {
  applyCrawledEventsForQuarter,
  type CrawledEventInput,
} from "@/modules/events/services/event-feed-apply.service";

async function requireSuperAdmin() {
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
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") {
    return {
      error: NextResponse.json({ error: "Nur Super-Admins" }, { status: 403 }),
    };
  }
  return { user };
}

function getAdminDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body muss JSON sein." },
      { status: 400 },
    );
  }

  const events = (body as { events?: unknown })?.events;
  if (!Array.isArray(events)) {
    return NextResponse.json(
      { error: "Body braucht ein events-Array." },
      { status: 400 },
    );
  }

  try {
    const result = await applyCrawledEventsForQuarter(
      getAdminDb(),
      id,
      events as CrawledEventInput[],
    );
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
