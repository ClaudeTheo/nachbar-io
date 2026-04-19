// __tests__/components/senior/ProfilView-gedaechtnis-link.test.tsx
// Welle C C7 — Verifiziert dass die Senior-Profil-Page den DSGVO-Link
// zur Memory-Uebersicht (/profil/gedaechtnis) anbietet.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { ProfilView } from "@/components/senior/ProfilView";

afterEach(() => cleanup());

describe("ProfilView — Gedaechtnis-Link (C7)", () => {
  it("zeigt Link 'Mein Gedaechtnis' der zu /profil/gedaechtnis fuehrt", () => {
    render(
      <ProfilView displayName="Anna" avatarUrl={null} emergencyContacts={[]} />,
    );
    const link = screen.getByRole("link", {
      name: /mein gedaechtnis|was die ki|ki-assistent.*weiss/i,
    });
    expect(link).toHaveAttribute("href", "/profil/gedaechtnis");
  });

  it("Senior-Mode: Gedaechtnis-Link hat min-height 80px", () => {
    render(
      <ProfilView displayName="Anna" avatarUrl={null} emergencyContacts={[]} />,
    );
    const link = screen.getByRole("link", {
      name: /mein gedaechtnis|was die ki|ki-assistent.*weiss/i,
    });
    expect(link.style.minHeight).toBe("80px");
  });
});
