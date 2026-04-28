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

  it("Dialog ist per accessible name (SheetTitle) auffindbar", async () => {
    render(<KiHelpFaqSheet />);
    openSheet();
    const dialog = await screen.findByRole("dialog", {
      name: /Häufige Fragen zur KI-Hilfe/i,
    });
    expect(dialog).toBeInTheDocument();
  });

  it("Dialog hat eine accessible description", async () => {
    render(<KiHelpFaqSheet />);
    openSheet();
    const dialog = await screen.findByRole("dialog", {
      name: /Häufige Fragen zur KI-Hilfe/i,
    });
    expect(dialog).toHaveAccessibleDescription(
      /vordefinierte Fragen|fest geschriebene/i,
    );
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

  it("Accordion-Buttons haben aria-controls auf das jeweilige Panel", async () => {
    render(<KiHelpFaqSheet />);
    openSheet();
    const questionText = await screen.findByText("Was ist die KI-Hilfe?");
    const questionBtn = questionText.closest("button")!;
    const panelId = questionBtn.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(panelId).toMatch(/ki-help-faq-panel-what/);
  });

  it("expandiertes Panel hat passende id, role=region und aria-labelledby", async () => {
    render(<KiHelpFaqSheet />);
    openSheet();
    const questionText = await screen.findByText("Was ist die KI-Hilfe?");
    const questionBtn = questionText.closest("button")!;
    fireEvent.click(questionBtn);
    const panelId = questionBtn.getAttribute("aria-controls")!;
    const buttonId = questionBtn.getAttribute("id");
    expect(buttonId).toBeTruthy();
    const panel = document.getElementById(panelId);
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("role", "region");
    expect(panel).toHaveAttribute("aria-labelledby", buttonId);
  });

  it("alle 7 Accordion-Buttons haben unique aria-controls / id-Paare", async () => {
    render(<KiHelpFaqSheet />);
    openSheet();
    await screen.findByText("Was ist die KI-Hilfe?");
    const buttons = screen
      .getAllByRole("button")
      .filter((el) =>
        el.getAttribute("aria-controls")?.startsWith("ki-help-faq-panel-"),
      );
    expect(buttons).toHaveLength(7);
    const ids = buttons.map((b) => b.getAttribute("id"));
    const controls = buttons.map((b) => b.getAttribute("aria-controls"));
    expect(new Set(ids).size).toBe(7);
    expect(new Set(controls).size).toBe(7);
  });
});
