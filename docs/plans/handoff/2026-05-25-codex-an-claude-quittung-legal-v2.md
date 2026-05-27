# Codex -> Claude Quittung: Legal-v2 BFSG und Wording-Sweep

Datum: 2026-05-25

## Commit

- Commit-Hash: `058c1c5`
- Commit: `chore(legal): bfsg kleinstunternehmen exception + gmbh handelnden note`
- Push: nicht ausgefuehrt
- Prod-DB/Migration/Vercel-Env/Secrets/Billing: nicht beruehrt

## Diff-Stats

```text
058c1c5 chore(legal): bfsg kleinstunternehmen exception + gmbh handelnden note
 __tests__/app/barrierefreiheit-page.test.tsx       |  9 +-
 __tests__/app/legal-ai-copy.test.tsx               |  2 +
 app/barrierefreiheit/page.tsx                      | 68 +++++++++------
 app/impressum/page.tsx                             |  6 ++
 ...-05-25-codex-an-claude-wording-sweep-treffer.md | 96 ++++++++++++++++++++++
 5 files changed, 153 insertions(+), 28 deletions(-)
 create mode 100644 docs/plans/handoff/2026-05-25-codex-an-claude-wording-sweep-treffer.md
```

## TSC Tail

```text
npx tsc --noEmit
exit=0
(keine Ausgabe)
```

## Lint Tail

```text
> nachbar-io@2.5.0 lint
> eslint
```

## Vitest Tail

```text
> nachbar-io@2.5.0 test
> vitest run --run __tests__/app/barrierefreiheit-page.test.tsx __tests__/app/legal-ai-copy.test.tsx __tests__/app/datenschutz-page.test.tsx __tests__/app/richtlinien-page.test.tsx

RUN v4.1.0 C:/Users/thoma/Claud Code/Handy APP/nachbar-io

Test Files  4 passed (4)
Tests       8 passed (8)
Start at    17:18:06
Duration    2.10s (transform 416ms, setup 559ms, import 1.57s, tests 555ms, environment 4.67s)
```

## Build Tail

```text
├ ƒ /tauschen
├ ƒ /terminal/[token]
├ ƒ /testanleitung
├ ƒ /tips
├ ƒ /tips/[id]
├ ƒ /tips/new
├ ƒ /ui-modes-preview
├ ƒ /ui-modi-entscheidungsmatrix
├ ƒ /vouching
├ ƒ /was-steht-uns-zu
├ ƒ /waste-calendar
├ ƒ /welcome
└ ƒ /whohas

ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Hinweis: Build exit=0. Bekannte lokale Stripe-Warnungen erschienen im Build-Log erneut, ohne den Build fehlschlagen zu lassen.

## Diff-Check Tail

```text
exit=0
git diff --check: clean (only CRLF working-copy warnings from Git on Windows, no whitespace errors)
```

## Wording-Sweep

- Trefferliste: `docs/plans/handoff/2026-05-25-codex-an-claude-wording-sweep-treffer.md`
- Gesamttreffer: 60
- Hochrisiko positiv-werbend: 1
- Disclaim/protective: 16
- False-positive/funktionale Fachbegriffe: 42
- Zusaetzlich offen in KI-Wissensbasis: 1

## Offene Punkte

- Claude-Review: `components/landing/AudienceTabs.tsx:127`
- Claude-Review optional: `modules/voice/services/system-prompt.ts:168`
- Eskaliert, nicht direkt per `rg` geprueft: `C:/Users/thoma/Claud Code/Handy APP/QuartierApp_Versionskonzept_2026.docx`
- Eskaliert, nicht direkt per `rg` geprueft: `C:/Users/thoma/Claud Code/Handy APP/Nachbar_io_Investor_Deck_2026.pptx`

## Mini-Audit

Nicht ausgefuehrt, weil diese Welle nur Text, Tests und Handoff-Dokumentation beruehrt hat: keine Auth-/RLS-/Admin-Surface, keine Migration, kein Token-/Secret-/Billing-Pfad.
