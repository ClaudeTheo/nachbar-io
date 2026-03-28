import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StreamingTextDisplay } from "@/modules/voice/components/companion/StreamingTextDisplay";

describe("StreamingTextDisplay", () => {
  it("zeigt Text progressiv an", () => {
    const { rerender } = render(
      <StreamingTextDisplay text="Hallo" isStreaming={true} />,
    );
    expect(screen.getByText("Hallo")).toBeInTheDocument();

    rerender(<StreamingTextDisplay text="Hallo Welt" isStreaming={true} />);
    expect(screen.getByText("Hallo Welt")).toBeInTheDocument();
  });

  it("zeigt blinkenden Cursor waehrend Streaming", () => {
    const { container } = render(
      <StreamingTextDisplay text="Test" isStreaming={true} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("versteckt Cursor nach Streaming-Ende", () => {
    const { container } = render(
      <StreamingTextDisplay text="Fertig" isStreaming={false} />,
    );
    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });

  it("rendert leeren Text ohne Fehler", () => {
    const { container } = render(
      <StreamingTextDisplay text="" isStreaming={true} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});
