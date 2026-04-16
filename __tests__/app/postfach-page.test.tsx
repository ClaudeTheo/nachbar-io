import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { CitizenPostfachThread } from "@/lib/civic/threads";

class RedirectError extends Error {
  constructor(public path: string) {
    super(`NEXT_REDIRECT:${path}`);
  }
}

let mockUser: { id: string } | null = null;
let mockThreads: CitizenPostfachThread[] = [];

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectError(path);
  }),
}));

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

vi.mock("date-fns", () => ({
  format: () => "16.04.2026",
}));

vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Icon.displayName = `Icon_${name}`;
    return Icon;
  };

  return {
    Mail: icon("mail"),
    ArrowRight: icon("arrow-right"),
    MessageSquareReply: icon("message-square-reply"),
    Plus: icon("plus"),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockUser } })),
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({}) as object),
}));

vi.mock("@/lib/civic/threads", () => ({
  listCitizenPostfachThreads: vi.fn(async () => mockThreads),
}));

async function renderPage() {
  const mod = await import("@/app/(app)/postfach/page");
  const Page = mod.default;
  const ui = await Page();
  return render(ui);
}

describe("PostfachPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    cleanup();
    mockUser = { id: "citizen-1" };
    mockThreads = [];
  });

  it("leitet ohne Auth nach /login weiter", async () => {
    mockUser = null;

    try {
      await renderPage();
    } catch (error) {
      expect(error).toBeInstanceOf(RedirectError);
      expect((error as RedirectError).path).toBe("/login");
      return;
    }

    throw new Error("Page did not redirect");
  });

  it("rendert Threads inklusive Unread-Hinweis", async () => {
    mockThreads = [
      {
        id: "thread-1",
        subject: "Laterne defekt",
        status: "sent",
        created_at: "2026-04-16T08:00:00.000Z",
        org_name: "Stadt Bad Saeckingen",
        has_reply: true,
        unread_count: 2,
      },
    ];

    await renderPage();

    expect(screen.getByText("Laterne defekt")).toBeInTheDocument();
    expect(screen.getByText("Stadt Bad Saeckingen")).toBeInTheDocument();
    expect(screen.getByTestId("postfach-unread-badge")).toHaveTextContent(
      "2 neue Antworten",
    );
  });
});
