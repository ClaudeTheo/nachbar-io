# Audit-Log-Smoke-Test Bericht

Datum: 2026-04-30
Block: G3
Status: blocked

## Ziel

Browser-Smoke fuer den Admin-Audit-Log-Reader auf `http://localhost:3000/admin`:

- Empty-State vor dem ersten Toggle pruefen.
- Zwei bis drei Feature-Flags togglen.
- Audit-Log-Eintraege fuer Zeit, Flag-Key, Aktion, vorher/nachher, Wer und Reason pruefen.
- Screenshots unter `docs/plans/2026-04-30-audit-log-smoke-test-screenshots/` ablegen.

## Pre-Check

- `app/(app)/admin/components/FeatureFlagAuditLog.tsx` existiert.
- `supabase/migrations/176_feature_flags_audit_log.sql` existiert.
- Migration 176 legt `public.feature_flags_audit_log`, `last_change_reason`, RLS-Select fuer Admins und den Trigger `feature_flags_audit_log_trigger` an.
- `FeatureFlagAuditLog.tsx` liest die letzten 50 Eintraege aus `feature_flags_audit_log`, zeigt Loading-Skeleton, Empty-State und Flag-Key-Filter.

## Ausfuehrung

T0: 2026-04-30 18:04 +02:00

1. `npm run supabase:status` geprueft: Script existiert in `package.json` nicht.
2. `npx supabase status` geprueft: Docker Desktop war zunaechst nicht aktiv.
3. Docker Desktop lokal gestartet.
4. `npx supabase start` versucht.
5. Erster Startversuch blockierte auf Port `54322`, weil ein anderer lokaler Supabase-Stack `projekt-nahraum-app` lief.
6. Der laufende Stack wurde lokal inspiziert:
   - `public.feature_flags_audit_log` fehlte.
   - `public.feature_flags` fehlte.
   - `public.users` fehlte.
   - Ergebnis: falscher/leerer lokaler Stack, fuer G3 nicht nutzbar.
7. Der lokale Stack `projekt-nahraum-app` wurde gestoppt.
8. `npx supabase start` fuer dieses Repo erneut versucht.
9. Start brach bei Migration 019 ab:

```text
ERROR: relation "care_helpers" does not exist (SQLSTATE 42P01)
At statement: 1
CREATE OR REPLACE FUNCTION is_care_helper_for(p_senior_id uuid)
...
SELECT 1 FROM care_helpers
```

## Befund

Der Browser-Smoke konnte nicht seriös gestartet werden, weil der lokale Supabase-Replay vor Migration 176 stoppt. Cloud-Modus wurde bewusst nicht genutzt, weil Migration 176 nicht auf Prod applied ist und Prod-DB-Schreibaktionen rote Zone sind.

## Screenshots

Keine Screenshots erzeugt, weil kein valider lokaler Admin-Smoke moeglich war.

## Empfehlung

Fix-noetig vor G3-Fortsetzung:

1. Lokalen Migrations-Replay-Blocker bei Migration 019 beheben oder eine saubere lokale Test-Baseline bereitstellen.
2. Danach Migration 176 lokal anwenden und G3 erneut ausfuehren.
3. Alternativ eine nicht-produktive Supabase-Test-Branch mit Mig 176 nutzen, wenn dafuer ein freigegebener Connector/Workflow bereitsteht.

Keine Prod-Migration, kein Prod-Write und kein Vercel-Deploy wurden ausgefuehrt.
