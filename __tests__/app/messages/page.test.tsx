import { describe, it, expect, vi, afterEach } from "vitest";
import MessagesPage from "@/app/(app)/messages/page";

// Schritt 3 (Chat-Unify): /messages ist nur noch ein Redirect-Shim auf /chat.
// Die fruehere Listen-UI (Konversationen, Anfragen) lebt jetzt unter /chat.
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

describe("MessagesPage (Redirect-Shim)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("leitet auf die kanonische /chat-Liste um", () => {
    MessagesPage();
    expect(mockRedirect).toHaveBeenCalledWith("/chat");
  });
});
