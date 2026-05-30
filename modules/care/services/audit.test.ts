// Tests fuer das revisionssichere Care-Audit-Log.
// Schwerpunkt: sanitizeAuditMetadata() haelt Art.-9-Gesundheitsdaten (Medikamentenname,
// SOS-Notizen, Care-Task-Titel) aus dem care_audit_log.metadata heraus.
// Pre-Pilot-Audit Finding W4/M8: Quellspalten sind verschluesselt, der Klartext
// landete aber im freien jsonb-metadata.

import { describe, it, expect } from "vitest";
import { sanitizeAuditMetadata, writeAuditLog } from "./audit";

describe("sanitizeAuditMetadata", () => {
  it("entfernt sensible Freitext-Felder (Art.-9-Schutz)", () => {
    const result = sanitizeAuditMetadata({
      medicationName: "Metformin",
      name: "Insulin",
      notes: "Patient hat Diabetes Typ 2",
      title: "Blutzucker messen",
      message: "vertraulich",
      description: "Freitext",
      action: "created",
      medicationId: "med-1",
      category: "medical",
      status: "missed",
    });

    expect(result).not.toHaveProperty("medicationName");
    expect(result).not.toHaveProperty("name");
    expect(result).not.toHaveProperty("notes");
    expect(result).not.toHaveProperty("title");
    expect(result).not.toHaveProperty("message");
    expect(result).not.toHaveProperty("description");
    // Nicht-sensible Felder (IDs, Status, Kategorien, Aktionen) bleiben erhalten
    expect(result).toEqual({
      action: "created",
      medicationId: "med-1",
      category: "medical",
      status: "missed",
    });
  });

  it("ist case-insensitiv fuer die Schluesselnamen", () => {
    const result = sanitizeAuditMetadata({ Name: "X", NOTES: "Y", Title: "Z", ok: 1 });
    expect(result).toEqual({ ok: 1 });
  });

  it("liefert leeres Objekt fuer undefined oder leeres metadata", () => {
    expect(sanitizeAuditMetadata(undefined)).toEqual({});
    expect(sanitizeAuditMetadata({})).toEqual({});
  });
});

describe("writeAuditLog", () => {
  it("schreibt nur sanitisiertes metadata in care_audit_log", async () => {
    let captured: Record<string, unknown> | undefined;
    const supabase = {
      from: (table: string) => {
        expect(table).toBe("care_audit_log");
        return {
          insert: (row: Record<string, unknown>) => {
            captured = row;
            return Promise.resolve({ error: null });
          },
        };
      },
    } as never;

    await writeAuditLog(supabase, {
      seniorId: "senior-1",
      actorId: "actor-1",
      eventType: "profile_updated",
      referenceType: "care_medications",
      referenceId: "med-1",
      metadata: { name: "Insulin", action: "created", schedule: "08:00" },
    });

    expect(captured).toBeDefined();
    expect(captured!.metadata).toEqual({ action: "created", schedule: "08:00" });
    expect(captured!.metadata).not.toHaveProperty("name");
    // Nicht-PII-Felder des Log-Eintrags bleiben unveraendert
    expect(captured!.senior_id).toBe("senior-1");
    expect(captured!.event_type).toBe("profile_updated");
    expect(captured!.reference_id).toBe("med-1");
  });
});
