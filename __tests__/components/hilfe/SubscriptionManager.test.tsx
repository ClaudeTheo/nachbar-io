import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SubscriptionManager from "@/modules/hilfe/components/SubscriptionManager";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function subscriptionResponse(status: "free" | "trial" | "active" | "paused" | "cancelled") {
  return jsonResponse({
    subscription_status: status,
    trial_receipt_used: false,
    subscription_paused_at: null,
    subscription_cancelled_at: null,
  });
}

describe("SubscriptionManager", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/hilfe/abo");
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("zeigt einen Hinweis nach abgebrochenem Checkout", async () => {
    window.history.replaceState({}, "", "/hilfe/abo?cancelled=true");

    vi.mocked(global.fetch).mockResolvedValue(subscriptionResponse("free"));

    render(<SubscriptionManager />);

    await waitFor(() => {
      expect(screen.getByText("Checkout abgebrochen")).toBeInTheDocument();
    });

    expect(window.location.search).toBe("");
  });

  it("pollt nach erfolgreichem Checkout bis das Abo aktiv ist", async () => {
    window.history.replaceState({}, "", "/hilfe/abo?success=true");

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(subscriptionResponse("free"))
      .mockResolvedValueOnce(subscriptionResponse("active"));

    render(<SubscriptionManager />);

    expect(await screen.findByText("Zahlung erfolgreich")).toBeInTheDocument();

    expect(
      await screen.findByText("Abrechnungs-Modul aktiviert", {}, { timeout: 3000 }),
    ).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  }, 7000);

  it("zeigt sichtbare Fehlermeldung wenn der Checkout nicht startet", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(subscriptionResponse("free"))
      .mockResolvedValueOnce(
        jsonResponse(
          { error: "Zahlungssystem nicht konfiguriert" },
          { status: 503 },
        ),
      );

    render(<SubscriptionManager />);

    const button = await screen.findByRole("button", {
      name: /Abrechnungs-Modul aktivieren/i,
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Checkout nicht verfuegbar")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Zahlungssystem nicht konfiguriert"),
    ).toBeInTheDocument();
  });
});
