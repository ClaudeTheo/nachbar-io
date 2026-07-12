// __tests__/app/profile/ui-mode-youth-sticky.test.tsx
// Youth-Modus ist per Mig-198-Trigger sticky: ein Client-Update auf users.ui_mode
// laeuft OHNE Fehler durch, der Trigger setzt NEW.ui_mode aber auf "youth" zurueck.
// Die Profil-Seite darf den Wechsel dann NICHT als Erfolg behandeln:
// 1. Youth-Account (kein Admin) → Modus-Karten gesperrt + ruhiger Hinweis
// 2. Persistierter Modus weicht ab → Hinweis anzeigen, kein Redirect
// 3. Normaler Wechsel (Modus persistiert) → Redirect wie bisher

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";

// --- Router-Mock (steuerbar) ---
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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

// lucide-react — alle verwendeten Icons als einfache SVG-Stubs
vi.mock("lucide-react", () => {
  const iconStub = (name: string) => {
    const Icon = (props: Record<string, unknown>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Icon.displayName = `Icon_${name}`;
    return Icon;
  };
  return {
    Settings: iconStub("settings"),
    LogOut: iconStub("logout"),
    Star: iconStub("star"),
    Shield: iconStub("shield"),
    ChevronRight: iconStub("chevron-right"),
    Pencil: iconStub("pencil"),
    Bell: iconStub("bell"),
    TrendingUp: iconStub("trending-up"),
    Plane: iconStub("plane"),
    MapPin: iconStub("map-pin"),
    CircleHelp: iconStub("circle-help"),
    BarChart3: iconStub("bar-chart"),
    Package: iconStub("package"),
    UserPlus: iconStub("user-plus"),
    Download: iconStub("download"),
    ArrowLeft: iconStub("arrow-left"),
    Mic: iconStub("mic"),
    Fingerprint: iconStub("fingerprint"),
    Inbox: iconStub("inbox"),
    Share2: iconStub("share2"),
    Copy: iconStub("copy"),
    Bot: iconStub("bot"),
    Map: iconStub("map"),
    Monitor: iconStub("monitor"),
    Check: iconStub("check"),
    Brain: iconStub("brain"),
    Sparkles: iconStub("sparkles"),
    CheckCircle2: iconStub("check-circle-2"),
    HeartHandshake: iconStub("heart-handshake"),
  };
});

// VoiceSettings + Hook Mock
vi.mock("@/modules/voice/components/companion/VoiceSettings", () => ({
  VoiceSettings: () => <div data-testid="voice-settings">VoiceSettings</div>,
  CollapsibleVoiceSettings: () => (
    <div data-testid="collapsible-voice-settings">CollapsibleVoiceSettings</div>
  ),
}));
vi.mock("@/hooks/useVoicePreferences", () => ({
  useVoicePreferences: () => ({
    preferences: { voice: "nova", speed: 1.0, formality: "formal" },
    updatePreferences: vi.fn(),
    isLoading: false,
  }),
}));
vi.mock("@/lib/ux-flags", () => ({
  isUxRedesignEnabled: vi.fn(() => true),
}));
vi.mock("@/lib/useUnreadCount", () => ({
  useUnreadCount: () => ({
    count: 0,
    refresh: vi.fn(),
  }),
}));

// shadcn UI-Stubs
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div {...props}>{children}</div>
  ),
  CardContent: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div {...props}>{children}</div>
  ),
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: React.ComponentProps<"button">) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));
vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

// Komponenten-Mocks
vi.mock("@/components/TrustBadge", () => ({
  TrustBadge: ({ level }: { level: string }) => (
    <span data-testid="trust-badge">{level}</span>
  ),
}));
vi.mock("@/components/ReputationBadge", () => ({
  ReputationBadge: () => <span data-testid="reputation-badge" />,
}));

// useAuth-Mock
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "user-001" },
    loading: false,
    refreshUser: vi.fn(),
  }),
}));

// lib-Mocks
vi.mock("@/lib/storage", () => ({
  resolveAvatarUrl: (url: string | null) => ({
    type: "emoji",
    value: url || "👤",
  }),
}));
vi.mock("@/lib/reputation", () => ({
  getCachedReputation: () => null,
  getReputationLevel: () => ({
    name: "Starter",
    icon: "🌱",
    color: "text-green-600",
    bgColor: "bg-green-100",
  }),
}));
vi.mock("@/lib/supabase/cached-auth", () => ({
  getCachedUser: vi.fn().mockResolvedValue({ id: "user-001" }),
}));

// --- Steuerbarer Supabase-Mock ---
const mockAuthGetUser = vi.fn();
const mockUserSelect = vi.fn();
const mockHouseholdSelect = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue({});
// Update-Kette: .update(values).eq().select().single() — single liefert die
// tatsaechlich persistierte Row (post-Trigger, RETURNING).
const mockUserUpdate = vi.fn();
const mockUserUpdateSingle = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockAuthGetUser,
      signOut: mockSignOut,
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: mockUserSelect,
            }),
          }),
          update: (values: Record<string, unknown>) => {
            mockUserUpdate(values);
            return {
              eq: () => ({
                select: () => ({
                  single: mockUserUpdateSingle,
                }),
              }),
            };
          },
        };
      }
      if (table === "household_members") {
        return {
          select: () => ({
            eq: () => ({
              not: () => ({
                maybeSingle: mockHouseholdSelect,
              }),
              maybeSingle: mockHouseholdSelect,
            }),
          }),
        };
      }
      // Default-Fallback fuer alle anderen Tabellen (inkl. invite_codes)
      const chainResult = { data: null, error: null, count: 0 };
      const makeChain = (): Record<string, unknown> => {
        const chain: Record<string, unknown> = {};
        const methods = [
          "select",
          "eq",
          "is",
          "not",
          "limit",
          "head",
          "in",
          "or",
          "gte",
          "order",
        ];
        for (const m of methods) {
          chain[m] = vi.fn(() => makeChain());
        }
        chain.single = vi.fn().mockResolvedValue(chainResult);
        chain.maybeSingle = vi.fn().mockResolvedValue(chainResult);
        chain.then = (resolve: (v: unknown) => void) => resolve(chainResult);
        return chain;
      };
      return {
        select: vi.fn(() => makeChain()),
        insert: vi.fn(() => makeChain()),
      };
    },
  })),
}));

// --- Hilfsfunktion: Profil-Daten ---
function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-001",
    display_name: "Jugend Nutzer",
    ui_mode: "youth",
    trust_level: "verified",
    role: "resident",
    bio: null,
    phone: null,
    avatar_url: null,
    is_admin: false,
    settings: null,
    ...overrides,
  };
}

// --- Dynamischer Import der Page-Komponente ---
let ProfilePage: React.ComponentType;

async function loadProfilePage() {
  const mod = await import("@/app/(app)/profile/page");
  ProfilePage = mod.default;
}

const LOCK_HINT = /Jugendmodus kann nur von einem Erwachsenen oder Admin/;

describe("ProfilePage — Youth-Modus sticky (Mig 198)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await loadProfilePage();
  });

  afterEach(() => {
    cleanup();
  });

  it("sperrt die Modus-Karten fuer Youth-Accounts und zeigt den Hinweis", async () => {
    mockUserSelect.mockResolvedValue({
      data: makeProfile({ ui_mode: "youth", is_admin: false }),
      error: null,
    });
    mockHouseholdSelect.mockResolvedValue({ data: null, error: null });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Jugend Nutzer")).toBeDefined();
    });

    // Alle waehlbaren Modus-Karten sind gesperrt
    const activeCard = screen.getByRole("button", { name: /^Aktiv:/ });
    const comfortCard = screen.getByRole("button", { name: /^Aktiv 55\+:/ });
    const seniorCard = screen.getByRole("button", { name: /^Einfach:/ });
    expect((activeCard as HTMLButtonElement).disabled).toBe(true);
    expect((comfortCard as HTMLButtonElement).disabled).toBe(true);
    expect((seniorCard as HTMLButtonElement).disabled).toBe(true);

    // Ruhiger Hinweis ist sichtbar
    expect(screen.getByText(LOCK_HINT)).toBeDefined();
  });

  it("zeigt einen Hinweis statt Redirect, wenn der persistierte Modus abweicht", async () => {
    // Admin-Testzugang: Karten bleiben klickbar, aber der Mig-198-Trigger
    // haelt ui_mode='youth' sticky — das Update gibt fehlerfrei "youth" zurueck.
    mockUserSelect.mockResolvedValue({
      data: makeProfile({ ui_mode: "youth", is_admin: true }),
      error: null,
    });
    mockHouseholdSelect.mockResolvedValue({ data: null, error: null });
    mockUserUpdateSingle.mockResolvedValue({
      data: makeProfile({ ui_mode: "youth", is_admin: true }),
      error: null,
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Jugend Nutzer")).toBeDefined();
    });

    const seniorCard = screen.getByRole("button", { name: /^Einfach:/ });
    expect((seniorCard as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(seniorCard);

    // Update wurde versucht ...
    await waitFor(() => {
      expect(mockUserUpdate).toHaveBeenCalledWith({ ui_mode: "senior" });
    });

    // ... aber der Hinweis erscheint und es gibt KEINEN Redirect
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toMatch(
        /bleibt im Jugendmodus/,
      );
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("wechselt normal und leitet weiter, wenn der Modus persistiert wurde", async () => {
    mockUserSelect.mockResolvedValue({
      data: makeProfile({ ui_mode: "active", display_name: "Max Mustermann" }),
      error: null,
    });
    mockHouseholdSelect.mockResolvedValue({ data: null, error: null });
    mockUserUpdateSingle.mockResolvedValue({
      data: makeProfile({ ui_mode: "comfort", display_name: "Max Mustermann" }),
      error: null,
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Max Mustermann")).toBeDefined();
    });

    // Kein Sperr-Hinweis fuer Nicht-Youth-Accounts
    expect(screen.queryByText(LOCK_HINT)).toBeNull();

    const comfortCard = screen.getByRole("button", { name: /^Aktiv 55\+:/ });
    fireEvent.click(comfortCard);

    await waitFor(() => {
      expect(mockUserUpdate).toHaveBeenCalledWith({ ui_mode: "comfort" });
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
    expect(screen.queryByText(/bleibt im Jugendmodus/)).toBeNull();
  });
});
