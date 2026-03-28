import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

describe("SegmentedControl", () => {
  const items = ["Alle", "Kaufen", "Leihen"];

  afterEach(() => cleanup());

  it("rendert alle Segmente als tabs", () => {
    render(
      <SegmentedControl items={items} active="Alle" onChange={() => {}} />,
    );
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });

  it("ruft onChange bei Klick auf inaktives Segment", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl items={items} active="Alle" onChange={onChange} />,
    );
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[1]); // "Kaufen"
    expect(onChange).toHaveBeenCalledWith("Kaufen");
  });

  it("ruft onChange NICHT bei Klick auf aktives Segment", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl items={items} active="Alle" onChange={onChange} />,
    );
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[0]); // "Alle" (aktiv)
    expect(onChange).not.toHaveBeenCalled();
  });

  it("zeigt Glassmorphism-Slider", () => {
    const { container } = render(
      <SegmentedControl items={items} active="Leihen" onChange={() => {}} />,
    );
    const slider = container.querySelector("[data-testid='segment-slider']");
    expect(slider).toBeInTheDocument();
  });

  it("hat py-2 fuer Touch-Targets", () => {
    render(
      <SegmentedControl items={items} active="Alle" onChange={() => {}} />,
    );
    const tabs = screen.getAllByRole("tab");
    tabs.forEach((tab) => {
      expect(tab.className).toContain("py-2");
    });
  });
});
