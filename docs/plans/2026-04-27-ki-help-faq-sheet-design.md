# 2026-04-27 — KI-Hilfe FAQ-Sheet (Phase-2-Touchpoint, Design)

> Folge-Workstream nach KI-Consent-Polish (heute, Commit-Range
> `dc33f14..2318a8e`). Touchpoint 2: User tippt auf den heute eingeführten
> `KiHelpPulseDot` und bekommt ein FAQ-Sheet mit 7 fest geschriebenen
> Frage-Antwort-Paaren. Komplett client-side, kein LLM, kein Backend,
> kein Persist.
>
> Design steht. Implementation in eigener Session.

## Ziel

Der pulsierende Punkt im Hero-Bereich von `RegisterStepAiConsent` bekommt
eine echte Funktion: Tap öffnet ein Bottom-Sheet (Mobile) bzw. Center-
Modal (Desktop) mit 7 vordefinierten Fragen rund um die KI-Hilfe.

User-getriggert, nicht aufdringlich. Wer Hilfe möchte, tippt drauf. Wer
nicht, wird nicht aufgehalten.

## Out of Scope (heute / morgen)

- **Pre-Scripted Tour** über Onboarding-Steps (Phase 2b, eigener
  Workstream).
- **Live-Q&A** mit echtem LLM. Vor Consent komplett verboten.
- **Backend / API**. Statische Daten in TS-Datei.
- **Persistierung** der zuletzt geöffneten Frage. Jeder Open zeigt alle
  Items collapsed.
- **Settings-Trigger / Welcome-Trigger.** Pulse-Dot ist heute der einzige
  Entry-Point (im AiConsent-Step). Erweiterung später mit
  `AiHelpSettingsToggle`.
- **Such-Filter** über FAQs. YAGNI bei 7 Items.

## Pre-Check-Befund (Pflicht laut `.claude/rules/pre-check.md`)

Codebase-weiter Grep am 2026-04-27 abend:

| Stichwort | Treffer | Bedeutung |
|---|---|---|
| `BottomSheet`, `bottom-sheet`, `Sheet` | mehrere — zentral `components/ui/sheet.tsx` (Base UI Dialog Wrapper, shadcn-style) plus Pattern-Beispiele in `components/sos/SosConfirmationSheet.tsx`, `modules/voice/components/assistant/SheetContent.tsx`, `components/BugReportButton.tsx` | **Adapter, nicht neu bauen.** Sheet-Primitive wird wiederverwendet. |
| `KiHelpFaq`, `KiHelpSheet`, `HelpSheet`, `FaqSheet` | 0 Treffer | Neubau OK, kein Duplikat. |
| `KiHelpPulseDot` | `app/(auth)/register/components/KiHelpPulseDot.tsx` (heute neu) | Pulse-Dot wird klickbar; Komponente bleibt rein dekoratives Visual + neue optionale `onClick`-/`asTriggerOf`-Erweiterung. |
| `FAQ`-Komponenten / -Routen | mehrere mit „FAQ" als String, aber keine generische FAQ-Sheet-Komponente | Nicht relevant; spezifische FAQ-Sheet bauen. |

**Konsequenz:** Wir nutzen `Sheet` aus `components/ui/sheet.tsx` als
Primitiv. Folgen dem Pattern von `SosConfirmationSheet.tsx` /
`BugReportButton.tsx` für Trigger + Content + Close. Keine eigene
Dialog-Lib.

## Architektur

### Komponenten

| Datei | Status | Zweck |
|---|---|---|
| `components/ui/sheet.tsx` | unverändert | Sheet-Primitive (`Sheet`, `SheetTrigger`, `SheetContent`, `SheetClose`, `SheetOverlay`). |
| `components/ki-help/KiHelpFaqSheet.tsx` | NEU | Wrapper-Komponente. Akzeptiert `trigger: ReactNode`. Rendert Sheet mit FAQ-Header, 7 Accordion-Items, Close-Button. |
| `components/ki-help/KiHelpPulseDot.tsx` | UMZUG + Erweiterung | Heute in `app/(auth)/register/components/`. Wird in shared Modul verschoben (für spätere Wiederverwendung in Settings). Bekommt optionale `onClick`-Prop. Wenn gesetzt: rendert als `<button aria-label="Hilfe zur KI-Hilfe öffnen">` statt dekoratives `<span aria-hidden="true">`. |
| `lib/ki-help/faq-content.ts` | NEU | Statische Daten: `export const KI_HELP_FAQ: ReadonlyArray<{ id: string; question: string; answer: string }>`. 7 Items per Founder-Approve. |
| `app/(auth)/register/components/RegisterStepAiConsent.tsx` | ÄNDERUNG | Hero-Card embed `<KiHelpFaqSheet trigger={<KiHelpPulseDot onClick={...} />} />`. Restliches Wording bleibt. |

### Component-Skizze `KiHelpFaqSheet.tsx`

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { KI_HELP_FAQ } from "@/lib/ki-help/faq-content";

interface KiHelpFaqSheetProps {
  trigger: ReactNode; // typically a <KiHelpPulseDot onClick={...} />
}

export function KiHelpFaqSheet({ trigger }: KiHelpFaqSheetProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl p-0">
        <header className="flex items-center justify-between border-b p-4">
          <h2 className="text-base font-semibold text-anthrazit">
            Häufige Fragen zur KI-Hilfe
          </h2>
          <SheetClose
            aria-label="Schließen"
            className="rounded-full p-1 hover:bg-muted"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </SheetClose>
        </header>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          <ul className="space-y-2">
            {KI_HELP_FAQ.map(({ id, question, answer }) => {
              const isOpen = openId === id;
              return (
                <li key={id} className="rounded-lg border border-border">
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
                      className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
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
  );
}
```

### Datenstruktur `lib/ki-help/faq-content.ts`

```ts
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
      "Nachrichten und Hinweise vorlesen, Antworten per Sprache statt per Tippen und beim Formulieren helfen — zum Beispiel: „Kannst du mir diesen Hinweis vorlesen?" oder „Hilf mir, eine kurze Antwort zu formulieren.""
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

### Erweiterung `KiHelpPulseDot.tsx`

Aktuell:

```tsx
export function KiHelpPulseDot(props: HTMLAttributes<HTMLSpanElement>) { ... }
```

Erweitert:

```tsx
import type { HTMLAttributes, ButtonHTMLAttributes } from "react";

type DecorativeProps = HTMLAttributes<HTMLSpanElement> & {
  asButton?: false;
};
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asButton: true;
  ariaLabel: string;
};

export function KiHelpPulseDot(
  props: DecorativeProps | ButtonProps,
) {
  if (props.asButton) {
    const { asButton: _ignored, ariaLabel, ...rest } = props;
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-quartier-green/40"
        {...rest}
      >
        <PulseInner />
      </button>
    );
  }
  const { asButton: _ignored2, ...rest } = props;
  return (
    <span aria-hidden="true" className="..." {...rest}>
      <PulseInner />
    </span>
  );
}
```

`PulseInner` ist der bestehende Visual-Code (Outer-Halo + Inner-Dot).
Bewahrt prefers-reduced-motion-Schutz aus heutigem Bau.

### Anbindung in `RegisterStepAiConsent.tsx`

Stelle wo heute `<KiHelpPulseDot />` rendert wird zu:

```tsx
<KiHelpFaqSheet
  trigger={
    <KiHelpPulseDot
      asButton
      ariaLabel="Hilfe zur KI-Hilfe öffnen"
    />
  }
/>
```

Sheet-`asChild`-Prop reicht den Click-Handler an das Button-Element des
PulseDots durch (Base UI Dialog Standard-Pattern).

## Datenfluss

`KiHelpFaqSheet` ist self-contained. Lokaler State `openId` ist die
einzige Reaktivität. Kein Hoisting, kein Context, kein State-Library-
Eintrag. Beim Schließen des Sheets wird `openId` nicht persistiert —
beim Wieder-Öffnen sind alle Items collapsed.

## a11y

- Trigger: `<button aria-label="Hilfe zur KI-Hilfe öffnen">`. Tab-Index
  natürlich. Focus-Ring sichtbar.
- Sheet: Base UI Dialog liefert Focus-Trap, Escape-Close, Backdrop-
  Click-Close, ARIA-Attribute (`role="dialog"`, `aria-modal="true"`).
- Accordion-Items: `<button aria-expanded={isOpen}>` für jede Frage.
  Antwort als `<p>` darunter, im DOM nur wenn `isOpen=true` (alternativ
  immer im DOM mit `hidden`-Attribut — ggf. Tradeoff prüfen).
- Close-Button hat sichtbares Icon plus `aria-label="Schließen"`.

## Tests (TDD strict)

Neue Test-Files. RED zuerst.

| Datei | Tests |
|---|---|
| `__tests__/components/ki-help/KiHelpFaqSheet.test.tsx` | (1) Render Trigger, Sheet ist initial geschlossen. (2) Klick auf Trigger öffnet Sheet (`role=dialog`). (3) Header sichtbar mit „Häufige Fragen zur KI-Hilfe". (4) Alle 7 FAQ-Fragen als Buttons gerendert. (5) Klick auf eine Frage expandiert nur diese Antwort, nicht andere. (6) Erneuter Klick collapsed wieder. (7) Klick auf Close-Button schließt Sheet. (8) Escape schließt Sheet. (9) Wieder-Öffnen zeigt alle Items collapsed (kein State-Persist). |
| `__tests__/components/ki-help/KiHelpPulseDot-asButton.test.tsx` | (1) Default-Render = `<span aria-hidden="true">`. (2) Mit `asButton` = `<button>` mit `aria-label`-Attribut. (3) Click-Handler wird aufgerufen. (4) prefers-reduced-motion-Klasse weiter vorhanden. |
| `__tests__/lib/ki-help/faq-content.test.ts` | (1) `KI_HELP_FAQ` hat exakt 7 Items. (2) Alle IDs unique. (3) Keine leeren Strings in `question`/`answer`. (4) Antworten enthalten kein verbotenes Wording (Snapshot-Test gegen festes Wording-File). |
| `__tests__/app/register-ai-consent.test.tsx` | Erweiterung: (10) Pulse-Dot-Button mit aria-label im Render-Tree. (11) Klick auf Pulse-Dot öffnet Sheet mit FAQ-Header. |

Test-Befehle:

```bash
cd nachbar-io
npx vitest run \
  __tests__/components/ki-help/KiHelpFaqSheet.test.tsx \
  __tests__/components/ki-help/KiHelpPulseDot-asButton.test.tsx \
  __tests__/lib/ki-help/faq-content.test.ts \
  __tests__/app/register-ai-consent.test.tsx
npx tsc --noEmit
npx eslint \
  components/ki-help/KiHelpFaqSheet.tsx \
  components/ki-help/KiHelpPulseDot.tsx \
  lib/ki-help/faq-content.ts \
  app/\(auth\)/register/components/RegisterStepAiConsent.tsx
```

## Migration

- KiHelpPulseDot wird verschoben: alter Pfad
  `app/(auth)/register/components/KiHelpPulseDot.tsx` → neuer Pfad
  `components/ki-help/KiHelpPulseDot.tsx`. Ein einziger Caller heute
  (RegisterStepAiConsent) — Import-Pfad anpassen.
- Bestehende Tests `__tests__/app/register-ki-help-pulse-dot.test.tsx`
  bleiben funktional, Import-Pfad anpassen.

## Risiken

| Risiko | Maßnahme |
|---|---|
| Sheet-Trigger über `asChild` an Button durchreichen — Base UI Pattern, in unserer Codebase ggf. nicht etabliert | Pre-Check der `Sheet`-Beispiele zeigt, dass `SosConfirmationSheet` und `BugReportButton` das Pattern nutzen. Sicher. |
| KiHelpPulseDot wird zwei Modi haben (decorative vs button) — diskriminierte Union ist TS-streng | Tests decken beide Modi separat ab. |
| FAQ-Wording-Drift mit Datenschutz-Realität (z.B. „Bei Aktivierung pseudonymisiert" als Zusage zu früh) | Founder-approved Wording (siehe Antwort-Drafts). Anpassung 4+2 explizit eingebaut: keine festen Verarbeitungs-Zusagen vor AVV. |
| Bottom-Sheet auf Desktop suboptimal | `side="bottom"` fix; Base UI Sheet ist responsive ohne extra Logik in unserem Stack. Falls Desktop-Layout später hässlich wird, eigener Block. |

## Implementations-Reihenfolge (high-level — eigene Session)

1. Pre-Check (erneut, im Implementation-Moment).
2. `lib/ki-help/faq-content.ts` + Test.
3. `components/ki-help/KiHelpPulseDot.tsx` (Move + asButton-Erweiterung) + Test.
4. `components/ki-help/KiHelpFaqSheet.tsx` + Test (RED zuerst, GREEN dann).
5. `RegisterStepAiConsent.tsx` Anbindung + Test-Erweiterung.
6. Lokale Verifikation: vitest, tsc, eslint, manueller Smoke.
7. Lokal commit (kein Push). Master geht von 26 auf ~31 ahead.

Ein detaillierter Bite-Sized-Plan kommt im `writing-plans`-Schritt der
Implementations-Session, nicht hier.

## Memory / Topics

- `topics/ki-begleiter-stufen.md` Touchpoint-2-Eintrag aktualisieren
  („FAQ-Sheet DONE / TODO").
- Memory-Index unverändert.

## Founder-Approve-Stand

- ✅ Ansatz 1 Minimal-FAQ-Sheet
- ✅ Sheet-Primitives wiederverwenden
- ✅ Pulse-Dot als Trigger
- ✅ Kein Backend / API / Persist
- ✅ Kein LLM vor Consent
- ✅ TDD strict
- ✅ FAQ-Content mit Anpassungen 2 (Wording „Was kann sie tun?") und 4
  (Wording „Was passiert mit meinen Daten?")
- ✅ Stand-für-morgen, keine Implementation heute
