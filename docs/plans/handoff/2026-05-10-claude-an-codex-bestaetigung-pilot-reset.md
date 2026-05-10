# Codex-Auftrag: Pilot-Reset bestaetigen (Read-only)

**Datum:** 2026-05-10
**Owner:** claude → codex
**Auftrag:** Bestaetige meinen Pilot-Reset Read-only, bevor ich oder Thomas weitermachen.

## Was ich gemacht habe (Kurzfassung)

1. Pre-Pilot-Reset der Prod-DB nach Founder-Go `PROD-DELETE-GO: synthetische/Test-User löschen; ThomasTh@gmx.de strikt behalten.`
2. Helper + TDD-Tests + Doku, drei lokale Commits → gepusht zu origin/master:
   - `a8ee62e feat(admin): pilot-reset users cleanup helper (Founder-Allowlist)`
   - `70fa5e2 docs(cleanup): Pilot-Reset Prod-User-DELETE — 1183->1, Founder erhalten`
   - `a2e8745 docs(cleanup): UGC-Reset-Nachtrag fuer Pilot-Vorbereitung`
3. master==origin==`a2e8745`. Live (`1e3eb08`) ist nicht aktualisiert.
4. Memory-Regel `project_nachbar_io_zero_real_users.md` durable abgelegt: 0 echte Nutzer bis Pilotstart, UGC ist loeschbar, Quartier-Konfig bleibt, Founder strikt geschuetzt.

## Was du bestaetigen sollst

### A) Code-Review der drei Commits

```bash
git show a8ee62e --stat
git show 70fa5e2 --stat
git show a2e8745 --stat
```

Pruefe:

- `lib/admin/pilot-reset-users-cleanup.ts`: Allowlist case-insensitive (`PILOT_RESET_FOUNDER_ALLOWLIST = ["thomasth@gmx.de"]` lowercase, `email?.toLowerCase()` beim Vergleich). Bestaetigungs-Token-Format `PILOT-RESET-LOESCHEN:<count>`. Reihenfolge Referenztabellen → public.users → auth.users.
- `__tests__/admin/pilot-reset-users-cleanup.test.ts`: 11 Tests, deckt case-mixed `ThomasTh@gmx.de`, `THOMASTH@GMX.DE`, `additionalAllowlistEmails`, `requireFounderPresent`, FK-Fehler-Propagation, leere Liste.
- `docs/plans/2026-05-10-pilot-reset-users-prod-delete.md`: Audit-Trail mit allen Schritten (Trigger temp disable, prevention_*-TRUNCATE, NO-ACTION-Loop, SET-NULL/NOT-NULL-Konflikt-Tabellen, public.users + auth.users DELETE, Trigger re-enable) und UGC-Nachtrag.

### B) Read-only Pruefung der Prod-DB

Nutze Supabase-MCP (Project `uylszchlyhbpbmslcnka`, eu-central-1) oder lokal mit Service-Role.

Erwartung:

```sql
-- Erwartet: { total_public_users: 1, total_auth_users: 1, founder_email: "thomasth@gmx.de" }
SELECT
  (SELECT COUNT(*) FROM public.users) AS total_public_users,
  (SELECT COUNT(*) FROM auth.users) AS total_auth_users,
  (SELECT email FROM auth.users LIMIT 1) AS founder_email,
  (SELECT id FROM public.users LIMIT 1) AS founder_id;
```

Erwartet:
- `total_public_users = 1`
- `total_auth_users = 1`
- `founder_email = thomasth@gmx.de`
- `founder_id = dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd`

Synthetik-Selektor:

```sql
-- Erwartet: 0
SELECT COUNT(*) FROM public.users
 WHERE settings->>'is_test_user' = 'true'
    OR display_name = 'E2E Testnutzer'
    OR display_name LIKE 'E2E Testnutzer %'
    OR LOWER(display_name) LIKE 'ai-test%'
    OR LOWER(display_name) LIKE 'test-%'
    OR display_name ~ '^[A-Za-zÄÖÜäöüß]+\s[A-Z]\.$'
    OR display_name ILIKE 'AI-Test %';
```

UGC-Tabellen leer:

```sql
SELECT 'notifications' AS t, COUNT(*) FROM public.notifications
UNION ALL SELECT 'heartbeats', COUNT(*) FROM public.heartbeats
UNION ALL SELECT 'security_events', COUNT(*) FROM public.security_events
UNION ALL SELECT 'alerts', COUNT(*) FROM public.alerts
UNION ALL SELECT 'bug_reports', COUNT(*) FROM public.bug_reports
UNION ALL SELECT 'care_audit_log', COUNT(*) FROM public.care_audit_log
UNION ALL SELECT 'civic_audit_log', COUNT(*) FROM public.civic_audit_log
UNION ALL SELECT 'points_log', COUNT(*) FROM public.points_log
UNION ALL SELECT 'organizations', COUNT(*) FROM public.organizations
UNION ALL SELECT 'invite_codes', COUNT(*) FROM public.invite_codes
UNION ALL SELECT 'household_members', COUNT(*) FROM public.household_members;
```

Erwartet: alle 0.

Konfig-Tabellen erhalten:

```sql
SELECT 'quarters' AS t, COUNT(*) FROM public.quarters
UNION ALL SELECT 'municipal_config', COUNT(*) FROM public.municipal_config
UNION ALL SELECT 'households', COUNT(*) FROM public.households
UNION ALL SELECT 'feature_flags', COUNT(*) FROM public.feature_flags;
```

Erwartet: `quarters=5`, `municipal_config=5`, `households=56`, `feature_flags=50`.

care_audit_log Trigger aktiv:

```sql
SELECT t.tgname, t.tgenabled
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'care_audit_log' AND NOT t.tgisinternal;
```

Erwartet: beide `tgenabled = O` (Origin = aktiv).

### C) Lokale Verifikation

```bash
cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"
git fetch origin
git log origin/master --oneline -5  # erwarte a2e8745 als Top
npx vitest run __tests__/admin/pilot-reset-users-cleanup.test.ts  # 11/11
npx tsc --noEmit
npm run lint
```

## Was du NICHT machen sollst

- Kein DELETE/TRUNCATE/UPDATE auf Prod (nur Read-only).
- Keine neuen Commits oder Pushes.
- Kein Vercel-Deploy.
- Keine Vercel-Env-Aenderung.
- Keine Provider-/Billing-Aenderung.
- Wenn etwas anders ist als oben beschrieben: STOP und mir/Thomas melden, was abweicht.

## Antwort bitte als Markdown

Im selben handoff-Ordner unter `2026-05-10-codex-an-claude-bestaetigung-pilot-reset.md` mit:

1. Tabelle aller erwarteten vs. tatsaechlichen Werte aus Sektion B.
2. Tests-Output (11/11, tsc Exit 0, lint clean).
3. Code-Review-Kommentare zu den drei Commits (Sektion A).
4. Eindeutige Aussage: "Pilot-Reset bestaetigt" ODER "Abweichung gefunden: ...".

Kein Push noetig — Thomas mergt deinen Bericht selbst, falls er ihn auf master will.
