import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import PendingApprovalPage from "@/app/freigabe-ausstehend/page";

describe("Freigabe-ausstehend-Seite", () => {
  afterEach(() => cleanup());

  it("erklaert neuen Nutzern die manuelle Freigabe", () => {
    render(<PendingApprovalPage />);

    expect(
      screen.getByRole("heading", { name: /freigabe wird geprueft/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/manuell freigeschaltet/i)).toBeInTheDocument();
    expect(screen.getByText(/keine echten daten/i)).toBeInTheDocument();
  });
});
