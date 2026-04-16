import { describe, expect, it } from "vitest";
import airqualityFixture from "./fixtures/uba-airquality.json";
import stationsFixture from "./fixtures/uba-stations.json";
import type { UbaAirQualityResponse } from "../types";
import { parseLatestUbaMeasurement, toCacheRow } from "../parser";

const station = {
  id: "240",
  code: "DEBW031",
  name: "Schwarzwald-Sued",
  city: "Muenstertal",
  activeFrom: "2016-01-01",
  activeTo: null,
  longitude: 7.7645,
  latitude: 47.8099,
  networkCode: "BW",
};

describe("parseLatestUbaMeasurement", () => {
  it("parses the latest station record and normalizes the LQI", () => {
    const measurement = parseLatestUbaMeasurement(
      airqualityFixture as unknown as UbaAirQualityResponse,
      station,
    );

    expect(measurement?.station.code).toBe("DEBW031");
    expect(measurement?.endedAt).toBe("2026-04-16 19:00:00");
    expect(measurement?.rawLqi).toBe(2);
    expect(measurement?.lqi).toBe(3);
    expect(measurement?.components).toHaveLength(4);
  });
});

describe("toCacheRow", () => {
  const ctx = {
    quarterId: "quarter-1",
    ars: "08337007",
    batchId: "00000000-0000-0000-0000-000000000003",
  };

  it("maps a measurement to a valid cache row", () => {
    const measurement = parseLatestUbaMeasurement(
      airqualityFixture as unknown as UbaAirQualityResponse,
      station,
    );
    const row = toCacheRow(measurement!, ctx);

    expect(row?.provider).toBe("uba");
    expect(row?.external_id).toBe("DEBW031");
    expect(row?.severity).toBe("minor");
    expect(row?.attribution_text).toBe("Quelle: Umweltbundesamt, dl-de/by-2-0");
    expect(row?.event_code).toBe("LQI_3");
  });

  it("ignores low air-quality indices", () => {
    const measurement = parseLatestUbaMeasurement(
      {
        ...airqualityFixture,
        data: {
          "240": {
            "2026-04-16 18:00:00": [
              "2026-04-16 19:00:00",
              1,
              0,
              [3, 40, 0, "0.667"],
            ],
          },
        },
      } as unknown as UbaAirQualityResponse,
      station,
    );

    expect(toCacheRow(measurement!, ctx)).toBeNull();
  });

  it("returns null when station data is missing", () => {
    expect(
      parseLatestUbaMeasurement(
        {
          ...stationsFixture,
          data: {},
        },
        station,
      ),
    ).toBeNull();
  });
});
