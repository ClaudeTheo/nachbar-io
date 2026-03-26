import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import AccountLoeschenPage from "@/app/account-loeschen/page";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AccountLoeschenPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("rendert die Seite mit Titel und E-Mail-Feld", () => {
    render(<AccountLoeschenPage />);
    expect(screen.getByText("Konto löschen")).toBeTruthy();
    expect(screen.getByLabelText(/E-Mail-Adresse/)).toBeTruthy();
    expect(screen.getByText("Bestätigungscode anfordern")).toBeTruthy();
  });

  it("zeigt Warnung zu unwiderruflicher Loeschung", () => {
    render(<AccountLoeschenPage />);
    expect(
      screen.getByText(/Diese Aktion kann nicht rückgängig gemacht werden/),
    ).toBeTruthy();
    expect(screen.getByText(/30 Tagen unwiderruflich gelöscht/)).toBeTruthy();
  });

  it("zeigt DSGVO-Hinweis", () => {
    render(<AccountLoeschenPage />);
    expect(screen.getByText(/DSGVO Art. 17/)).toBeTruthy();
  });

  it("zeigt Support-E-Mail", () => {
    render(<AccountLoeschenPage />);
    expect(screen.getByText("support@quartierapp.de")).toBeTruthy();
  });

  it("zeigt Footer-Links zu Datenschutz, Impressum, Support", () => {
    render(<AccountLoeschenPage />);
    expect(screen.getByText("Datenschutz")).toBeTruthy();
    expect(screen.getByText("Impressum")).toBeTruthy();
    expect(screen.getByText("Support")).toBeTruthy();
  });

  it("Button ist disabled wenn E-Mail leer ist", () => {
    render(<AccountLoeschenPage />);
    const button = screen.getByText("Bestätigungscode anfordern");
    expect(button.hasAttribute("disabled")).toBe(true);
  });
});
