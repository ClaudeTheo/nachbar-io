import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach } from "vitest";
import { CompensationSelector } from "@/modules/hilfe/components/CompensationSelector";

afterEach(() => {
  cleanup();
});

describe("CompensationSelector", () => {
  it("zeigt sichere Optionen und den Pflicht-Hinweis", () => {
    render(
      <CompensationSelector
        value={{ recognition_type: "free", suggested_recognition_cents: null }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Freiwillige Anerkennung")).toBeInTheDocument();
    expect(screen.getByText("Kostenlos / freiwillig")).toBeInTheDocument();
    expect(screen.getByText("Kleines Dankeschön")).toBeInTheDocument();
    expect(screen.getByText("Unverbindlicher Wunschbetrag")).toBeInTheDocument();
    expect(screen.getByText("Privat klären")).toBeInTheDocument();
    expect(screen.getByText(/nimmt keine Zahlungen entgegen/i)).toBeInTheDocument();
  });

  it("zeigt Betragsfeld nur bei Wunschbetrag", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CompensationSelector
        value={{ recognition_type: "free", suggested_recognition_cents: null }}
        onChange={onChange}
      />,
    );

    expect(screen.queryByLabelText(/Wunschbetrag in Euro/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Unverbindlicher Wunschbetrag/i }));

    expect(onChange).toHaveBeenCalledWith({
      recognition_type: "suggested_amount",
      suggested_recognition_cents: null,
    });
  });

  it("meldet Cent-Werte bei Eingabe", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CompensationSelector
        value={{ recognition_type: "suggested_amount", suggested_recognition_cents: null }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Wunschbetrag in Euro/i), {
      target: { value: "10,50" },
    });

    expect(onChange).toHaveBeenLastCalledWith({
      recognition_type: "suggested_amount",
      suggested_recognition_cents: 1050,
    });
  });
});
