# New-Session-Handover — OWASP-Fixes abgeschlossen, Prod-Apply-Gate offen

Datum: 2026-05-04
Autor: Codex
Baseline-Implementierungs-HEAD: `50c78c6`
Branch: `master`

## Kurzstatus

Die OWASP-Nachtragsfindings NEW-1 bis NEW-5 aus Claudes Audit sind lokal gefixt, verifiziert und nach `origin/master` gepusht.

Aktueller Code-Stand vor dieser Handover-Datei:

- `50c78c6 fix(waste): guard ics connector urls`
- `60a8f65 chore(inbox): claim ics waste ssrf guard`
- `4aa9fca fix(admin): audit privileged actions`
- `b37d98b chore(inbox): claim admin audit logs`
- `e11de1d fix(kiosk): bind companion memory to device`
- `6461d36 chore(inbox): claim kiosk companion owasp fixes`
- `c1cf81f docs(db): add migration runbook 186 187`
- `d53e389 chore(inbox): claim migration runbook`
- `6fb8cdd fix(care): hash emergency pdf tokens`

`git status` war sauber gegen `origin/master`, abgesehen von alten untracked Handoff-Dateien und `.codex-welle-d-3001.pid`. Diese alten untracked Dateien wurden bewusst nicht angefasst.

## Erledigt in dieser Session

### F-1 PDF-Token Hashing

Commit: `6fb8cdd`

- `lib/care/pdf-token.ts`
- `app/api/care/emergency-profile/token/route.ts`
- `app/notfall/[token]/page.tsx`
- `app/api/care/emergency-profile/route.ts`
- `supabase/migrations/187_emergency_pdf_token_hash.sql`
- `supabase/rollbacks/187_emergency_pdf_token_hash.down.sql`
- Tests fuer Token-Hash und Legacy-Kompatibilitaet

Wichtig: Migration 187 ist vorbereitet, aber nicht auf Prod angewendet.

### Migration-Runbook 186/187

Commits: `d53e389`, `c1cf81f`

Runbook:

- `docs/plans/2026-05-04-migration-runbook-186-187.md`

Es beschreibt kontrolliertes Apply fuer:

- Migration 186: CareCircle/RLS Bridge
- Migration 187: Emergency PDF Token Hash

Kein Prod-Apply wurde ausgefuehrt.

### NEW-1/2/3 Kiosk-Companion

Commits: `6461d36`, `e11de1d`

Fixes:

- Kiosk-Companion laedt Memory nur noch ueber verifizierte Device-Bindung.
- Body-`user_id` kann keinen fremden Bewohner mehr spoofen.
- Redis-AI-Limit `consumeAiDailyUserLimit` laeuft vor Memory/Provider.
- Client-History wird serverseitig nicht mehr an Gemini/Claude gegeben.
- Kiosk-Seite sendet keine History mehr und reicht Device-Daten mit.

Doku:

- `docs/plans/2026-05-04-kiosk-companion-device-gate-owasp-new-1-3.md`

### NEW-4 Admin-Audit-Logs

Commits: `b37d98b`, `4aa9fca`

Fixes:

- Admin Create User
- Address Verification Approve/Reject
- Admin Broadcast
- Quarter Archive
- Feature Flag Preset

Wichtig: Es wurde bewusst `admin_audit_log` genutzt, nicht `org_audit_log`, weil `org_audit_log.org_id` `NOT NULL` ist und diese Aktionen plattformweit sind.

Doku:

- `docs/plans/2026-05-04-admin-audit-logs-owasp-new-4.md`

### NEW-5 ICS-Waste SSRF-Guard

Commits: `60a8f65`, `50c78c6`

Fixes:

- `lib/webhooks.ts` exportiert `isValidExternalUrl()`.
- `isValidWebhookUrl()` bleibt als kompatibler Alias erhalten.
- `fetchIcsWasteDates()` validiert `config.url` vor `fetch`.
- `checkIcsHealth()` validiert vor HEAD-Request.
- Interne/private/link-local/numerische Hosts werden geblockt.
- `file_content`-basierte ICS-Imports bleiben unveraendert erlaubt.

Doku:

- `docs/plans/2026-05-04-ics-waste-ssrf-guard-owasp-new-5.md`

## Letzte bekannte Verifikation

Nach NEW-5:

- `npx vitest run lib/__tests__/webhooks.test.ts __tests__/lib/waste/ics-connector.test.ts` — 25 passed
- `npm run test` — 546 Test Files passed, 4050 passed, 1 skipped
- `npm run lint` — gruen
- `npx tsc --noEmit` — gruen
- `npm run build` — gruen

Nach NEW-4:

- `npm run test` — 546 Test Files passed, 4043 passed, 1 skipped
- `npm run lint` — gruen
- `npx tsc --noEmit` — gruen
- `npm run build` — gruen

Nach NEW-1/2/3:

- `npm run test` — 545 Test Files passed, 4039 passed, 1 skipped
- `npm run lint` — gruen
- `npx tsc --noEmit` — gruen
- `npm run build` — gruen

## Naechster sinnvoller Ablauf fuer neue Session

1. Session-Start:
   - `AGENTS.md`
   - `nachbar-io/AGENTS.md`
   - `docs/plans/handoff/INBOX.md`
   - diese Handover-Datei lesen
   - `git status --short --branch`

2. CI/Deploy pruefen:
   - GitHub Actions fuer `50c78c6` pruefen.
   - Vercel Production Deploy fuer `50c78c6` pruefen.
   - Nur read-only Checks, keine Env-Aenderungen.

3. Read-only Production Smoke:
   - Startseite/Health unauthentifiziert pruefen.
   - Closed-Pilot-Verhalten fuer geschuetzte Routen pruefen.
   - Keine Prod-DB-Schreibaktion, keine Testdatenanlage.

4. Dann erst Migration 186/187:
   - Nur mit eindeutigem, separatem Founder-Go fuer Prod-DB-Migration-Apply.
   - Runbook exakt nutzen: `docs/plans/2026-05-04-migration-runbook-186-187.md`.
   - 186 und 187 getrennt behandeln.
   - Nach Apply read-only Smoke/SQL-Checks gemaess Runbook.

## Rote Zonen

Ohne ausdrueckliches neues Founder-Go nicht tun:

- Prod-DB schreiben
- Migrationen auf Prod anwenden
- Vercel-Env aendern
- Secrets lesen oder ausgeben
- Billing/Auth/Provider-Konfiguration aendern

Push-Go galt in der bisherigen Session und wurde fuer die Fix-Wellen genutzt. In einer neuen Session erneut auf aktuelle Founder-Anweisung achten.

## Nicht anfassen

Alte untracked Dateien lagen weiterhin im Worktree und wurden bewusst nicht angefasst:

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
