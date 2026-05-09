// Welle J — Stadt-Events-Feed-URL-Prober.
//
// Probt Standard-Pfade auf einer Stadt-Domain auf RSS/iCal-Feeds.
// Gibt eine erkannte RSS- und iCal-URL zurueck (oder null).
//
// Zweck: Im Stadt-Onboarding (W4) automatisch herausfinden, ob eine
// neue Stadt einen oeffentlichen Veranstaltungs-Feed hat. Der gefundene
// Feed kann spaeter von einem Crawler (separate Welle) regelmaessig
// gelesen werden.
//
// fetch ist injizierbar, sodass Tests ohne Netz laufen.

const DEFAULT_RSS_PATHS = [
  "/veranstaltungen.rss",
  "/termine.rss",
  "/events.rss",
  "/feed/veranstaltungen",
];

const DEFAULT_ICAL_PATHS = [
  "/events.ics",
  "/veranstaltungen.ics",
  "/termine.ics",
];

export interface FeedProbeResult {
  rss: string | null;
  ical: string | null;
  errors: string[];
}

export interface FeedProbeDeps {
  fetch?: typeof fetch;
  /** Timeout pro Probe in ms. Default 4000. */
  timeoutMs?: number;
}

export interface FeedProbeOptions {
  rssPaths?: string[];
  icalPaths?: string[];
}

function normalizeBaseUrl(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    url.protocol = "https:";
    const result = url.toString();
    return result.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function isRssContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const lower = contentType.toLowerCase();
  return (
    lower.includes("rss") ||
    lower.includes("atom") ||
    lower.includes("xml")
  );
}

function isIcalContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const lower = contentType.toLowerCase();
  return lower.includes("calendar") || lower.includes("ics");
}

async function probeOne(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  contentTypeMatcher: (contentType: string | null) => boolean,
  errors: string[],
): Promise<boolean> {
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return false;
    const contentType = res.headers.get("content-type");
    return contentTypeMatcher(contentType);
  } catch (err) {
    errors.push(`${url}: ${String(err)}`);
    return false;
  }
}

export async function probeFeedUrls(
  domain: string,
  deps: FeedProbeDeps = {},
  options: FeedProbeOptions = {},
): Promise<FeedProbeResult> {
  const baseUrl = normalizeBaseUrl(domain);
  if (!baseUrl) {
    return {
      rss: null,
      ical: null,
      errors: [`Ungueltige Domain: ${domain}`],
    };
  }

  const fetchImpl = deps.fetch ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 4000;
  const rssPaths = options.rssPaths ?? DEFAULT_RSS_PATHS;
  const icalPaths = options.icalPaths ?? DEFAULT_ICAL_PATHS;

  const errors: string[] = [];

  let rss: string | null = null;
  for (const path of rssPaths) {
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const ok = await probeOne(
      url,
      fetchImpl,
      timeoutMs,
      isRssContentType,
      errors,
    );
    if (ok) {
      rss = url;
      break;
    }
  }

  let ical: string | null = null;
  for (const path of icalPaths) {
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const ok = await probeOne(
      url,
      fetchImpl,
      timeoutMs,
      isIcalContentType,
      errors,
    );
    if (ok) {
      ical = url;
      break;
    }
  }

  return { rss, ical, errors };
}
