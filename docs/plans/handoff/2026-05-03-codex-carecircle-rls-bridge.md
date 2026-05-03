# Codex Handover — CareCircle-RLS-Bruecke

Stand: 2026-05-03 abend
Branch: `master`
Scope: `care_helpers`/`caregiver_links` RLS-Mismatch vorbereitend beheben

## Gemerkte Arbeitsauslegung

Founder-Vollmacht bedeutet: grosse thematische Schritte sind gewuenscht, aber
kein blinder Autopilot. Ich arbeite ab jetzt nach dieser Auslegung:

- Eine Welle hat ein klares Thema und eine klare Risikoachse.
- Push autonom nach gruener Verifikation.
- Kein Prod-Deploy, wenn Vercel-Env, Prod-Migrationen, Provider-Live-Schaltung,
  neue laufende Kosten oder echte personenbezogene KI-Verarbeitung ohne AVV
  beruehrt werden.
- Prod-DB-Apply bleibt Founder-Hand.
- Sobald echte Pilotfamilien onboarden, zurueck zu engerem Modus.

## Harte Linien

- Keine Prod-DB-Schreibaktion.
- Keine Migration angewendet.
- Keine Vercel-Env-Aenderung.
- Kein Deploy.
- Keine Provider-/Kosten-Aenderung.

## Pre-Check

Durchgefuehrt:

```powershell
rg -n "care_helpers|caregiver_links|is_care_helper_for|CareCircle|care circle|circle_events|heartbeat_visible|emergency_contacts" app modules lib supabase __tests__ docs -g '!node_modules'
rg -n "is_care_helper_for\(|care_helper_role\(" supabase\migrations supabase\rollbacks lib modules app __tests__ -g '!node_modules'
```

Gefunden:

- App-seitig hat `modules/care/services/permissions.ts` bereits den Fallback
  von `care_helpers` auf `caregiver_links`.
- RLS-seitig kennen `is_care_helper_for()` und `care_helper_role()` nur
  `care_helpers`.
- Betroffene alte Care-Policies haengen zentral an diesen Funktionen:
  `care_profiles`, `care_sos_alerts`, `care_sos_responses`, `care_checkins`,
  `care_medications`, `care_medication_logs`, `care_appointments`,
  `care_audit_log`, `care_documents` und einzelne Quarter-RLS-Policies.
- Direkte Policy-Duplikation pro Tabelle waere breiter und riskanter als eine
  zentrale Funktions-Bruecke.

## RED

```powershell
npx vitest run __tests__/lib/carecircle-rls-bridge-migration.test.ts
```

Erwartet rot: Migration `186_carecircle_rls_bridge.sql` fehlte.

## Implementiert

- `supabase/migrations/186_carecircle_rls_bridge.sql`
  - Ersetzt `is_care_helper_for(uuid)` zentral.
  - Legacy-`care_helpers` bleibt vorrangig.
  - Aktive `caregiver_links` (`revoked_at is null`) zaehlen als CareCircle-
    Zugriff fuer bestehende RLS-Policies.
  - Ersetzt `care_helper_role(uuid)` zentral.
  - Mapping entspricht App-Service:
    `volunteer -> neighbor`, alle anderen `caregiver_links.relationship_type`
    -> `relative`.
  - Guard via `to_regclass` fuer replay-/drift-taugliches Fail-closed-Verhalten.
- `supabase/rollbacks/186_carecircle_rls_bridge.down.sql`
  - Stellt die Legacy-`care_helpers`-Funktionen wieder her.
- `__tests__/lib/carecircle-rls-bridge-migration.test.ts`
  - Dokumentiert zentrale SQL-Semantik und Migrationsnummer.

## Verifikation

```powershell
npx vitest run __tests__/lib/carecircle-rls-bridge-migration.test.ts __tests__/lib/migration-versions.test.ts __tests__/lib/care-shared-functions-migration.test.ts
```

Ergebnis: 3 Dateien / 6 Tests passed.

```powershell
npx tsc --noEmit
```

Ergebnis: gruen.

## Betriebsnotiz

Diese Welle schreibt nur Migrationsdateien. Sie behebt Production erst nach
Founder-Go fuer `apply_migration` auf Prod. Bis dahin ist der Fix im Repo
vorbereitet, aber nicht live.
