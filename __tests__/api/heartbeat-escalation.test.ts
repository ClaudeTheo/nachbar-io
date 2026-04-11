import { describe, it, expect } from "vitest";
import { getEscalationStage } from "@/modules/care/services/heartbeat-escalation.service";
import { HEARTBEAT_ESCALATION } from "@/lib/care/constants";

// Phase-1 Neuausrichtung Design-Doc 2026-04-10 Abschnitt 4.5:
// Eskalation vereinfacht auf 2 Stufen (statt bisher 4):
//   1. 24h keine Aktivitaet -> sanfte Erinnerung an den Bewohner ("Alles gut bei Ihnen?")
//   2. 48h keine Aktivitaet -> Benachrichtigung an eingeladene Angehoerige
describe("getEscalationStage — 2-Stufen-Eskalation (Phase 1)", () => {
  it("liefert null im OK-Bereich (0-24h inklusive)", () => {
    expect(getEscalationStage(0)).toBe(null);
    expect(getEscalationStage(1)).toBe(null);
    expect(getEscalationStage(10)).toBe(null);
    expect(getEscalationStage(23.9)).toBe(null);
    expect(getEscalationStage(24)).toBe(null);
  });

  it("liefert reminder_24h zwischen 24h und 48h", () => {
    expect(getEscalationStage(24.1)).toBe("reminder_24h");
    expect(getEscalationStage(25)).toBe("reminder_24h");
    expect(getEscalationStage(36)).toBe("reminder_24h");
    expect(getEscalationStage(48)).toBe("reminder_24h");
  });

  it("liefert alert_48h ab 48h", () => {
    expect(getEscalationStage(48.1)).toBe("alert_48h");
    expect(getEscalationStage(49)).toBe("alert_48h");
    expect(getEscalationStage(72)).toBe("alert_48h");
    expect(getEscalationStage(Infinity)).toBe("alert_48h");
  });
});

describe("HEARTBEAT_ESCALATION Konstanten", () => {
  it("hat nur die 2 neuen Schwellenwerte (24h, 48h)", () => {
    expect(HEARTBEAT_ESCALATION.reminder_after_hours).toBe(24);
    expect(HEARTBEAT_ESCALATION.alert_after_hours).toBe(48);
  });

  it("hat keine Legacy-Stufen mehr", () => {
    expect(HEARTBEAT_ESCALATION).not.toHaveProperty("ok_hours");
    expect(HEARTBEAT_ESCALATION).not.toHaveProperty("alert_hours");
    expect(HEARTBEAT_ESCALATION).not.toHaveProperty("lotse_hours");
  });
});
