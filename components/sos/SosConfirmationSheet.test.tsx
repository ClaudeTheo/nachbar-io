// components/sos/SosConfirmationSheet.test.tsx
// Nachbar.io — Tests for SOS notify-family integration (J-1 Task 3)

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { SosConfirmationSheet } from "./SosConfirmationSheet";

const mockSosState = vi.hoisted(() => ({
  isOpen: true,
}));

const mockCloseSos = vi.fn();

vi.mock("./SosContext", () => ({
  useSos: () => ({
    isOpen: mockSosState.isOpen,
    openSos: vi.fn(),
    closeSos: mockCloseSos,
  }),
}));

vi.mock("lucide-react", () => ({
  Phone: (props: Record<string, unknown>) => (
    <svg data-testid="phone-icon" {...props} />
  ),
  Users: (props: Record<string, unknown>) => (
    <svg data-testid="users-icon" {...props} />
  ),
  X: (props: Record<string, unknown>) => (
    <svg data-testid="x-icon" {...props} />
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  mockSosState.isOpen = true;
});

describe("SosConfirmationSheet — notify-family", () => {
  it("rendert geschlossen gar nicht im DOM", () => {
    mockSosState.isOpen = false;

    const { container } = render(<SosConfirmationSheet />);

    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByRole("dialog", { name: /was brauchen sie/i }),
    ).not.toBeInTheDocument();
  });

  it("calls /api/sos/notify-family on button click and shows success message", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ notified: 2, failed: 0 }),
    } as Response);

    render(<SosConfirmationSheet />);

    fireEvent.click(screen.getByTestId("sos-notify-caregivers"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/sos/notify-family", {
        method: "POST",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("2 Angehörige benachrichtigt."),
      ).toBeInTheDocument();
    });
  });

  it("shows error message on API failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    render(<SosConfirmationSheet />);

    fireEvent.click(screen.getByTestId("sos-notify-caregivers"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Benachrichtigung fehlgeschlagen. Bitte versuchen Sie es erneut.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("shows no-contacts hint when notified is 0", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ notified: 0, failed: 0 }),
    } as Response);

    render(<SosConfirmationSheet />);

    fireEvent.click(screen.getByTestId("sos-notify-caregivers"));

    await waitFor(() => {
      expect(
        screen.getByText("Keine Angehörigen hinterlegt."),
      ).toBeInTheDocument();
    });
  });
});
