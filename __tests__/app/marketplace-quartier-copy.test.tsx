import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import MarketplacePage from "@/app/(app)/marketplace/page";
import MarketplaceNewPage from "@/app/(app)/marketplace/new/page";
import MarketplaceDetailPage from "@/app/(app)/marketplace/[id]/page";
import { QuickActions } from "@/components/dashboard/QuickActions";

const mockPush = vi.fn();
const mockFrom = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "item-1" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "viewer-1" } }),
}));

vi.mock("@/lib/quarters", () => ({
  useQuarter: () => ({
    currentQuarter: { id: "quarter-1", name: "Bad Säckingen" },
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/storage", () => ({
  uploadCategoryImage: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

vi.mock("@/lib/haptics", () => ({
  haptic: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "vor 1 Minute",
}));

vi.mock("date-fns/locale", () => ({
  de: {},
}));

vi.mock("@/components/moderation/GuidelinesAcceptance", () => ({
  GuidelinesGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ImageUpload", () => ({
  ImageUpload: () => <div data-testid="image-upload" />,
  UploadingOverlay: () => <div data-testid="uploading-overlay" />,
}));

function createTableMock(table: string) {
  if (table === "marketplace_items") {
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: async () => ({ data: [], error: null }),
          }),
          maybeSingle: async () => ({
            data: {
              id: "item-1",
              user_id: "owner-1",
              quarter_id: "quarter-1",
              type: "lend",
              category: "tools",
              title: "Bohrmaschine",
              description: "Kann am Wochenende ausgeliehen werden.",
              price: null,
              images: [],
              status: "active",
              created_at: "2026-04-25T10:00:00.000Z",
              user: { display_name: "Maria M.", avatar_url: null },
            },
            error: null,
          }),
        }),
      }),
    };
  }

  if (table === "conversations") {
    return {
      select: () => ({
        or: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: "conversation-1" }, error: null }),
        }),
      }),
    };
  }

  throw new Error(`Unexpected table mock: ${table}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockImplementation((table: string) => createTableMock(table));
});

afterEach(() => {
  cleanup();
});

describe("Quartier-Marktplatz Copy", () => {
  it("zeigt die Übersicht als lokalen Quartier-Marktplatz mit verständlichen Filtern und Beispielen", async () => {
    render(<MarketplacePage />);

    expect(screen.getAllByText("Quartier-Marktplatz").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText(/Ausleihen, verschenken, suchen oder verkaufen/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nur verifizierte Nachbarn im eigenen Quartier/i),
    ).toBeInTheDocument();

    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toEqual([
      "Alles",
      "Verschenken",
      "Verleihen",
      "Gesucht",
      "Verkaufen",
    ]);

    await waitFor(() => {
      expect(screen.getByText(/Bohrmaschine verleihen/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Leiter gesucht/i)).toBeInTheDocument();
    expect(screen.getByText(/Pflanzen verschenken/i)).toBeInTheDocument();
  });

  it("erklärt beim Erstellen Verkaufen und Verleihen seniorenfreundlich", () => {
    render(<MarketplaceNewPage />);

    expect(
      screen.getByText("Was möchten Sie im Quartier anbieten oder suchen?"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Verkaufen/i }));
    expect(
      screen.getByText(/Privatverkauf unter Nachbarn/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/keine gewerbliche Plattform/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Zurück/i }));
    fireEvent.click(screen.getByRole("button", { name: /Verleihen/i }));
    expect(
      screen.getByText(/Rückgabe und Pfand bitte direkt absprechen/i),
    ).toBeInTheDocument();
  });

  it("zeigt im Detail sicheren Kontakt per Nachbar.io statt öffentlicher Kontaktdaten", async () => {
    render(<MarketplaceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Bohrmaschine")).toBeInTheDocument();
    });

    expect(screen.getByText("Interesse per Nachricht zeigen")).toBeInTheDocument();
    expect(
      screen.getByText(/Telefonnummer und Adresse werden nicht öffentlich angezeigt/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Kontakt läuft über Nachbar.io/i),
    ).toBeInTheDocument();
  });

  it("positioniert den Dashboard-Schnellzugriff als Quartier-Marktplatz", () => {
    render(<QuickActions />);

    const marketplaceLink = screen.getByRole("link", {
      name: /Quartier-Markt/i,
    });
    expect(marketplaceLink).toHaveAttribute("href", "/marketplace");
    expect(marketplaceLink).toHaveTextContent("Leihen & Teilen");
  });
});
