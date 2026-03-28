import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ConsentFeatureCard } from "@/modules/care/components/consent/ConsentFeatureCard";

afterEach(cleanup);

describe("ConsentFeatureCard", () => {
  it("zeigt Feature-Name und Beschreibung", () => {
    render(
      <ConsentFeatureCard
        feature="sos"
        label="SOS-Hilferufe"
        description="Kategorien, Freitext-Notizen und GPS"
        granted={false}
        disabled={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("SOS-Hilferufe")).toBeInTheDocument();
    expect(
      screen.getByText("Kategorien, Freitext-Notizen und GPS"),
    ).toBeInTheDocument();
  });

  it("zeigt Checkbox im aktiven Zustand", () => {
    render(
      <ConsentFeatureCard
        feature="sos"
        label="SOS-Hilferufe"
        description="Test"
        granted={true}
        disabled={false}
        onChange={vi.fn()}
      />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("ist deaktivierbar", () => {
    render(
      <ConsentFeatureCard
        feature="emergency_contacts"
        label="Notfallkontakte"
        description="Test"
        granted={false}
        disabled={true}
        onChange={vi.fn()}
      />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();
  });

  it("ruft onChange auf bei Klick", () => {
    const onChange = vi.fn();
    render(
      <ConsentFeatureCard
        feature="sos"
        label="SOS-Hilferufe"
        description="Test"
        granted={false}
        disabled={false}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith("sos", true);
  });
});
