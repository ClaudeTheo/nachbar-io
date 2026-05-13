import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { YouthGroupsSurface } from "@/modules/youth/components/YouthGroupsSurface";

describe("YouthGroupsSurface", () => {
  afterEach(cleanup);

  it("erklaert geschuetzte Jugend-Gruppen mit Einladung", () => {
    render(<YouthGroupsSurface />);

    expect(screen.getByRole("heading", { name: "Geschützte Gruppen" })).toBeInTheDocument();
    expect(screen.getByText(/Nur mit Einladung/i)).toBeInTheDocument();
    expect(screen.getByText(/Gründer oder Admin/i)).toBeInTheDocument();
    expect(screen.getByText(/nicht öffentlich auffindbar/i)).toBeInTheDocument();
  });

  it("verlinkt auf vorhandene Gruppenchat-Funktionen", () => {
    render(<YouthGroupsSurface />);

    expect(screen.getByRole("link", { name: /Meine Gruppen/i })).toHaveAttribute(
      "href",
      "/chat",
    );
    expect(screen.getByRole("link", { name: /Gruppe gründen/i })).toHaveAttribute(
      "href",
      "/chat-groups/neu",
    );
  });
});
