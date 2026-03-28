import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { SpeakerAnimation } from "@/modules/voice/components/voice/SpeakerAnimation";

afterEach(() => {
  cleanup();
});

describe("SpeakerAnimation", () => {
  it("rendert Speaker-Icon", () => {
    const { getByTestId } = render(<SpeakerAnimation isPlaying={true} />);
    expect(getByTestId("speaker-animation")).toBeDefined();
  });

  it("hat animate-pulse Klasse wenn isPlaying=true", () => {
    const { getByTestId } = render(<SpeakerAnimation isPlaying={true} />);
    const el = getByTestId("speaker-animation");
    expect(el.className).toContain("animate-pulse");
  });

  it("hat keine animate-pulse Klasse wenn isPlaying=false", () => {
    const { getByTestId } = render(<SpeakerAnimation isPlaying={false} />);
    const el = getByTestId("speaker-animation");
    expect(el.className).not.toContain("animate-pulse");
  });
});
