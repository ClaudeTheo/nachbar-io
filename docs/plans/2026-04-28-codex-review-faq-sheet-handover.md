# Codex-Review-Handover — FAQ-Sheet Phase-2 (Commit-Range `f5d00f5..a3e05df`)

> Übergabe Claude → Codex. Markdown-Handover gemäß `feedback_codex_handover_markdown.md`.
> Kein Plugin-Slash-Command (Founder-Anweisung). Codex prüft die 4 Commits und meldet Findings 1:1 kopierbar zurück (`feedback_codex_format.md`).

## Kontext

**Repo:** `nachbar-io` (master, lokal), 32 Commits ahead origin/master, KEIN Push, Prod auf `10a72f0`.

**HEAD:** `a3e05df`

**Review-Range:** `f5d00f5..a3e05df` (4 Commits, 10 Dateien, +450/−54)

```
f5d00f5  feat(ki-help): add KI_HELP_FAQ static content (7 items)
175155d  refactor(ki-help): move KiHelpPulseDot to components/ki-help + add asButton mode
1a628b2  feat(ki-help): add KiHelpFaqSheet wrapper with controlled-mode Sheet
a3e05df  feat(register): wire KiHelpFaqSheet into AiConsent step
```

**Diff-Befehl für Codex:**

```bash
cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"
git log f5d00f5^..a3e05df --oneline --stat
git diff f5d00f5^..a3e05df
```

## Warum dieser Review

Phase-2-Touchpoint des KI-Hilfe-Begleiters. Pulse-Dot im AiConsent-Onboarding-Step wird klickbar und öffnet Bottom-Sheet mit 7 fest geschriebenen FAQ-Items.

Codex hat gestern Abend (2026-04-27) auf dem **vorigen** Commit-Range bereits 3 echte Findings gefunden (semantischer DB-Drift-Bug, Compliance-Wording-Überversprechen, Type-Guard-Bypass) — alle gefixt in `232ede7`. Heutiger Range ist deutlich kleiner und UI-lastig, aber genau deshalb wert geprüft zu werden.

## Sensitivitäts-Einstufung

**Niedrig.** Reines Frontend + statische Texte:

- Keine PII, keine Care-/Medical-Pfade, keine Prod-DB-Schreibungen.
- Kein neuer Backend-Code, keine Migration, keine RLS-Änderung, keine API-Route geändert.
- Kein neuer LLM-Call, keine externen Datenflüsse.
- FAQ-Texte sind Founder-approved Wording.

OpenAI-Datenfluss zu diesem Diff ist somit unkritisch (kein Klartext-PII, kein Schema). AVV-Status bleibt aber generell offen bis nach GmbH-HR — bitte trotzdem keine sensiblen Pfade in den Review ziehen, die nicht im Range sind.

## Architektur-Kurzfassung (was Codex wissen sollte)

- **Sheet-Primitive:** `components/ui/sheet.tsx` ist ein **base-ui Dialog-Wrapper** (nicht Radix/shadcn). Trigger-API: `render`-Prop, kein `asChild` im klassischen Sinn.
- **Pattern-Entscheidung:** Statt `<SheetTrigger asChild>` → **kontrollierter Modus** (`open`/`onOpenChange`) wie etabliert in `components/BugReportButton.tsx`. Bewusste Abweichung vom Design-Doc, dokumentiert im Plan.
- **KiHelpPulseDot:** Vorher in `app/(auth)/register/components/`, jetzt in `components/ki-help/` (shared). Diskriminierte Union mit zwei Modi:
  - `asButton?: false` (Default) → `<span aria-hidden="true">` (dekorativ, prefers-reduced-motion-aware)
  - `asButton: true` + `ariaLabel: string` → `<button type="button">` mit focus-visible-Ring
- **KiHelpFaqSheet:** Wrapper-Komponente. Lokaler State `open` und `openId`. Single-open-Accordion. `handleOpenChange` resettet `openId` beim Schliessen → Wieder-Öffnen zeigt alle collapsed. Kein Persist, kein Backend, kein LLM.
- **Anbindung:** Im `RegisterStepAiConsent.tsx` Hero-Bereich wurde `<KiHelpPulseDot />` durch `<KiHelpFaqSheet />` ersetzt (1 Zeile). Restliches Wording, 4 Stufen-Cards, Compliance-Footer, Submit-Logik unverändert.

## Was geprüft werden soll

### 1. a11y / WCAG

- `KiHelpPulseDot` asButton-Modus: hat `aria-label`, `type="button"`, `focus-visible:ring-2`. Reicht das für Keyboard-Nutzer? Tab-Reihenfolge im AiConsent-Step plausibel?
- `KiHelpFaqSheet` Accordion-Items: `aria-expanded`. Brauchen wir zusätzlich `aria-controls`/`role="region"` mit eigenem Panel-ID? Senior-Mode-Anforderung 80px Touch-Target — ist die Pulse-Dot-Button-Größe (`h-6 w-6`) zu klein? (CLAUDE.md sagt min. 80px, ist hier vielleicht Ausnahme weil Dekorativ-Trigger im Hero-Card und nicht primärer Action-Button.)
- Sheet-Schluss: Escape-Key + Backdrop-Click — kommt aus base-ui Dialog out-of-the-box, aber Test deckt's nicht ab. Sollte das?

### 2. State-Management / React-Hygiene

- `KiHelpFaqSheet`: `useState` für `open` und `openId` getrennt. Beim Schließen wird `openId=null` gesetzt. Race-Condition denkbar wenn `onOpenChange` zwischen Render-Cycle re-fired? Eher unwahrscheinlich, aber bitte einmal anschauen.
- Diskriminierte Union in `KiHelpPulseDot`: `props.asButton` Type-Guard — TS strict zufrieden, aber clean? Spread `...rest` reicht beide Varianten korrekt durch (data-testid, onClick, etc.)?
- Snapshot-Test in `faq-content.test.ts`: prüft IDs in Reihenfolge. Stabil, oder fragile-bei-jedem-Wording-Update?

### 3. Sheet-Primitive korrekt benutzt

- `<Sheet open={open} onOpenChange={handleOpenChange}>` mit `<SheetContent side="bottom">`. Rest aus dem Sheet-Modul (`SheetHeader`, `SheetTitle`) NICHT verwendet — stattdessen eigener `<header>`. Bewusst (semantisch flexibler) oder Inkonsistenz mit `BugReportButton.tsx` der `SheetHeader`/`SheetTitle` nutzt?
- `showCloseButton` ist Default `true` in `SheetContent` — gibt's also automatisch ein X-Icon oben rechts. Kollidiert das mit unserem eigenen `<header>`? Visuell prüfen wäre Browser-Smoke-Job, aber Codex kann's auf Code-Ebene als Risiko flaggen.

### 4. Tests

- 21 neue Tests, 34/34 grün im Subset (vitest, lokal verifiziert).
- Negativ-Assertions in `faq-content.test.ts` (`data`-Antwort verspricht NICHT „pseudonymisiert"/„AVV"): sinnvoll? Oder zu spezifisch?
- `register-ai-consent.test.tsx` Test 12 nutzt `findByText("Häufige Fragen zur KI-Hilfe")` nach Click — base-ui Sheet-Animation könnte unter Last hängen. Flake-Risiko in CI?

### 5. Wording / Compliance (light)

- 7 FAQ-Items in `lib/ki-help/faq-content.ts`. Wording ist Founder-approved 2026-04-27, aber gegenkontrollieren:
  - Verspricht eine Antwort konkrete Verarbeitung vor Consent? (Codex-Lehre 2026-04-27: AVV-Vorabversprechen ist Falle.)
  - „Persönlich noch gesperrt": klar genug, ohne Lock-In-Suggestion?

### 6. Naming / Konsistenz

- `KI_HELP_FAQ` (uppercase) vs. `KiHelpFaqItem` (PascalCase): TS-üblich, OK.
- File-Pfade: `lib/ki-help/`, `components/ki-help/` — konsistent.
- Kommentare auf Deutsch (Repo-Regel), Variablen English: Stichprobe sieht gut aus, bitte prüfen.

## Was NICHT zu reviewen ist

- Migration / DB / RLS — keine Änderung im Range.
- Backend-Routen / API — keine Änderung im Range.
- Stripe / Billing — keine Änderung.
- Other Onboarding-Steps — nur AiConsent berührt.
- Deployment / Vercel — kein Push, kein Env-Touch.

## Erwarteter Output-Format (kopierbar)

Bitte als Markdown-Tabelle pro Finding, plus zusammenfassendes Verdict:

```markdown
| # | Severity | File:Line | Befund | Vorschlag |
|---|---|---|---|---|
| 1 | low/med/high | path/to/file.ts:42 | Was ist los | Wie zu fixen |

**Verdict:** ship-ready / fix-then-ship / needs-rework
**Geschaetzter Fix-Aufwand:** ~X min
```

## Wichtige Constraints für etwaige Fixes (für Claude im nächsten Block)

- **TDD strict** für jeden Fix: Test zuerst (RED), dann Implementation (GREEN), dann Commit.
- **Keine rote Zone:** kein Push, kein Vercel-Touch, kein Prod-DB-Write.
- **Pre-Check vor Neubau** bleibt Pflicht (`.claude/rules/pre-check.md`).
- Fixes laufen in der nächsten Claude-Session, kommen on-top auf den 4 Commits.

## Referenzen

- Implementation-Plan: `docs/plans/2026-04-28-ki-help-faq-sheet-plan.md`
- Design-Doc: `docs/plans/2026-04-27-ki-help-faq-sheet-design.md`
- Vorheriger Codex-Review-Repair (Lehre): Commit `232ede7`
- AiConsent-Polish-Plan: `docs/plans/2026-04-27-ai-consent-polish-plan.md`
- Memory-Pointer: `topics/ki-begleiter-stufen.md`, `topics/pilot-onboarding.md`
