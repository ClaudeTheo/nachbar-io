// __tests__/app/senior/familienkreis.test.tsx
// Welle F2 (Befund C2:2/C2:4): "Mein Kreis" in der Senior-Shell. Die zentrale
// kreis-start-Kachel fuehrte bisher auf /mein-kreis in der (app)-Shell (kein
// 80px-Zwang, kein 112-Footer). /familienkreis rendert die Gegenrichtung in der
// (senior)-Shell mit 80px-Aktionen.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const useMyCaregiversMock = vi.fn();
vi.mock("@/modules/care/hooks/useMyCaregivers", () => ({
  useMyCaregivers: () => useMyCaregiversMock(),
}));

import SeniorFamilienkreisPage from "@/app/(senior)/familienkreis/page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Senior /familienkreis — Mein Kreis in der Senior-Shell (C2:2/C2:4)", () => {
  it("zeigt verbundene Angehoerige mit 80px-Aktionen", () => {
    useMyCaregiversMock.mockReturnValue({
      caregivers: [
        {
          id: "c1",
          display_name: "Maria Muster",
          avatar_url: null,
          relationship_type: "child",
        },
      ],
      loading: false,
      error: null,
    });

    render(<SeniorFamilienkreisPage />);

    expect(screen.getByText("Maria Muster")).toBeInTheDocument();
    const anrufen = screen.getByRole("button", { name: /maria muster anrufen/i });
    expect(anrufen.style.minHeight).toBe("80px");
  });

  it("bietet einen Zurueck-Weg zur Startseite", () => {
    useMyCaregiversMock.mockReturnValue({
      caregivers: [],
      loading: false,
      error: null,
    });

    render(<SeniorFamilienkreisPage />);

    const back = screen.getByRole("link", { name: /startseite/i });
    expect(back.getAttribute("href")).toBe("/kreis-start");
  });

  it("zeigt einen freundlichen Leerzustand, wenn niemand verbunden ist", () => {
    useMyCaregiversMock.mockReturnValue({
      caregivers: [],
      loading: false,
      error: null,
    });

    render(<SeniorFamilienkreisPage />);

    expect(screen.getByText(/noch niemand in ihrem kreis/i)).toBeInTheDocument();
  });
});
