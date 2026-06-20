// __tests__/components/senior/FamilienMomentCard.test.tsx
// Welle SB-2: „Erster gemeinsamer Moment" — neuestes Familienfoto gross auf dem
// Senior-Home mit Ein-Tap-Sprachantwort. Die Sprachantwort verwendet den
// bestehenden Chat-Stack wieder (openConversation -> signed upload -> sendDirectMessage)
// und faengt den Fall „noch kein akzeptierter Kontakt" (403) senior-freundlich ab.

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";

// AudioRecorder durch ein Test-Double ersetzen: ein Knopf, der onComplete mit
// einem Fake-Blob aufruft — so testen wir die Versand-Logik ohne MediaRecorder.
vi.mock("@/components/chat/AudioRecorder", () => ({
  AudioRecorder: ({
    onComplete,
    onCancel,
  }: {
    onComplete: (blob: Blob, durationSec: number, mimeType: string) => void;
    onCancel: () => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onComplete(new Blob(["x"], { type: "audio/webm" }), 3, "audio/webm")
        }
      >
        fake-aufnahme-fertig
      </button>
      <button type="button" onClick={onCancel}>
        fake-abbrechen
      </button>
    </div>
  ),
}));

const mocks = vi.hoisted(() => ({
  openConversation: vi.fn(),
  requestSignedUploadUrl: vi.fn(),
  uploadBlobToSignedUrl: vi.fn(),
  sendDirectMessage: vi.fn(),
}));

vi.mock("@/lib/chat/client", () => ({
  openConversation: mocks.openConversation,
  requestSignedUploadUrl: mocks.requestSignedUploadUrl,
  uploadBlobToSignedUrl: mocks.uploadBlobToSignedUrl,
  sendDirectMessage: mocks.sendDirectMessage,
}));

/** Plain-Error mit code/status — die Komponente prueft nur diese Felder. */
function noContactError() {
  return Object.assign(
    new Error("Chat nur mit akzeptierten Kontakten moeglich"),
    { status: 403, code: "no_accepted_contact" },
  );
}

import { FamilienMomentCard } from "@/modules/care/components/senior/FamilienMomentCard";

const PHOTO = {
  url: "https://signed.example/foto.jpg",
  caption: "Gruss vom Geburtstag",
  uploaderId: "11111111-1111-1111-1111-111111111111",
};

describe("FamilienMomentCard (SB-2)", () => {
  afterEach(cleanup);
  beforeEach(() => {
    mocks.openConversation.mockReset();
    mocks.requestSignedUploadUrl.mockReset();
    mocks.uploadBlobToSignedUrl.mockReset();
    mocks.sendDirectMessage.mockReset();
  });

  it("rendert nichts ohne Foto", () => {
    const { container } = render(<FamilienMomentCard photo={null} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("familien-moment-card")).toBeNull();
  });

  it("rendert nichts wenn die Signed-URL fehlt", () => {
    render(
      <FamilienMomentCard
        photo={{ url: null, caption: "x", uploaderId: PHOTO.uploaderId }}
      />,
    );
    expect(screen.queryByTestId("familien-moment-card")).toBeNull();
  });

  it("zeigt das Foto gross mit Caption und einem Sprachantwort-Knopf >=80px", () => {
    render(<FamilienMomentCard photo={PHOTO} />);

    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe(PHOTO.url);
    expect(screen.getByText(/Gruss vom Geburtstag/)).toBeDefined();

    const button = screen.getByTestId("familien-moment-voice-reply");
    const style = button.getAttribute("style") ?? "";
    expect(style).toContain("min-height");
    expect(style).toContain("80px");
  });

  it("oeffnet den Recorder beim Tippen auf Sprachantwort", () => {
    render(<FamilienMomentCard photo={PHOTO} />);
    fireEvent.click(screen.getByTestId("familien-moment-voice-reply"));
    expect(screen.getByText("fake-aufnahme-fertig")).toBeDefined();
  });

  it("sendet die Sprachantwort ueber den bestehenden Chat-Stack an den Uploader", async () => {
    mocks.openConversation.mockResolvedValue({ id: "conv-1" });
    mocks.requestSignedUploadUrl.mockResolvedValue({
      signed_url: "https://upload.example/put",
      path: "direct/conv-1/abc.webm",
    });
    mocks.uploadBlobToSignedUrl.mockResolvedValue(undefined);
    mocks.sendDirectMessage.mockResolvedValue({ id: "msg-1" });

    render(<FamilienMomentCard photo={PHOTO} />);
    fireEvent.click(screen.getByTestId("familien-moment-voice-reply"));
    fireEvent.click(screen.getByText("fake-aufnahme-fertig"));

    await waitFor(() => {
      expect(mocks.openConversation).toHaveBeenCalledWith(PHOTO.uploaderId);
      expect(mocks.sendDirectMessage).toHaveBeenCalledWith("conv-1", {
        media_type: "audio",
        media_url: "direct/conv-1/abc.webm",
        media_duration_sec: 3,
      });
    });
    expect(await screen.findByText(/gesendet/i)).toBeDefined();
  });

  it("faengt fehlenden Kontakt (403) senior-freundlich ab — ohne Crash, ohne Senden", async () => {
    mocks.openConversation.mockRejectedValue(noContactError());

    render(<FamilienMomentCard photo={PHOTO} />);
    fireEvent.click(screen.getByTestId("familien-moment-voice-reply"));
    fireEvent.click(screen.getByText("fake-aufnahme-fertig"));

    expect(await screen.findByText(/verbunden/i)).toBeDefined();
    expect(mocks.sendDirectMessage).not.toHaveBeenCalled();
  });
});
