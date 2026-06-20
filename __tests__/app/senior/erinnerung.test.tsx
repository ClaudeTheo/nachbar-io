// __tests__/app/senior/erinnerung.test.tsx — Welle SP2-2
// Die Seite holt die Haushaltsfotos server-seitig (SB-1/SB-3) und zeigt das
// deterministisch gewaehlte Wochen-Foto. Ohne captioniertes Foto: freundlicher
// Hinweis statt Leerzustand.

import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

const getSeniorHouseholdPhotosMock = vi.fn();
vi.mock("@/modules/care/services/senior-kiosk.service", () => ({
  getSeniorHouseholdPhotos: (...a: unknown[]) =>
    getSeniorHouseholdPhotosMock(...a),
}));

// FamilienMomentCard-Abhaengigkeiten als Doubles (kein MediaRecorder/Netzwerk).
vi.mock("@/components/chat/AudioRecorder", () => ({
  AudioRecorder: () => <div data-testid="audio-recorder-stub" />,
}));
vi.mock("@/lib/chat/client", () => ({
  openConversation: vi.fn(),
  requestSignedUploadUrl: vi.fn(),
  uploadBlobToSignedUrl: vi.fn(),
  sendDirectMessage: vi.fn(),
}));

import SeniorErinnerungPage from "@/app/(senior)/erinnerung/page";

function photo(over: Record<string, unknown> = {}) {
  return {
    id: "p1",
    url: "https://signed.example/1.jpg",
    caption: "Damals am Rhein",
    uploaderId: "u1",
    createdAt: "t",
    pinned: false,
    ...over,
  };
}

afterEach(() => {
  cleanup();
  getSeniorHouseholdPhotosMock.mockReset();
});

describe("SeniorErinnerungPage (SP2-2)", () => {
  it("zeigt das Wochen-Foto mit Caption, wenn ein captioniertes Foto existiert", async () => {
    getSeniorHouseholdPhotosMock.mockResolvedValue([photo()]);
    render(await SeniorErinnerungPage());
    expect(screen.getByRole("img").getAttribute("src")).toBe(
      "https://signed.example/1.jpg",
    );
    expect(screen.getByText(/Damals am Rhein/)).toBeDefined();
  });

  it("zeigt einen freundlichen Hinweis ohne captioniertes Foto", async () => {
    getSeniorHouseholdPhotosMock.mockResolvedValue([photo({ caption: null })]);
    render(await SeniorErinnerungPage());
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(/Sobald Ihre Familie/i)).toBeDefined();
  });
});
