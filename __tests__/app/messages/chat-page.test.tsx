import { describe, it, expect, vi, afterEach } from "vitest";
import MessagesIdRedirect from "@/app/(app)/messages/[id]/page";

// Schritt 3 (Chat-Unify): /messages/[id] ist nur noch ein Redirect-Shim auf
// /chat/[id] (medienfaehiger Detail-View). Async params (Next 16).
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

describe("MessagesIdRedirect (Redirect-Shim)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("leitet auf /chat/<id> um", async () => {
    await MessagesIdRedirect({ params: Promise.resolve({ id: "conv-123" }) });
    expect(mockRedirect).toHaveBeenCalledWith("/chat/conv-123");
  });
});
