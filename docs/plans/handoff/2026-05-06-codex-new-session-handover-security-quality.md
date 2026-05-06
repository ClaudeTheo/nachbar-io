# Codex New-Session-Handover - Security/Code-Quality

Datum: 2026-05-06 21:05 +02:00
Owner: Codex

## Kurzfassung

Aktueller Stand in `nachbar-io`: `master` ist lokal **5 Commits ahead** von `origin/master`.

Noch nicht gepusht:

- `c7f0fa7 docs(handoff): claim ssrf syntax hardening`
- `fde0b8a fix(security): harden external url validation`
- `3e32b5f docs(handoff): new session security quality status`
- `905a98a docs(handoff): claim quartier info auth gate`
- `5343085 fix(security): require auth for quartier info api`

Bereits gepusht:

- `1ef1306 docs(handoff): claim e2e bypass hardening`
- `936e5d3 fix(security): harden e2e bypass middleware`

Nicht gepusht, nicht deployed. Production steht laut INBOX weiter auf der Security-Audit-Welle 2026-05-06 (`f8d2149`, Deploy `dpl_A2AfKsn3qbe8NCdPiCVX4NpHdNSf`).

## Erledigt

### 1. SECURITY_E2E_BYPASS gehaertet

Dateien:

- `lib/supabase/middleware.ts`
- `__tests__/lib/supabase/middleware.test.ts`
- `docs/plans/handoff/INBOX.md`

Ergebnis:

- `/api/test/login`-Middleware-Bypass ist in `NODE_ENV=production` fail-closed, auch bei lokaler Supabase-URL.
- Vercel `production` und `preview` bleiben hart blockiert.
- Header-Secret-Vergleich nutzt `timingSafeEqual` ueber SHA-256-Hash statt direktem `===`.
- Tests resetten Env-Stubs mit `vi.unstubAllEnvs()`.

Verifikation:

- RED: Middleware-Test fiel erwartbar bei lokalem `NODE_ENV=production` und fehlendem `timingSafeEqual`.
- GREEN: `npx vitest run __tests__/api/test-login.test.ts __tests__/lib/supabase/middleware.test.ts` -> 24/24 gruen.
- Gezieltes ESLint, `npx tsc --noEmit`, `git diff --check`, `npm run build` -> gruen.

### 2. `isValidExternalUrl` gegen IP-Notation-Bypaesse gehaertet

Dateien:

- `lib/webhooks.ts`
- `lib/__tests__/webhooks.test.ts`
- `docs/plans/handoff/INBOX.md`

Ergebnis:

- Zentrale URL-Validierung blockiert jetzt auch:
  - IPv6 loopback: `[::1]`
  - IPv6-mapped IPv4: `[::ffff:127.0.0.1]`
  - alternative IPv4-Notation fuer lokale/private Ziele: Hex, Octal, kurze IPv4-Formen, `0`
- Umsetzung ohne neue Dependency via Node `net.isIP` und zentrale IPv4/IPv6-Range-Checks.
- Bestehende Call-Sites bleiben unveraendert:
  - `modules/admin/services/org-webhooks.service.ts`
  - `modules/waste/services/ics-connector.ts`

Verifikation:

- RED: `lib/__tests__/webhooks.test.ts` fiel erwartbar bei `https://[::ffff:127.0.0.1]/calendar.ics`.
- GREEN: `npx vitest run lib/__tests__/webhooks.test.ts __tests__/lib/waste/ics-connector.test.ts` -> 26/26 gruen.
- Gezieltes ESLint, `npx tsc --noEmit`, `git diff --check`, `npm run build` -> gruen.

Wichtig: DNS-Re-Resolve gegen DNS-Rebinding ist noch nicht umgesetzt. Dieser Schritt blockiert Syntax-/Parser-Bypaesse vor dem Fetch.

### 3. `/api/quartier-info` serverseitig authentifiziert

Dateien:

- `app/api/quartier-info/route.ts`
- `__tests__/api/quartier-info-route.test.ts`
- `docs/plans/handoff/INBOX.md`

Ergebnis:

- `GET /api/quartier-info` ruft jetzt zuerst `requireAuth()` auf.
- Unauthentifizierte Requests bekommen 401.
- Der Service-Role-Client wird bei unauthentifizierten Requests nicht mehr erstellt.
- Das folgt der Projektregel: Nur Nutzer mit gueltigem Invite-Code sehen Quartiersdaten.

Verifikation:

- RED: unauthentifizierter Request bekam vorher 200 statt 401.
- GREEN: `npx vitest run __tests__/api/quartier-info-route.test.ts __tests__/pages/quartier-info-vorlesen.test.tsx __tests__/lib/closed-pilot.test.ts` -> 16/16 gruen.
- Gezieltes ESLint, `npx tsc --noEmit`, `git diff --check`, `npm run build` -> gruen.

## Git-Stand

Neue Session sollte sehen:

```text
## master...origin/master [ahead 5]
```

Untracked Altdateien weiterhin unberuehrt:

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
```

## Rote Zonen

Nur mit klarem Founder-Go:

- `git push origin master`
- Production-Deploy
- Prod-DB-Schreibaktionen / Migrationen
- Vercel-Env-/Secret-Aenderungen
- neue laufende Kosten

Fuer Push reicht ein klares `GO PUSH`. Fuer Deploy danach separat `GO DEPLOY` oder zusammen `GO PUSH DEPLOY`.

## Naechste sinnvolle kleine Schritte

Aus `docs/plans/handoff/2026-05-06-claude-an-codex-security-audit-high-fixes.md` bleiben nach dieser Session:

- LOW: Encryption-Format-Versionierung in `modules/care/services/crypto.ts` vorbereiten. Achtung: migrations-/kompatibilitaetsnah, daher klein planen.
- LOW: Medical-Blocklist NFKD/Diacritic-Strip in `modules/memory/services/medical-blocklist.ts`.
- MEDIUM-Rest: DNS-Re-Resolve gegen DNS-Rebinding fuer echte Fetch-Call-Sites. Dafuer wahrscheinlich async Fetch-Guard oder separater Netzwerk-Guard statt synchroner `isValidExternalUrl`.

Empfehlung fuer neue Session:

1. Erst entscheiden, ob die 5 lokalen Commits gepusht werden sollen.
2. Danach kleinen LOW-Schritt Medical-Blocklist Normalisierung TDD-first bearbeiten.
3. Deploy nur bewusst nach Push/CI/Smoke.

## Startbefehle

```bash
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content docs\plans\handoff\INBOX.md -TotalCount 35
```
