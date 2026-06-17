// __tests__/app/senior/paare-finden.test.tsx — Welle SP2-1
// Die Senior-Seite holt die Familienfotos server-seitig (getSeniorHouseholdPhotos,
// SB-1/SB-3) und baut daraus das Raster. Genug Fotos -> Foto-Karten; zu wenige ->
// Emoji-Fallback. Fotos ohne Signed-URL werden weggelassen.

import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

const getSeniorHouseholdPhotosMock = vi.fn();
vi.mock("@/modules/care/services/senior-kiosk.service", () => ({
  getSeniorHouseholdPhotos: (...args: unknown[]) =>
    getSeniorHouseholdPhotosMock(...args),
}));

import SeniorPaareFindenPage from "@/app/(senior)/spiele/paare-finden/page";

function photo(i: number, url: string | null = `https://signed.example/${i}.jpg`) {
  return {
    id: `p${i}`,
    url,
    caption: `Foto ${i}`,
    uploaderId: "x",
    createdAt: "t",
    pinned: false,
  };
}

afterEach(() => {
  cleanup();
  getSeniorHouseholdPhotosMock.mockReset();
});

describe("SeniorPaareFindenPage (SP2-1)", () => {
  it("mit 8 Fotos: 16 Foto-Karten, Bild erscheint nach Aufdecken", async () => {
    getSeniorHouseholdPhotosMock.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => photo(i)),
    );
    render(await SeniorPaareFindenPage());
    const cards = screen.getAllByTestId("paar-card");
    expect(cards).toHaveLength(16);
    fireEvent.click(cards[0]);
    expect(cards[0].querySelector("img")).not.toBeNull();
  });

  it("ohne Fotos: Emoji-Fallback (16 Karten, kein Bild)", async () => {
    getSeniorHouseholdPhotosMock.mockResolvedValue([]);
    render(await SeniorPaareFindenPage());
    const cards = screen.getAllByTestId("paar-card");
    expect(cards).toHaveLength(16);
    fireEvent.click(cards[0]);
    expect(cards[0].querySelector("img")).toBeNull();
    expect(cards[0].textContent).not.toBe("");
  });

  it("laesst Fotos ohne Signed-URL weg (5 nutzbar -> 10 Karten, 3 Spalten)", async () => {
    getSeniorHouseholdPhotosMock.mockResolvedValue([
      ...Array.from({ length: 5 }, (_, i) => photo(i)),
      photo(99, null),
    ]);
    render(await SeniorPaareFindenPage());
    expect(screen.getAllByTestId("paar-card")).toHaveLength(10);
  });
});
