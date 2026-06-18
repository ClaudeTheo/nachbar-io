import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { AutoAnswerCountdown } from "@/components/video/AutoAnswerCountdown";

describe("AutoAnswerCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("zeigt den Countdown und nimmt nach Ablauf genau einmal automatisch an", () => {
    const onAutoAnswer = vi.fn();
    const onCancel = vi.fn();
    render(
      <AutoAnswerCountdown
        callerName="Lisa"
        seconds={3}
        onAutoAnswer={onAutoAnswer}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByTestId("auto-answer-countdown-text")).toHaveTextContent("3");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onAutoAnswer).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("Ablehnen bricht ab und verhindert die Auto-Annahme", () => {
    const onAutoAnswer = vi.fn();
    const onCancel = vi.fn();
    render(
      <AutoAnswerCountdown
        callerName="Lisa"
        seconds={5}
        onAutoAnswer={onAutoAnswer}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByTestId("auto-answer-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(onAutoAnswer).not.toHaveBeenCalled();
  });
});
