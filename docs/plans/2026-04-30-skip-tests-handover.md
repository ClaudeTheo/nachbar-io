# Skip-Test-Handover 2026-04-30

Status: Block F Code-Hygiene
Owner: Codex

## Pre-Check

- `rg "it\\.skip|billing-checkout|hilfe/tasks"` fand drei aktive Vitest-Skips:
  - `__tests__/api/billing-checkout.test.ts`
  - `__tests__/app/hilfe/tasks/page.test.tsx` (2 Tests)
- Memory nannte `__tests__/hilfe/tasks/page.test.tsx`; der reale aktuelle Pfad ist `__tests__/app/hilfe/tasks/page.test.tsx`.
- Skip-Ursprungscommit: `226f390 test(skip): phase-1-drift + maybeSingle-mock als separate tickets`.

## Billing Checkout

Datei: `__tests__/api/billing-checkout.test.ts`

Status: bleibt bewusst `it.skip`.

Grund:

- Der Test erwartet, dass `pro_community` die erste Planvalidierung passiert und danach ohne `quarterId` mit einer `quarterId`-Meldung scheitert.
- Der aktuelle Produktcode erlaubt in `lib/services/billing-checkout.service.ts` absichtlich nur `VALID_PAID_PLANS = ["plus"]`.
- Der Kommentar im Service begrenzt Phase 1 auf Plus. Pro Community bleibt B2B-Direktvertrag und braucht bei Aktivierung auch DB-Constraint- und UI-Pruefung.

Reaktivierung:

- TODO: blocked by `pro_community` activation in `VALID_PAID_PLANS`.
- Erst reaktivieren, wenn B2B/Billing-Scope, DB-Constraint und UI bewusst freigegeben sind.

## Hilfe Tasks

Datei: `__tests__/app/hilfe/tasks/page.test.tsx`

Status: beide Tests reaktiviert.

Grund:

- Die Produktionsseite fragt heute mehrere Tabellen in Reihenfolge ab: `neighborhood_helpers`, `help_matches`, `help_requests`, `users`.
- Der alte Test-Mock modellierte noch einen einzelnen Query-Pfad und konnte `.maybeSingle()` nicht liefern.
- Der Mock wurde an die aktuelle Supabase-Query-Kette angepasst. Produktionscode blieb unveraendert.

Verifikation:

- `npx vitest run __tests__/app/hilfe/tasks/page.test.tsx` -> 5 passed.
