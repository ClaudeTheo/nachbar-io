// __tests__/components/senior/ErinnerungDerWoche.test.tsx
// Welle SP2-2: Die „Erinnerung der Woche" zeigt EIN Wochen-Foto gross mit seiner
// Bildunterschrift als Geschichte und einer Ein-Tap-Sprachantwort — sie verwendet
// den SB-2-Baustein (FamilienMomentCard) mit eigener Ueberschrift wieder.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// FamilienMomentCard importiert AudioRecorder + Chat-Client — fuers Render-Testen
// als harmlose Doubles ersetzen (kein MediaRecorder/Netzwerk noetig).
vi.mock("@/components/chat/AudioRecorder", () => ({
  AudioRecorder: () => <div data-testid="audio-recorder-stub" />,
}));
vi.mock("@/lib/chat/client", () => ({
  openConversation: vi.fn(),
  requestSignedUploadUrl: vi.fn(),
  uploadBlobToSignedUrl: vi.fn(),
  sendDirectMessage: vi.fn(),
}));

import { ErinnerungDerWoche } from "@/modules/care/components/senior/ErinnerungDerWoche";

const PHOTO = {
  url: "https://signed.example/woche.jpg",
  caption: "Damals am Rhein",
  uploaderId: "11111111-1111-1111-1111-111111111111",
};

describe("ErinnerungDerWoche (SP2-2)", () => {
  afterEach(cleanup);

  it("rendert nichts ohne Foto", () => {
    const { container } = render(<ErinnerungDerWoche photo={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("zeigt das Wochen-Foto mit Ueberschrift, Caption und Sprachantwort-Knopf", () => {
    render(<ErinnerungDerWoche photo={PHOTO} />);
    expect(screen.getByText(/Erinnerung der Woche/i)).toBeDefined();
    expect(screen.getByRole("img").getAttribute("src")).toBe(PHOTO.url);
    expect(screen.getByText(/Damals am Rhein/)).toBeDefined();
    expect(screen.getByTestId("familien-moment-voice-reply")).toBeDefined();
  });
});
