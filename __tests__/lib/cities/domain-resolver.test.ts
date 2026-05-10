// __tests__/lib/cities/domain-resolver.test.ts
// Skalierbare Stadt-Domain-Discovery aus Stadt-Namen.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveCityDomain,
  generateCityDomainCandidates,
} from "@/lib/cities/domain-resolver";

beforeEach(() => {
  // empty
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateCityDomainCandidates", () => {
  it("Bad Saeckingen → www.badsaeckingen.de + bad-saeckingen-Varianten", () => {
    const candidates = generateCityDomainCandidates("Bad Säckingen");
    expect(candidates).toContain("https://www.badsaeckingen.de");
    expect(candidates).toContain("https://www.bad-saeckingen.de");
    expect(candidates).toContain("https://badsaeckingen.de");
  });

  it("ersetzt Umlaute (ä→ae, ö→oe, ü→ue, ß→ss)", () => {
    const candidates = generateCityDomainCandidates("Schönberg");
    const all = candidates.join(" ");
    expect(all).toContain("schoenberg");
    expect(all).not.toContain("schönberg");
  });

  it("normalisiert mehrere Whitespaces", () => {
    const candidates = generateCityDomainCandidates("Frankfurt   am Main");
    const all = candidates.join(" ");
    expect(all).toContain("frankfurt-am-main");
    expect(all).toContain("frankfurtammain");
  });

  it("liefert leeres Array fuer leeren Input", () => {
    expect(generateCityDomainCandidates("")).toEqual([]);
    expect(generateCityDomainCandidates("   ")).toEqual([]);
  });

  it("dedupliziert Kandidaten", () => {
    const candidates = generateCityDomainCandidates("Berlin");
    const unique = new Set(candidates);
    expect(candidates.length).toBe(unique.size);
  });
});

describe("resolveCityDomain", () => {
  function fetchOk(): Response {
    return new Response("", { status: 200 });
  }

  function fetch404(): Response {
    return new Response("", { status: 404 });
  }

  it("liefert ersten 2xx-Kandidaten als Domain", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      // Simuliere: nur badsaeckingen.de antwortet 200
      if (u === "https://www.badsaeckingen.de") return fetchOk();
      return fetch404();
    });

    const result = await resolveCityDomain("Bad Säckingen", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.domain).toBe("https://www.badsaeckingen.de");
    expect(result.candidatesTried.length).toBeGreaterThan(0);
    expect(result.errors).toEqual([]);
  });

  it("liefert null wenn alle Kandidaten 404", async () => {
    const fetchMock = vi.fn(async () => fetch404());

    const result = await resolveCityDomain("Nonexistent City", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.domain).toBeNull();
    expect(result.candidatesTried.length).toBeGreaterThan(0);
  });

  it("sammelt Netz-Errors statt zu werfen", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("Network down");
    });

    const result = await resolveCityDomain("Bad Säckingen", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.domain).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("respektiert maxCandidates-Option", async () => {
    const fetchMock = vi.fn(async () => fetch404());

    const result = await resolveCityDomain("Bad Säckingen", {
      fetch: fetchMock as unknown as typeof fetch,
      maxCandidates: 2,
    });

    expect(result.candidatesTried.length).toBeLessThanOrEqual(2);
  });

  it("liefert null fuer leeren Stadt-Namen ohne fetch-Aufruf", async () => {
    const fetchMock = vi.fn();
    const result = await resolveCityDomain("", {
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(result.domain).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
