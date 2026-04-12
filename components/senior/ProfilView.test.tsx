// Nachbar.io — Tests for ProfilView (Senior Profile Page)
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProfilView } from "./ProfilView";

afterEach(() => cleanup());

describe("ProfilView", () => {
  it("shows the display name", () => {
    render(
      <ProfilView
        displayName="Maria Huber"
        avatarUrl={null}
        emergencyContacts={[]}
      />,
    );
    expect(screen.getByTestId("profil-name")).toHaveTextContent("Maria Huber");
  });

  it("renders emergency contacts with tel: links", () => {
    render(
      <ProfilView
        displayName="Maria Huber"
        avatarUrl={null}
        emergencyContacts={[
          {
            name: "Hans Huber",
            relationship: "Sohn",
            phone: "+49 170 1234567",
          },
          {
            name: "Lisa Meier",
            relationship: "Nachbarin",
            phone: "+49 171 9876543",
          },
        ]}
      />,
    );

    const cards = screen.getAllByTestId("profil-contact");
    expect(cards).toHaveLength(2);

    // First contact
    expect(cards[0]).toHaveTextContent("Hans Huber");
    expect(cards[0]).toHaveTextContent("Sohn");
    const link1 = cards[0].querySelector('a[href="tel:+49 170 1234567"]');
    expect(link1).toBeTruthy();

    // Second contact
    expect(cards[1]).toHaveTextContent("Lisa Meier");
    expect(cards[1]).toHaveTextContent("Nachbarin");
    const link2 = cards[1].querySelector('a[href="tel:+49 171 9876543"]');
    expect(link2).toBeTruthy();
  });

  it("shows empty state when no contacts", () => {
    render(
      <ProfilView
        displayName="Maria Huber"
        avatarUrl={null}
        emergencyContacts={[]}
      />,
    );
    expect(screen.getByTestId("profil-no-contacts")).toHaveTextContent(
      "Keine Kontakte hinterlegt",
    );
  });

  it("shows back link to /kreis-start", () => {
    render(
      <ProfilView
        displayName="Maria Huber"
        avatarUrl={null}
        emergencyContacts={[]}
      />,
    );
    const backLink = screen.getByRole("link", { name: /Zur.*ck/i });
    expect(backLink).toHaveAttribute("href", "/kreis-start");
  });
});
