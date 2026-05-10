# Codex an Claude - Quartier-Info Cache-Persistenz sichtbar gemacht

Datum: 2026-05-10 abend
Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
Branch: `master`
Modus: lokal/read-only gegen App-Code. Kein Push, kein Deploy, kein Prod-DB-Write, kein Migration-Apply, keine Vercel-Env-/Secrets-/Billing-/Provider-Aktion.

## Kurzfazit

Ich habe nach dem Pollen-Cache-Smoke direkt am offenen Handoff-Punkt `quartier_info_cache`-Persistenz weitergemacht.

Root Cause fuer den naechsten sichtbaren Fehler war zweigeteilt:

1. `runQuartierInfoSync()` wartete zwar auf Supabase-`upsert`, pruefte aber das `{ error }`-Resultat nicht. Supabase wirft bei RLS-/Constraint-Fehlern nicht automatisch. Dadurch konnte der Sync `weather=1` oder `oepnv=1` melden, obwohl nichts persistiert wurde.
2. Der Code liest und schreibt `source: "oepnv"` in `quartier_info_cache`, aber Migration 118 erlaubt in der Check-Constraint nur `weather`, `pollen`, `nina`. OEPNV-Cache-Writes muessen deshalb ohne Schema-Fix scheitern.

Beides ist lokal gefixt bzw. vorbereitet, aber Migration 191 wurde nicht auf Prod angewendet.

## Git-Stand vor dieser Uebergabe

```text
## master...origin/master [ahead 6]
```

Ahead-Commits:

```text
fb5fae5 fix(db): allow oepnv quartier info cache
a22c515 fix(info-hub): surface cache write failures
bdd5514 docs(handoff): new session after pollen cache smoke
7f192a7 fix(info-hub): refresh legacy pollen cache region
073985e docs(handoff): new session after QA cron infohub
60ae46e docs(handoff): codex QA after cron infohub fixes
```

## Commit `a22c515` - Cache-Write-Fehler sichtbar machen

Geaendert:

```text
modules/info-hub/services/quartier-info-sync.service.ts
__tests__/modules/info-hub/quartier-info-sync.service.test.ts
docs/plans/handoff/INBOX.md
```

Was:

- Neuer Helper `assertCacheWriteSucceeded(source, error)`.
- Weather-/Pollen-/OEPNV-Upserts pruefen jetzt explizit `error`.
- Bei Write-Fehlern wird der bestehende `weather_error` / `pollen_error` / `oepnv_error`-Pfad genutzt.
- Ergebniszaehler werden nur noch erhoeht, wenn der Cache-Write wirklich erfolgreich war.

TDD:

```text
npx vitest run __tests__/modules/info-hub/quartier-info-sync.service.test.ts

RED:
2 failed
expected weather/oepnv 0, received 1

GREEN:
2 passed
```

Weitere Verifikation fuer diesen Block:

```text
npx vitest run __tests__/modules/info-hub/quartier-info-sync.service.test.ts __tests__/lib/quartier-info.service.test.ts __tests__/api/quartier-info-route.test.ts
Test Files 3 passed
Tests 18 passed
Exit 0

npx eslint modules/info-hub/services/quartier-info-sync.service.ts __tests__/modules/info-hub/quartier-info-sync.service.test.ts __tests__/lib/quartier-info.service.test.ts
Exit 0

npx tsc --noEmit
Exit 0

git diff --check
Exit 0, nur CRLF-Warnungen

npm run build
Exit 0
```

## Commit `fb5fae5` - Migration 191 fuer OEPNV-Cache-Source

Geaendert:

```text
supabase/migrations/191_quartier_info_cache_oepnv_source.sql
supabase/rollbacks/191_quartier_info_cache_oepnv_source.down.sql
__tests__/lib/quartier-info-cache-source-migration.test.ts
docs/plans/handoff/INBOX.md
```

Pre-Check:

- `supabase/migrations/118_quartier_info_hub.sql` enthaelt die Ursprungstabelle und Constraint:
  `source IN ('weather', 'pollen', 'nina')`.
- `modules/info-hub/services/quartier-info-sync.service.ts` schreibt `source: "oepnv"`.
- `lib/services/quartier-info.service.ts` liest `cacheMap.get("oepnv")`.
- Es gab keine bestehende Migration, die `oepnv` als Cache-Source erlaubt.

Was:

- Migration 191 droppt idempotent `quartier_info_cache_source_check`.
- Migration 191 setzt sie neu auf `weather`, `pollen`, `nina`, `oepnv`.
- Rollback entfernt zuerst `source='oepnv'`-Cache-Zeilen und setzt dann die alte Constraint wieder.
- File-first only. Kein Apply.

TDD:

```text
npx vitest run __tests__/lib/quartier-info-cache-source-migration.test.ts

RED:
2 failed
Migration-/Rollback-Dateien fehlten

GREEN:
2 passed
```

Weitere Verifikation fuer diesen Block:

```text
npx vitest run __tests__/lib/quartier-info-cache-source-migration.test.ts __tests__/lib/migration-versions.test.ts __tests__/modules/info-hub/quartier-info-sync.service.test.ts __tests__/lib/quartier-info.service.test.ts
Test Files 4 passed
Tests 13 passed
Exit 0

npx eslint __tests__/lib/quartier-info-cache-source-migration.test.ts __tests__/modules/info-hub/quartier-info-sync.service.test.ts modules/info-hub/services/quartier-info-sync.service.ts
Exit 0

npx tsc --noEmit
Exit 0

git diff --check
Exit 0, nur CRLF-Warnung fuer INBOX
```

## Bekannte untracked Dateien

Weiterhin unberuehrt lassen, ausser Thomas sagt es ausdruecklich:

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

Die beiden Scripts klingen live-/cron-/reprocess-nah. Nicht ausfuehren ohne Founder-Go.

## Rote Gates

Nicht ohne explizites Founder-Go:

- Kein Push.
- Kein Deploy.
- Kein Prod-DB-Write.
- Kein Migration-Apply fuer 191.
- Kein `schema_migrations`-Insert/Repair.
- Keine Vercel-Env-/Secrets-/Billing-/Provider-Aktion.
- Keine Manual-Cron-/Reprocess-Scripts gegen Prod.

## Naechste sinnvolle Schritte

1. `git status --short --branch` pruefen.
2. Falls Thomas Migration-Go gibt: Migration 191 kontrolliert auf Ziel-DB anwenden und danach `quartier_info_cache_source_check` sowie `source='oepnv'` Smoke pruefen.
3. Ohne Migration-Go: lokal weiterarbeiten, aber wissen, dass OEPNV-Cache-Writes in einer DB ohne Mig 191 weiterhin korrekt als `oepnv_error` sichtbar werden.
4. Vor Push/Deploy erst Founder-Go und aktuellen Verification-Stand nennen.
