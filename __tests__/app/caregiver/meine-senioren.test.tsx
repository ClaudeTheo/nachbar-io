import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

vi.mock("lucide-react", () => ({
  ArrowRight: (props: Record<string, unknown>) => <svg {...props} />,
  Users: (props: Record<string, unknown>) => <svg {...props} />,
  UserPlus: (props: Record<string, unknown>) => <svg {...props} />,
  ShieldCheck: (props: Record<string, unknown>) => <svg {...props} />,
  UserCog: (props: Record<string, unknown>) => <svg {...props} />,
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle }: { title: React.ReactNode; subtitle?: string }) => (
    <header>
      <div>{title}</div>
      {subtitle && <p>{subtitle}</p>}
    </header>
  ),
}));

vi.mock("@/lib/care/hooks/useAssignedSeniors", () => ({
  useAssignedSeniors: () => ({
    loading: false,
    error: null,
    helperRole: "relative",
    seniors: [
      {
        id: "senior-1",
        display_name: "Erika",
        avatar_url: null,
        setup_origin: "family_qr",
        consent_status: "pending_senior_confirm",
        profile_edit_allowed: true,
        sensitive_data_allowed: false,
      },
    ],
  }),
}));

vi.mock("@/lib/leistungen/use-teaser-state", () => ({
  useLeistungenTeaserState: () => ({ ready: true, show: false, hasPlus: false }),
}));

describe("Meine Senioren", () => {
  afterEach(cleanup);

  it("shows setup and consent status for linked seniors", async () => {
    const Page = (await import("@/app/(app)/care/meine-senioren/page")).default;

    render(<Page />);

    expect(screen.getByText("Erika")).toBeInTheDocument();
    expect(screen.getByText("Einrichtung per QR")).toBeInTheDocument();
    expect(
      screen.getByText(/Senior muss sensible Daten noch freigeben/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Daten pflegen/i })).toHaveAttribute(
      "href",
      "/care/meine-senioren/senior-1/edit",
    );
  });
});
