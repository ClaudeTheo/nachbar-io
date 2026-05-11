# New-Session-Handover Codex - nach Quartier-Info Cache-Persistenz

Datum: 2026-05-11
Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
Branch: `master`

## Aktueller Git-Stand

Zum Zeitpunkt dieser Uebergabe:

```text
## master...origin/master
HEAD: 1dea8e7 docs(handoff): update quartier info cache persistence
origin/master: 1dea8e7 docs(handoff): update quartier info cache persistence
```

`master` ist lokal mit `origin/master` synchron. Es wurde in dieser Mini-Session kein Push gemacht; der Remote zeigte beim Check bereits denselben HEAD.

Letzte relevante Commits:

```text
1dea8e7 docs(handoff): update quartier info cache persistence
fb5fae5 fix(db): allow oepnv quartier info cache
a22c515 fix(info-hub): surface cache write failures
bdd5514 docs(handoff): new session after pollen cache smoke
7f192a7 fix(info-hub): refresh legacy pollen cache region
073985e docs(handoff): new session after QA cron infohub
60ae46e docs(handoff): codex QA after cron infohub fixes
```

## Was zuletzt passiert ist

Codex hat nach dem Pollen-Cache-Smoke am offenen Handoff-Punkt `quartier_info_cache`-Persistenz weitergemacht.

Die Details stehen in:

```text
docs/plans/handoff/2026-05-10-codex-an-claude-quartier-info-cache-persistenz.md
```

Kurz:

1. `a22c515 fix(info-hub): surface cache write failures`
   - `runQuartierInfoSync()` prueft Supabase-`upsert`-Fehler jetzt explizit.
   - Wetter-/Pollen-/OEPNV-Zaehler steigen nur noch nach echtem Cache-Write.
   - RLS-/Constraint-Fehler laufen ueber vorhandene `*_error`-Logs.

2. `fb5fae5 fix(db): allow oepnv quartier info cache`
   - Neue File-first-Migration 191:
     `supabase/migrations/191_quartier_info_cache_oepnv_source.sql`
   - Rollback:
     `supabase/rollbacks/191_quartier_info_cache_oepnv_source.down.sql`
   - Erlaubt `source='oepnv'` in `quartier_info_cache`.
   - Wurde nicht auf Prod angewendet.

3. `1dea8e7 docs(handoff): update quartier info cache persistence`
   - Uebergabe an Claude mit Root Cause, TDD/Verifikation und Gates.

## Verifikation der letzten Code-Bloecke

Bereits erledigt und dokumentiert:

```text
npx vitest run __tests__/modules/info-hub/quartier-info-sync.service.test.ts __tests__/lib/quartier-info.service.test.ts __tests__/api/quartier-info-route.test.ts
Test Files 3 passed
Tests 18 passed
Exit 0
```

```text
npx vitest run __tests__/lib/quartier-info-cache-source-migration.test.ts __tests__/lib/migration-versions.test.ts __tests__/modules/info-hub/quartier-info-sync.service.test.ts __tests__/lib/quartier-info.service.test.ts
Test Files 4 passed
Tests 13 passed
Exit 0
```

```text
npx eslint ...
Exit 0

npx tsc --noEmit
Exit 0

git diff --check
Exit 0, nur CRLF-Warnungen

npm run build
Exit 0
```

In dieser Mini-Session wurde nur diese Handover-Datei geschrieben. Vor dem Commit dieser Doku bitte `git diff --check` gegen diese Datei/INBOX laufen lassen.

## Bekannte untracked Dateien

Weiterhin nicht anfassen, ausser Thomas sagt es ausdruecklich:

```text
.codex-welle-d-3001.pid
docs/plans/2026-05-04-quartier-info-skalierung-auto-first.md
docs/plans/handoff/2026-05-03-claude-an-codex-due-diligence-review.md
docs/plans/handoff/2026-05-03-claude-an-codex-founder-go-vollmacht-grosse-schritte.md
docs/plans/handoff/2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md
docs/plans/handoff/2026-05-03-claude-an-codex-vollgas-bis-100-dann-sicherheit.md
docs/plans/handoff/2026-05-03-codex-an-claude-due-diligence-review.md
docs/plans/handoff/2026-05-04-claude-an-codex-owasp-audit-5-neue-findings.md
docs/plans/handoff/2026-05-04-claude-an-codex-quittung-phase4-findings.md
docs/plans/handoff/2026-05-04-claude-an-codex-security-zweitmeinung.md
docs/plans/handoff/2026-05-04-codex-new-session-handover-security-ci-health-deploy.md
docs/plans/handoff/2026-05-09-claude-an-claude-cleanup-skript-erweiterung.md
docs/plans/handoff/2026-05-10-codex-an-claude-bestaetigung-pilot-reset.md
docs/plans/handoff/2026-05-10-codex-new-session-handover-after-pilot-reset-confirmation.md
scripts/manual-cron-trigger-2026-05-10.ts
scripts/reprocess-amtsblatt-issue-0015.ts
```

Die beiden Scripts klingen live-/cron-/reprocess-nah. Nicht ausfuehren ohne klares Founder-Go.

## Rote Gates

Nicht ohne explizites Founder-Go:

- Kein Prod-DB-Write.
- Kein Migration-Apply fuer 191.
- Kein `schema_migrations`-Insert/Repair.
- Kein Deploy.
- Keine Vercel-Env-/Secrets-/Billing-/Provider-Aktion.
- Keine Manual-Cron-/Reprocess-Scripts gegen Prod.

Push/Deploy-Autonomie in `AGENTS.md` war historisch gelockert, aber Thomas' neueste explizite Session-Regel war enger: kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing/Provider-Live ohne Founder-Go. Diese neuere Regel gewinnt.

## Naechste sinnvolle Schritte

1. Neue Session zuerst lesen:
   - `AGENTS.md`
   - `docs/plans/handoff/INBOX.md`
   - diese Datei
   - `docs/plans/handoff/2026-05-10-codex-an-claude-quartier-info-cache-persistenz.md`
2. `git status --short --branch` pruefen.
3. Wenn Thomas Migration-Go gibt:
   - Migration 191 kontrolliert auf Ziel-DB anwenden.
   - Danach read-only verifizieren, dass `quartier_info_cache_source_check` `oepnv` erlaubt.
   - Danach gezielt `quartier-info-sync`/OEPNV-Smoke testen.
4. Ohne Migration-Go:
   - lokal weiterarbeiten; OEPNV-Cache-Writes werden auf DBs ohne Mig 191 korrekt als `oepnv_error` sichtbar.
5. Bei neuem Code: Pre-Check zuerst, TDD strict.

## Startprompt fuer naechste Session

```text
Bitte in `C:\Users\thoma\Claud Code\Handy APP\nachbar-io` weitermachen.
Zuerst lesen:
- `AGENTS.md`
- `docs/plans/handoff/INBOX.md`
- `docs/plans/handoff/2026-05-11-codex-new-session-handover-after-cache-persistence.md`
- `docs/plans/handoff/2026-05-10-codex-an-claude-quartier-info-cache-persistenz.md`

Dann `git status --short --branch` pruefen.
Aktueller Stand laut Uebergabe: HEAD und origin/master auf `1dea8e7`, Migration 191 file-first vorhanden aber nicht applied.
Kein Push/Deploy/Prod-DB-Write/Vercel-Env/Secrets/Billing/Provider-Live ohne Founder-Go.
```
