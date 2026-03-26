// __tests__/hooks/care-fetch-hooks.test.ts
// Nachbar.io — Tests fuer fetch-basierte Care-Hooks
// useAppointments, useDocuments, useHelpers, useDueMedications, useMedicationLogs

import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Global fetch-Mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Supabase-Mock (fuer useDocuments)
const mockLimit = vi.fn();
const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

import { useAppointments } from "@/lib/care/hooks/useAppointments";
import { useDocuments } from "@/lib/care/hooks/useDocuments";
import { useHelpers } from "@/lib/care/hooks/useHelpers";
import { useDueMedications } from "@/lib/care/hooks/useDueMedications";
import { useMedicationLogs } from "@/lib/care/hooks/useMedicationLogs";

// === useAppointments ===
describe("useAppointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: "apt-1", title: "Arzt" }]),
    });
  });

  it("laedt Termine fuer Senior", async () => {
    const { result } = renderHook(() => useAppointments("senior-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.appointments).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("setzt loading=false wenn keine seniorId", async () => {
    const { result } = renderHook(() => useAppointments(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.appointments).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sendet Query-Parameter (upcoming=true)", async () => {
    renderHook(() => useAppointments("senior-1", true));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("senior_id=senior-1");
    expect(url).toContain("upcoming=true");
  });

  it("setzt error bei HTTP-Fehler", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderHook(() => useAppointments("senior-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("setzt error bei Netzwerkfehler", async () => {
    mockFetch.mockRejectedValue(new Error("Offline"));
    const { result } = renderHook(() => useAppointments("senior-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Verbindungsfehler");
  });

  it("stellt refetch bereit", async () => {
    const { result } = renderHook(() => useAppointments("senior-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refetch).toBe("function");
  });
});

// === useHelpers ===
describe("useHelpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: "h-1", role: "neighbor" }]),
    });
  });

  it("laedt Helfer ohne seniorId", async () => {
    const { result } = renderHook(() => useHelpers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.helpers).toHaveLength(1);
  });

  it("sendet senior_id und role als Parameter", async () => {
    renderHook(() => useHelpers("senior-1", "neighbor"));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("senior_id=senior-1");
    expect(url).toContain("role=neighbor");
  });

  it("stellt refetch bereit", async () => {
    const { result } = renderHook(() => useHelpers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refetch).toBe("function");
  });
});

// === useDueMedications ===
describe("useDueMedications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            medication: { id: "med-1", name: "Metformin" },
            scheduled_at: "2026-03-22T08:00:00Z",
            status: "pending",
            snoozed_until: null,
          },
        ]),
    });
  });

  it("laedt faellige Medikamente", async () => {
    const { result } = renderHook(() => useDueMedications("senior-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dueMeds).toHaveLength(1);
  });

  it("setzt loading=false wenn keine seniorId", async () => {
    const { result } = renderHook(() => useDueMedications(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dueMeds).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sendet senior_id als Parameter", async () => {
    renderHook(() => useDueMedications("senior-1"));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][0]).toContain("senior_id=senior-1");
  });
});

// === useMedicationLogs ===
describe("useMedicationLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: "log-1", status: "taken", medication_id: "med-1" },
          { id: "log-2", status: "skipped", medication_id: "med-1" },
        ]),
    });
  });

  it("laedt Medikamenten-Logs", async () => {
    const { result } = renderHook(() => useMedicationLogs("senior-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.logs).toHaveLength(2);
  });

  it("setzt loading=false wenn keine seniorId", async () => {
    const { result } = renderHook(() => useMedicationLogs(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.logs).toEqual([]);
  });

  it("sendet medication_id als optionalen Filter", async () => {
    renderHook(() => useMedicationLogs("senior-1", "med-1"));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("medication_id=med-1");
  });

  it("stellt refetch bereit", async () => {
    const { result } = renderHook(() => useMedicationLogs("senior-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refetch).toBe("function");
  });
});

// === useDocuments (Supabase-direkt) ===
describe("useDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue({
      data: [{ id: "doc-1", type: "care_report_daily" }],
      error: null,
    });
  });

  it("laedt Dokumente fuer Senior", async () => {
    const { result } = renderHook(() => useDocuments("senior-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.documents).toHaveLength(1);
  });

  it("setzt leeres Array wenn keine seniorId", async () => {
    const { result } = renderHook(() => useDocuments(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.documents).toEqual([]);
  });

  it("fragt care_documents Tabelle ab", async () => {
    renderHook(() => useDocuments("senior-1"));
    await waitFor(() =>
      expect(mockFrom).toHaveBeenCalledWith("care_documents"),
    );
  });

  it("setzt leeres Array bei Fehler", async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: "Fehler" },
    });
    const { result } = renderHook(() => useDocuments("senior-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.documents).toEqual([]);
  });

  it("stellt refetch bereit", async () => {
    const { result } = renderHook(() => useDocuments("senior-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refetch).toBe("function");
  });
});
