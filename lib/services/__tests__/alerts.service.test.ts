// Tests fuer den Alerts-Service
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

import {
  getAlertsByQuarter,
  getAlertById,
  createAlert,
  respondToAlert,
  updateAlertStatus,
} from "../alerts.service";

const MOCK_ALERT = {
  id: "alert-1",
  quarter_id: "q-1",
  user_id: "user-1",
  household_id: "hh-1",
  category: "shopping",
  title: "Einkaufshilfe",
  description: "Brauche Hilfe beim Einkaufen",
  status: "open",
  is_emergency: false,
  current_radius: 1,
  location_lat: null,
  location_lng: null,
  location_source: "none",
  created_at: "2026-03-20T10:00:00Z",
  resolved_at: null,
};

describe("getAlertsByQuarter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("laedt Alerts mit Relationen, sortiert nach Erstelldatum", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [MOCK_ALERT], error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getAlertsByQuarter("q-1");
    expect(mockFrom).toHaveBeenCalledWith("alerts");
    expect(chain.select).toHaveBeenCalledWith(
      expect.stringContaining("user:users(display_name, avatar_url)")
    );
    expect(chain.eq).toHaveBeenCalledWith("quarter_id", "q-1");
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(50);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("alert-1");
  });

  it("filtert nach Status wenn angegeben", async () => {
    // limit() muss die Chain zurueckgeben (nicht sofort resolven),
    // weil danach noch .eq("status",...) aufgerufen wird.
    // await auf die Chain resolved dann das Ergebnis.
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null })),
    };
    mockFrom.mockReturnValue(chain);

    await getAlertsByQuarter("q-1", { status: "open" });
    // eq wird 2x aufgerufen: einmal fuer quarter_id, einmal fuer status
    expect(chain.eq).toHaveBeenCalledWith("quarter_id", "q-1");
    expect(chain.eq).toHaveBeenCalledWith("status", "open");
  });

  it("verwendet custom Limit wenn angegeben", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(chain);

    await getAlertsByQuarter("q-1", { limit: 10 });
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it("wirft Fehler bei Datenbankproblem", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(getAlertsByQuarter("q-1")).rejects.toEqual({ message: "DB error" });
  });
});

describe("getAlertById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("laedt einzelnen Alert mit Relationen", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_ALERT, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getAlertById("alert-1");
    expect(mockFrom).toHaveBeenCalledWith("alerts");
    expect(chain.eq).toHaveBeenCalledWith("id", "alert-1");
    expect(result.id).toBe("alert-1");
  });
});

describe("createAlert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("erstellt Alert mit korrekten Standardwerten", async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_ALERT, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await createAlert({
      userId: "user-1",
      householdId: "hh-1",
      quarterId: "q-1",
      category: "shopping",
      title: "Einkaufshilfe",
    });

    expect(mockFrom).toHaveBeenCalledWith("alerts");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        household_id: "hh-1",
        quarter_id: "q-1",
        category: "shopping",
        title: "Einkaufshilfe",
        status: "open",
        is_emergency: false,
        current_radius: 1,
        location_lat: null,
        location_lng: null,
        location_source: "none",
      })
    );
    expect(result.id).toBe("alert-1");
  });

  it("uebergibt GPS-Koordinaten wenn vorhanden", async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_ALERT, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    await createAlert({
      userId: "user-1",
      householdId: "hh-1",
      quarterId: "q-1",
      category: "medical",
      title: "Medizinischer Notfall",
      isEmergency: true,
      locationLat: 47.5535,
      locationLng: 7.964,
      locationSource: "gps",
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        is_emergency: true,
        location_lat: 47.5535,
        location_lng: 7.964,
        location_source: "gps",
      })
    );
  });
});

describe("respondToAlert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("erstellt Antwort und aktualisiert Status auf help_coming", async () => {
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return insertChain;
      return updateChain;
    });

    await respondToAlert("alert-1", "responder-1");
    expect(mockFrom).toHaveBeenCalledWith("alert_responses");
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        alert_id: "alert-1",
        responder_user_id: "responder-1",
        response_type: "help",
      })
    );
    expect(mockFrom).toHaveBeenCalledWith("alerts");
    expect(updateChain.update).toHaveBeenCalledWith({ status: "help_coming" });
  });

  it("setzt Status auf resolved bei response_type resolved", async () => {
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return insertChain;
      return updateChain;
    });

    await respondToAlert("alert-1", "responder-1", "resolved");
    expect(updateChain.update).toHaveBeenCalledWith({ status: "resolved" });
  });
});

describe("updateAlertStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aktualisiert Status ohne resolved_at bei help_coming", async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValue(chain);

    await updateAlertStatus("alert-1", "help_coming");
    expect(chain.update).toHaveBeenCalledWith({ status: "help_coming" });
  });

  it("setzt resolved_at bei Status resolved", async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValue(chain);

    await updateAlertStatus("alert-1", "resolved");
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "resolved",
        resolved_at: expect.any(String),
      })
    );
  });
});
