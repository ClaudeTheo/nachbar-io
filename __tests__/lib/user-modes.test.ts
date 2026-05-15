import { describe, expect, it } from "vitest";
import {
  getUserModeConfig,
  getUserModeSurface,
  isUserUiMode,
  USER_MODE_CONFIG,
  USER_UI_MODES,
} from "@/lib/user-modes";

describe("USER_MODE_CONFIG", () => {
  it("enthaelt alle vier Generationen-Modi in stabiler Reihenfolge", () => {
    expect(USER_UI_MODES).toEqual(["youth", "active", "comfort", "senior"]);
    expect(Object.keys(USER_MODE_CONFIG)).toEqual(USER_UI_MODES);
  });

  it("verwendet die vorhandenen Senior- und Jugend-Einstiege", () => {
    expect(getUserModeConfig("senior").postLoginPath).toBe("/kreis-start");
    expect(getUserModeConfig("youth").postLoginPath).toBe("/jugend");
  });

  it("erkennt gueltige ui_mode-Werte ohne neue Datenbankspalte", () => {
    expect(isUserUiMode("comfort")).toBe(true);
    expect(isUserUiMode("active")).toBe(true);
    expect(isUserUiMode("normal")).toBe(false);
    expect(isUserUiMode(null)).toBe(false);
  });

  it("liefert fuer jeden Modus eine eigene UI-Oberflaeche mit Hauptaktion", () => {
    for (const mode of USER_UI_MODES) {
      const surface = getUserModeSurface(mode);

      expect(surface.title.length).toBeGreaterThan(8);
      expect(surface.primaryAction.href).toBe(
        getUserModeConfig(mode).postLoginPath,
      );
      expect(surface.principles).toHaveLength(3);
      expect(surface.visualIntent.length).toBeGreaterThan(10);
    }
  });

  it("haelt Senior und Jugend visuell/operativ getrennt", () => {
    expect(getUserModeSurface("senior").title).toMatch(/grosse/i);
    expect(getUserModeSurface("senior").principles.join(" ")).toMatch(
      /notruf/i,
    );
    expect(getUserModeSurface("youth").title).toMatch(/karte|mission/i);
    expect(getUserModeSurface("youth").primaryAction.href).toBe("/jugend");
  });
});
