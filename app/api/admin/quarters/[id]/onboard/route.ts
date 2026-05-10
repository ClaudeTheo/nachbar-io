// Welle W4 (Mini) — POST /api/admin/quarters/[id]/onboard
//
// Orchestriert den initialen Quartier-Onboarding-Lauf nach dem `createQuarter`-
// Schritt. Verbindet:
// - Welle J: probeFeedUrls(domain)        — RSS/iCal-Discovery auf Stadt-Domain
// - Welle H: discoverOepnvStopsForQuarter — EFA-BW-Stop-Vorschlaege
// - Welle W10: crawlEventFeeds            — initialer Event-Pull
//
// Schreibt NICHTS in die DB — der Caller (Admin-UI / spaeter Wizard) bekommt
// einen Onboarding-Report zurueck und entscheidet selbst ueber Apply (Welle I)
// oder weiteres.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

import { probeFeedUrls } from "@/lib/events/feed-url-prober";
import { discoverOepnvStopsForQuarter } from "@/modules/info-hub/services/oepnv-stops-discovery.service";
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

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // Body optional
  }

  const domain =
    typeof body.domain === "string" && body.domain.trim().length > 0
      ? body.domain.trim()
      : null;

  const errors: string[] = [];

  // Schritt 1: Welle-J Feed-Probe (nur wenn domain gegeben)
  let feeds: { rss: string | null; ical: string | null } = {
    rss: null,
    ical: null,
  };
  if (domain) {
    try {
      const probe = await probeFeedUrls(domain);
      feeds = { rss: probe.rss, ical: probe.ical };
      // Probe-Errors nur als Hinweis sammeln, sind nicht fatal
      if (probe.errors.length > 0) {
        errors.push(
          `Probe-Hinweise: ${probe.errors.length} Pfade ohne Feed-Match.`,
        );
      }
    } catch (err) {
      errors.push(
        `Probe-Fehler: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Schritt 2: Welle-H OEPNV-Discover
  let stops: unknown[] = [];
  try {
    const discovery = await discoverOepnvStopsForQuarter(getAdminDb(), id);
    stops = discovery.stops;
    if (discovery.errors.length > 0) {
      errors.push(...discovery.errors);
    }
  } catch (err) {
    errors.push(
      `Stops-Discover-Fehler: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Schritt 3: Welle-W10 Event-Crawl (nur wenn Feeds gefunden)
  let events: unknown[] = [];
  let fetchedFromRss = 0;
  let fetchedFromIcal = 0;
  if (feeds.rss || feeds.ical) {
    try {
      const crawl = await crawlEventFeeds({
        rssUrl: feeds.rss,
        icalUrl: feeds.ical,
      });
      events = crawl.events;
      fetchedFromRss = crawl.fetchedFromRss;
      fetchedFromIcal = crawl.fetchedFromIcal;
      if (crawl.errors.length > 0) {
        errors.push(...crawl.errors);
      }
    } catch (err) {
      errors.push(
        `Crawl-Fehler: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return NextResponse.json({
    quarterId: id,
    domain,
    feeds,
    stops,
    events,
    fetchedFromRss,
    fetchedFromIcal,
    errors,
  });
}
