import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LocationConsentDialog } from "@/modules/alerts/components/LocationConsentDialog";

afterEach(() => {
  cleanup();
});

describe("LocationConsentDialog", () => {
  it("zeigt Erklärungstext und zwei Buttons", () => {
    render(<LocationConsentDialog onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByText(/Standort bei Hilferufen teilen/)).toBeTruthy();
    expect(screen.getByText(/Ja, Standort teilen/)).toBeTruthy();
    expect(screen.getByText(/Nein, danke/)).toBeTruthy();
  });

  it("ruft onAccept bei Zustimmung", () => {
    const onAccept = vi.fn();
    render(<LocationConsentDialog onAccept={onAccept} onDecline={vi.fn()} />);
    fireEvent.click(screen.getByText(/Ja, Standort teilen/));
    expect(onAccept).toHaveBeenCalled();
  });

  it("ruft onDecline bei Ablehnung", () => {
    const onDecline = vi.fn();
    render(<LocationConsentDialog onAccept={vi.fn()} onDecline={onDecline} />);
    fireEvent.click(screen.getByText(/Nein, danke/));
    expect(onDecline).toHaveBeenCalled();
  });

  it("enthält MDR-Abgrenzungshinweis", () => {
    render(<LocationConsentDialog onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByText(/ersetzt nicht den Notruf 112/)).toBeTruthy();
  });
});
