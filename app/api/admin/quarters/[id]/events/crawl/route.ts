// Welle W10 — POST /api/admin/quarters/[id]/events/crawl
//
// Crawlt RSS- und/oder iCal-Feeds und liefert normalisierte CrawledEvent[].
// Schreibt nichts in DB — der Caller entscheidet ueber Speicherform
// (events-Tabelle hat user_id NOT NULL, municipal_config.events ist fuer
// regelmaessige Events). Diese Welle macht nur Discovery wie Welle H/I/J.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { crawlEventFeeds } from "@/modules/events/services/event-feed-crawler.service";

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

function parseOptionalDate(raw: unknown): Date | undefined {
  if (typeof raw !== "string" || raw.trim().length === 0) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  // params.id wird derzeit nicht weiter genutzt (Crawler nimmt URLs direkt),
  // aber bleibt im Pfad — fuer spaetere Persistenz pro Quartier.
  await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body muss JSON sein." },
      { status: 400 },
    );
  }

  const obj = (body ?? {}) as Record<string, unknown>;
  const rssUrl = typeof obj.rssUrl === "string" ? obj.rssUrl : null;
  const icalUrl = typeof obj.icalUrl === "string" ? obj.icalUrl : null;

  if (!rssUrl && !icalUrl) {
    return NextResponse.json(
      {
        error:
          "Mindestens rssUrl oder icalUrl ist Pflicht. Welle-J-Prober kann diese ermitteln.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await crawlEventFeeds({
      rssUrl,
      icalUrl,
      fromDate: parseOptionalDate(obj.fromDate),
      toDate: parseOptionalDate(obj.toDate),
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
