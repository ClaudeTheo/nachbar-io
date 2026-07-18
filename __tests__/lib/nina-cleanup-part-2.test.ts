import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { normalizeQuartierInfoResponse } from "@/modules/info-hub/normalize-response";
import { buildDailyBrief } from "@/modules/voice/services/daily-brief.service";

const projectFile = (...segments: string[]) => join(process.cwd(), ...segments);

describe("NINA-Cleanup Teil 2", () => {
  it("entfernt das Legacy-NINA-Feld aus dem Quartier-Info-Response", () => {
    const normalized = normalizeQuartierInfoResponse({
      nina: [
        {
          id: "legacy-1",
          warning_id: "legacy-1",
          severity: "Severe",
          headline: "Legacy-Warnung",
          description: null,
          sent_at: "2026-07-18T10:00:00Z",
          expires_at: null,
        },
      ],
    });

    expect(normalized).not.toHaveProperty("nina");
  });

  it("liest selbst bei ausgelassenem Warnargument niemals aus data.nina vor", () => {
    const callWithoutWarnings = buildDailyBrief as unknown as (
      data: Record<string, unknown>,
    ) => string;

    const brief = callWithoutWarnings({
      nina: [
        {
          id: "legacy-1",
          warning_id: "legacy-1",
          severity: "Severe",
          headline: "Diese Legacy-Warnung darf nicht vorgelesen werden",
          description: null,
          sent_at: "2026-07-18T10:00:00Z",
          expires_at: null,
        },
      ],
    });

    expect(brief).toContain("Zu Warnungen habe ich gerade keine Daten");
    expect(brief).not.toContain("Diese Legacy-Warnung");
  });

  it("entfernt Client A und dessen Exporte aus dem Info-Hub", () => {
    expect(
      existsSync(projectFile("modules", "info-hub", "services", "nina-client.ts")),
    ).toBe(false);

    const indexSource = readFileSync(
      projectFile("modules", "info-hub", "index.ts"),
      "utf8",
    );
    const serviceSource = readFileSync(
      projectFile("lib", "services", "quartier-info.service.ts"),
      "utf8",
    );

    expect(indexSource).not.toContain("services/nina-client");
    expect(serviceSource).not.toContain("services/nina-client");
    expect(serviceSource).not.toContain("settings?.nina_ags");
  });
});
