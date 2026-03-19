import { describe, it, expect } from "vitest";
import {
  canTransition,
  getAvailableActions,
  type AppointmentStatus as _AppointmentStatus,
} from "@/lib/consultation/appointment-status";

describe("canTransition", () => {
  it("erlaubt proposed → confirmed durch Gegenseite", () => {
    expect(canTransition("proposed", "confirmed", "patient", "doctor")).toBe(true);
  });

  it("verbietet proposed → confirmed durch Vorschlagenden", () => {
    expect(canTransition("proposed", "confirmed", "doctor", "doctor")).toBe(false);
  });

  it("erlaubt proposed → counter_proposed durch Gegenseite", () => {
    expect(canTransition("proposed", "counter_proposed", "patient", "doctor")).toBe(true);
  });

  it("erlaubt confirmed → cancelled durch beide", () => {
    expect(canTransition("confirmed", "cancelled", "doctor", "doctor")).toBe(true);
    expect(canTransition("confirmed", "cancelled", "patient", "doctor")).toBe(true);
  });

  it("erlaubt confirmed → active nur durch Arzt", () => {
    expect(canTransition("confirmed", "active", "doctor", "doctor")).toBe(true);
    expect(canTransition("confirmed", "active", "patient", "doctor")).toBe(false);
  });

  it("verbietet completed → irgendwas", () => {
    expect(canTransition("completed", "proposed", "doctor", "doctor")).toBe(false);
  });
});

describe("getAvailableActions", () => {
  it("gibt Bestaetigen/Gegenvorschlag/Ablehnen fuer proposed (Gegenseite)", () => {
    const actions = getAvailableActions("proposed", "patient", "doctor");
    expect(actions).toContain("confirm");
    expect(actions).toContain("counter_propose");
    expect(actions).toContain("decline");
    expect(actions).not.toContain("start");
  });

  it("gibt Starten/Absagen fuer confirmed (Arzt)", () => {
    const actions = getAvailableActions("confirmed", "doctor", "doctor");
    expect(actions).toContain("start");
    expect(actions).toContain("cancel");
  });

  it("gibt Beitreten fuer active (Patient)", () => {
    const actions = getAvailableActions("active", "patient", "doctor");
    expect(actions).toContain("join");
  });
});
