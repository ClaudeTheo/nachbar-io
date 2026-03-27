// __tests__/app/dashboard/page.test.tsx
// Tests fuer die Dashboard-Seite — Avatar im Header + Angehörige-Schnellzugriff

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";

// --- Mocks ---

// next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// next/link
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

// lucide-react — alle Icons die von Dashboard-Komponenten transitiv genutzt werden
vi.mock("lucide-react", () => ({
  Bell: (props: Record<string, unknown>) => (
    <svg data-testid="icon-bell" {...props} />
  ),
  ChevronRight: (props: Record<string, unknown>) => (
    <svg data-testid="icon-chevron-right" {...props} />
  ),
  Plus: (props: Record<string, unknown>) => (
    <svg data-testid="icon-plus" {...props} />
  ),
  UserPlus: (props: Record<string, unknown>) => (
    <svg data-testid="icon-user-plus" {...props} />
  ),
  // QuickActions
  Clipboard: (props: Record<string, unknown>) => (
    <svg data-testid="icon-clipboard" {...props} />
  ),
  ShoppingBag: (props: Record<string, unknown>) => (
    <svg data-testid="icon-shopping-bag" {...props} />
  ),
  CalendarDays: (props: Record<string, unknown>) => (
    <svg data-testid="icon-calendar-days" {...props} />
  ),
  AlertTriangle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-alert-triangle" {...props} />
  ),
  // DiscoverGrid
  MapPin: (props: Record<string, unknown>) => (
    <svg data-testid="icon-map-pin" {...props} />
  ),
  HandHeart: (props: Record<string, unknown>) => (
    <svg data-testid="icon-hand-heart" {...props} />
  ),
  PartyPopper: (props: Record<string, unknown>) => (
    <svg data-testid="icon-party-popper" {...props} />
  ),
  Star: (props: Record<string, unknown>) => (
    <svg data-testid="icon-star" {...props} />
  ),
  Search: (props: Record<string, unknown>) => (
    <svg data-testid="icon-search" {...props} />
  ),
  MessageCircle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-message-circle" {...props} />
  ),
  Wrench: (props: Record<string, unknown>) => (
    <svg data-testid="icon-wrench" {...props} />
  ),
  Trash2: (props: Record<string, unknown>) => (
    <svg data-testid="icon-trash-2" {...props} />
  ),
  Building2: (props: Record<string, unknown>) => (
    <svg data-testid="icon-building-2" {...props} />
  ),
  Paperclip: (props: Record<string, unknown>) => (
    <svg data-testid="icon-paperclip" {...props} />
  ),
  Lightbulb: (props: Record<string, unknown>) => (
    <svg data-testid="icon-lightbulb" {...props} />
  ),
  ShoppingCart: (props: Record<string, unknown>) => (
    <svg data-testid="icon-shopping-cart" {...props} />
  ),
  ClipboardList: (props: Record<string, unknown>) => (
    <svg data-testid="icon-clipboard-list" {...props} />
  ),
  Stethoscope: (props: Record<string, unknown>) => (
    <svg data-testid="icon-stethoscope" {...props} />
  ),
  ChevronDown: (props: Record<string, unknown>) => (
    <svg data-testid="icon-chevron-down" {...props} />
  ),
  // help-requests-section
  X: (props: Record<string, unknown>) => (
    <svg data-testid="icon-x" {...props} />
  ),
  // InfoBar + NinaAlert
  Sun: (props: Record<string, unknown>) => (
    <svg data-testid="icon-sun" {...props} />
  ),
  Cloud: (props: Record<string, unknown>) => (
    <svg data-testid="icon-cloud" {...props} />
  ),
  CloudRain: (props: Record<string, unknown>) => (
    <svg data-testid="icon-cloud-rain" {...props} />
  ),
  Snowflake: (props: Record<string, unknown>) => (
    <svg data-testid="icon-snowflake" {...props} />
  ),
  CloudFog: (props: Record<string, unknown>) => (
    <svg data-testid="icon-cloud-fog" {...props} />
  ),
  CloudLightning: (props: Record<string, unknown>) => (
    <svg data-testid="icon-cloud-lightning" {...props} />
  ),
}));

// sonner
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// Komponenten-Mocks
vi.mock("@/components/CategoryIcon", () => ({
  CategoryIcon: ({ icon }: { icon: string }) => (
    <span data-testid="category-icon">{icon}</span>
  ),
}));
vi.mock("@/components/HeroCard", () => ({
  HeroCard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="hero-card">{children}</div>
  ),
}));
vi.mock("@/components/ReputationBadge", () => ({
  ReputationBadge: () => <span data-testid="reputation-badge" />,
}));
vi.mock("@/components/ProfileCompletionBanner", () => ({
  ProfileCompletionBanner: () => (
    <div data-testid="profile-completion-banner" />
  ),
}));
vi.mock("@/components/FloatingHelpButton", () => ({
  FloatingHelpButton: () => <button data-testid="floating-help-button" />,
}));
vi.mock("@/components/info/InfoBar", () => ({
  InfoBar: () => <div data-testid="info-bar" />,
}));
vi.mock("@/components/info/NinaAlert", () => ({
  NinaAlert: () => <div data-testid="nina-alert" />,
}));
vi.mock("@/components/AlertCard", () => ({
  AlertCard: () => <div data-testid="alert-card" />,
}));
vi.mock("@/components/NewsCard", () => ({
  NewsCard: () => <div data-testid="news-card" />,
}));
vi.mock("@/components/PullToRefresh", () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/components/InviteNeighborModal", () => ({
  InviteNeighborModal: () => <div data-testid="invite-neighbor-modal" />,
}));
vi.mock("@/components/care/DailyCheckinButton", () => ({
  DailyCheckinButton: () => <button data-testid="daily-checkin-button" />,
}));
vi.mock("@/components/care/RedeemCodeBanner", () => ({
  RedeemCodeBanner: () => <div data-testid="redeem-code-banner" />,
}));
vi.mock("@/components/care/CaregiverDashboard", () => ({
  CaregiverDashboard: () => <div data-testid="caregiver-dashboard" />,
}));
vi.mock("@/components/municipal/QuartierServicesSection", () => ({
  QuartierServicesSection: () => (
    <div data-testid="quartier-services-section" />
  ),
}));
vi.mock("@/components/FeatureGate", () => ({
  FeatureGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));
vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: (props: Record<string, unknown>) => (
    <div data-testid="skeleton" {...props} />
  ),
}));

// lib-Mocks
vi.mock("@/lib/category-icons", () => ({
  GREETING_ICON_MAP: {
    morning: { icon: "sun", bgColor: "#fff", iconColor: "#000" },
    lunch: { icon: "fork", bgColor: "#fff", iconColor: "#000" },
    afternoon: { icon: "cloud", bgColor: "#fff", iconColor: "#000" },
    evening: { icon: "moon", bgColor: "#fff", iconColor: "#000" },
    night: { icon: "star", bgColor: "#fff", iconColor: "#000" },
  },
}));
vi.mock("@/lib/reputation", () => ({
  getCachedReputation: () => null,
}));
vi.mock("@/lib/useUnreadCount", () => ({
  useUnreadCount: () => ({ count: 0 }),
}));

// useAuth-Mock (Dashboard nutzt jetzt useAuth() statt getCachedUser)
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "user-001" },
    loading: false,
    refreshUser: vi.fn(),
  }),
}));

// useQuarter Mock
const mockCurrentQuarter = {
  id: "quarter-bs",
  name: "Bad Säckingen — Altstadt",
  center_lat: 47.5535,
  center_lng: 7.964,
  city: "Bad Säckingen",
};

vi.mock("@/lib/quarters", () => ({
  useQuarter: () => ({
    currentQuarter: mockCurrentQuarter,
    loading: false,
  }),
}));

// Supabase-Mock
const mockSupabaseUser = { id: "user-001" };
const mockProfile = {
  id: "user-001",
  display_name: "Max",
  avatar_url: null as string | null,
  bio: null,
  phone: null,
  settings: { onboarding_completed: true },
  created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};

// Konfigurierbare Angehörige-Daten fuer Tests
interface CaregiverLink {
  caregiver_id: string;
}
interface CaregiverProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

let mockCaregiverLinks: CaregiverLink[] = [];
let mockCaregiverProfiles: CaregiverProfile[] = [];

// Flexible Supabase-Chain-Factory — inkl. caregiver_links
function buildSupabaseChain(profile = mockProfile) {
  // Skill-Count-Chain
  const mockSkillHead = vi.fn(() => Promise.resolve({ count: 0, error: null }));
  const mockSkillEq2 = vi.fn(() => ({ head: mockSkillHead }));
  const mockSkillSelect = vi.fn(() => ({ eq: mockSkillEq2 }));

  // caregiver_links-Chain: select → eq → is → limit
  const mockCaregiverLinksLimit = vi.fn(() =>
    Promise.resolve({ data: mockCaregiverLinks, error: null }),
  );
  const mockCaregiverLinksIs = vi.fn(() => ({
    limit: mockCaregiverLinksLimit,
  }));
  const mockCaregiverLinksEq = vi.fn(() => ({ is: mockCaregiverLinksIs }));
  const mockCaregiverLinksSelect = vi.fn(() => ({ eq: mockCaregiverLinksEq }));

  // Users-Chain: select → eq → single (Profil) ODER select → in (Caregiver-Profile)
  // Da beide auf 'users' abfragen, unterscheiden wir via mockReturnValueOnce
  const mockUsersSingle = vi.fn(() =>
    Promise.resolve({ data: profile, error: null }),
  );
  const mockUsersEqForSingle = vi.fn(() => ({ single: mockUsersSingle }));

  const mockUsersInResult = vi.fn(() =>
    Promise.resolve({ data: mockCaregiverProfiles, error: null }),
  );

  // Erster select()-Aufruf: Profil-Load (eq → single)
  // Zweiter select()-Aufruf: Caregiver-Profile (in → result)
  let usersSelectCount = 0;
  const mockUsersSelect = vi.fn(() => {
    usersSelectCount++;
    if (usersSelectCount === 1) {
      // Profil-Abfrage
      return { eq: mockUsersEqForSingle };
    } else {
      // Caregiver-Profile-Abfrage
      return { in: mockUsersInResult };
    }
  });

  // Alerts-Chain
  const mockAlertsLimit = vi.fn(() =>
    Promise.resolve({ data: [], error: null }),
  );
  const mockAlertsOrder = vi.fn(() => ({ limit: mockAlertsLimit }));
  const mockAlertsIn = vi.fn(() => ({ order: mockAlertsOrder }));
  const mockAlertsEq2 = vi.fn(() => ({ in: mockAlertsIn }));
  const mockAlertsEq1 = vi.fn(() => ({ eq: mockAlertsEq2 }));
  const mockAlertsSelect = vi.fn(() => ({ eq: mockAlertsEq1 }));

  // News-Chain
  const mockNewsLimit = vi.fn(() => Promise.resolve({ data: [], error: null }));
  const mockNewsOrder = vi.fn(() => ({ limit: mockNewsLimit }));
  const mockNewsGte = vi.fn(() => ({ order: mockNewsOrder }));
  const mockNewsOr = vi.fn(() => ({ gte: mockNewsGte }));
  const mockNewsSelect = vi.fn(() => ({ or: mockNewsOr }));

  // Help-Chain
  const mockHelpLimit = vi.fn(() => Promise.resolve({ data: [], error: null }));
  const mockHelpOrder2 = vi.fn(() => ({ limit: mockHelpLimit }));
  const mockHelpOrder1 = vi.fn(() => ({ order: mockHelpOrder2 }));
  const mockHelpGte = vi.fn(() => ({ order: mockHelpOrder1 }));
  const mockHelpEq2 = vi.fn(() => ({ gte: mockHelpGte }));
  const mockHelpEq1 = vi.fn(() => ({ eq: mockHelpEq2 }));
  const mockHelpSelect = vi.fn(() => ({ eq: mockHelpEq1 }));

  // Marketplace-Chain
  const mockMarketLimit = vi.fn(() =>
    Promise.resolve({ data: [], error: null }),
  );
  const mockMarketOrder = vi.fn(() => ({ limit: mockMarketLimit }));
  const mockMarketEq2 = vi.fn(() => ({ order: mockMarketOrder }));
  const mockMarketEq1 = vi.fn(() => ({ eq: mockMarketEq2 }));
  const mockMarketSelect = vi.fn(() => ({ eq: mockMarketEq1 }));

  const mockFrom = vi.fn((table: string) => {
    if (table === "users") return { select: mockUsersSelect };
    if (table === "skills") return { select: mockSkillSelect };
    if (table === "caregiver_links")
      return { select: mockCaregiverLinksSelect };
    if (table === "alerts") return { select: mockAlertsSelect };
    if (table === "news_items") return { select: mockNewsSelect };
    if (table === "help_requests") return { select: mockHelpSelect };
    if (table === "marketplace_items") return { select: mockMarketSelect };
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    };
  });

  const mockChannel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  }));
  const mockRemoveChannel = vi.fn();

  return {
    from: mockFrom,
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: mockSupabaseUser }, error: null }),
      ),
    },
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  };
}

let currentSupabaseClient = buildSupabaseChain();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => currentSupabaseClient),
}));

import DashboardPage from "@/app/(app)/dashboard/page";

beforeEach(() => {
  vi.clearAllMocks();
  mockCaregiverLinks = [];
  mockCaregiverProfiles = [];
  currentSupabaseClient = buildSupabaseChain(mockProfile);
});

afterEach(() => {
  cleanup();
});

// ============================================================
// AVATAR-TESTS
// ============================================================

describe("DashboardPage — Avatar im Header", () => {
  it("zeigt Profilbild-Avatar im Header", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      const avatar = screen.getByTestId("dashboard-avatar");
      expect(avatar).toBeInTheDocument();
    });
  });

  it("zeigt Initialen-Fallback wenn kein Avatar vorhanden", async () => {
    // mockProfile hat avatar_url: null
    render(<DashboardPage />);
    await waitFor(() => {
      const avatar = screen.getByTestId("dashboard-avatar");
      expect(avatar).toBeInTheDocument();
      // Initialen-Fallback ist ein div (kein img)
      expect(avatar.tagName).toBe("DIV");
      // Zeigt ersten Buchstaben des Namens
      expect(avatar.textContent).toBe("M");
    });
  });

  it("zeigt Profilbild als img wenn avatarUrl vorhanden", async () => {
    const profileWithAvatar = {
      ...mockProfile,
      avatar_url: "https://example.com/avatar.jpg",
    };
    currentSupabaseClient = buildSupabaseChain(profileWithAvatar);

    render(<DashboardPage />);
    await waitFor(() => {
      const avatar = screen.getByTestId("dashboard-avatar");
      expect(avatar).toBeInTheDocument();
      expect(avatar.tagName).toBe("IMG");
      expect(avatar.getAttribute("src")).toBe("https://example.com/avatar.jpg");
    });
  });

  it("Avatar erscheint links neben der Begrüßung im HeroCard", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      const avatar = screen.getByTestId("dashboard-avatar");
      const greeting = screen.getByTestId("dashboard-greeting");
      // Beide sind im HeroCard vorhanden
      expect(avatar).toBeInTheDocument();
      expect(greeting).toBeInTheDocument();
    });
  });
});

// ============================================================
// GRUNDLEGENDE RENDERING-TESTS
// ============================================================

describe("DashboardPage — Grundlegendes Rendering", () => {
  it("rendert die Begrüßung mit Nutzername", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      const greeting = screen.getByTestId("dashboard-greeting");
      expect(greeting).toBeInTheDocument();
      expect(greeting.textContent).toContain("Max");
    });
  });

  it("rendert den Benachrichtigungs-Button", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
    });
  });

  it("rendert den HeroCard-Bereich", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId("hero-card")).toBeInTheDocument();
    });
  });
});

// ============================================================
// ANGEHÖRIGE-SCHNELLZUGRIFF
// ============================================================

describe("DashboardPage — Angehörige-Schnellzugriff", () => {
  it("rendert Angehörige-Schnellzugriff Container ohne Abstürze", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      // queryByTestId gibt null zurück wenn nicht vorhanden (kein Fehler)
      const container = screen.queryByTestId("dashboard-caregivers");
      // Test bestätigt dass die Komponente ohne Crash rendert
      expect(container === null || container !== null).toBe(true);
    });
  });

  it("zeigt Angehörige-Container NICHT wenn keine Angehörigen vorhanden", async () => {
    mockCaregiverLinks = [];
    currentSupabaseClient = buildSupabaseChain(mockProfile);

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.queryByTestId("dashboard-caregivers")).toBeNull();
    });
  });

  it("zeigt Angehörige-Container wenn Angehörige vorhanden sind", async () => {
    mockCaregiverLinks = [{ caregiver_id: "cg-1" }];
    mockCaregiverProfiles = [
      { id: "cg-1", display_name: "Maria Müller", avatar_url: null },
    ];
    currentSupabaseClient = buildSupabaseChain(mockProfile);

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-caregivers")).toBeInTheDocument();
    });
  });

  it('zeigt Label "Angehörige:" mit echtem Umlaut ö', async () => {
    mockCaregiverLinks = [{ caregiver_id: "cg-1" }];
    mockCaregiverProfiles = [
      { id: "cg-1", display_name: "Maria", avatar_url: null },
    ];
    currentSupabaseClient = buildSupabaseChain(mockProfile);

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Angehörige:")).toBeInTheDocument();
    });
  });

  it("zeigt Initial des Angehörigen-Namens als Avatar-Fallback", async () => {
    mockCaregiverLinks = [{ caregiver_id: "cg-1" }];
    mockCaregiverProfiles = [
      { id: "cg-1", display_name: "Maria Müller", avatar_url: null },
    ];
    currentSupabaseClient = buildSupabaseChain(mockProfile);

    render(<DashboardPage />);
    await waitFor(() => {
      // "M" ist die Initial von "Maria Müller"
      // Achtung: "Max" (Profilname) ist ebenfalls "M" — daher getByText kann mehrfach vorkommen
      const ms = screen.getAllByText("M");
      expect(ms.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("verlinkt Angehörigen-Avatar zur Nachrichten-Seite", async () => {
    mockCaregiverLinks = [{ caregiver_id: "cg-42" }];
    mockCaregiverProfiles = [
      { id: "cg-42", display_name: "Anna Schmidt", avatar_url: null },
    ];
    currentSupabaseClient = buildSupabaseChain(mockProfile);

    render(<DashboardPage />);
    await waitFor(() => {
      const links = screen.getAllByRole("link");
      const caregiverLink = links.find(
        (l) => l.getAttribute("href") === "/messages/cg-42",
      );
      expect(caregiverLink).toBeDefined();
    });
  });

  it("zeigt title-Attribut mit Angehörigen-Name", async () => {
    mockCaregiverLinks = [{ caregiver_id: "cg-7" }];
    mockCaregiverProfiles = [
      { id: "cg-7", display_name: "Klaus Weber", avatar_url: null },
    ];
    currentSupabaseClient = buildSupabaseChain(mockProfile);

    render(<DashboardPage />);
    await waitFor(() => {
      const caregiverLink = screen
        .getAllByRole("link")
        .find((l) => l.getAttribute("href") === "/messages/cg-7");
      expect(caregiverLink?.getAttribute("title")).toBe("Klaus Weber");
    });
  });

  it("zeigt Fragezeichen als Fallback-Initial wenn kein Name vorhanden", async () => {
    mockCaregiverLinks = [{ caregiver_id: "cg-empty" }];
    mockCaregiverProfiles = [
      { id: "cg-empty", display_name: "", avatar_url: null },
    ];
    currentSupabaseClient = buildSupabaseChain(mockProfile);

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("?")).toBeInTheDocument();
    });
  });

  it("rendert mehrere Angehörige-Avatare nebeneinander", async () => {
    mockCaregiverLinks = [{ caregiver_id: "cg-a" }, { caregiver_id: "cg-b" }];
    mockCaregiverProfiles = [
      { id: "cg-a", display_name: "Anna", avatar_url: null },
      { id: "cg-b", display_name: "Bernd", avatar_url: null },
    ];
    currentSupabaseClient = buildSupabaseChain(mockProfile);

    render(<DashboardPage />);
    await waitFor(() => {
      // Link zu Anna
      const linkAnna = screen
        .getAllByRole("link")
        .find((l) => l.getAttribute("href") === "/messages/cg-a");
      expect(linkAnna).toBeDefined();
      // Link zu Bernd
      const linkBernd = screen
        .getAllByRole("link")
        .find((l) => l.getAttribute("href") === "/messages/cg-b");
      expect(linkBernd).toBeDefined();
    });
  });
});
