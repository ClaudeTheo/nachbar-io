import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchDepartures } from "./oepnv-client";

// EFA-BW Mock-Response (vereinfacht, basierend auf echtem API-Response)
const MOCK_EFA_RESPONSE = {
  departureList: [
    {
      dateTime: { hour: "12", minute: "28" },
      servingLine: {
        number: "7334",
        direction: "Waldshut Busbahnhof",
        name: "Bus 7334",
      },
      platform: "14",
      countdown: "5",
      hints: [{ content: "behindertengerecht" }],
    },
    {
      dateTime: { hour: "12", minute: "32" },
      servingLine: {
        number: "SEV C",
        direction: "Basel Bad Bf",
        name: "SEV C",
      },
      platform: "11",
      countdown: "9",
      hints: [{ content: "Ersatzverkehr" }],
    },
  ],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchDepartures", () => {
  it("parst EFA-BW Response korrekt", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_EFA_RESPONSE,
    } as Response);

    const result = await fetchDepartures("8506566", "Bad Säckingen Bahnhof");
    expect(result.id).toBe("8506566");
    expect(result.name).toBe("Bad Säckingen Bahnhof");
    expect(result.departures).toHaveLength(2);

    const first = result.departures[0];
    expect(first.line).toBe("7334");
    expect(first.destination).toBe("Waldshut Busbahnhof");
    expect(first.time).toBe("12:28");
    expect(first.platform).toBe("14");
    expect(first.countdown).toBe(5);
  });

  it("gibt leere Abfahrten bei null departureList", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ departureList: null }),
    } as Response);

    const result = await fetchDepartures("8506566", "Bad Säckingen Bahnhof");
    expect(result.departures).toEqual([]);
  });

  it("gibt leere Abfahrten bei Netzwerkfehler", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("timeout"));

    const result = await fetchDepartures("8506566", "Bad Säckingen Bahnhof");
    expect(result.departures).toEqual([]);
  });

  it("gibt leere Abfahrten bei HTTP-Fehler", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response);

    const result = await fetchDepartures("8506566", "Bad Säckingen Bahnhof");
    expect(result.departures).toEqual([]);
  });
});
