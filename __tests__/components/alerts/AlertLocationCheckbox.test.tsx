import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AlertLocationCheckbox } from "@/modules/alerts/components/AlertLocationCheckbox";

afterEach(() => {
  cleanup();
});

describe("AlertLocationCheckbox", () => {
  it("zeigt Checkbox mit Label", () => {
    render(<AlertLocationCheckbox checked={true} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Standort teilen/)).toBeTruthy();
  });

  it("ist checked wenn true", () => {
    render(<AlertLocationCheckbox checked={true} onChange={vi.fn()} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("ruft onChange bei Klick", () => {
    const onChange = vi.fn();
    render(<AlertLocationCheckbox checked={true} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("zeigt GPS-Loading-Indikator", () => {
    render(
      <AlertLocationCheckbox
        checked={true}
        onChange={vi.fn()}
        gpsLoading={true}
      />,
    );
    expect(screen.getByText(/Standort wird ermittelt/)).toBeTruthy();
  });
});
