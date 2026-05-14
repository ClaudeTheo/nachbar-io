import { ServiceError } from "@/lib/services/service-error";

export type HelpRecognitionType =
  | "free"
  | "thank_you"
  | "suggested_amount"
  | "by_agreement";

export type HelpRecognitionHandling = "outside_app_only";

export interface HelpRecognition {
  recognition_type: HelpRecognitionType;
  suggested_recognition_cents: number | null;
  recognition_handling: HelpRecognitionHandling;
}

export const RECOGNITION_NOTICE =
  "Die Quartier-App nimmt keine Zahlungen entgegen, verwaltet kein Guthaben und zahlt keine Beträge aus. Eine mögliche Anerkennung klären die Beteiligten privat außerhalb der App. Es besteht kein Anspruch auf Zahlung, kein Zahlungsversprechen und keine Abwicklung durch die Quartier-App.";

export const RECOGNITION_TAX_NOTICE =
  "Nachbarschaftshilfe soll gelegentlich, freiwillig und nicht auf nachhaltigen Gewinn ausgerichtet sein. Wenn regelmäßig gegen Entgelt gearbeitet wird oder wirtschaftlicher Verdienst im Vordergrund steht, können steuerliche, sozialversicherungsrechtliche oder Meldepflichten entstehen, zum Beispiel als Minijob im Privathaushalt. Die Beteiligten sind selbst verantwortlich, ihre Pflichten zu prüfen.";

export const NEIGHBORHOOD_HELP_INFO =
  "Nachbarschaftshilfe bedeutet: Menschen im Quartier unterstützen sich freiwillig im Alltag. Die Quartier-App vermittelt nur den Kontakt und dokumentiert die Hilfeanfrage. Sie ersetzt keinen Notruf, keinen Pflegedienst, keinen Fachbetrieb und keinen Zahlungsdienst.";

export const YOUTH_NEIGHBORHOOD_HELP_INFO =
  "Jugendliche sehen nur leichte, altersgerechte Aufgaben. Aufgaben mit Geld, Medikamenten, Pflege, Transport, Leitern, Elektroarbeiten, gefährlichen Werkzeugen, schweren körperlichen Arbeiten oder besonderer Verantwortung sind ausgeschlossen. Punkte in der Jugend-App sind Anerkennung ohne Geldwert und können nicht ausgezahlt, verkauft oder verrechnet werden.";

export const RECOGNITION_OPTIONS: Array<{
  value: HelpRecognitionType;
  label: string;
  description: string;
}> = [
  {
    value: "free",
    label: "Kostenlos / freiwillig",
    description: "Die Hilfe ist freiwillig und ohne Erwartung einer Anerkennung.",
  },
  {
    value: "thank_you",
    label: "Kleines Dankeschön",
    description: "Eine kleine Anerkennung kann privat abgesprochen werden.",
  },
  {
    value: "suggested_amount",
    label: "Unverbindlicher Wunschbetrag",
    description: "Ein kleiner Vorschlag für die Hilfe insgesamt, nicht pro Stunde.",
  },
  {
    value: "by_agreement",
    label: "Privat klären",
    description: "Die Beteiligten klären eine mögliche Anerkennung direkt miteinander.",
  },
];

export const FORBIDDEN_PAYMENT_FIELDS = [
  "paid_at",
  "payment_status",
  "payout_status",
  "wallet_balance",
  "credit_balance",
  "transaction_id",
  "escrow",
  "payout_amount",
  "iban",
  "payment_link",
  "checkout_url",
  "wallet",
  "balance",
  "saldo",
  "credits",
  "coin_balance",
] as const;

const VALID_RECOGNITION_TYPES: HelpRecognitionType[] = [
  "free",
  "thank_you",
  "suggested_amount",
  "by_agreement",
];

type RecognitionInput = {
  recognition_type?: unknown;
  suggested_recognition_cents?: unknown;
  suggested_recognition_euros?: unknown;
  recognition_handling?: unknown;
};

export function validateNoPaymentFields(input: unknown): void {
  const found = new Set<string>();
  collectForbiddenPaymentFields(input, found);

  if (found.size > 0) {
    throw new ServiceError(
      `Zahlungsfelder sind nicht erlaubt: ${Array.from(found).sort().join(", ")}`,
      400,
    );
  }
}

function collectForbiddenPaymentFields(input: unknown, found: Set<string>): void {
  if (!input || typeof input !== "object") {
    return;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      collectForbiddenPaymentFields(item, found);
    }
    return;
  }

  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_PAYMENT_FIELDS.includes(key as (typeof FORBIDDEN_PAYMENT_FIELDS)[number])) {
      found.add(key);
    }
    collectForbiddenPaymentFields(value, found);
  }
}

export function normalizeRecognitionInput(input: RecognitionInput): HelpRecognition {
  const rawType = input.recognition_type ?? "free";
  if (
    typeof rawType !== "string" ||
    !VALID_RECOGNITION_TYPES.includes(rawType as HelpRecognitionType)
  ) {
    throw new ServiceError("Ungültige freiwillige Anerkennung.", 400);
  }

  const recognitionType = rawType as HelpRecognitionType;
  if (recognitionType !== "suggested_amount") {
    return {
      recognition_type: recognitionType,
      suggested_recognition_cents: null,
      recognition_handling: "outside_app_only",
    };
  }

  const cents = parseSuggestedRecognitionCents(input);
  if (cents < 100) {
    throw new ServiceError("Der Wunschbetrag muss mindestens 1 Euro betragen.", 400);
  }
  if (cents > 5000) {
    throw new ServiceError("Der Wunschbetrag darf höchstens 50 Euro betragen.", 400);
  }

  return {
    recognition_type: "suggested_amount",
    suggested_recognition_cents: cents,
    recognition_handling: "outside_app_only",
  };
}

function parseSuggestedRecognitionCents(input: RecognitionInput): number {
  if (typeof input.suggested_recognition_cents === "number") {
    if (
      !Number.isFinite(input.suggested_recognition_cents) ||
      !Number.isInteger(input.suggested_recognition_cents)
    ) {
      throw new ServiceError("Bitte geben Sie einen gültigen Euro-Betrag an.", 400);
    }
    return input.suggested_recognition_cents;
  }

  if (typeof input.suggested_recognition_euros !== "string") {
    throw new ServiceError("Bitte geben Sie einen Betrag an.", 400);
  }

  const normalized = input.suggested_recognition_euros.trim().replace(",", ".");
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(normalized)) {
    throw new ServiceError("Bitte geben Sie einen gültigen Euro-Betrag an.", 400);
  }

  const euros = Number(normalized);
  const cents = Math.round(euros * 100);
  if (!Number.isFinite(euros) || !Number.isInteger(cents)) {
    throw new ServiceError("Bitte geben Sie einen gültigen Euro-Betrag an.", 400);
  }

  return cents;
}

export function formatRecognition(recognition: HelpRecognition): string {
  switch (recognition.recognition_type) {
    case "free":
      return "Kostenlos / freiwillig";
    case "thank_you":
      return "Kleines Dankeschön";
    case "by_agreement":
      return "Privat klären";
    case "suggested_amount":
      return `Unverbindlicher Wunschbetrag: ${formatEuro(
        recognition.suggested_recognition_cents ?? 0,
      )}`;
  }
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  })
    .format(cents / 100)
    .replace("€", "Euro")
    .replace(/\s+/g, " ")
    .trim();
}
