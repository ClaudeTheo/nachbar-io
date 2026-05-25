import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FamilySetupPanel } from "@/modules/family-setup/components/FamilySetupPanel";

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-qr-value={value} />
  ),
}));

describe("FamilySetupPanel", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const path = String(url);
      return {
        ok: true,
        json: async () => ({
          setupUrl: path.includes("/senior")
            ? "https://nachbar.test/setup/senior-token"
            : "https://nachbar.test/setup/child-token",
          shortCode: path.includes("/senior") ? "SENIOR12" : "KIND1234",
          expiresAt: "2099-05-15T10:00:00.000Z",
        }),
      } as Response;
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("creates a child QR setup from the profile panel", async () => {
    render(<FamilySetupPanel />);

    fireEvent.change(screen.getByLabelText("Name des Kindes"), {
      target: { value: "Mia" },
    });
    fireEvent.change(screen.getByLabelText("Geburtsjahr des Kindes"), {
      target: { value: "2012" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Kinderzugang erstellen/i }));

    await waitFor(() => {
      expect(screen.getByTestId("qr-code")).toHaveAttribute(
        "data-qr-value",
        "https://nachbar.test/setup/child-token",
      );
    });
    expect(screen.getByText("KIND1234")).toBeInTheDocument();
    expect(screen.getByText(/nicht öffentlich teilen/i)).toBeInTheDocument();
  });

  it("creates a senior QR setup from the profile panel", async () => {
    render(<FamilySetupPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Senior" }));
    fireEvent.change(screen.getByLabelText("Name des Seniors"), {
      target: { value: "Erika" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Senior-Zugang erstellen/i }));

    await waitFor(() => {
      expect(screen.getByTestId("qr-code")).toHaveAttribute(
        "data-qr-value",
        "https://nachbar.test/setup/senior-token",
      );
    });
    expect(screen.getByText("SENIOR12")).toBeInTheDocument();
    expect(screen.getByText(/sensible Daten bleiben geschützt/i)).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      targetUiMode: "senior",
    });
  });

  it("can create an Aktiv 55+ senior setup", async () => {
    render(<FamilySetupPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Senior" }));
    fireEvent.change(screen.getByLabelText("Name des Seniors"), {
      target: { value: "Erika" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aktiv 55+" }));
    fireEvent.click(screen.getByRole("button", { name: /Senior-Zugang erstellen/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      targetUiMode: "comfort",
    });
  });
});
