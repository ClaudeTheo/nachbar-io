import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { YouthHomeSurface } from "@/modules/youth/components/YouthHomeSurface";
import type { YouthProfileData } from "@/modules/youth/services/hooks";

const profile: YouthProfileData = {
  access_level: "freigeschaltet",
  age_group: "u16",
  birth_year: 2011,
  quarter_id: "quarter-1",
  total_points: 420,
};

describe("YouthHomeSurface", () => {
  afterEach(cleanup);

  it("rendert Jugend-Start mit Karte oben und Schnellzugriffen", () => {
    render(
      <YouthHomeSurface
        mapSlot={<div data-testid="map-slot">Map</div>}
        profile={profile}
        taskSlot={<div data-testid="task-slot">Tasks</div>}
      />,
    );

    expect(screen.getByText("QuartierApp Jugend")).toBeInTheDocument();
    expect(screen.getByText("Dein Quartier, dein Move.")).toBeInTheDocument();

    const mapSection = screen.getByTestId("youth-map-section");
    expect(within(mapSection).getByTestId("map-slot")).toBeInTheDocument();
    expect(within(mapSection).getByText("Was läuft gerade?")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Aufgaben/i })).toHaveAttribute(
      "href",
      "/jugend/aufgaben",
    );
    expect(screen.getByRole("link", { name: /Karte/i })).toHaveAttribute(
      "href",
      "/map",
    );
    expect(screen.getByTestId("task-slot")).toBeInTheDocument();
  });

  it("zeigt ohne Jugendprofil den sicheren Zugangseinstieg", () => {
    render(<YouthHomeSurface profile={null} />);

    expect(screen.getByText("Dein Quartier wartet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Zugang starten/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });
});
