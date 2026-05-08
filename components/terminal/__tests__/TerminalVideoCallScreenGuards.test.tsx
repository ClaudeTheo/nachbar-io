import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import VideoCallScreen from "../screens/VideoCallScreen";

const setActiveScreen = vi.fn();
const useConsultationsMock = vi.fn();

vi.mock("@/lib/terminal/TerminalContext", () => ({
  useTerminal: () => ({
    setActiveScreen,
  }),
}));

vi.mock("@/lib/care/hooks/useConsultations", () => ({
  useConsultations: (...args: unknown[]) => useConsultationsMock(...args),
}));

vi.mock("@/modules/care/components/appointments/ConsultationConsent", () => ({
  ConsultationConsent: ({
    providerType,
    onConsented,
  }: {
    providerType: string;
    onConsented: () => void;
  }) => (
    <div>
      <p>Einwilligung: {providerType}</p>
      <button onClick={onConsented}>Einwilligung erledigt</button>
    </div>
  ),
}));

vi.mock("@/modules/care/components/appointments/TechCheck", () => ({
  TechCheck: ({ onReady }: { onReady: () => void }) => (
    <button onClick={onReady}>Technik bereit</button>
  ),
}));

vi.mock("@/modules/care/components/senior/SeniorSosButton", () => ({
  SeniorSosButton: () => <button>SOS</button>,
}));

function createSlot(overrides: Record<string, unknown> = {}) {
  return {
    id: "slot-1",
    quarter_id: "q-1",
    provider_type: "community",
    host_user_id: "host-1",
    host_name: "Praxis am Rhein",
    title: "Videosprechstunde",
    scheduled_at: "2026-05-08T10:00:00.000Z",
    duration_minutes: 30,
    status: "scheduled",
    booked_by: "resident-1",
    booked_at: null,
    room_id: "room-1",
    join_url: "https://meet.example.com/room-1",
    notes: null,
    created_at: "2026-05-08T08:00:00.000Z",
    updated_at: "2026-05-08T08:00:00.000Z",
    ...overrides,
  };
}

describe("Terminal VideoCallScreen Guards", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    setActiveScreen.mockReset();
    useConsultationsMock.mockReset();
  });

  it("rendert kaputte Slot-Listen wie keine Termine", () => {
    useConsultationsMock.mockReturnValue({
      slots: { id: "slot-1", title: "Kaputte Liste" },
      loading: false,
    });

    render(<VideoCallScreen />);

    expect(screen.getByText("Kein Termin geplant")).toBeInTheDocument();
    expect(screen.queryByText("Kaputte Liste")).not.toBeInTheDocument();
  });

  it("filtert kaputte Slot-Felder vor Datum- und Textausgabe", () => {
    useConsultationsMock.mockReturnValue({
      slots: [
        createSlot({
          id: "broken-date",
          title: { text: "Kaputter Titel" },
          host_name: { name: "Kaputter Host" },
          scheduled_at: "kein Datum",
          status: "scheduled",
        }),
        createSlot({
          id: "broken-status",
          title: "Falscher Status",
          status: "morgen",
        }),
        createSlot({
          id: "valid-slot",
          title: "",
          host_name: "",
          scheduled_at: "2026-05-08T11:30:00.000Z",
          status: "scheduled",
        }),
      ],
      loading: false,
    });

    render(<VideoCallScreen />);

    expect(screen.getByText("Videosprechstunde")).toBeInTheDocument();
    expect(screen.getByText(/Praxis/)).toBeInTheDocument();
    expect(screen.queryByText("Kaputter Titel")).not.toBeInTheDocument();
    expect(screen.queryByText("Falscher Status")).not.toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument();
  });

  it("trimmt Slot-Status vor der Wartezimmer-Entscheidung", async () => {
    useConsultationsMock.mockReturnValue({
      slots: [
        createSlot({
          id: "spaced-status",
          status: "  waiting  ",
          title: "  Videosprechstunde  ",
          host_name: "  Praxis am Rhein  ",
          join_url: "  https://meet.example.com/room-1  ",
        }),
      ],
      loading: false,
    });

    render(<VideoCallScreen />);

    expect(await screen.findByText("Datenschutz")).toBeInTheDocument();
    expect(screen.getByText("Einwilligung: community")).toBeInTheDocument();
  });

  it("trimmt Slot-Datumsstrings vor der Termin-Anzeige", () => {
    useConsultationsMock.mockReturnValue({
      slots: [
        createSlot({
          id: "spaced-date",
          scheduled_at: "  2026-05-08T11:30:00.000Z  ",
          status: "scheduled",
        }),
      ],
      loading: false,
    });

    render(<VideoCallScreen />);

    expect(screen.getByText("Videosprechstunde")).toBeInTheDocument();
    expect(screen.queryByText("Kein Termin geplant")).not.toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date|NaN/i)).not.toBeInTheDocument();
  });

  it("startet kein iFrame mit kaputter Join-URL", async () => {
    useConsultationsMock.mockReturnValue({
      slots: [
        createSlot({
          id: "waiting-slot",
          status: "waiting",
          join_url: { href: "https://meet.example.com/room-1" },
        }),
      ],
      loading: false,
    });

    render(<VideoCallScreen />);

    fireEvent.click(await screen.findByText("Einwilligung erledigt"));
    fireEvent.click(await screen.findByText("Technik bereit"));

    await waitFor(() => {
      expect(screen.queryByTitle("Videosprechstunde")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Sprechstunde starten" })).toBeInTheDocument();
  });
});
