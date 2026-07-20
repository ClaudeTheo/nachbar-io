import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VouchingPage from "@/app/(app)/vouching/page";

describe("VouchingPage circle privacy empty state", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("beendet den Skeleton und erklaert eine RLS-leere Nachbarliste", async () => {
    render(<VouchingPage />);

    expect(
      await screen.findByText(
        "Keine unverifizierten Nachbarn in Ihrem Quartier.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector(".animate-pulse")).not.toBeInTheDocument();
    });
  });
});
