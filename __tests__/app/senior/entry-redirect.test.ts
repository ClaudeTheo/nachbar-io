// __tests__/app/senior/entry-redirect.test.ts
// Welle D: /senior ist der oeffentliche Einstieg in den Seniorenmodus.

import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("SeniorEntryPage", () => {
  it("leitet /senior auf /senior/home weiter", async () => {
    const { default: SeniorEntryPage } = await import("@/app/senior/page");

    SeniorEntryPage();

    expect(redirectMock).toHaveBeenCalledWith("/senior/home");
  });
});
