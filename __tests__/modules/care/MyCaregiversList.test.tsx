// __tests__/modules/care/MyCaregiversList.test.tsx
// Welle S2 (C2:2): Der Senior sieht in "Mein Kreis" endlich seine verbundenen
// Angehoerigen — nicht mehr nur einen leeren Zustand.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MyCaregiversList } from "@/modules/care/components/senior/MyCaregiversList";

afterEach(cleanup);

const caregivers = [
  { id: "c1", display_name: "Maria Muster", avatar_url: null, relationship_type: "child" },
  { id: "c2", display_name: "Peter Muster", avatar_url: null, relationship_type: null },
];

describe("MyCaregiversList (S2/C2:2)", () => {
  it("zeigt jede verbundene Person mit Name und Beziehung", () => {
    render(<MyCaregiversList caregivers={caregivers} />);
    expect(screen.getByText("Maria Muster")).toBeInTheDocument();
    expect(screen.getByText("Kind")).toBeInTheDocument();
    expect(screen.getByText("Peter Muster")).toBeInTheDocument();
    expect(screen.getByText("In Ihrem Kreis")).toBeInTheDocument();
  });

  it("bietet pro Person einen Nachricht-Weg (56px Touch-Target)", () => {
    render(<MyCaregiversList caregivers={caregivers} />);
    const links = screen.getAllByRole("link", {
      name: /nachricht schreiben/i,
    });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/messages");
    expect(links[0].style.minHeight).toBe("56px");
  });
});
