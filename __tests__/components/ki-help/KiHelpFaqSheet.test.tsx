import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KiHelpFaqSheet } from "@/components/ki-help/KiHelpFaqSheet";

function openSheet() {
  const trigger = screen.getByRole("button", {
    name: /Hilfe zur KI-Hilfe öffnen/i,
  });
  fireEvent.click(trigger);
}

describe("KiHelpFaqSheet", () => {
  afterEach(() => cleanup());

  it("rendert den Pulse-Dot-Trigger als Button mit aria-label", () => {
    render(<KiHelpFaqSheet />);
    const trigger = screen.getByRole("button", {
      name: /Hilfe zur KI-Hilfe öffnen/i,
    });
    expect(trigger).toBeInTheDocument();
  });

  it("Sheet ist initial geschlossen (kein Header sichtbar)", () => {
    render(<KiHelpFaqSheet />);
    expect(
      screen.queryByText("Häufige Fragen zur KI-Hilfe"),
    ).not.toBeInTheDocument();
  });

  it("Click auf Trigger oeffnet das Sheet mit Header", async () => {
    render(<KiHelpFaqSheet />);
    openSheet();
    expect(
      await screen.findByText("Häufige Fragen zur KI-Hilfe"),
    ).toBeInTheDocument();
  });

  it("rendert alle 7 FAQ-Fragen", async () => {
    render(<KiHelpFaqSheet />);
    openSheet();
    expect(
      await screen.findByText("Was ist die KI-Hilfe?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Was kann sie später für mich tun?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ist die KI jetzt schon aktiv?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Was passiert mit meinen Daten?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Kann ich die KI später wieder ausschalten?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Was bedeutet Basis, Alltag und Persönlich?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Warum ist Persönlich noch gesperrt?"),
    ).toBeInTheDocument();
  });

  it("Antworten sind initial collapsed", async () => {
    render(<KiHelpFaqSheet />);
    openSheet();
    await screen.findByText("Was ist die KI-Hilfe?");
    expect(
      screen.queryByText(/Eine optionale Funktion, die Ihnen später/),
    ).not.toBeInTheDocument();
  });

  it("Click auf eine Frage expandiert genau diese Antwort", async () => {
    render(<KiHelpFaqSheet />);
    openSheet();
    const question = await screen.findByText("Was ist die KI-Hilfe?");
    fireEvent.click(question);
    expect(
      screen.getByText(/Eine optionale Funktion, die Ihnen später/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Nein\. Vor Ihrer Einwilligung passiert nichts/),
    ).not.toBeInTheDocument();
  });

  it("erneuter Click auf dieselbe Frage collapsed sie wieder", async () => {
    render(<KiHelpFaqSheet />);
    openSheet();
    const question = await screen.findByText("Was ist die KI-Hilfe?");
    fireEvent.click(question);
    fireEvent.click(question);
    expect(
      screen.queryByText(/Eine optionale Funktion, die Ihnen später/),
    ).not.toBeInTheDocument();
  });

  it("Click auf eine andere Frage schliesst die vorige (nur eine offen)", async () => {
    render(<KiHelpFaqSheet />);
    openSheet();
    const q1 = await screen.findByText("Was ist die KI-Hilfe?");
    fireEvent.click(q1);
    fireEvent.click(screen.getByText("Ist die KI jetzt schon aktiv?"));
    expect(
      screen.queryByText(/Eine optionale Funktion, die Ihnen später/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Nein\. Vor Ihrer Einwilligung passiert nichts/),
    ).toBeInTheDocument();
  });

  it("aria-expanded reflektiert offen/geschlossen-Status", async () => {
    render(<KiHelpFaqSheet />);
    openSheet();
    const questionText = await screen.findByText("Was ist die KI-Hilfe?");
    const questionBtn = questionText.closest("button");
    expect(questionBtn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(questionBtn!);
    expect(questionBtn).toHaveAttribute("aria-expanded", "true");
  });
});
