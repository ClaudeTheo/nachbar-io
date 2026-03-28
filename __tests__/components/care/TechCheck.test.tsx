// __tests__/components/care/TechCheck.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TechCheck } from "@/modules/care/components/appointments/TechCheck";

// getUserMedia mocken
const mockGetUserMedia = vi.fn();
Object.defineProperty(navigator, "mediaDevices", {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
});

describe("TechCheck", () => {
  it("sollte drei Pruefschritte anzeigen", () => {
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });
    render(<TechCheck onReady={() => {}} onFailed={() => {}} />);
    expect(screen.getByText(/Kamera/)).toBeDefined();
    expect(screen.getByText(/Mikrofon/)).toBeDefined();
    expect(screen.getByText(/Internet/)).toBeDefined();
  });
});
