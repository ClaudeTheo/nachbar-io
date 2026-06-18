import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { AutoAnswerSettings } from "@/modules/care/components/senior/AutoAnswerSettings";
import type { SeniorCallContact } from "@/modules/care/services/senior-auto-answer.service";

const LINK = "22222222-2222-2222-2222-222222222222";

function contact(overrides: Partial<SeniorCallContact> = {}): SeniorCallContact {
  return {
    linkId: LINK,
    caregiverName: "Lisa",
    caregiverAvatar: null,
    autoAnswerAllowed: true,
    autoAnswerConsented: false,
    ...overrides,
  };
}

describe("AutoAnswerSettings", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("zeigt einen Leer-Hinweis ohne Kontakte", () => {
    render(<AutoAnswerSettings contacts={[]} />);
    expect(screen.getByTestId("auto-answer-empty")).toBeInTheDocument();
  });

  it("rendert pro Kontakt einen Schalter mit korrektem Anfangszustand", () => {
    render(
      <AutoAnswerSettings
        contacts={[contact({ autoAnswerConsented: true })]}
      />,
    );
    const toggle = screen.getByTestId(`auto-answer-toggle-${LINK}`);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveTextContent("Anrufe von Lisa automatisch annehmen");
  });

  it("schaltet ein und sendet consent=true an die Route", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });
    render(<AutoAnswerSettings contacts={[contact()]} />);
    const toggle = screen.getByTestId(`auto-answer-toggle-${LINK}`);
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);

    await waitFor(() =>
      expect(toggle).toHaveAttribute("aria-pressed", "true"),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/senior/auto-answer-consent",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ caregiverLinkId: LINK, consent: true }),
      }),
    );
  });

  it("dreht bei Fehler zurueck und zeigt eine Meldung", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
    });
    render(<AutoAnswerSettings contacts={[contact()]} />);
    const toggle = screen.getByTestId(`auto-answer-toggle-${LINK}`);

    fireEvent.click(toggle);

    await waitFor(() =>
      expect(screen.getByTestId(`auto-answer-error-${LINK}`)).toBeInTheDocument(),
    );
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });
});
