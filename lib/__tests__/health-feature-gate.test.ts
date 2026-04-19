import { describe, it, expect } from "vitest";
import {
  getRequiredFlagForRoute,
  isHealthRoute,
} from "@/lib/health-feature-gate";

describe("getRequiredFlagForRoute", () => {
  it("liefert MEDICATIONS_ENABLED fuer /care/medications", () => {
    expect(getRequiredFlagForRoute("/care/medications")).toBe(
      "MEDICATIONS_ENABLED",
    );
  });
  it("matcht Sub-Paths", () => {
    expect(getRequiredFlagForRoute("/care/aerzte/42")).toBe("DOCTORS_ENABLED");
  });
  it("liefert VIDEO_CONSULTATION fuer /care/sprechstunde und /care/consultations", () => {
    expect(getRequiredFlagForRoute("/care/sprechstunde")).toBe(
      "VIDEO_CONSULTATION",
    );
    expect(getRequiredFlagForRoute("/care/consultations")).toBe(
      "VIDEO_CONSULTATION",
    );
  });
  it("liefert HEARTBEAT_ENABLED fuer /care/heartbeat und /care/checkin", () => {
    expect(getRequiredFlagForRoute("/care/heartbeat")).toBe(
      "HEARTBEAT_ENABLED",
    );
    expect(getRequiredFlagForRoute("/care/checkin")).toBe("HEARTBEAT_ENABLED");
  });
  it("liefert APPOINTMENTS_ENABLED fuer /care/appointments und /care/termine", () => {
    expect(getRequiredFlagForRoute("/care/appointments")).toBe(
      "APPOINTMENTS_ENABLED",
    );
    expect(getRequiredFlagForRoute("/care/termine")).toBe(
      "APPOINTMENTS_ENABLED",
    );
    expect(getRequiredFlagForRoute("/care/termine/buchen/doc-1")).toBe(
      "APPOINTMENTS_ENABLED",
    );
  });
  it("liefert GDT_ENABLED fuer /arzt", () => {
    expect(getRequiredFlagForRoute("/arzt")).toBe("GDT_ENABLED");
  });
  it("liefert null fuer nicht-gesundheits-routes", () => {
    expect(getRequiredFlagForRoute("/dashboard")).toBeNull();
    expect(getRequiredFlagForRoute("/care/tasks")).toBeNull();
    expect(getRequiredFlagForRoute("/")).toBeNull();
  });
});

describe("isHealthRoute", () => {
  it("true fuer health-routes", () => {
    expect(isHealthRoute("/care/medications")).toBe(true);
    expect(isHealthRoute("/arzt")).toBe(true);
  });
  it("false fuer nicht-health-routes", () => {
    expect(isHealthRoute("/care/tasks")).toBe(false);
    expect(isHealthRoute("/")).toBe(false);
  });
});
