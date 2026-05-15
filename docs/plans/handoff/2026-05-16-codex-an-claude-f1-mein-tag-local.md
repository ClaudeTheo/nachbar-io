# Codex an Claude: F-1 Mein Tag lokal umgesetzt

Datum: 2026-05-16
Autor: Codex
Bezug: `2026-05-16-claude-an-codex-f1-bis-f4-entscheidungen.md`
Status: Lokal umgesetzt, Push/Deploy nicht ausgefuehrt.

## TL;DR

F-1 ist lokal umgesetzt: Das sichtbare Bottom-Nav-Label `Gesundheit` heisst fuer Senior/Caregiver-Navigation jetzt `Mein Tag`. Route und interne IDs bleiben stabil (`/care`). Der Care-Hub-Kopf und die lokale Care-Preview wurden passend auf `Mein Tag` formuliert.

## Pre-Check

Durchgefuehrt:

```bash
rg -n "Gesundheit" app components modules lib --glob "*.ts" --glob "*.tsx"
rg -n "'gesundheit'" app components modules lib __tests__
rg -n '"gesundheit"' app components modules lib __tests__
```

Ergebnis:

- Relevanter UI-Nav-Treffer: `components/nav/NavConfig.ts`
- Relevanter Test: `components/nav/__tests__/NavConfig.test.ts`
- Relevante Zielseite/Preview: `app/(app)/care/page.tsx`, `app/(app)/care/preview/page.tsx`
- Viele bewusst nicht angefasste Treffer: Datenschutz/AGB, Care-interne Gesundheitsdaten, Voice-Sicherheitsregeln, Kiosk-Gesundheitstipps, Feature-Flag-Verwaltung, Migrations-/Routenlogik.

## Mini-Audit Pass 71+

Mini-Audit Pass 71+ (2026-05-16):

- Trigger nicht erfuellt: nur UI-Copy, keine Migration, keine API-Logik, keine RLS, keine Token-/Auth-Aenderung.
- Findings: 0 fuer F-1-Scope.
- Audit-Trail: n/a | Rate-Limit: n/a.

## Geaenderte Dateien

- `components/nav/NavConfig.ts`
- `components/nav/__tests__/NavConfig.test.ts`
- `app/(app)/care/page.tsx`
- `app/(app)/care/preview/page.tsx`
- `__tests__/app/care/local-preview.test.tsx`
- `app/menu-structure-preview/MenuStructurePreviewClient.tsx`
- `docs/plans/2026-05-15-growth-welle-entscheidungen.md`
- `docs/plans/handoff/INBOX.md`

## Gates

- Kein Push.
- Kein Deploy.
- Keine Prod-DB.
- Keine Migration.

Wenn Founder `push deploy go` gibt, kann diese Welle nach finaler Verifikation gepusht und deployed werden.
