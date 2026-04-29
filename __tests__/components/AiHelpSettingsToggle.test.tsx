import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiHelpSettingsToggle } from "@/modules/ai/components/AiHelpSettingsToggle";

describe("AiHelpSettingsToggle", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (_input, init) => {
      if (!init) {
        return new Response(
          JSON.stringify({ enabled: true, assistanceLevel: "basic" }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ enabled: true, assistanceLevel: "everyday" }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
  });

  afterEach(() => cleanup());

  it("loads the current assistance level and marks Basis", async () => {
    render(<AiHelpSettingsToggle />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Basis/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(
      screen.queryByRole("button", { name: /Später entscheiden/i }),
    ).toBeNull();
  });

  it("renders the existing KI-Hilfe FAQ pulse trigger in settings and opens the same sheet", async () => {
    const user = userEvent.setup();
    render(<AiHelpSettingsToggle />);

    const trigger = await screen.findByRole("button", {
      name: /Hilfe zur KI-Hilfe öffnen/i,
    });
    await user.click(trigger);

    expect(
      await screen.findByRole("dialog", {
        name: /Häufige Fragen zur KI-Hilfe/i,
      }),
    ).toBeInTheDocument();
  });

  it("posts ai_assistance_level when a settings level changes", async () => {
    const user = userEvent.setup();
    render(<AiHelpSettingsToggle />);

    await screen.findByRole("button", { name: /^Alltag/i });
    await user.click(screen.getByRole("button", { name: /^Alltag/i }));

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith("/api/settings/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_assistance_level: "everyday" }),
    });
  });

  it("shows and dismisses the locked Persoenlich hint", async () => {
    const user = userEvent.setup();
    render(<AiHelpSettingsToggle />);

    await user.click(await screen.findByRole("button", { name: /Persönlich/i }));
    expect(
      screen.getByText("Persönlich ist noch gesperrt."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Wir informieren Sie dann/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Hinweis schließen/i }));
    expect(
      screen.queryByText("Persönlich ist noch gesperrt."),
    ).not.toBeInTheDocument();
  });

  it("rolls optimistic selection back on save failure", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(async (_input, init) => {
      if (!init) {
        return new Response(
          JSON.stringify({ enabled: true, assistanceLevel: "basic" }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ error: "fail" }), { status: 500 });
    }) as unknown as typeof fetch;

    render(<AiHelpSettingsToggle />);

    await screen.findByRole("button", { name: /^Basis/i });
    await user.click(screen.getByRole("button", { name: /^Alltag/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Basis/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(
      screen.getByText("KI-Einstellung konnte nicht gespeichert werden."),
    ).toBeInTheDocument();
  });
});
