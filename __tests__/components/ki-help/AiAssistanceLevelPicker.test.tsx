import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiAssistanceLevelPicker } from "@/components/ki-help/AiAssistanceLevelPicker";

describe("AiAssistanceLevelPicker", () => {
  afterEach(() => cleanup());

  it("renders onboarding levels including Spaeter plus locked Persoenlich", () => {
    render(
      <AiAssistanceLevelPicker
        mode="onboarding"
        value={null}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /^Aus\s/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Basis/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Alltag/i })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /Später entscheiden/i }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: /Persönlich/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("renders settings levels without Spaeter entscheiden", () => {
    render(
      <AiAssistanceLevelPicker
        mode="settings"
        value="basic"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /^Aus\s/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Basis/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^Alltag/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Später entscheiden/i }),
    ).toBeNull();
  });

  it("calls onChange with the selected level", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AiAssistanceLevelPicker
        mode="settings"
        value="off"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Alltag/i }));
    expect(onChange).toHaveBeenCalledWith("everyday");
  });

  it("keeps locked Persoenlich out of onChange and calls onLockedClick", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onLockedClick = vi.fn();
    render(
      <AiAssistanceLevelPicker
        mode="settings"
        value="basic"
        onChange={onChange}
        onLockedClick={onLockedClick}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Persönlich/i }));
    expect(onChange).not.toHaveBeenCalled();
    expect(onLockedClick).toHaveBeenCalledTimes(1);
  });

  it("uses senior-size touch targets for level cards", () => {
    render(
      <AiAssistanceLevelPicker
        mode="settings"
        value="off"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /^Aus\s/i })).toHaveClass(
      "min-h-[80px]",
    );
  });

  it("can be disabled while saving", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AiAssistanceLevelPicker
        mode="settings"
        value="off"
        onChange={onChange}
        disabled
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Basis/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
