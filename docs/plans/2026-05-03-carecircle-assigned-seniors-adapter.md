# CareCircle Assigned-Seniors Adapter

Stand: 2026-05-03 abend

## Scope

Enger CareCircle-/Care-Privacy-Haertungsblock fuer `/care/meine-senioren`.
M4 Pflegekassen-PDF bleibt blockiert, keine Prod-Aktion, kein Deploy, keine
Migration angewendet, keine Provider-/Env-/Kosten-Aenderung.

## Pre-Check

Durchgefuehrt:

```powershell
rg -n "care_helpers|caregiver_links|getCareCircle|CareCircle|care circle|circle_events|emergency_contacts|heartbeat_visible|mapCaregiverRelationshipToRole|AssignedSeniors|meine-senioren" app modules lib supabase __tests__ docs -g '!node_modules'
rg -n "is_care_helper_for\(|care_helper_role\(|care_helpers" supabase\migrations supabase\rollbacks lib modules app __tests__ -g '!node_modules'
rg -n "emergency_contacts|field-encryption|encryptSensitiveField|decryptSensitiveField|sensitive" app modules lib __tests__ -g '!node_modules'
```

Gefunden:

- `docs/21_CARECIRCLE_DOMAIN_MODEL.md` legt `caregiver_links` als
  CareCircle-Master fest.
- `modules/care/services/permissions.ts` und `modules/care/hooks/useCareRole.ts`
  haben bereits einen `caregiver_links`-Fallback.
- `modules/care/hooks/useAssignedSeniors.ts` lud fuer `/care/meine-senioren`
  bisher nur Legacy-`care_helpers.assigned_seniors`.
- Migration 186 bereitet die RLS-Bruecke vor, wurde hier aber nicht angewendet.

## TDD

RED:

```powershell
npx vitest run __tests__/hooks/care-supabase-hooks.test.ts -t "laedt aktive CareCircle-Links"
```

Ergebnis: Test scheiterte, weil `caregiver_links` nicht abgefragt wurde.

GREEN:

```powershell
npx vitest run __tests__/hooks/care-supabase-hooks.test.ts -t "laedt aktive CareCircle-Links"
npx vitest run __tests__/hooks/care-supabase-hooks.test.ts
```

Ergebnis: gezielter Test und Hook-Testdatei gruen.

## Implementiert

- `useAssignedSeniors` nutzt Legacy-`care_helpers` weiter vorrangig.
- Wenn kein Legacy-Assignment vorhanden ist, fragt der Hook aktive
  `caregiver_links` (`revoked_at is null`) fuer den aktuellen Caregiver ab.
- Die geladenen `resident_id`s werden dedupliziert und anschliessend wie bisher
  ueber `users` in die UI-Struktur gemappt.
- Die erste `relationship_type` wird mit dem bestehenden
  `mapCaregiverRelationshipToRole()` auf die alte Care-Rolle gemappt.

## Verifikation

Gruen:

```powershell
npx vitest run __tests__/hooks/care-supabase-hooks.test.ts __tests__/lib/care/permissions.test.ts
npm run lint
npx tsc --noEmit
```

Ergebnis:

- Vitest: 2 Dateien / 30 Tests passed.
- ESLint: exit 0.
- TypeScript: exit 0.
