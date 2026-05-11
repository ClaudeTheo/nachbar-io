// Welle W4 (Mini) — POST /api/admin/quarters/[id]/onboard
//
// Orchestriert den initialen Quartier-Onboarding-Lauf nach dem `createQuarter`-
// Schritt. Verbindet:
// - Welle: resolveCityDomain(quartier.city)  — auto-Discovery der Stadt-Domain
// - Welle J: probeFeedUrls(domain)           — RSS/iCal-Discovery auf Domain
// - Welle H: discoverOepnvStopsForQuarter    — EFA-BW-Stop-Vorschlaege
// - Welle W10: crawlEventFeeds               — initialer Event-Pull
//
// Skalierungs-Hinweis: domain im Body ueberschreibt die Auto-Discovery —
// fuer Test-Zwecke. Im Pilot ist die Auto-Discovery der Default-Pfad.
//
// Schreibt NICHTS in die DB — der Caller (Admin-UI / spaeter Wizard) bekommt
// einen Onboarding-Report zurueck und entscheidet selbst ueber Apply (Welle I)
// oder weiteres.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

import { resolveCityDomain } from "@/lib/cities/domain-resolver";
import { probeFeedUrls } from "@/lib/events/feed-url-prober";
import { discoverOepnvStopsForQuarter } from "@/modules/info-hub/services/oepnv-stops-discovery.service";
import { crawlEventFeeds } from "@/modules/events/services/event-feed-crawler.service";
import { discoverDoctorsForQuarter } from "@/modules/doctors/services/doctor-discovery.service";

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

  const overrideDomain =
    typeof body.domain === "string" && body.domain.trim().length > 0
      ? body.domain.trim()
      : null;

  const errors: string[] = [];
  const adminDb = getAdminDb();

  // Schritt 0: Wenn keine Override-Domain gegeben, City aus DB lesen und
  // ueber Heuristik die Stadt-Domain ableiten (skalierbar fuer beliebige Staedte).
  let domain: string | null = overrideDomain;
  let domainAutoDiscovered = false;
  if (!domain) {
    try {
      const { data: quarter } = await adminDb
        .from("quarters")
        .select("city")
        .eq("id", id)
        .single();
      const city = (quarter as { city?: string | null })?.city ?? null;
      if (city) {
        const resolved = await resolveCityDomain(city);
        if (resolved.domain) {
          domain = resolved.domain;
          domainAutoDiscovered = true;
        } else {
          errors.push(
            `Auto-Domain-Discovery fuer "${city}" ergebnislos (${resolved.candidatesTried.length} Kandidaten).`,
          );
        }
      } else {
        errors.push(
          "Quartier hat kein city-Feld — Auto-Domain-Discovery uebersprungen.",
        );
      }
    } catch (err) {
      errors.push(
        `City-Lookup-Fehler: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Schritt 1: Welle-J Feed-Probe (nur wenn domain bekannt)
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
    const discovery = await discoverOepnvStopsForQuarter(adminDb, id);
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

  // Schritt 4: Welle Doctor-Discovery — OSM-Aerzte rund um Quartier-Zentrum.
  // Schreibt direkt in external_doctors (eigene Tabelle, kein Konflikt mit
  // doctor_profiles). Founder-Entscheidung 3a: initialer Pull beim Onboarding.
  let doctors: {
    inserted: number;
    updated: number;
    hidden: number;
    total: number;
  } | null = null;
  try {
    const { data: quarterCoords, error: coordsErr } = await adminDb
      .from("quarters")
      .select("center_lat, center_lng")
      .eq("id", id)
      .single();
    if (coordsErr) {
      errors.push(`Doctor-Discovery Coords-Lookup: ${coordsErr.message}`);
    } else if (
      quarterCoords?.center_lat != null &&
      quarterCoords?.center_lng != null
    ) {
      const report = await discoverDoctorsForQuarter(
        adminDb,
        id,
        quarterCoords.center_lat,
        quarterCoords.center_lng,
      );
      doctors = {
        inserted: report.inserted,
        updated: report.updated,
        hidden: report.hidden,
        total: report.total,
      };
      if (report.errors.length > 0) {
        errors.push(...report.errors.map((e) => `Doctors: ${e}`));
      }
    } else {
      errors.push("Doctor-Discovery uebersprungen: Quartier ohne Center-Koordinaten.");
    }
  } catch (err) {
    errors.push(
      `Doctor-Discovery-Fehler: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return NextResponse.json({
    quarterId: id,
    domain,
    domainAutoDiscovered,
    feeds,
    stops,
    events,
    fetchedFromRss,
    fetchedFromIcal,
    doctors,
    errors,
  });
}
