// __tests__/modules/care/MyCaregiversList.test.tsx
// Welle S2 (C2:2): Der Senior sieht in "Mein Kreis" seine verbundenen
// Angehoerigen. (C2:1): Der "Nachricht"-Button loest die Konversation auf und
// oeffnet /chat — er ist kein toter /messages-Link mehr.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

import { MyCaregiversList } from "@/modules/care/components/senior/MyCaregiversList";

afterEach(() => {
  cleanup();
  pushMock.mockClear();
});

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

  it("bietet pro Person einen Nachricht-Button (56px Touch-Target)", () => {
    render(<MyCaregiversList caregivers={caregivers} />);
    const buttons = screen.getAllByRole("button", {
      name: /nachricht schreiben/i,
    });
    expect(buttons).toHaveLength(2);
    expect(buttons[0].style.minHeight).toBe("56px");
  });

  it("bietet pro Person einen Anrufen-Button (56px Touch-Target)", () => {
    render(<MyCaregiversList caregivers={caregivers} />);
    const buttons = screen.getAllByRole("button", { name: /anrufen/i });
    expect(buttons).toHaveLength(2);
    expect(buttons[0].style.minHeight).toBe("56px");
  });

  it("navigiert beim Anrufen auf /call/<id> der jeweiligen Person", () => {
    render(<MyCaregiversList caregivers={caregivers} />);
    fireEvent.click(
      screen.getByRole("button", { name: /maria muster anrufen/i }),
    );
    expect(pushMock).toHaveBeenCalledWith("/call/c1");
  });
});
