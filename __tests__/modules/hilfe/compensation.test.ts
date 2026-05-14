import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_PAYMENT_FIELDS,
  RECOGNITION_NOTICE,
  formatRecognition,
  normalizeRecognitionInput,
  validateNoPaymentFields,
} from "@/modules/hilfe/services/compensation";

describe("help recognition", () => {
  it("normalisiert kostenlos als outside-app-only", () => {
    expect(normalizeRecognitionInput({ recognition_type: "free" })).toEqual({
      recognition_type: "free",
      suggested_recognition_cents: null,
      recognition_handling: "outside_app_only",
    });
  });

  it("normalisiert einen Betrag in Cent", () => {
    expect(
      normalizeRecognitionInput({
        recognition_type: "suggested_amount",
        suggested_recognition_euros: "10,50",
      }),
    ).toEqual({
      recognition_type: "suggested_amount",
      suggested_recognition_cents: 1050,
      recognition_handling: "outside_app_only",
    });
  });

  it("lehnt zu hohe Betraege ab", () => {
    expect(() =>
      normalizeRecognitionInput({
        recognition_type: "suggested_amount",
        suggested_recognition_euros: "75",
      }),
    ).toThrow("Der Wunschbetrag darf höchstens 50 Euro betragen.");
  });

  it("lehnt nicht-finite und nicht-ganzzahlige Cent-Werte ab", () => {
    expect(() =>
      normalizeRecognitionInput({
        recognition_type: "suggested_amount",
        suggested_recognition_cents: Number.POSITIVE_INFINITY,
      }),
    ).toThrow("Bitte geben Sie einen gültigen Euro-Betrag an.");

    expect(() =>
      normalizeRecognitionInput({
        recognition_type: "suggested_amount",
        suggested_recognition_cents: 1050.5,
      }),
    ).toThrow("Bitte geben Sie einen gültigen Euro-Betrag an.");
  });

  it("lehnt Zahlungsstatus- und Wallet-Felder rekursiv ab", () => {
    expect(FORBIDDEN_PAYMENT_FIELDS).toContain("payment_status");
    expect(() =>
      validateNoPaymentFields({
        meta: { wallet: { balance: 10 } },
      }),
    ).toThrow("Zahlungsfelder sind nicht erlaubt");
  });

  it("ignoriert clientseitiges recognition_handling und setzt outside-app-only", () => {
    expect(
      normalizeRecognitionInput({
        recognition_type: "thank_you",
        recognition_handling: "paid_in_app",
      }),
    ).toEqual({
      recognition_type: "thank_you",
      suggested_recognition_cents: null,
      recognition_handling: "outside_app_only",
    });
  });

  it("formatiert ohne Zahlungsversprechen", () => {
    expect(
      formatRecognition({
        recognition_type: "suggested_amount",
        suggested_recognition_cents: 1200,
        recognition_handling: "outside_app_only",
      }),
    ).toBe("Unverbindlicher Wunschbetrag: 12,00 Euro");
  });

  it("enthaelt den Pflicht-Hinweis ausserhalb der App", () => {
    expect(RECOGNITION_NOTICE).toContain("nimmt keine Zahlungen entgegen");
    expect(RECOGNITION_NOTICE).toContain("außerhalb der App");
    expect(RECOGNITION_NOTICE).toContain("kein Anspruch auf Zahlung");
  });
});
