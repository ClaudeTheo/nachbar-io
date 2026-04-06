import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import YouthAdmin from "@/app/(app)/admin/components/YouthAdmin";

afterEach(cleanup);

// Mock sonner toast
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock lucide-react Icons — geben einfache SVG-Elemente zurueck
vi.mock("lucide-react", () => ({
  Users: (props: Record<string, unknown>) => <svg data-testid="icon-users" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="icon-clock" {...props} />,
  CheckCircle: (props: Record<string, unknown>) => <svg data-testid="icon-check" {...props} />,
  XCircle: (props: Record<string, unknown>) => <svg data-testid="icon-xcircle" {...props} />,
  Shield: (props: Record<string, unknown>) => <svg data-testid="icon-shield" {...props} />,
  RefreshCw: (props: Record<string, unknown>) => <svg data-testid="icon-refresh" {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => <svg data-testid="icon-alert" {...props} />,
}));

// Mock shadcn Select — rendert nur den Trigger-Text
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button className={className}>{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

// --- Mock-Daten (exakte API-Response-Form) ---
const mockData = {
  kpis: {
    totalProfiles: 12,
    consentsPending: 3,
    consentsGranted: 7,
    consentsRevoked: 2,
  },
  consents: [
    {
      id: "yp-001",
      user_id: "u-001",
      birth_year: 2011,
      created_at: "2026-04-01T10:00:00Z",
      users: { first_name: "Lena" },
      quarters: { name: "Oberer Rebberg" },
      youth_guardian_consents: [
        { status: "granted", granted_at: "2026-04-02T12:00:00Z", token_send_count: 1 },
      ],
    },
    {
      id: "yp-002",
      user_id: "u-002",
      birth_year: 2010,
      created_at: "2026-04-01T09:00:00Z",
      users: { first_name: "Tim" },
      quarters: { name: "Sanarystrasse" },
      youth_guardian_consents: [
        { status: "pending", granted_at: null, token_send_count: 2 },
      ],
    },
  ],
  moderation: {
    flaggedCount: 0,
    suspendedItems: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockData),
  });
});

describe("YouthAdmin", () => {
  it("rendert KPI-Karten mit korrekten Zahlen", async () => {
    render(<YouthAdmin />);

    await waitFor(() => {
      expect(screen.getByText("12")).toBeInTheDocument();
    });

    // KPI-Labels pruefen (koennen mehrfach vorkommen wegen Select-Optionen)
    expect(screen.getByText("Registriert")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getAllByText("Ausstehend").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getAllByText("Erteilt").length).toBeGreaterThanOrEqual(1);
    // "2" und "Widerrufen" auch mehrfach moeglich (KPI + Badge + Select)
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Widerrufen").length).toBeGreaterThanOrEqual(1);
  });

  it("rendert Consent-Eintraege mit Namen und Quartier", async () => {
    render(<YouthAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Lena")).toBeInTheDocument();
    });

    expect(screen.getByText("Oberer Rebberg")).toBeInTheDocument();
    expect(screen.getByText("Tim")).toBeInTheDocument();
    expect(screen.getByText("Sanarystrasse")).toBeInTheDocument();
  });

  it("zeigt Lade-Zustand initial", () => {
    // fetch bleibt pending — Promise wird nie aufgeloest
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { container } = render(<YouthAdmin />);

    // Komponente zeigt animate-spin RefreshCw Icon
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("zeigt Fehler-Zustand bei fehlgeschlagenem Fetch", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Fehler" }),
    });

    render(<YouthAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Keine Daten verfuegbar")).toBeInTheDocument();
    });
  });
});
