import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import { SeniorConsentPrompt } from "@/modules/care/components/senior/SeniorConsentPrompt";

const LINK = "33333333-3333-3333-3333-333333333333";

describe("SeniorConsentPrompt", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    refreshMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("rendert nichts, wenn keine offene Einwilligung vorliegt", () => {
    const { container } = render(<SeniorConsentPrompt consents={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("zeigt den Angehörigen-Namen und einen großen Bestätigungs-Button (>=80px)", () => {
    render(
      <SeniorConsentPrompt consents={[{ linkId: LINK, caregiverName: "Anna", relationshipType: "child" }]} />,
    );
    expect(screen.getByText(/Anna möchte Sie begleiten/i)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /einverstanden/i });
    expect(button).toHaveStyle({ minHeight: "80px" });
  });

  it("POSTet die Bestätigung, entfernt die Karte und meldet Erfolg", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <SeniorConsentPrompt consents={[{ linkId: LINK, caregiverName: "Anna", relationshipType: "child" }]} />,
    );

    await user.click(screen.getByRole("button", { name: /einverstanden/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/family-setup/senior/consent",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ caregiverLinkId: LINK });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(refreshMock).toHaveBeenCalled();
    expect(screen.queryByText(/Anna möchte Sie begleiten/i)).not.toBeInTheDocument();
  });

  it("zeigt einen Fehler und behält die Karte bei nicht-ok Antwort", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <SeniorConsentPrompt consents={[{ linkId: LINK, caregiverName: "Anna", relationshipType: "child" }]} />,
    );

    await user.click(screen.getByRole("button", { name: /einverstanden/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByText(/Anna möchte Sie begleiten/i)).toBeInTheDocument();
  });
});
