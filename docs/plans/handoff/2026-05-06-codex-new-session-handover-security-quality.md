# Codex New-Session-Handover - Security/Code-Quality

Datum: 2026-05-06 20:35 +02:00
Owner: Codex

## Kurzfassung

Aktueller Code-Stand in `nachbar-io`: `master` ist vor dem Handover-Doku-Commit lokal **2 Commits ahead** von `origin/master`. Nach dem Commit dieser Datei ist `master` voraussichtlich **3 Commits ahead**.

Nicht gepusht:

- `c7f0fa7 docs(handoff): claim ssrf syntax hardening`
- `fde0b8a fix(security): harden external url validation`
- dieser Handover-Doku-Commit

Bereits gepusht:

- `1ef1306 docs(handoff): claim e2e bypass hardening`
- `936e5d3 fix(security): harden e2e bypass middleware`

Kein Deploy nach den letzten lokalen SSRF-Commits. Production lief vorher auf dem Deploy aus der Security-Audit-Welle 2026-05-06 (`f8d2149` laut INBOX-Eintrag, Deploy `dpl_A2AfKsn3qbe8NCdPiCVX4NpHdNSf`).

## Was diese Session erledigt hat

### 1. SECURITY_E2E_BYPASS gehaertet

Dateien:

- `lib/supabase/middleware.ts`
- `__tests__/lib/supabase/middleware.test.ts`
- `docs/plans/handoff/INBOX.md`

Ergebnis:

- `/api/test/login`-Middleware-Bypass ist in `NODE_ENV=production` jetzt fail-closed, auch bei lokaler Supabase-URL.
- Vercel `production` und `preview` bleiben hart blockiert.
- Header-Secret-Vergleich nutzt `timingSafeEqual` ueber SHA-256-Hash statt direktem `===`.
- Tests resetten Env-Stubs mit `vi.unstubAllEnvs()`.

Verifikation:

- RED: Middleware-Test fiel erwartbar bei lokalem `NODE_ENV=production` und fehlendem `timingSafeEqual`.
- GREEN: `npx vitest run __tests__/api/test-login.test.ts __tests__/lib/supabase/middleware.test.ts` -> 24/24 gruen.
- `npx eslint lib/supabase/middleware.ts __tests__/lib/supabase/middleware.test.ts --no-warn-ignored` -> gruen.
- `npx tsc --noEmit` -> gruen.
- `git diff --check` -> gruen.
- `npm run build` -> gruen.

### 2. `isValidExternalUrl` gegen IP-Notation-Bypaesse gehaertet

Dateien:

- `lib/webhooks.ts`
- `lib/__tests__/webhooks.test.ts`
- `docs/plans/handoff/INBOX.md`

Ergebnis:

- Zentrale URL-Validierung blockiert jetzt zusaetzlich:
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
- `npx eslint lib/webhooks.ts lib/__tests__/webhooks.test.ts --no-warn-ignored` -> gruen.
- `npx tsc --noEmit` -> gruen.
- `git diff --check` -> gruen.
- `npm run build` -> gruen.

## Git-Stand

Vor dem Handover-Doku-Commit:

```text
## master...origin/master [ahead 2]
```

Nach dem Handover-Doku-Commit sollte die neue Session `ahead 3` sehen.

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

Wichtig: Die letzten zwei SSRF-Commits sind lokal, nicht gepusht. Fuer Push reicht ein klares `GO PUSH`. Fuer Deploy danach separat `GO DEPLOY` oder `GO PUSH DEPLOY`.

## Naechste sinnvolle kleine Schritte

Aus `docs/plans/handoff/2026-05-06-claude-an-codex-security-audit-high-fixes.md` sind nach den erledigten Punkten noch offen:

- LOW: `app/api/quartier-info/route.ts` Service-Role ohne Auth-Check pruefen: entweder `requireAuth` ergaenzen oder explizit als public deklarieren.
- LOW: Encryption-Format-Versionierung in `modules/care/services/crypto.ts` vorbereiten. Achtung: kann migrations-/kompatibilitaetsnah werden, daher klein planen.
- LOW: Medical-Blocklist NFKD/Diacritic-Strip in `modules/memory/services/medical-blocklist.ts`.
- MEDIUM-Rest: DNS-Re-Resolve gegen DNS-Rebinding fuer echte Fetch-Call-Sites ist **noch nicht umgesetzt**. Der aktuelle SSRF-Schritt blockiert Syntax-/Parser-Bypaesse, aber macht keine DNS-Aufloesung vor `fetch`. Dafuer muesste die API vermutlich async werden oder ein separater Fetch-Guard entstehen.

Empfehlung fuer naechste Session:

1. Erst entscheiden, ob die lokalen zwei SSRF-Commits gepusht werden sollen.
2. Danach kleinen LOW-Schritt `quartier-info` Auth/Public-Deklaration TDD-first bearbeiten.
3. Deploy nur bewusst nach Push/CI/Smoke.

## Startbefehle fuer neue Session

```bash
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline -6
Get-Content docs\plans\handoff\INBOX.md -TotalCount 35
```
