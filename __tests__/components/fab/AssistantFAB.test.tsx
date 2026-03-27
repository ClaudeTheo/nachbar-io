import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";

vi.mock("lucide-react", () => ({
  Mic: (props: Record<string, unknown>) => (
    <svg data-testid="icon-mic" {...props} />
  ),
}));

import { AssistantFAB } from "@/components/fab/AssistantFAB";

describe("AssistantFAB", () => {
  afterEach(() => {
    cleanup();
  });

  it("rendert violetten FAB mit Mikrofon-Icon", () => {
    render(<AssistantFAB onClick={vi.fn()} />);
    const fab = screen.getByTestId("assistant-fab");
    expect(fab).toBeInTheDocument();
    expect(fab.className).toContain("bg-violet-500");
    expect(screen.getByTestId("icon-mic")).toBeInTheDocument();
  });

  it("hat 56px Standardgroesse", () => {
    render(<AssistantFAB onClick={vi.fn()} />);
    const fab = screen.getByTestId("assistant-fab");
    expect(fab.style.width).toBe("56px");
    expect(fab.style.height).toBe("56px");
  });

  it("hat 64px im Senior-Modus", () => {
    render(<AssistantFAB onClick={vi.fn()} seniorMode />);
    const fab = screen.getByTestId("assistant-fab");
    expect(fab.style.width).toBe("64px");
    expect(fab.style.height).toBe("64px");
  });

  it("ruft onClick bei Klick auf", () => {
    const handleClick = vi.fn();
    render(<AssistantFAB onClick={handleClick} />);
    fireEvent.click(screen.getByTestId("assistant-fab"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("hat animate-fab-pulse Klasse", () => {
    render(<AssistantFAB onClick={vi.fn()} />);
    const fab = screen.getByTestId("assistant-fab");
    expect(fab.className).toContain("animate-fab-pulse");
  });

  it("hat Accessibility-Label", () => {
    render(<AssistantFAB onClick={vi.fn()} />);
    expect(screen.getByLabelText("KI-Assistent")).toBeInTheDocument();
  });

  it("startet mit fab-visible Klasse", () => {
    render(<AssistantFAB onClick={vi.fn()} />);
    const fab = screen.getByTestId("assistant-fab");
    expect(fab.className).toContain("fab-visible");
  });
});
