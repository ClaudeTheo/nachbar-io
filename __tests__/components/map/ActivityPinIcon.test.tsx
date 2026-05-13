import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ActivityPinIcon } from "@/components/map/ActivityPinIcon";
import { MAP_ACTIVITY_PIN_TYPES } from "@/lib/map-activity-pins";

afterEach(() => cleanup());

describe("ActivityPinIcon", () => {
  it("rendert alle freigegebenen Activity-Pins als eigene SVG-Piktogramme", () => {
    const { container } = render(
      <div>
        {MAP_ACTIVITY_PIN_TYPES.map((type) => (
          <ActivityPinIcon key={type} type={type} />
        ))}
      </div>,
    );

    for (const type of MAP_ACTIVITY_PIN_TYPES) {
      expect(
        container.querySelector(`[data-activity-pin-type="${type}"]`),
      ).not.toBeNull();
    }

    expect(container.querySelectorAll("[data-activity-pin-symbol]")).toHaveLength(
      10,
    );
    expect(container.textContent).not.toContain("🌱");
    expect(container.textContent).not.toContain("⚽");
  });

  it("ist per Screenreader lesbar und laesst die Groesse steuern", () => {
    const { getByRole } = render(<ActivityPinIcon size={80} type="mowing" />);

    const icon = getByRole("img", {
      name: "Rasen maehen auf der Quartierskarte",
    });

    expect(icon).toHaveAttribute("width", "80");
    expect(icon).toHaveAttribute("height", "107");
    expect(icon).toHaveAttribute("data-category", "community");
  });
});
