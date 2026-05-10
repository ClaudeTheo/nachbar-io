// lib/cities/domain-resolver.ts
// Skalierbare Stadt-Domain-Discovery aus Stadt-Namen.
//
// Heuristik (kein LLM-Call): Generiert plausible Domain-Kandidaten und probt
// jeden via HEAD-Request. Erster 2xx gewinnt. Funktioniert deterministisch
// und offline-faehig fuer den Pilot Bad Saeckingen + skaliert auf weitere
// deutsche Kleinstaedte.
//
// Fuer Edge-Cases (z.B. "Frankfurt am Main" → frankfurt.de) kann spaeter ein
// LLM-Fallback oder eine Wikidata-Lookup-Schicht ergaenzt werden.

const UMLAUT_MAP: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
  Ä: "ae",
  Ö: "oe",
  Ü: "ue",
};

function normalizeCity(city: string): { compact: string; dashed: string } {
  const lowered = city
    .toLowerCase()
    .replace(/[äöüßÄÖÜ]/g, (c) => UMLAUT_MAP[c] ?? c)
    .replace(/[^a-z0-9\s-]/g, "") // nur a-z, 0-9, Whitespace, Bindestrich
    .trim()
    .replace(/\s+/g, " ");
  const compact = lowered.replace(/[\s-]+/g, "");
  const dashed = lowered.replace(/[\s-]+/g, "-");
  return { compact, dashed };
}

export function generateCityDomainCandidates(city: string): string[] {
  if (!city || typeof city !== "string" || city.trim().length === 0) {
    return [];
  }
  const { compact, dashed } = normalizeCity(city);
  if (compact.length === 0) return [];

  const candidates: string[] = [
    `https://www.${compact}.de`,
    `https://www.${dashed}.de`,
    `https://${compact}.de`,
    `https://${dashed}.de`,
    `https://www.stadt-${compact}.de`,
    `https://www.stadt-${dashed}.de`,
  ];

  // Dedupe, bewahre Reihenfolge
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const c of candidates) {
    if (!seen.has(c)) {
      seen.add(c);
      unique.push(c);
    }
  }
  return unique;
}

export interface ResolveCityDomainOptions {
  /** Dependency-Injection fuer Tests. */
  fetch?: typeof fetch;
  /** Timeout pro Kandidat in ms. Default 4000. */
  timeoutMs?: number;
  /** Max. Anzahl Kandidaten zu probieren. Default alle. */
  maxCandidates?: number;
}

export interface ResolveCityDomainResult {
  domain: string | null;
  candidatesTried: string[];
  errors: string[];
}

async function probeDomain(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetchImpl(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { ok: res.ok };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function resolveCityDomain(
  city: string,
  options: ResolveCityDomainOptions = {},
): Promise<ResolveCityDomainResult> {
  const candidates = generateCityDomainCandidates(city);
  if (candidates.length === 0) {
    return { domain: null, candidatesTried: [], errors: [] };
  }

  const fetchImpl = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 4000;
  const limit = options.maxCandidates ?? candidates.length;

  const tried: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < Math.min(candidates.length, limit); i++) {
    const url = candidates[i];
    tried.push(url);
    const probe = await probeDomain(url, fetchImpl, timeoutMs);
    if (probe.ok) {
      return { domain: url, candidatesTried: tried, errors };
    }
    if (probe.error) {
      errors.push(`${url}: ${probe.error}`);
    }
  }

  return { domain: null, candidatesTried: tried, errors };
}
