import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import { PilotRoleSelector } from "@/app/(app)/profile/components/PilotRoleSelector";
import { PilotRoleSection } from "@/app/(app)/profile/components/PilotRoleSection";

describe("PilotRoleSelector", () => {
  afterEach(() => cleanup());

  it("zeigt resident/caregiver/helper, aber NICHT test_user", () => {
    render(<PilotRoleSelector value="resident" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /für mich/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unterstütze/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /helfe im quartier/i })).toBeInTheDocument();
    expect(screen.queryByText(/testweise/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/testkonto/i)).not.toBeInTheDocument();
  });

  it("markiert den aktiven Wert via aria-pressed und meldet Klicks", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PilotRoleSelector value="resident" onChange={onChange} />);
    expect(screen.getByRole("button", { name: /für mich/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /helfe im quartier/i }));
    expect(onChange).toHaveBeenCalledWith("helper");
  });
});

describe("PilotRoleSection", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("Speichern ist ohne Aenderung deaktiviert", () => {
    render(<PilotRoleSection initialRole="resident" />);
    expect(screen.getByRole("button", { name: /rolle speichern/i })).toBeDisabled();
  });

  it("POSTet die gewaehlte Rolle an /api/profile/pilot-role und zeigt Erfolg", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ pilotRole: "caregiver" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<PilotRoleSection initialRole="resident" />);

    await user.click(screen.getByRole("button", { name: /unterstütze/i }));
    const save = screen.getByRole("button", { name: /rolle speichern/i });
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/profile/pilot-role",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ pilotRole: "caregiver" });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it("zeigt einen Fehler bei nicht-ok Response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: "x" }), { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<PilotRoleSection initialRole="resident" />);

    await user.click(screen.getByRole("button", { name: /helfe im quartier/i }));
    await user.click(screen.getByRole("button", { name: /rolle speichern/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
