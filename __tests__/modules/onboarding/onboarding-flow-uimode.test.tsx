// Regression-Test fuer Befund A1:1: Die /welcome-Tour darf den bei der
// Registrierung gewaehlten ui_mode nicht still mit dem Default ueberschreiben.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGetCachedUser = vi.fn();
vi.mock("@/lib/supabase/cached-auth", () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
}));

const mockSingle = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockSingle })),
      })),
    })),
  }),
}));

const mockCompleteOnboarding = vi.fn();
vi.mock("@/modules/onboarding/services/onboarding", () => ({
  completeOnboarding: (...args: unknown[]) => mockCompleteOnboarding(...args),
}));

// Schwere Kinder mocken — hier geht es nur um die Modus-Logik
vi.mock("@/modules/onboarding/components/slides/SlideWelcome", () => ({
  SlideWelcome: () => <div data-testid="slide-welcome" />,
}));
vi.mock("@/modules/onboarding/components/slides/SlideEmergency", () => ({
  SlideEmergency: () => <div />,
}));
vi.mock("@/modules/onboarding/components/slides/SlideVideo", () => ({
  default: () => <div />,
}));
vi.mock("@/modules/onboarding/components/slides/SlideReady", () => ({
  SlideReady: () => <div />,
}));
vi.mock("@/modules/onboarding/components/slides/SlideFamilySetup", () => ({
  SlideFamilySetup: () => <div />,
}));
vi.mock("@/modules/onboarding/components/SlideSkills", () => ({
  SlideSkills: () => <div />,
}));
vi.mock("@/modules/onboarding/components/ConfettiEffect", () => ({
  ConfettiEffect: () => null,
}));
vi.mock("@/modules/onboarding/components/ProgressDots", () => ({
  ProgressDots: () => <div />,
}));
vi.mock("@/components/modes/UserModeSurface", () => ({
  UserModeChoiceCard: ({
    mode,
    active,
  }: {
    mode: string;
    active: boolean;
  }) => <div data-testid={`mode-${mode}`} data-active={String(active)} />,
}));

import { OnboardingFlow } from "@/modules/onboarding/components/OnboardingFlow";

describe("OnboardingFlow — ui_mode-Erhalt (A1:1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCachedUser.mockResolvedValue({ user: { id: "user-1" } });
    mockCompleteOnboarding.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("Ueberspringen behaelt den registrierten Senior-Modus und routet auf /kreis-start", async () => {
    mockSingle.mockResolvedValue({
      data: { display_name: "Erika", ui_mode: "senior" },
      error: null,
    });

    render(<OnboardingFlow />);

    // Warten bis der DB-Wert geladen und in den State uebernommen ist
    await waitFor(() => expect(mockSingle).toHaveBeenCalled());
    await act(async () => {});

    await userEvent.click(screen.getByText("Überspringen"));

    await waitFor(() =>
      expect(mockCompleteOnboarding).toHaveBeenCalledWith({
        uiMode: "senior",
      }),
    );
    expect(mockPush).toHaveBeenCalledWith("/kreis-start");
  });

  it("Ueberspringen ohne geladenen Modus fasst ui_mode nicht an", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    render(<OnboardingFlow />);
    await waitFor(() => expect(mockSingle).toHaveBeenCalled());
    await act(async () => {});

    await userEvent.click(screen.getByText("Überspringen"));

    await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalledWith({}));
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  // A1:1: Die Tour fragt den Modus NICHT mehr erneut — die Registrierung setzt
  // ihn (Schritt 4) und die Tour laedt/erhaelt ihn nur noch. Die zweite Slide
  // war frueher die Modus-Auswahl ("Wie moechten Sie QuartierApp nutzen?").
  it("zeigt keine Modus-Auswahl-Slide mehr", async () => {
    mockSingle.mockResolvedValue({
      data: { display_name: "Erika", ui_mode: "senior" },
      error: null,
    });

    render(<OnboardingFlow />);
    await waitFor(() => expect(mockSingle).toHaveBeenCalled());
    await act(async () => {});

    // Von der Willkommens-Slide eine weiter. Frueher kam hier die Modus-Slide;
    // jetzt direkt der 112-Hinweis (CTA "Verstanden"). Erst auf den neuen
    // Slide-Marker warten (sonst race mit der 200ms-Slide-Animation), dann
    // sicherstellen, dass die Modus-Auswahl nirgends auftaucht.
    await userEvent.click(screen.getByText("Weiter"));
    await waitFor(() => expect(screen.getByText("Verstanden")).toBeTruthy());

    expect(
      screen.queryByText(/Wie möchten Sie QuartierApp nutzen/i),
    ).toBeNull();
    expect(screen.queryByTestId("mode-senior")).toBeNull();
    expect(screen.queryByTestId("mode-active")).toBeNull();
  });
});
