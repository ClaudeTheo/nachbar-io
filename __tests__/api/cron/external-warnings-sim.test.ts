import { describe, it, expect } from "vitest";
import { isSimulationId } from "@/lib/integrations/__shared__/simulation-id";

describe("isSimulationId", () => {
  it("erkennt manuell eingefuegte Simulations-IDs am Prefix 'sim-'", () => {
    expect(isSimulationId("sim-hitze-001")).toBe(true);
    expect(isSimulationId("sim-")).toBe(true);
    expect(isSimulationId("sim-nina-test-42")).toBe(true);
  });

  it("behandelt echte Provider-IDs nicht als Simulation", () => {
    expect(isSimulationId("DE.BBK.MOWAS.123456")).toBe(false);
    expect(isSimulationId("2.49.0.0.276.0.DWD.PVW.1234567890.HITZE")).toBe(
      false,
    );
    expect(isSimulationId("uba-pm10-DEBW001")).toBe(false);
    expect(isSimulationId("")).toBe(false);
    expect(isSimulationId("SIM-UPPERCASE")).toBe(false);
  });
});
