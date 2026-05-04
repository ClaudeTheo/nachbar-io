# New-Session-Handover — OWASP live, Migration-Go 186/187 erteilt

Datum: 2026-05-04
Autor: Codex
Repo: `nachbar-io`
Branch: `master`
Aktueller HEAD / `origin/master`: `acd2e9b fix(db): guard emergency pdf token migration replay`

## Kurzstatus

OWASP-Nachtragsfixes NEW-1 bis NEW-5 sind jetzt nicht nur auf `master`, sondern auch live auf Production.

Production:

- Deployment: `dpl_67RoPzYQH44DuAuDWKM3gcAVZZV9`
- URL: `https://nachbar-k9ai8lh6w-thomasth1977s-projects.vercel.app`
- Alias: `https://nachbar-io.vercel.app`
- Deploy-Zeitpunkt: 2026-05-04 ca. 17:12 MESZ

`acd2e9b` wurde nach `origin/master` gepusht und danach per `vercel deploy --prod --yes` als Vercel-Remote-Build deployed. Keine Prod-DB-Schreibaktion, keine Migration, keine Vercel-Env-Aenderung, keine Secrets gelesen.

## Was in Production jetzt live ist

Implementierungs-Block:

- `6fb8cdd fix(care): hash emergency pdf tokens`
- `e11de1d fix(kiosk): bind companion memory to device`
- `4aa9fca fix(admin): audit privileged actions`
- `50c78c6 fix(waste): guard ics connector urls`
- `acd2e9b fix(db): guard emergency pdf token migration replay`

Damit live:

- F-1 PDF-Token-Code nutzt Hash-Lookup und Legacy-Fallback.
- NEW-1/2/3 Kiosk-Companion Device-Gate ist live.
- NEW-4 Admin-Audit-Logs sind live.
- NEW-5 ICS-Waste SSRF-Guard ist live.
- Migration 187 ist replay-tauglich, wenn lokale/CI-Replay-DB die Prod-Drift-Tabelle `public.emergency_profiles` nicht hat.

## Verifikation in dieser Session

Vor Push/Deploy fuer `acd2e9b` lokal:

- `npx vitest run __tests__/lib/emergency-pdf-token-hash-migration.test.ts` -> 3 passed
- `npx vitest run __tests__/lib/emergency-pdf-token-hash-migration.test.ts __tests__/api/care/emergency-profile-token.test.ts __tests__/app/notfall-token-hash.test.tsx __tests__/api/care/emergency-profile.test.ts __tests__/lib/migration-versions.test.ts` -> 5 files passed, 8 tests passed
- `npm run lint` -> gruen
- `npx tsc --noEmit` -> gruen
- `npm run build` -> gruen

Nach Push/Deploy:

- Vercel Inspect: `dpl_67RoPzYQH44DuAuDWKM3gcAVZZV9`, `Ready`, Alias `https://nachbar-io.vercel.app`
- Live-Smoke read-only:
  - `/` -> 200
  - `/login` -> 200
  - `/register` -> 200
  - `/datenschutz` -> 200
  - `/impressum` -> 200
  - `/api/health` -> 200, `{"status":"ok"}`
  - `/api/messages` -> 503 `closed_pilot`
  - `/api/test/login` -> 503 `closed_pilot`
  - `/register/preview/pilot-role` -> 404
- GitHub Actions fuer `acd2e9b`:
  - CodeQL Security Analysis -> success
  - E2E Multi-Agent Tests / Smoke Tests (S7) -> success
  - E2E Multi-Agent Tests / Multi-Agent Tests (S1-S6) -> success

## Wichtigster naechster Schritt

Thomas hat nach dem Deploy gesagt:

> mach dir eine übergabe in die nächste session und da hast du ein go dafür

Das ist als Founder-Go fuer die naechste Session zu verstehen, die offenen Prod-DB-Migrationen 186/187 kontrolliert nach Runbook anzuwenden.

Go-String fuer die naechste Session:

`MIGRATION-PROD-GO-186-187`

Runbook:

- `docs/plans/2026-05-04-migration-runbook-186-187.md`

Migrationen:

- `supabase/migrations/186_carecircle_rls_bridge.sql`
- `supabase/migrations/187_emergency_pdf_token_hash.sql`

Rollbacks:

- `supabase/rollbacks/186_carecircle_rls_bridge.down.sql`
- `supabase/rollbacks/187_emergency_pdf_token_hash.down.sql`

## Ablauf fuer naechste Session

1. Session-Start:
   - `AGENTS.md`
   - `nachbar-io/AGENTS.md`
   - `docs/plans/handoff/INBOX.md`
   - diese Handover-Datei
   - `docs/plans/2026-05-04-migration-runbook-186-187.md`
   - `git status --short --branch`

2. Vor Migration kurz bestaetigen:
   - HEAD / `origin/master` ist mindestens `acd2e9b`
   - Production Alias zeigt weiter auf Deployment mit OWASP-Fixes oder neuer
   - keine neuere Founder-Anweisung widerspricht dem Migration-Go

3. Dann Runbook exakt nutzen:
   - Migration 186 anwenden
   - Migration 186 read-only pruefen
   - Migration 187 anwenden
   - Migration 187 read-only pruefen
   - keine anderen Prod-DB-Schreibaktionen

4. Nach Apply:
   - read-only SQL-Checks gemaess Runbook
   - read-only Live-Smoke
   - Ergebnis dokumentieren

## Rote Zonen bleiben

Trotz Migration-Go fuer 186/187:

- keine anderen Prod-DB-Schreibaktionen
- keine Vercel-Env-Aenderung
- keine Secrets lesen oder ausgeben
- keine Billing/Auth/Provider-Konfigurationsaenderung
- keine neuen Kosten
- keine Echtdaten-KI

## Nicht anfassen

Alte untracked Dateien weiter nicht anfassen, ausser Thomas sagt es explizit:

- `.codex-welle-d-3001.pid`
- `docs/plans/handoff/2026-05-03-claude-an-codex-due-diligence-review.md`
- `docs/plans/handoff/2026-05-03-claude-an-codex-founder-go-vollmacht-grosse-schritte.md`
- `docs/plans/handoff/2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md`
- `docs/plans/handoff/2026-05-03-claude-an-codex-vollgas-bis-100-dann-sicherheit.md`
- `docs/plans/handoff/2026-05-03-codex-an-claude-due-diligence-review.md`
- `docs/plans/handoff/2026-05-04-claude-an-codex-owasp-audit-5-neue-findings.md`
- `docs/plans/handoff/2026-05-04-claude-an-codex-quittung-phase4-findings.md`
- `docs/plans/handoff/2026-05-04-claude-an-codex-security-zweitmeinung.md`
- `docs/plans/handoff/2026-05-04-codex-new-session-handover-security-ci-health-deploy.md`

