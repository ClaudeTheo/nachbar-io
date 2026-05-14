# Outside-App Aufwandsentschaedigung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hilfeanfragen bekommen fuer alle Nutzer eine rechtlich risikoarme, freiwillige Aufwandsentschaedigungs-Angabe, ohne Zahlungssystem, ohne Zahlungsstatus und mit besonderen Schutzregeln fuer Jugendliche.

**Architecture:** Die App speichert nur die Absicht/Einordnung einer moeglichen Anerkennung. Geld fliesst nie durch die App; es gibt keine Verrechnung, kein Guthaben, kein Wallet, keine Auszahlung und keine Zahlungsstatus-Felder. Die fachliche Logik sitzt in kleinen Domain-Services, die UI nutzt gemeinsame Text-/Options-Konstanten, und die Persistenz wird erst nach Founder-Freigabe ueber eine file-first Migration erweitert.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase Postgres/RLS, Vitest, Playwright, Tailwind v4.

---

## Founder-/Compliance-Review Amendment 2026-05-14

Dieses Amendment ist fuer die Umsetzung bindend und ersetzt widersprechende Details in den Tasks unten.

### Freigabe-Status

- Task 1 und Task 2 duerfen umgesetzt werden, aber mit den hier verschaerften Regeln.
- Task 3 Migration darf erst umgesetzt werden, nachdem die Naming-/Constraint-Korrekturen aus diesem Amendment eingearbeitet sind.
- Prod-Migration-Apply, Prod-Write, Deploy und Push bleiben separate Founder-Gates.

### Produkt-Wording

Im sichtbaren UI primaer **"Freiwillige Anerkennung"** verwenden, nicht als Hauptbegriff "Aufwandsentschaedigung". "Aufwandsentschaedigung" darf nur erlaeuternd als moegliche Anerkennung ausserhalb der App vorkommen.

UI-Labels:

- `free` -> "Kostenlos / freiwillig"
- `thank_you` -> "Kleines Dankeschoen"
- `suggested_amount` -> "Unverbindlicher Wunschbetrag"
- `by_agreement` -> "Privat klaeren"

Sichtbare UI-Texte verwenden echte deutsche Umlaute: "Freiwillige Anerkennung", "Dankeschön", "außerhalb", "Aufwandsentschädigung". ASCII bleibt nur fuer Code, Dateinamen und technische Bezeichner.

### Naming im Code und Schema

Bevorzugtes neues Naming:

- `recognition_type`
- `suggested_recognition_cents`
- `recognition_handling = 'outside_app_only'`

Nicht mehr bevorzugt:

- `compensation_type`
- `suggested_amount_cents`
- `compensation_handling`

Grund: "recognition" wirkt produktsprachlich weniger wie Verguetung, Job oder Plattformzahlung.

### Migration-Constraint Korrektur

Der Constraint muss `IS NOT NULL` fuer den Betrag bei `suggested_amount` enthalten, weil PostgreSQL-CHECKs mit `NULL` sonst als `UNKNOWN` durchlaufen koennen.

Verbindliche Constraint-Logik:

```sql
CHECK (
  (
    recognition_type = 'suggested_amount'
    AND suggested_recognition_cents IS NOT NULL
    AND suggested_recognition_cents BETWEEN 100 AND 5000
  )
  OR
  (
    recognition_type <> 'suggested_amount'
    AND suggested_recognition_cents IS NULL
  )
)
```

Pilot-Empfehlung: Betrag produktseitig eher auf 25 oder 30 Euro begrenzen. 50 Euro ist nur technische Obergrenze, keine rechtliche Freigrenze.

### Non-Negotiable Product Rules

- Kein Job-Marktplatz.
- Keine Stundenloehne.
- Keine Gebote.
- Kein Ranking nach Betrag.
- Kein Sortieren nach Betrag.
- Keine Provision.
- Keine App-vermittelte Zahlung.
- Keine Payment-Links.
- Keine IBAN-Erfassung.
- Kein Wallet, keine Credits mit Geldwert, kein Guthaben, kein Escrow, keine Auszahlung.
- Kein Status "bezahlt", "unbezahlt", "abgerechnet" oder "Zahlung abgeschlossen".
- Wunschbetrag ist optional, unverbindlich und ausschliesslich ausserhalb der App zu klaeren.
- Jugend-Oberflaechen zeigen nur kostenlose, niedrig-riskante Aufgaben.

### Jugend-Regeln verschaerfen

Unter 13:

- Keine Aufgabenannahme. Punkt.
- Auch kostenlose niedrig-riskante Aufgaben nicht als vermittelbare Hilfeaufgabe anbieten.

13 bis 17:

- Nur mit Elternfreigabe.
- Nur `risk = low`.
- Nur `recognition_type = 'free'`.
- Maximal kurze, leichte Aufgaben, z. B. produktseitig `estimatedDurationMinutes <= 120`.
- Kein Geldhandling, keine Medikamente, keine Pflege, kein Transport, keine Leiter, keine Elektroarbeiten, keine schweren koerperlichen Arbeiten, keine gefaehrlichen Werkzeuge.

Youth-Boards muessen serverseitig nur freie niedrig-riskante Aufgaben liefern. Nicht im Youth-Code pauschal `recognitionType: "free"` setzen, wenn die echte Hilfeanfrage einen Wunschbetrag hat; stattdessen echte Daten pruefen und nicht geeignete Aufgaben ausblenden/blockieren.

### Risk-Matrix verschaerfen

Immer blockieren oder nur als Erwachsenen-/Fachhilfe behandeln:

- `handwork:electrical`
- `handwork:plumbing`
- `handwork:carpentry`
- `garden:hedge_trimming`
- `garden:chainsaw`
- `garden:ladder`
- `transport:*`
- `medication:*`
- `care:*`
- `childcare:*`
- `money_handling:*`
- `legal:*`
- `tax:*`
- `medical:*`

Fuer Erwachsene moeglich, aber mit Warnhinweis:

- `garden:mowing`
- `pet_care:dog_walking`
- `handwork:assembly`
- `moving:light`

Fuer Jugendliche nur niedrig-riskant:

- kleine Botengaenge ohne Geldhandling
- `tech:phone_help`
- `company:walk`
- `garden:watering`
- `tutoring:basic`
- Paketannahme nur nach genauer Produktentscheidung und nicht fuer wertvolle/alterssensible Sendungen

Rasenmaehen ist fuer Minderjaehrige zu blockieren, sobald motorisierte Geraete moeglich sind.

### Zusaetzliche Pflicht-Copy

Steuer-/Minijob-Hinweis fuer Detail-/Infoflaeche:

```text
Nachbarschaftshilfe soll gelegentlich, freiwillig und nicht auf nachhaltigen Gewinn ausgerichtet sein. Wenn regelmäßig gegen Entgelt gearbeitet wird oder wirtschaftlicher Verdienst im Vordergrund steht, können steuerliche, sozialversicherungsrechtliche oder Meldepflichten entstehen, zum Beispiel als Minijob im Privathaushalt. Die Beteiligten sind selbst verantwortlich, ihre Pflichten zu prüfen.
```

Freiwillige Anerkennung:

```text
Die Quartier-App nimmt keine Zahlungen entgegen, verwaltet kein Guthaben und zahlt keine Beträge aus. Eine mögliche Anerkennung klären die Beteiligten privat außerhalb der App. Es besteht kein Anspruch auf Zahlung, kein Zahlungsversprechen und keine Abwicklung durch die Quartier-App.
```

Jugend:

```text
Jugendliche sehen nur leichte, altersgerechte Aufgaben. Aufgaben mit Geld, Medikamenten, Pflege, Transport, Leitern, Elektroarbeiten, gefährlichen Werkzeugen, schweren körperlichen Arbeiten oder besonderer Verantwortung sind ausgeschlossen. Punkte in der Jugend-App sind Anerkennung ohne Geldwert und können nicht ausgezahlt, verkauft oder verrechnet werden.
```

### Technische Haertung

- Betragsparser muss `Number.isFinite` und Integer-Cent-Werte pruefen.
- Verbotene Payment-Felder rekursiv pruefen, nicht nur Top-Level.
- `recognition_handling` niemals vom Client akzeptieren; serverseitig immer auf `"outside_app_only"` setzen.
- `HelpRecognitionType` nur an einer Stelle definieren und in anderen Typdateien re-exportieren.

## Safety Gates

- Keine Production-Writes.
- Kein Migration-Apply auf Prod.
- Kein Deploy.
- Kein Wallet, kein Guthaben, keine Coins, keine Zahlungsausloesung, keine Auszahlung.
- Keine neuen Felder wie `paid_at`, `payment_status`, `payout_status`, `wallet_balance`, `credit_balance`, `transaction_id`, `escrow`, `payout_amount`.
- Migration-Datei erst nach Planfreigabe erstellen; Prod-Apply bleibt ein separater Founder-Go.
- Rechtliche Texte sind Produkt- und Sicherheitshinweise, keine Rechts- oder Steuerberatung.

## Product Copy

### Allgemeine Info: Was ist Nachbarschaftshilfe?

```text
Nachbarschaftshilfe bedeutet: Menschen im Quartier unterstuetzen sich freiwillig im Alltag. Typische Beispiele sind Einkaeufe mitbringen, Pakete annehmen, beim Handy helfen, gemeinsam spazieren gehen oder leichte Hilfe im Garten.

Die Quartier-App vermittelt nur den Kontakt und dokumentiert die Hilfeanfrage. Sie ersetzt keinen Notruf, keinen Pflegedienst, keinen Fachbetrieb und keinen Zahlungsdienst. Medizinische, pflegerische, gefaehrliche oder rechtlich besonders geregelte Taetigkeiten gehoeren nicht in eine normale Nachbarschaftshilfe-Anfrage.
```

### Aufwandsentschaedigung-Hinweis

```text
Die Quartier-App nimmt keine Zahlungen entgegen und zahlt keine Betraege aus. Eine moegliche Anerkennung oder Aufwandsentschaedigung vereinbaren Sie direkt mit der helfenden Person ausserhalb der App.
```

### Jugend-Erklaerung

```text
Jugendliche duerfen in der Quartier-App nur leichte, altersgerechte Aufgaben sehen oder uebernehmen. Nicht erlaubt sind gefaehrliche Arbeiten, Pflege, Medikamente, Geldgeschaefte, Leiterarbeiten, Elektroarbeiten, schwere koerperliche Arbeiten oder Aufgaben mit riskanten Werkzeugen.

Unter 13 Jahren gibt es keine bezahlten oder entschaedigten Aufgaben. Von 13 bis 17 Jahren sind nur geeignete leichte Aufgaben erlaubt; je nach Funktion ist eine Elternfreigabe erforderlich. Punkte in der Jugend-App sind Anerkennung ohne Geldwert und koennen nicht ausgezahlt oder verrechnet werden.
```

## Legal Orientation Sources

- Zahlungsdienste/E-Geld: Bundesbank, Zahlungsinstitute und E-Geld-Institute: https://www.bundesbank.de/de/aufgaben/bankenaufsicht/einzelaspekte/zahlungsinstitute-und-e-geld-institute-598334
- Jugendarbeitsschutz: BMAS Jugendarbeitsschutz: https://www.bmas.de/DE/Arbeit/Arbeitsrecht/Arbeitnehmerrechte/Jugendarbeitsschutz/jugendarbeitsschutz.html
- Kinderarbeit: JArbSchG § 5: https://www.gesetze-im-internet.de/jarbschg/__5.html
- Gefaehrliche Arbeiten: JArbSchG § 22: https://www.gesetze-im-internet.de/jarbschg/__22.html
- Minderjaehrige/Geschaeftsfaehigkeit: BGB §§ 106, 107, 110: https://www.gesetze-im-internet.de/bgb/__106.html
- Datenminimierung: DSGVO Art. 5: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679

## File Structure

- Create `modules/hilfe/services/compensation.ts`: Domain types, UI labels, info texts, amount parsing, forbidden payment-field validation, display formatting.
- Create `modules/hilfe/services/help-task-risk.ts`: Risk matrix for help categories/subcategories, including youth restrictions.
- Create `__tests__/modules/hilfe/compensation.test.ts`: Unit tests for compensation validation, formatting, forbidden fields.
- Create `__tests__/modules/hilfe/help-task-risk.test.ts`: Unit tests for low/medium/blocked task classification.
- Modify `modules/hilfe/services/types.ts`: Add `HelpCompensationType`, `HelpCompensationHandling`, and fields on `HelpRequest`.
- Modify `lib/supabase/types.ts`: Add UI-facing help request fields.
- Modify `lib/supabase/database.types.ts`: Add generated/manual Supabase table fields after migration file exists.
- Modify `modules/hilfe/services/hilfe-requests.service.ts`: Validate and persist compensation metadata.
- Modify `app/api/hilfe/requests/route.ts`: Accept safe fields and reject forbidden payment fields.
- Create `modules/hilfe/components/CompensationSelector.tsx`: Shared selector for `/help/new` and legacy `/hilfe/neu`.
- Modify `app/(app)/help/new/page.tsx`: Add "Aufwandsentschaedigung" step/section.
- Modify `app/(app)/help/page.tsx`: Display compact compensation label on cards.
- Modify `app/(app)/help/[id]/page.tsx`: Display full compensation info plus mandatory outside-app notice.
- Modify `modules/hilfe/components/NewRequestForm.tsx`: Add same selector to the senior/legacy form without changing visual-polish surfaces elsewhere.
- Create `supabase/migrations/196_help_request_compensation_outside_app.sql`: File-first migration only after Founder approves this plan.
- Modify `__tests__/api/hilfe/requests.test.ts`: API validation and persistence tests.
- Modify `__tests__/components/hilfe/NewRequestForm.test.tsx`: Legacy form test.
- Create `__tests__/components/hilfe/CompensationSelector.test.tsx`: Selector behavior.
- Modify `tests/e2e/pages/help.page.ts`: Page object helpers for compensation section.
- Modify `tests/e2e/scenarios/s2-help-request.spec.ts`: E2E for creating a request with outside-app compensation.
- Add or update Storybook story for the selector if Storybook remains active.

---

### Task 1: Compensation Domain Service

**Files:**
- Create: `modules/hilfe/services/compensation.ts`
- Create: `__tests__/modules/hilfe/compensation.test.ts`

- [ ] **Step 1: Write the failing unit test**

```ts
// __tests__/modules/hilfe/compensation.test.ts
import { describe, expect, it } from "vitest";
import {
  COMPENSATION_NOTICE,
  FORBIDDEN_PAYMENT_FIELDS,
  formatCompensation,
  normalizeCompensationInput,
  validateNoPaymentFields,
} from "@/modules/hilfe/services/compensation";

describe("help compensation", () => {
  it("normalisiert kostenlos als outside-app-only", () => {
    expect(normalizeCompensationInput({ compensation_type: "free" })).toEqual({
      compensation_type: "free",
      suggested_amount_cents: null,
      compensation_handling: "outside_app_only",
    });
  });

  it("normalisiert einen Betrag in Cent", () => {
    expect(
      normalizeCompensationInput({
        compensation_type: "suggested_amount",
        suggested_amount_euros: "10,50",
      }),
    ).toEqual({
      compensation_type: "suggested_amount",
      suggested_amount_cents: 1050,
      compensation_handling: "outside_app_only",
    });
  });

  it("lehnt zu hohe Betraege ab", () => {
    expect(() =>
      normalizeCompensationInput({
        compensation_type: "suggested_amount",
        suggested_amount_euros: "75",
      }),
    ).toThrow("Der Vorschlag darf hoechstens 50 Euro betragen.");
  });

  it("lehnt Zahlungsstatus- und Wallet-Felder ab", () => {
    expect(FORBIDDEN_PAYMENT_FIELDS).toContain("payment_status");
    expect(() => validateNoPaymentFields({ payment_status: "paid" })).toThrow(
      "Zahlungsfelder sind nicht erlaubt",
    );
  });

  it("formatiert ohne Zahlungsversprechen", () => {
    expect(
      formatCompensation({
        compensation_type: "suggested_amount",
        suggested_amount_cents: 1200,
        compensation_handling: "outside_app_only",
      }),
    ).toBe("Vorschlag: 12,00 Euro");
  });

  it("enthaelt den Pflicht-Hinweis ausserhalb der App", () => {
    expect(COMPENSATION_NOTICE).toContain("keine Zahlungen entgegen");
    expect(COMPENSATION_NOTICE).toContain("ausserhalb der App");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -- __tests__/modules/hilfe/compensation.test.ts
```

Expected: FAIL because `modules/hilfe/services/compensation.ts` does not exist.

- [ ] **Step 3: Implement the domain service**

```ts
// modules/hilfe/services/compensation.ts
import { ServiceError } from "@/lib/services/service-error";

export type HelpCompensationType =
  | "free"
  | "thank_you"
  | "suggested_amount"
  | "by_agreement";

export type HelpCompensationHandling = "outside_app_only";

export interface HelpCompensation {
  compensation_type: HelpCompensationType;
  suggested_amount_cents: number | null;
  compensation_handling: HelpCompensationHandling;
}

export const COMPENSATION_NOTICE =
  "Die Quartier-App nimmt keine Zahlungen entgegen und zahlt keine Betraege aus. Eine moegliche Anerkennung oder Aufwandsentschaedigung vereinbaren Sie direkt mit der helfenden Person ausserhalb der App.";

export const NEIGHBORHOOD_HELP_INFO =
  "Nachbarschaftshilfe bedeutet: Menschen im Quartier unterstuetzen sich freiwillig im Alltag. Die Quartier-App vermittelt nur den Kontakt und dokumentiert die Hilfeanfrage. Sie ersetzt keinen Notruf, keinen Pflegedienst, keinen Fachbetrieb und keinen Zahlungsdienst.";

export const YOUTH_NEIGHBORHOOD_HELP_INFO =
  "Jugendliche duerfen in der Quartier-App nur leichte, altersgerechte Aufgaben sehen oder uebernehmen. Unter 13 Jahren gibt es keine bezahlten oder entschaedigten Aufgaben. Von 13 bis 17 Jahren sind nur geeignete leichte Aufgaben erlaubt; je nach Funktion ist eine Elternfreigabe erforderlich.";

export const COMPENSATION_OPTIONS: Array<{
  value: HelpCompensationType;
  label: string;
  description: string;
}> = [
  {
    value: "free",
    label: "Kostenlos / ehrenamtlich",
    description: "Die Hilfe ist freiwillig und ohne Erwartung einer Anerkennung.",
  },
  {
    value: "thank_you",
    label: "Kleines Dankeschoen",
    description: "Eine kleine Anerkennung kann direkt abgesprochen werden.",
  },
  {
    value: "suggested_amount",
    label: "Vorschlag",
    description: "Ein kleiner Betrag als Vorschlag, keine Zahlung in der App.",
  },
  {
    value: "by_agreement",
    label: "Nach Absprache",
    description: "Die Beteiligten klaeren eine moegliche Anerkennung direkt miteinander.",
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
  "wallet",
  "balance",
  "saldo",
  "credits",
] as const;

const VALID_TYPES: HelpCompensationType[] = [
  "free",
  "thank_you",
  "suggested_amount",
  "by_agreement",
];

export function validateNoPaymentFields(input: Record<string, unknown>) {
  const found = FORBIDDEN_PAYMENT_FIELDS.filter((field) => field in input);
  if (found.length > 0) {
    throw new ServiceError(
      `Zahlungsfelder sind nicht erlaubt: ${found.join(", ")}`,
      400,
    );
  }
}

export function normalizeCompensationInput(input: {
  compensation_type?: unknown;
  suggested_amount_cents?: unknown;
  suggested_amount_euros?: unknown;
}): HelpCompensation {
  const rawType = input.compensation_type ?? "free";
  if (typeof rawType !== "string" || !VALID_TYPES.includes(rawType as HelpCompensationType)) {
    throw new ServiceError("Ungueltige Aufwandsentschaedigung.", 400);
  }

  const compensationType = rawType as HelpCompensationType;
  if (compensationType !== "suggested_amount") {
    return {
      compensation_type: compensationType,
      suggested_amount_cents: null,
      compensation_handling: "outside_app_only",
    };
  }

  const cents = parseSuggestedAmount(input);
  if (cents < 100) {
    throw new ServiceError("Der Vorschlag muss mindestens 1 Euro betragen.", 400);
  }
  if (cents > 5000) {
    throw new ServiceError("Der Vorschlag darf hoechstens 50 Euro betragen.", 400);
  }

  return {
    compensation_type: "suggested_amount",
    suggested_amount_cents: cents,
    compensation_handling: "outside_app_only",
  };
}

function parseSuggestedAmount(input: {
  suggested_amount_cents?: unknown;
  suggested_amount_euros?: unknown;
}): number {
  if (typeof input.suggested_amount_cents === "number") {
    return Math.round(input.suggested_amount_cents);
  }

  if (typeof input.suggested_amount_euros !== "string") {
    throw new ServiceError("Bitte geben Sie einen Betrag an.", 400);
  }

  const normalized = input.suggested_amount_euros.trim().replace(",", ".");
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(normalized)) {
    throw new ServiceError("Bitte geben Sie einen gueltigen Euro-Betrag an.", 400);
  }

  return Math.round(Number(normalized) * 100);
}

export function formatCompensation(compensation: HelpCompensation): string {
  switch (compensation.compensation_type) {
    case "free":
      return "Kostenlos / ehrenamtlich";
    case "thank_you":
      return "Kleines Dankeschoen";
    case "by_agreement":
      return "Nach Absprache";
    case "suggested_amount":
      return `Vorschlag: ${formatEuro(compensation.suggested_amount_cents ?? 0)}`;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test -- __tests__/modules/hilfe/compensation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/hilfe/services/compensation.ts __tests__/modules/hilfe/compensation.test.ts
git commit -m "feat(help): add outside-app compensation domain"
```

---

### Task 2: Help Task Risk Matrix

**Files:**
- Create: `modules/hilfe/services/help-task-risk.ts`
- Create: `__tests__/modules/hilfe/help-task-risk.test.ts`

- [ ] **Step 1: Write the failing risk tests**

```ts
// __tests__/modules/hilfe/help-task-risk.test.ts
import { describe, expect, it } from "vitest";
import {
  classifyHelpTaskRisk,
  getMinorHelpDecision,
} from "@/modules/hilfe/services/help-task-risk";

describe("help task risk", () => {
  it("klassifiziert einfache Hilfe als niedrig", () => {
    expect(classifyHelpTaskRisk("shopping", "weekly")).toBe("low");
    expect(classifyHelpTaskRisk("tech", "phone_help")).toBe("low");
  });

  it("klassifiziert einfache Gartenhilfe als mittel", () => {
    expect(classifyHelpTaskRisk("garden", "mowing")).toBe("medium");
  });

  it("blockiert gefaehrliche Taetigkeiten fuer Minderjaehrige", () => {
    expect(classifyHelpTaskRisk("handwork", "electrical")).toBe("blocked_for_minors");
    expect(classifyHelpTaskRisk("garden", "hedge_trimming")).toBe("blocked_for_minors");
  });

  it("erlaubt unter 13 nur kostenlos und niedriges Risiko", () => {
    expect(
      getMinorHelpDecision({
        age: 12,
        hasGuardianConsent: true,
        category: "shopping",
        subcategory: "weekly",
        compensationType: "free",
      }).allowed,
    ).toBe(true);

    expect(
      getMinorHelpDecision({
        age: 12,
        hasGuardianConsent: true,
        category: "shopping",
        subcategory: "weekly",
        compensationType: "thank_you",
      }).allowed,
    ).toBe(false);
  });

  it("erlaubt 13-17 nur mit Freigabe und nicht blockiertem Risiko", () => {
    expect(
      getMinorHelpDecision({
        age: 15,
        hasGuardianConsent: false,
        category: "garden",
        subcategory: "mowing",
        compensationType: "free",
      }).allowed,
    ).toBe(false);

    expect(
      getMinorHelpDecision({
        age: 15,
        hasGuardianConsent: true,
        category: "handwork",
        subcategory: "electrical",
        compensationType: "free",
      }).allowed,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -- __tests__/modules/hilfe/help-task-risk.test.ts
```

Expected: FAIL because `help-task-risk.ts` does not exist.

- [ ] **Step 3: Implement risk matrix**

```ts
// modules/hilfe/services/help-task-risk.ts
import type { HelpCompensationType } from "@/modules/hilfe/services/compensation";

export type HelpTaskRisk = "low" | "medium" | "blocked_for_minors";

const LOW_TASKS = new Set([
  "shopping:weekly",
  "shopping:parcel",
  "package:*",
  "tech:phone_help",
  "tech:pc_setup",
  "tech:internet",
  "company:*",
  "tutoring:*",
  "garden:watering",
  "garden:planting",
]);

const MEDIUM_TASKS = new Set([
  "garden:mowing",
  "pet_care:dog_walking",
  "handwork:assembly",
]);

const BLOCKED_FOR_MINORS = new Set([
  "garden:hedge_trimming",
  "handwork:electrical",
  "handwork:plumbing",
  "handwork:carpentry",
  "transport:*",
  "childcare:*",
  "shopping:pharmacy",
]);

export function classifyHelpTaskRisk(
  category: string,
  subcategory: string | null | undefined,
): HelpTaskRisk {
  const exact = `${category}:${subcategory ?? "*"}`;
  const wildcard = `${category}:*`;

  if (BLOCKED_FOR_MINORS.has(exact) || BLOCKED_FOR_MINORS.has(wildcard)) {
    return "blocked_for_minors";
  }
  if (MEDIUM_TASKS.has(exact) || MEDIUM_TASKS.has(wildcard)) {
    return "medium";
  }
  if (LOW_TASKS.has(exact) || LOW_TASKS.has(wildcard)) {
    return "low";
  }

  return "medium";
}

export function getMinorHelpDecision(input: {
  age: number;
  hasGuardianConsent: boolean;
  category: string;
  subcategory?: string | null;
  compensationType: HelpCompensationType;
}): { allowed: boolean; risk: HelpTaskRisk; reason: string } {
  const risk = classifyHelpTaskRisk(input.category, input.subcategory);

  if (input.age < 13 && input.compensationType !== "free") {
    return {
      allowed: false,
      risk,
      reason: "Unter 13 Jahren sind bezahlte oder entschaedigte Aufgaben nicht erlaubt.",
    };
  }

  if (risk === "blocked_for_minors") {
    return {
      allowed: false,
      risk,
      reason: "Diese Aufgabe ist fuer Minderjaehrige nicht geeignet.",
    };
  }

  if (input.age >= 13 && input.age <= 17 && !input.hasGuardianConsent) {
    return {
      allowed: false,
      risk,
      reason: "Fuer diese Aufgabe ist eine Elternfreigabe erforderlich.",
    };
  }

  if (input.age < 13 && risk !== "low") {
    return {
      allowed: false,
      risk,
      reason: "Unter 13 Jahren sind nur leichte Aufgaben erlaubt.",
    };
  }

  return { allowed: true, risk, reason: "Erlaubt" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test -- __tests__/modules/hilfe/help-task-risk.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/hilfe/services/help-task-risk.ts __tests__/modules/hilfe/help-task-risk.test.ts
git commit -m "feat(help): add youth-safe task risk rules"
```

---

### Task 3: File-First Migration And Types

**Files:**
- Create: `supabase/migrations/196_help_request_compensation_outside_app.sql`
- Modify: `modules/hilfe/services/types.ts`
- Modify: `lib/supabase/types.ts`
- Modify: `lib/supabase/database.types.ts`

**Gate:** Start this task only after Thomas confirms the plan. Do not apply this migration to any database in this task.

- [ ] **Step 1: Create migration file only**

```sql
-- supabase/migrations/196_help_request_compensation_outside_app.sql
-- Help requests: voluntary outside-app compensation metadata only.
-- No payment processing, no payment status, no wallet, no payout.

ALTER TABLE public.help_requests
  ADD COLUMN IF NOT EXISTS compensation_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS suggested_amount_cents integer,
  ADD COLUMN IF NOT EXISTS compensation_handling text NOT NULL DEFAULT 'outside_app_only';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'help_requests_compensation_type_check'
  ) THEN
    ALTER TABLE public.help_requests
      ADD CONSTRAINT help_requests_compensation_type_check
      CHECK (compensation_type IN ('free', 'thank_you', 'suggested_amount', 'by_agreement'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'help_requests_compensation_handling_check'
  ) THEN
    ALTER TABLE public.help_requests
      ADD CONSTRAINT help_requests_compensation_handling_check
      CHECK (compensation_handling = 'outside_app_only');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'help_requests_suggested_amount_check'
  ) THEN
    ALTER TABLE public.help_requests
      ADD CONSTRAINT help_requests_suggested_amount_check
      CHECK (
        (
          compensation_type = 'suggested_amount'
          AND suggested_amount_cents BETWEEN 100 AND 5000
        )
        OR (
          compensation_type <> 'suggested_amount'
          AND suggested_amount_cents IS NULL
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.help_requests.compensation_type IS
  'Voluntary outside-app recognition type. Not a payment status or claim.';
COMMENT ON COLUMN public.help_requests.suggested_amount_cents IS
  'Optional suggested amount in cents, only for compensation_type=suggested_amount. The app does not process payment.';
COMMENT ON COLUMN public.help_requests.compensation_handling IS
  'Always outside_app_only. No wallet, no escrow, no payout, no settlement.';
```

- [ ] **Step 2: Update TypeScript help types**

Add to `modules/hilfe/services/types.ts` and `lib/supabase/types.ts`:

```ts
export type HelpCompensationType =
  | "free"
  | "thank_you"
  | "suggested_amount"
  | "by_agreement";

export type HelpCompensationHandling = "outside_app_only";
```

Add to each `HelpRequest` interface:

```ts
compensation_type: HelpCompensationType;
suggested_amount_cents: number | null;
compensation_handling: HelpCompensationHandling;
```

- [ ] **Step 3: Update `lib/supabase/database.types.ts` manually or by local type generation**

Add these fields to `help_requests.Row`:

```ts
compensation_type: string
suggested_amount_cents: number | null
compensation_handling: string
```

Add these fields to `help_requests.Insert`:

```ts
compensation_type?: string
suggested_amount_cents?: number | null
compensation_handling?: string
```

Add these fields to `help_requests.Update`:

```ts
compensation_type?: string
suggested_amount_cents?: number | null
compensation_handling?: string
```

- [ ] **Step 4: Verify no forbidden fields exist**

Run:

```bash
rg "paid_at|payment_status|payout_status|wallet_balance|credit_balance|transaction_id|escrow|payout_amount" supabase/migrations/196_help_request_compensation_outside_app.sql modules/hilfe lib/supabase
```

Expected: No matches in the new feature files except inside deny-list tests/constants.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/196_help_request_compensation_outside_app.sql modules/hilfe/services/types.ts lib/supabase/types.ts lib/supabase/database.types.ts
git commit -m "feat(help): add outside-app compensation schema"
```

---

### Task 4: API Validation And Persistence

**Files:**
- Modify: `app/api/hilfe/requests/route.ts`
- Modify: `modules/hilfe/services/hilfe-requests.service.ts`
- Modify: `__tests__/api/hilfe/requests.test.ts`

- [ ] **Step 1: Add failing API tests**

Add to `__tests__/api/hilfe/requests.test.ts`:

```ts
it("speichert freiwillige Aufwandsentschaedigung ausserhalb der App", async () => {
  mockSupabase.setUser({ id: "user-comp", email: "comp@test.de" });
  mockSupabase.addResponse("help_requests", {
    data: {
      id: "req-comp",
      user_id: "user-comp",
      quarter_id: "q-1",
      type: "need",
      category: "shopping",
      title: "Einkaufen gesucht",
      status: "active",
      compensation_type: "suggested_amount",
      suggested_amount_cents: 1000,
      compensation_handling: "outside_app_only",
    },
    error: null,
  });

  const { POST } = await import("@/app/api/hilfe/requests/route");
  const response = await POST(
    makePostRequest({
      quarter_id: "q-1",
      category: "shopping",
      title: "Einkaufen gesucht",
      compensation_type: "suggested_amount",
      suggested_amount_cents: 1000,
    }),
  );

  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body.compensation_handling).toBe("outside_app_only");
});

it("lehnt Zahlungsstatus-Felder ab", async () => {
  mockSupabase.setUser({ id: "user-pay-field", email: "pay@test.de" });

  const { POST } = await import("@/app/api/hilfe/requests/route");
  const response = await POST(
    makePostRequest({
      quarter_id: "q-1",
      category: "shopping",
      title: "Einkaufen gesucht",
      compensation_type: "free",
      payment_status: "paid",
    }),
  );

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toContain("Zahlungsfelder sind nicht erlaubt");
});
```

- [ ] **Step 2: Run API test to verify it fails**

Run:

```bash
npm run test -- __tests__/api/hilfe/requests.test.ts
```

Expected: FAIL because route/service do not handle the new fields.

- [ ] **Step 3: Update route body and validation**

In `app/api/hilfe/requests/route.ts`, import:

```ts
import { validateNoPaymentFields } from "@/modules/hilfe/services/compensation";
```

Extend the body type:

```ts
compensation_type?: "free" | "thank_you" | "suggested_amount" | "by_agreement";
suggested_amount_cents?: number | null;
suggested_amount_euros?: string | null;
```

After `body = await request.json();`, add:

```ts
validateNoPaymentFields(body as Record<string, unknown>);
```

- [ ] **Step 4: Update service input and insert**

In `modules/hilfe/services/hilfe-requests.service.ts`, import:

```ts
import { normalizeCompensationInput } from "@/modules/hilfe/services/compensation";
```

Extend `createRequest` input:

```ts
compensation_type?: string;
suggested_amount_cents?: number | null;
suggested_amount_euros?: string | null;
```

Before insert:

```ts
const compensation = normalizeCompensationInput(input);
```

Add to the insert payload:

```ts
compensation_type: compensation.compensation_type,
suggested_amount_cents: compensation.suggested_amount_cents,
compensation_handling: compensation.compensation_handling,
```

- [ ] **Step 5: Run API test to verify it passes**

Run:

```bash
npm run test -- __tests__/api/hilfe/requests.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/hilfe/requests/route.ts modules/hilfe/services/hilfe-requests.service.ts __tests__/api/hilfe/requests.test.ts
git commit -m "feat(help): persist outside-app compensation metadata"
```

---

### Task 5: Shared Compensation UI

**Files:**
- Create: `modules/hilfe/components/CompensationSelector.tsx`
- Create: `__tests__/components/hilfe/CompensationSelector.test.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
// __tests__/components/hilfe/CompensationSelector.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompensationSelector } from "@/modules/hilfe/components/CompensationSelector";

describe("CompensationSelector", () => {
  it("zeigt alle sicheren Optionen und den Pflicht-Hinweis", () => {
    render(<CompensationSelector value={{ compensation_type: "free", suggested_amount_cents: null }} onChange={vi.fn()} />);

    expect(screen.getByText("Aufwandsentschaedigung")).toBeInTheDocument();
    expect(screen.getByText("Kostenlos / ehrenamtlich")).toBeInTheDocument();
    expect(screen.getByText("Kleines Dankeschoen")).toBeInTheDocument();
    expect(screen.getByText(/Die Quartier-App nimmt keine Zahlungen entgegen/i)).toBeInTheDocument();
  });

  it("zeigt Betragsfeld nur bei Vorschlag", async () => {
    const user = userEvent.setup();
    render(<CompensationSelector value={{ compensation_type: "free", suggested_amount_cents: null }} onChange={vi.fn()} />);

    expect(screen.queryByLabelText(/Vorschlag in Euro/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Vorschlag/i }));
    expect(screen.getByLabelText(/Vorschlag in Euro/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -- __tests__/components/hilfe/CompensationSelector.test.tsx
```

Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement component**

```tsx
// modules/hilfe/components/CompensationSelector.tsx
"use client";

import { Input } from "@/components/ui/input";
import {
  COMPENSATION_NOTICE,
  COMPENSATION_OPTIONS,
  type HelpCompensationType,
} from "@/modules/hilfe/services/compensation";

interface CompensationSelectorValue {
  compensation_type: HelpCompensationType;
  suggested_amount_cents: number | null;
}

interface CompensationSelectorProps {
  value: CompensationSelectorValue;
  onChange: (value: CompensationSelectorValue) => void;
  disabledTypes?: HelpCompensationType[];
}

export function CompensationSelector({
  value,
  onChange,
  disabledTypes = [],
}: CompensationSelectorProps) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-anthrazit">
          Aufwandsentschaedigung
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional und freiwillig. Die App wickelt keine Zahlungen ab.
        </p>
      </div>

      <div className="grid gap-2" role="radiogroup" aria-label="Aufwandsentschaedigung">
        {COMPENSATION_OPTIONS.map((option) => {
          const disabled = disabledTypes.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={value.compensation_type === option.value}
              disabled={disabled}
              onClick={() =>
                onChange({
                  compensation_type: option.value,
                  suggested_amount_cents:
                    option.value === "suggested_amount"
                      ? value.suggested_amount_cents
                      : null,
                })
              }
              className={`rounded-lg border p-3 text-left transition ${
                value.compensation_type === option.value
                  ? "border-quartier-green bg-quartier-green/10"
                  : "border-border bg-white"
              } ${disabled ? "opacity-45" : "hover:border-quartier-green"}`}
            >
              <span className="block text-sm font-semibold text-anthrazit">
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      {value.compensation_type === "suggested_amount" && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-anthrazit">
            Vorschlag in Euro
          </span>
          <Input
            inputMode="decimal"
            placeholder="z.B. 10"
            value={
              value.suggested_amount_cents
                ? String(value.suggested_amount_cents / 100).replace(".", ",")
                : ""
            }
            onChange={(event) => {
              const normalized = event.target.value.replace(",", ".");
              const amount = Number(normalized);
              onChange({
                compensation_type: "suggested_amount",
                suggested_amount_cents:
                  Number.isFinite(amount) && amount > 0
                    ? Math.round(amount * 100)
                    : null,
              });
            }}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Kleiner Vorschlag fuer diese Hilfeanfrage insgesamt, nicht pro Stunde.
          </span>
        </label>
      )}

      <p className="rounded-md bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {COMPENSATION_NOTICE}
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Run component test to verify it passes**

Run:

```bash
npm run test -- __tests__/components/hilfe/CompensationSelector.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/hilfe/components/CompensationSelector.tsx __tests__/components/hilfe/CompensationSelector.test.tsx
git commit -m "feat(help): add outside-app compensation selector"
```

---

### Task 6: Wire UI Into Help Creation And Display

**Files:**
- Modify: `app/(app)/help/new/page.tsx`
- Modify: `app/(app)/help/page.tsx`
- Modify: `app/(app)/help/[id]/page.tsx`
- Modify: `modules/hilfe/components/NewRequestForm.tsx`
- Modify: `__tests__/components/hilfe/NewRequestForm.test.tsx`

- [ ] **Step 1: Add component state in `/help/new`**

In `app/(app)/help/new/page.tsx`, import:

```ts
import { CompensationSelector } from "@/modules/hilfe/components/CompensationSelector";
```

Add state:

```ts
const [compensation, setCompensation] = useState({
  compensation_type: "free" as const,
  suggested_amount_cents: null as number | null,
});
```

Add to POST body:

```ts
compensation_type: compensation.compensation_type,
suggested_amount_cents: compensation.suggested_amount_cents,
```

Render inside details step after description:

```tsx
<CompensationSelector value={compensation} onChange={setCompensation} />
```

- [ ] **Step 2: Add legacy/senior form state**

In `modules/hilfe/components/NewRequestForm.tsx`, import `CompensationSelector`, add the same state, include the same POST fields, and render the selector before the submit button.

- [ ] **Step 3: Display compact card label**

In `app/(app)/help/page.tsx`, import:

```ts
import { formatCompensation } from "@/modules/hilfe/services/compensation";
```

Inside `HelpCard`, render after description:

```tsx
<p className="mt-2 text-xs font-medium text-muted-foreground">
  {formatCompensation({
    compensation_type: request.compensation_type ?? "free",
    suggested_amount_cents: request.suggested_amount_cents ?? null,
    compensation_handling: request.compensation_handling ?? "outside_app_only",
  })}
</p>
```

- [ ] **Step 4: Display detail notice**

In `app/(app)/help/[id]/page.tsx`, import:

```ts
import {
  COMPENSATION_NOTICE,
  formatCompensation,
} from "@/modules/hilfe/services/compensation";
```

Render in the main card meta area:

```tsx
<div className="mt-4 rounded-lg bg-muted px-3 py-2">
  <p className="text-sm font-semibold text-anthrazit">
    {formatCompensation({
      compensation_type: request.compensation_type ?? "free",
      suggested_amount_cents: request.suggested_amount_cents ?? null,
      compensation_handling: request.compensation_handling ?? "outside_app_only",
    })}
  </p>
  <p className="mt-1 text-xs text-muted-foreground">{COMPENSATION_NOTICE}</p>
</div>
```

- [ ] **Step 5: Update form tests**

In `__tests__/components/hilfe/NewRequestForm.test.tsx`, extend expected POST body:

```ts
compensation_type: "free",
suggested_amount_cents: null,
```

Add assertion:

```ts
expect(screen.getByText("Aufwandsentschaedigung")).toBeInTheDocument();
expect(screen.getByText(/keine Zahlungen entgegen/i)).toBeInTheDocument();
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm run test -- __tests__/components/hilfe/NewRequestForm.test.tsx __tests__/components/hilfe/CompensationSelector.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/(app)/help/new/page.tsx app/(app)/help/page.tsx app/(app)/help/[id]/page.tsx modules/hilfe/components/NewRequestForm.tsx __tests__/components/hilfe/NewRequestForm.test.tsx
git commit -m "feat(help): show outside-app compensation in help flow"
```

---

### Task 7: Youth Guardrails

**Files:**
- Modify: `modules/youth/services/youth-routes.service.ts`
- Modify: `modules/youth/components/TaskCard.tsx`
- Modify: `modules/youth/components/TaskBoard.tsx`
- Add tests near existing youth service tests.

- [ ] **Step 1: Add youth service test**

Create or extend a youth route/service test with this behavior:

```ts
it("blockiert blockierte Aufgaben fuer Minderjaehrige", async () => {
  const decision = getMinorHelpDecision({
    age: 15,
    hasGuardianConsent: true,
    category: "handwork",
    subcategory: "electrical",
    compensationType: "free",
  });

  expect(decision.allowed).toBe(false);
  expect(decision.reason).toContain("nicht geeignet");
});
```

- [ ] **Step 2: Use existing youth profile fields**

Use `youth_profiles.birth_year`, `youth_profiles.age_group`, and `youth_profiles.access_level`.

Rules:

```ts
const hasGuardianConsent = profile.access_level === "freigeschaltet";
const approximateAge = new Date().getFullYear() - profile.birth_year;
```

- [ ] **Step 3: Enforce visible/acceptable tasks**

For youth-facing task creation/acceptance:

```ts
const decision = getMinorHelpDecision({
  age: approximateAge,
  hasGuardianConsent,
  category,
  subcategory: typeof body.subcategory === "string" ? body.subcategory : null,
  compensationType: "free",
});

if (!decision.allowed) {
  throw new ServiceError(decision.reason, 403);
}
```

- [ ] **Step 4: Keep youth points non-monetary**

Do not connect `points_reward` to `compensation_type`. Keep copy as:

```text
Punkte sind Anerkennung ohne Geldwert. Sie koennen nicht ausgezahlt, verkauft oder verrechnet werden.
```

- [ ] **Step 5: Run youth tests**

Run:

```bash
npm run test -- __tests__/modules/hilfe/help-task-risk.test.ts __tests__/lib/youth-moderation.test.ts __tests__/lib/youth-exchange-rules.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/youth/services/youth-routes.service.ts modules/youth/components/TaskCard.tsx modules/youth/components/TaskBoard.tsx __tests__/modules/hilfe/help-task-risk.test.ts
git commit -m "feat(youth): enforce safe help task guardrails"
```

---

### Task 8: Playwright And Review Artefacts

**Files:**
- Modify: `tests/e2e/pages/help.page.ts`
- Modify: `tests/e2e/scenarios/s2-help-request.spec.ts`
- Optional: Create `modules/hilfe/components/CompensationSelector.stories.tsx`

- [ ] **Step 1: Add Playwright page object helpers**

In `tests/e2e/pages/help.page.ts`, add:

```ts
readonly compensationSection = this.page.getByText("Aufwandsentschaedigung");
readonly freeCompensation = this.page.getByRole("radio", { name: /Kostenlos/i });
readonly suggestedCompensation = this.page.getByRole("radio", { name: /Vorschlag/i });
readonly suggestedAmountInput = this.page.getByLabel(/Vorschlag in Euro/i);
```

Add helper:

```ts
async chooseSuggestedCompensation(amount: string) {
  await this.suggestedCompensation.click();
  await this.suggestedAmountInput.fill(amount);
}
```

- [ ] **Step 2: Add scenario assertion**

In `tests/e2e/scenarios/s2-help-request.spec.ts`, after details entry:

```ts
const compensation = page.getByRole("radio", { name: /Vorschlag/i });
await compensation.click();
await page.getByLabel(/Vorschlag in Euro/i).fill("10");
await expect(page.getByText(/keine Zahlungen entgegen/i)).toBeVisible();
```

After creation and feed/detail load:

```ts
await expect(page.getByText(/Vorschlag: 10,00 Euro/i)).toBeVisible();
```

- [ ] **Step 3: Run targeted Playwright test locally**

Run:

```bash
npm run test:e2e -- tests/e2e/scenarios/s2-help-request.spec.ts
```

Expected: PASS locally against the configured test environment.

- [ ] **Step 4: Capture screenshot artefact**

Run local app and capture:

```bash
npm run dev:local
```

Open:

```text
http://localhost:3000/help/new
```

Capture screens:

- Help details step with compensation section.
- Help detail page with outside-app notice.
- Youth tasks page showing no money wording.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/pages/help.page.ts tests/e2e/scenarios/s2-help-request.spec.ts modules/hilfe/components/CompensationSelector.stories.tsx
git commit -m "test(help): cover outside-app compensation flow"
```

---

### Task 9: Final Verification

**Files:**
- No new files unless a short handoff is needed.

- [ ] **Step 1: Static checks**

Run:

```bash
npm run lint
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 2: Unit tests**

Run:

```bash
npm run test -- __tests__/modules/hilfe/compensation.test.ts __tests__/modules/hilfe/help-task-risk.test.ts __tests__/api/hilfe/requests.test.ts __tests__/components/hilfe/NewRequestForm.test.tsx __tests__/components/hilfe/CompensationSelector.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Forbidden payment-field audit**

Run:

```bash
rg "paid_at|payment_status|payout_status|wallet_balance|credit_balance|transaction_id|escrow|payout_amount" app modules lib supabase/migrations/196_help_request_compensation_outside_app.sql __tests__
```

Expected: Matches only in deny-list constants/tests or unrelated pre-existing billing modules, not in new persistence or UI flow.

- [ ] **Step 4: Git status**

Run:

```bash
git status --short --branch
```

Expected: Clean working tree after local commits. Branch may be ahead locally. Do not push without explicit Founder-Go.

---

## Execution Recommendation

Recommended sequence:

1. Execute Task 1 and Task 2 first. These are green-zone code/tests and do not require DB changes.
2. Stop and ask Thomas for migration-file approval before Task 3.
3. Create migration file only. Do not apply it to Prod.
4. Execute API/UI/test tasks locally.
5. Review in browser and screenshots.
6. Push/deploy only after explicit Founder-Go.
