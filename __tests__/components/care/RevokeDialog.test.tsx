import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RevokeDialog } from "@/modules/care/components/caregiver/RevokeDialog";

afterEach(cleanup);

describe("RevokeDialog", () => {
  it("zeigt Feature-Label", () => {
    render(
      <RevokeDialog
        featureLabel="Medikamenten-Verwaltung"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/Medikamenten-Verwaltung/)).toBeInTheDocument();
  });

  it('ruft onConfirm(false) bei "Nur deaktivieren"', () => {
    const onConfirm = vi.fn();
    render(
      <RevokeDialog
        featureLabel="Test"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Nur deaktivieren"));
    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it('zeigt Bestaetigung bei "Daten loeschen"', () => {
    render(
      <RevokeDialog
        featureLabel="Test"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Deaktivieren und Daten löschen"));
    expect(screen.getByText("Endgültig löschen?")).toBeInTheDocument();
  });

  it("ruft onCancel auf", () => {
    const onCancel = vi.fn();
    render(
      <RevokeDialog
        featureLabel="Test"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText("Abbrechen"));
    expect(onCancel).toHaveBeenCalled();
  });
});
