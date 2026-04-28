# KI-Hilfe FAQ-Sheet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Pulsierender KI-Punkt im AiConsent-Step bekommt eine echte Funktion: Tap öffnet Bottom-Sheet mit 7 vordefinierten FAQ-Items zur KI-Hilfe.

**Architecture:** Wrapper-Komponente `KiHelpFaqSheet` über bestehender `Sheet`-Primitive (base-ui Dialog) im **kontrollierten Modus** (`open`/`onOpenChange`) wie etabliert in `BugReportButton.tsx`. `KiHelpPulseDot` wird in `components/ki-help/` verschoben und um `asButton`-Modus erweitert (diskriminierte Union). Statische FAQ-Daten in `lib/ki-help/faq-content.ts`. Kein Backend, kein LLM, kein Persist.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, base-ui Dialog (`components/ui/sheet.tsx`), Vitest + RTL, ESLint.

**Design-Doc:** `docs/plans/2026-04-27-ki-help-faq-sheet-design.md` (Founder-approved 2026-04-27)

**Abweichung vom Design:** Statt `<SheetTrigger asChild>` verwenden wir kontrollierten Modus (`<Sheet open={open} onOpenChange={setOpen}>` + `onClick` direkt am Pulse-Dot-Button). Begründung: Codebase-Pattern in `BugReportButton.tsx`. Funktional identisch, weniger API-Risiko.

---

## Pre-Check (bereits erledigt 2026-04-28)

| Stichwort | Treffer | Konsequenz |
|---|---|---|
| `KiHelpFaq`, `KiHelpSheet`, `faq-content` | 0 Code-Treffer (nur Doc-Plans) | Neubau OK |
| `components/ki-help/` | nicht vorhanden | Neues Verzeichnis OK |
| `KiHelpPulseDot` | `app/(auth)/register/components/KiHelpPulseDot.tsx` (heute neu) + 1 Test, 1 Caller | Move + Erweiterung |
| `Sheet` Primitive | `components/ui/sheet.tsx` (base-ui Dialog) | Adapter, nicht neu bauen |

---

## Task 1: FAQ-Daten + Snapshot-Test

**Files:**
- Create: `nachbar-io/lib/ki-help/faq-content.ts`
- Test: `nachbar-io/__tests__/lib/ki-help/faq-content.test.ts`

**Step 1.1: Failing Test schreiben**

```ts
// nachbar-io/__tests__/lib/ki-help/faq-content.test.ts
import { describe, it, expect } from "vitest";
import { KI_HELP_FAQ } from "@/lib/ki-help/faq-content";

describe("KI_HELP_FAQ", () => {
  it("hat exakt 7 Items (Founder-Approve 2026-04-27)", () => {
    expect(KI_HELP_FAQ).toHaveLength(7);
  });

  it("hat eindeutige IDs", () => {
    const ids = KI_HELP_FAQ.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("hat keine leeren Strings in question/answer", () => {
    for (const item of KI_HELP_FAQ) {
      expect(item.question.trim().length).toBeGreaterThan(0);
      expect(item.answer.trim().length).toBeGreaterThan(0);
    }
  });

  it("enthaelt die erwarteten Schluessel-IDs (Snapshot gegen Design)", () => {
    const ids = KI_HELP_FAQ.map((item) => item.id);
    expect(ids).toEqual([
      "what",
      "later-help",
      "active-now",
      "data",
      "switch-off",
      "levels",
      "personal-locked",
    ]);
  });

  it("personal-locked-Antwort erwaehnt Schutzmassnahmen + Freischaltung", () => {
    const item = KI_HELP_FAQ.find((i) => i.id === "personal-locked");
    expect(item).toBeDefined();
    expect(item!.answer).toMatch(/Schutzmaßnahmen/);
    expect(item!.answer).toMatch(/freischalten|frei|Sobald/);
  });

  it("data-Antwort verspricht KEINE konkrete Verarbeitung vor Consent", () => {
    const item = KI_HELP_FAQ.find((i) => i.id === "data");
    expect(item).toBeDefined();
    // Keine festen Verarbeitungs-Zusagen vor AVV (Design Anpassung 4)
    expect(item!.answer).not.toMatch(/pseudonymisiert|anonymisiert|verschluesselt/i);
    expect(item!.answer).toMatch(/Vor Ihrer Einwilligung/);
  });
});
```

**Step 1.2: Test laufen lassen → MUSS rot sein**

```bash
cd nachbar-io
npx vitest run __tests__/lib/ki-help/faq-content.test.ts
```

Erwartet: FAIL — `Cannot find module '@/lib/ki-help/faq-content'`.

**Step 1.3: Minimal-Implementierung (Wording 1:1 aus Design-Doc)**

```ts
// nachbar-io/lib/ki-help/faq-content.ts
// Statische FAQ-Daten fuer den KI-Hilfe-Begleiter (Touchpoint 2: Pulse-Dot im AiConsent-Step).
// Founder-approved 2026-04-27. Aenderungen brauchen erneute Abnahme.
export interface KiHelpFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const KI_HELP_FAQ: ReadonlyArray<KiHelpFaqItem> = [
  {
    id: "what",
    question: "Was ist die KI-Hilfe?",
    answer:
      "Eine optionale Funktion, die Ihnen später beim Vorlesen, beim Formulieren von Antworten und bei kleinen Fragen helfen kann. Standardmäßig ausgeschaltet, wird nur aktiv, wenn Sie es ausdrücklich wünschen.",
  },
  {
    id: "later-help",
    question: "Was kann sie später für mich tun?",
    answer:
      "Nachrichten und Hinweise vorlesen, Antworten per Sprache statt per Tippen und beim Formulieren helfen — zum Beispiel: „Kannst du mir diesen Hinweis vorlesen?" oder „Hilf mir, eine kurze Antwort zu formulieren."",
  },
  {
    id: "active-now",
    question: "Ist die KI jetzt schon aktiv?",
    answer:
      "Nein. Vor Ihrer Einwilligung passiert nichts. Diese Hilfetexte sind fest geschrieben, keine Live-KI.",
  },
  {
    id: "data",
    question: "Was passiert mit meinen Daten?",
    answer:
      "Vor Ihrer Einwilligung wird nichts an eine KI gesendet. Persönliche KI-Funktionen starten erst, wenn die nötigen Schutzmaßnahmen aktiv sind. Ihre Eingaben sind nicht öffentlich.",
  },
  {
    id: "switch-off",
    question: "Kann ich die KI später wieder ausschalten?",
    answer:
      "Ja, jederzeit in den Einstellungen. Sie können die Stufe wechseln oder die KI-Hilfe ganz ausschalten.",
  },
  {
    id: "levels",
    question: "Was bedeutet Basis, Alltag und Persönlich?",
    answer:
      "Drei Stufen mit unterschiedlicher Tiefe der Hilfe — Basis (App-Hilfe und Vorlesen), Alltag (Formulieren, Verstehen und kleine Fragen), Persönlich (tiefere Hilfe mit zusätzlichen Schutzmaßnahmen, derzeit gesperrt).",
  },
  {
    id: "personal-locked",
    question: "Warum ist Persönlich noch gesperrt?",
    answer:
      "Persönliche KI-Hilfe braucht zusätzliche Schutzmaßnahmen, die noch nicht alle abgeschlossen sind. Sobald die stehen, schalten wir die Stufe frei und informieren Sie.",
  },
];
```

**Step 1.4: Test laufen lassen → MUSS grün sein**

```bash
cd nachbar-io
npx vitest run __tests__/lib/ki-help/faq-content.test.ts
```

Erwartet: 6/6 PASS.

**Step 1.5: Commit**

```bash
git add nachbar-io/lib/ki-help/faq-content.ts \
        nachbar-io/__tests__/lib/ki-help/faq-content.test.ts
git commit -m "feat(ki-help): add KI_HELP_FAQ static content (7 items)"
```

---

## Task 2: KiHelpPulseDot Move + asButton-Modus

**Files:**
- Move: `nachbar-io/app/(auth)/register/components/KiHelpPulseDot.tsx` → `nachbar-io/components/ki-help/KiHelpPulseDot.tsx`
- Modify: `nachbar-io/__tests__/app/register-ki-help-pulse-dot.test.tsx` (Import-Pfad)
- Create: `nachbar-io/__tests__/components/ki-help/KiHelpPulseDot-asButton.test.tsx`
- Modify: `nachbar-io/app/(auth)/register/components/RegisterStepAiConsent.tsx` (nur Import-Pfad, Funktionalität unverändert)

**Step 2.1: Failing Test fuer asButton-Modus schreiben**

```tsx
// nachbar-io/__tests__/components/ki-help/KiHelpPulseDot-asButton.test.tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KiHelpPulseDot } from "@/components/ki-help/KiHelpPulseDot";

describe("KiHelpPulseDot — asButton-Modus", () => {
  afterEach(() => cleanup());

  it("rendert ohne asButton als dekoratives span (aria-hidden)", () => {
    render(<KiHelpPulseDot data-testid="dot" />);
    const node = screen.getByTestId("dot");
    expect(node.tagName).toBe("SPAN");
    expect(node).toHaveAttribute("aria-hidden", "true");
  });

  it("rendert mit asButton als <button> mit aria-label", () => {
    render(
      <KiHelpPulseDot
        asButton
        ariaLabel="Hilfe zur KI-Hilfe öffnen"
        data-testid="dot-btn"
      />,
    );
    const node = screen.getByTestId("dot-btn");
    expect(node.tagName).toBe("BUTTON");
    expect(node).toHaveAttribute("type", "button");
    expect(node).toHaveAttribute("aria-label", "Hilfe zur KI-Hilfe öffnen");
    expect(node).not.toHaveAttribute("aria-hidden");
  });

  it("ruft onClick im asButton-Modus auf", () => {
    const onClick = vi.fn();
    render(
      <KiHelpPulseDot
        asButton
        ariaLabel="Hilfe öffnen"
        onClick={onClick}
        data-testid="dot-btn"
      />,
    );
    fireEvent.click(screen.getByTestId("dot-btn"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("behaelt motion-safe-Klasse fuer prefers-reduced-motion (beide Modi)", () => {
    const { unmount } = render(<KiHelpPulseDot data-testid="dot" />);
    expect(screen.getByTestId("dot").innerHTML).toMatch(/motion-safe/);
    unmount();
    render(
      <KiHelpPulseDot
        asButton
        ariaLabel="x"
        data-testid="dot-btn"
      />,
    );
    expect(screen.getByTestId("dot-btn").innerHTML).toMatch(/motion-safe/);
  });
});
```

**Step 2.2: Test laufen lassen → MUSS rot sein**

```bash
cd nachbar-io
npx vitest run __tests__/components/ki-help/KiHelpPulseDot-asButton.test.tsx
```

Erwartet: FAIL — `Cannot find module '@/components/ki-help/KiHelpPulseDot'`.

**Step 2.3: Component verschieben + asButton-Modus implementieren**

```tsx
// nachbar-io/components/ki-help/KiHelpPulseDot.tsx
"use client";

import type { HTMLAttributes, ButtonHTMLAttributes } from "react";

// Dekorativer KI-Hilfe-Punkt im AiConsent-Step.
// Zwei Modi:
// - decorative (default): <span aria-hidden="true">. Kein KI-Call.
// - asButton: <button> mit aria-label fuer Click-Handler (z.B. FAQ-Sheet-Trigger).
// CSS-only Pulse mit prefers-reduced-motion-Schutz via Tailwind motion-safe-Variante.

type DecorativeProps = HTMLAttributes<HTMLSpanElement> & {
  asButton?: false;
};
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asButton: true;
  ariaLabel: string;
};

type Props = DecorativeProps | ButtonProps;

function PulseInner() {
  return (
    <>
      <span
        data-pulse-outer
        className="motion-safe:animate-[ki-help-pulse_2.4s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-quartier-green/25"
      />
      <span
        data-pulse-inner
        className="relative inline-flex h-2.5 w-2.5 rounded-full bg-quartier-green"
      />
    </>
  );
}

export function KiHelpPulseDot(props: Props) {
  if (props.asButton) {
    const { asButton: _ignored, ariaLabel, className, ...rest } = props;
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        className={
          "relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-quartier-green/50 " +
          (className ?? "")
        }
        {...rest}
      >
        <PulseInner />
      </button>
    );
  }
  const { asButton: _ignored2, className, ...rest } = props;
  return (
    <span
      aria-hidden="true"
      className={
        "relative inline-flex h-6 w-6 shrink-0 items-center justify-center " +
        (className ?? "")
      }
      {...rest}
    >
      <PulseInner />
    </span>
  );
}
```

**Step 2.4: Alten Pfad löschen**

```bash
git rm nachbar-io/app/\(auth\)/register/components/KiHelpPulseDot.tsx
```

**Step 2.5: Bestehenden Test umziehen (Import-Pfad anpassen)**

In `nachbar-io/__tests__/app/register-ki-help-pulse-dot.test.tsx`:

```diff
-import { KiHelpPulseDot } from "@/app/(auth)/register/components/KiHelpPulseDot";
+import { KiHelpPulseDot } from "@/components/ki-help/KiHelpPulseDot";
```

**Step 2.6: Caller in `RegisterStepAiConsent.tsx` umziehen**

```diff
-import { KiHelpPulseDot } from "./KiHelpPulseDot";
+import { KiHelpPulseDot } from "@/components/ki-help/KiHelpPulseDot";
```

**Step 2.7: Beide Tests laufen lassen → MUSS grün sein**

```bash
cd nachbar-io
npx vitest run \
  __tests__/components/ki-help/KiHelpPulseDot-asButton.test.tsx \
  __tests__/app/register-ki-help-pulse-dot.test.tsx
```

Erwartet: alle PASS (3 alte + 4 neue = 7 Tests).

**Step 2.8: Commit**

```bash
git add nachbar-io/components/ki-help/KiHelpPulseDot.tsx \
        nachbar-io/app/\(auth\)/register/components/RegisterStepAiConsent.tsx \
        nachbar-io/__tests__/components/ki-help/KiHelpPulseDot-asButton.test.tsx \
        nachbar-io/__tests__/app/register-ki-help-pulse-dot.test.tsx
git rm nachbar-io/app/\(auth\)/register/components/KiHelpPulseDot.tsx
git commit -m "refactor(ki-help): move KiHelpPulseDot to components/ki-help + add asButton mode"
```

---

## Task 3: KiHelpFaqSheet Wrapper-Komponente

**Files:**
- Create: `nachbar-io/components/ki-help/KiHelpFaqSheet.tsx`
- Test: `nachbar-io/__tests__/components/ki-help/KiHelpFaqSheet.test.tsx`

**Step 3.1: Failing Test schreiben**

```tsx
// nachbar-io/__tests__/components/ki-help/KiHelpFaqSheet.test.tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KiHelpFaqSheet } from "@/components/ki-help/KiHelpFaqSheet";

describe("KiHelpFaqSheet", () => {
  afterEach(() => cleanup());

  function renderSheet() {
    return render(<KiHelpFaqSheet />);
  }

  it("rendert den Pulse-Dot-Trigger als Button mit aria-label", () => {
    renderSheet();
    const trigger = screen.getByRole("button", {
      name: /Hilfe zur KI-Hilfe öffnen/i,
    });
    expect(trigger).toBeInTheDocument();
  });

  it("Sheet ist initial geschlossen (kein Header sichtbar)", () => {
    renderSheet();
    expect(
      screen.queryByText("Häufige Fragen zur KI-Hilfe"),
    ).not.toBeInTheDocument();
  });

  it("Click auf Trigger oeffnet das Sheet mit Header", () => {
    renderSheet();
    fireEvent.click(
      screen.getByRole("button", { name: /Hilfe zur KI-Hilfe öffnen/i }),
    );
    expect(
      screen.getByText("Häufige Fragen zur KI-Hilfe"),
    ).toBeInTheDocument();
  });

  it("rendert alle 7 FAQ-Fragen als expandierbare Buttons", () => {
    renderSheet();
    fireEvent.click(
      screen.getByRole("button", { name: /Hilfe zur KI-Hilfe öffnen/i }),
    );
    expect(screen.getByText("Was ist die KI-Hilfe?")).toBeInTheDocument();
    expect(
      screen.getByText("Was kann sie später für mich tun?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ist die KI jetzt schon aktiv?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Was passiert mit meinen Daten?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Kann ich die KI später wieder ausschalten?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Was bedeutet Basis, Alltag und Persönlich?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Warum ist Persönlich noch gesperrt?"),
    ).toBeInTheDocument();
  });

  it("Antworten sind initial collapsed", () => {
    renderSheet();
    fireEvent.click(
      screen.getByRole("button", { name: /Hilfe zur KI-Hilfe öffnen/i }),
    );
    // Antwort-Text fuer "what" darf nicht im DOM sein
    expect(
      screen.queryByText(/Eine optionale Funktion, die Ihnen später/),
    ).not.toBeInTheDocument();
  });

  it("Click auf eine Frage expandiert genau diese Antwort", () => {
    renderSheet();
    fireEvent.click(
      screen.getByRole("button", { name: /Hilfe zur KI-Hilfe öffnen/i }),
    );
    fireEvent.click(screen.getByText("Was ist die KI-Hilfe?"));
    expect(
      screen.getByText(/Eine optionale Funktion, die Ihnen später/),
    ).toBeInTheDocument();
    // andere Antworten weiterhin collapsed
    expect(
      screen.queryByText(/Nein. Vor Ihrer Einwilligung passiert nichts/),
    ).not.toBeInTheDocument();
  });

  it("erneuter Click auf dieselbe Frage collapsed sie wieder", () => {
    renderSheet();
    fireEvent.click(
      screen.getByRole("button", { name: /Hilfe zur KI-Hilfe öffnen/i }),
    );
    const question = screen.getByText("Was ist die KI-Hilfe?");
    fireEvent.click(question);
    fireEvent.click(question);
    expect(
      screen.queryByText(/Eine optionale Funktion, die Ihnen später/),
    ).not.toBeInTheDocument();
  });

  it("Click auf eine andere Frage schliesst die vorige (nur eine offen)", () => {
    renderSheet();
    fireEvent.click(
      screen.getByRole("button", { name: /Hilfe zur KI-Hilfe öffnen/i }),
    );
    fireEvent.click(screen.getByText("Was ist die KI-Hilfe?"));
    fireEvent.click(screen.getByText("Ist die KI jetzt schon aktiv?"));
    expect(
      screen.queryByText(/Eine optionale Funktion, die Ihnen später/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Nein. Vor Ihrer Einwilligung passiert nichts/),
    ).toBeInTheDocument();
  });

  it("aria-expanded reflektiert offen/geschlossen-Status", () => {
    renderSheet();
    fireEvent.click(
      screen.getByRole("button", { name: /Hilfe zur KI-Hilfe öffnen/i }),
    );
    const questionBtn = screen
      .getByText("Was ist die KI-Hilfe?")
      .closest("button");
    expect(questionBtn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(questionBtn!);
    expect(questionBtn).toHaveAttribute("aria-expanded", "true");
  });
});
```

**Step 3.2: Test laufen lassen → MUSS rot sein**

```bash
cd nachbar-io
npx vitest run __tests__/components/ki-help/KiHelpFaqSheet.test.tsx
```

Erwartet: FAIL — `Cannot find module '@/components/ki-help/KiHelpFaqSheet'`.

**Step 3.3: Komponente implementieren (kontrollierter Modus)**

```tsx
// nachbar-io/components/ki-help/KiHelpFaqSheet.tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { KiHelpPulseDot } from "@/components/ki-help/KiHelpPulseDot";
import { KI_HELP_FAQ } from "@/lib/ki-help/faq-content";

// Touchpoint 2 des KI-Hilfe-Begleiters: Tap auf Pulse-Dot oeffnet Bottom-Sheet
// mit 7 vordefinierten Q&A. Komplett client-side, kein LLM, kein Backend, kein Persist.
// Kontrollierter Modus (open/onOpenChange) wie BugReportButton.tsx.
export function KiHelpFaqSheet() {
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setOpenId(null); // Wieder-Oeffnen zeigt alle collapsed
  }

  return (
    <>
      <KiHelpPulseDot
        asButton
        ariaLabel="Hilfe zur KI-Hilfe öffnen"
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-lg rounded-t-2xl p-0"
        >
          <header className="border-b border-border p-4">
            <h2 className="text-base font-semibold text-anthrazit">
              Häufige Fragen zur KI-Hilfe
            </h2>
          </header>
          <div className="max-h-[70vh] overflow-y-auto p-4">
            <ul className="space-y-2">
              {KI_HELP_FAQ.map(({ id, question, answer }) => {
                const isOpen = openId === id;
                return (
                  <li
                    key={id}
                    className="rounded-lg border border-border"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenId(isOpen ? null : id)}
                      className="flex w-full items-start justify-between gap-3 p-3 text-left"
                    >
                      <span className="font-medium text-anthrazit">
                        {question}
                      </span>
                      <ChevronDown
                        className={
                          "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform " +
                          (isOpen ? "rotate-180" : "")
                        }
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <p className="border-t border-border p-3 text-sm text-muted-foreground">
                        {answer}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

**Step 3.4: Test laufen lassen → MUSS grün sein**

```bash
cd nachbar-io
npx vitest run __tests__/components/ki-help/KiHelpFaqSheet.test.tsx
```

Erwartet: 9/9 PASS.

**Hinweis fuer Test-Hänger:** Wenn das Sheet im JSDOM nicht via `Click` öffnet, base-ui Dialog-Mocking nötig. Erste Mitigation: in `__tests__/setup.ts` prüfen, ob bereits JSDOM-Setup für Dialog existiert. Falls Test hängt, im Test mit `await screen.findByText(...)` statt `screen.getByText(...)` arbeiten.

**Step 3.5: Commit**

```bash
git add nachbar-io/components/ki-help/KiHelpFaqSheet.tsx \
        nachbar-io/__tests__/components/ki-help/KiHelpFaqSheet.test.tsx
git commit -m "feat(ki-help): add KiHelpFaqSheet wrapper with controlled-mode Sheet"
```

---

## Task 4: RegisterStepAiConsent — KiHelpFaqSheet einbauen

**Files:**
- Modify: `nachbar-io/app/(auth)/register/components/RegisterStepAiConsent.tsx`
- Modify: `nachbar-io/__tests__/app/register-ai-consent.test.tsx` (Test-Erweiterung)

**Step 4.1: Failing Test fuer Anbindung schreiben**

In `nachbar-io/__tests__/app/register-ai-consent.test.tsx` zwei neue Test-Cases ergänzen:

```tsx
it("rendert den KI-Hilfe-Pulse-Dot als Button mit aria-label", () => {
  // Render-Setup wie bestehende Tests
  const trigger = screen.getByRole("button", {
    name: /Hilfe zur KI-Hilfe öffnen/i,
  });
  expect(trigger).toBeInTheDocument();
});

it("Click auf Pulse-Dot oeffnet FAQ-Sheet mit Header", () => {
  fireEvent.click(
    screen.getByRole("button", { name: /Hilfe zur KI-Hilfe öffnen/i }),
  );
  expect(
    screen.getByText("Häufige Fragen zur KI-Hilfe"),
  ).toBeInTheDocument();
});
```

**Step 4.2: Tests laufen lassen → MUSS rot sein**

```bash
cd nachbar-io
npx vitest run __tests__/app/register-ai-consent.test.tsx
```

Erwartet: FAIL bei den beiden neuen Cases (kein Button mit dem aria-label).

**Step 4.3: `RegisterStepAiConsent.tsx` anpassen**

Die heutige Stelle, an der `<KiHelpPulseDot />` direkt im Hero-Bereich gerendert wird, durch `<KiHelpFaqSheet />` ersetzen:

```diff
-import { KiHelpPulseDot } from "@/components/ki-help/KiHelpPulseDot";
+import { KiHelpFaqSheet } from "@/components/ki-help/KiHelpFaqSheet";
...
-        <KiHelpPulseDot />
+        <KiHelpFaqSheet />
```

(Exakte Position via `Read` auf `RegisterStepAiConsent.tsx` im Implementations-Moment lokalisieren — heutiger Bau hat den Pulse-Dot im Hero-Card-Header.)

**Step 4.4: Tests laufen lassen → MUSS grün sein**

```bash
cd nachbar-io
npx vitest run __tests__/app/register-ai-consent.test.tsx
```

Erwartet: alle PASS (bestehende + 2 neue).

**Step 4.5: Commit**

```bash
git add nachbar-io/app/\(auth\)/register/components/RegisterStepAiConsent.tsx \
        nachbar-io/__tests__/app/register-ai-consent.test.tsx
git commit -m "feat(register): wire KiHelpFaqSheet into AiConsent step"
```

---

## Task 5: Verifikation lokal

**Step 5.1: Volle Test-Subset-Suite**

```bash
cd nachbar-io
npx vitest run \
  __tests__/lib/ki-help/faq-content.test.ts \
  __tests__/components/ki-help/KiHelpPulseDot-asButton.test.tsx \
  __tests__/components/ki-help/KiHelpFaqSheet.test.tsx \
  __tests__/app/register-ki-help-pulse-dot.test.tsx \
  __tests__/app/register-ai-consent.test.tsx
```

Erwartet: alle PASS.

**Step 5.2: Type-Check**

```bash
cd nachbar-io
npx tsc --noEmit
```

Erwartet: 0 Errors.

**Step 5.3: ESLint**

```bash
cd nachbar-io
npx eslint \
  components/ki-help/KiHelpFaqSheet.tsx \
  components/ki-help/KiHelpPulseDot.tsx \
  lib/ki-help/faq-content.ts \
  app/\(auth\)/register/components/RegisterStepAiConsent.tsx
```

Erwartet: 0 Warnings/Errors.

**Step 5.4: Optional Browser-Smoke**

Wenn nötig, gleicher Pfad wie gestern Abend: temp `app/(test)/preview-ai-consent/page.tsx` + Route-Whitelist-Bypass, Mobile + Desktop snapshot, prüfen Pulse-Dot ist klickbar und Sheet öffnet, alle 7 Items expandieren/collapsed. Temp-Files **immer revertieren**.

Heute überspringbar wenn die 5 Test-Files vollständig grün sind und das Pattern (kontrollierter Modus) bereits in `BugReportButton.tsx` produktiv läuft.

**Step 5.5: Verifikations-Commit (nur wenn Smoke gelaufen ist)**

Sonst keinen Commit, dieser Schritt ist Read-Only.

---

## Task 6: Memory-Update

**Files:**
- Modify: `~/.claude/projects/.../memory/topics/ki-begleiter-stufen.md`

**Step 6.1: Topic-File aktualisieren**

`Touchpoint 2: FAQ-Sheet via Pulse-Dot` von "GEPARKT" auf "DONE" setzen, mit Commit-Range-Pointer und Test-Counts.

```bash
# In Auto-Memory-Verzeichnis
# Eintrag aendern: "Touchpoint 2 — DONE 2026-04-28 (Commit-Range <range>, ~21 neue Tests)"
```

**Step 6.2: Memory-Commit (Auto-Memory ist eigenes Verzeichnis, kein Repo-Commit nötig)**

Wenn der Auto-Memory-Save automatisch passiert, hier nichts tun. Sonst manuell schreiben.

---

## Was NICHT zum Plan gehört (bewusst out)

- **Push** der Commits — bleibt in der eigenen Push-Session zusammen mit P3 Vercel-Env-Repair und P4 GmbH-Push.
- **`/codex:review`** über die neuen Commits — macht erst Sinn als zusammenhängender Pass kurz vor dem Push, nicht inline.
- **Pre-Scripted Tour** (Phase 2b) — eigener Workstream nach Push.
- **Settings-Trigger** für KiHelpFaqSheet — kommt mit `AiHelpSettingsToggle`.
- **Such-Filter / Persistierung** — YAGNI bei 7 Items.

---

## Geschätzter Aufwand

- Task 1: ~10 min
- Task 2: ~15 min (Move + 2 Tests + 2 Caller-Anpassungen)
- Task 3: ~25 min (Wrapper + 9 Tests)
- Task 4: ~10 min (2 Test-Cases + 1-Line-Change)
- Task 5: ~5 min (vitest + tsc + eslint, Browser-Smoke optional)
- Task 6: ~3 min (Memory-Update)

**Wallclock: ~60–75 min** (deckt sich mit Design-Schätzung 1–2 h inkl. Plan-Phase).

---

## Founder-Approve-Punkte vor Implementation-Start

- [ ] Abweichung „kontrollierter Modus statt asChild" OK?
- [ ] Bite-Size-Granularität OK (6 Tasks, 5 Code-Commits + 1 Memory-Update)?
- [ ] Subagent-Driven-Development oder Linear-Execution?
