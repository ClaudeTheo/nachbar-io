import { describe, expect, it } from "vitest";
import {
  getKioskPinFromSettings,
  withKioskPinInSettings,
} from "@/lib/kiosk-pin";

describe("kiosk-pin helpers", () => {
  it("liest eine gueltige 4-stellige kiosk_pin aus settings", () => {
    expect(getKioskPinFromSettings({ kiosk_pin: "4821" })).toBe("4821");
  });

  it("ignoriert fehlende oder ungueltige kiosk_pin-Werte", () => {
    expect(getKioskPinFromSettings(null)).toBeNull();
    expect(getKioskPinFromSettings({ kiosk_pin: 4821 })).toBeNull();
    expect(getKioskPinFromSettings({ kiosk_pin: "12ab" })).toBeNull();
    expect(getKioskPinFromSettings({ kiosk_pin: "12345" })).toBeNull();
  });

  it("setzt kiosk_pin in bestehende settings ohne andere Keys zu verlieren", () => {
    expect(
      withKioskPinInSettings({ theme: "dark", lang: "de" }, "4821"),
    ).toEqual({
      theme: "dark",
      lang: "de",
      kiosk_pin: "4821",
    });
  });

  it("entfernt kiosk_pin sauber aus settings", () => {
    expect(
      withKioskPinInSettings({ kiosk_pin: "4821", theme: "dark" }, null),
    ).toEqual({
      theme: "dark",
    });
  });
});
