# Codex -> Codex Uebergabe: Security S-1 bis S-8 / Dependency-Audit

Stand: 2026-05-03 spaetabend  
Repo: `nachbar-io`  
Branch: `master`  
HEAD: `28cdcfa fix(security): update remaining audit dependencies`  
Remote: `origin/master` ist auf `28cdcfa` gepusht  
Live/Prod: kein Deploy aus dieser Session

## Kurzstatus

Thomas hat nach den Security-Fixes S-1 bis S-5 den Dependency-Audit fertig machen lassen.

Ergebnis:

- S-6 High/Critical Dependency-Audit erledigt.
- S-7 Moderate-Triage erledigt.
- S-8 Restliche vertretbare Dependency-Fixes erledigt.
- Alle lokalen Aenderungen wurden committed und nach Founder-Go gepusht.
- Kein Deploy.
- Keine Prod-DB-Aktion.
- Keine Migration angewendet.
- Keine Vercel-Env-Aenderung.
- Keine Secrets gelesen oder ausgegeben.
- Alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid` wurden nicht angefasst.

## Relevante Commits

Neue Dependency-/Handoff-Commits:

- `28cdcfa fix(security): update remaining audit dependencies`
- `c3aef18 fix(security): reduce moderate audit findings`
- `aa21361 fix(security): patch dependency audit highs`
- `8c8cb12 docs(security): hand over after local fixes`

Davor S-5:

- `eefcf60 fix(security): block test login outside local envs`

## Dependency-Audit Ergebnis

### Behoben

High/Critical:

- `next` Server Components DoS: `next` von `16.2.1` auf `16.2.4`.
- `@xmldom/xmldom` via `@capacitor/cli -> plist`: von `0.8.12` auf `0.8.13`.

Moderate, normal/klein geloest:

- `axios` auf `1.16.0`
- `follow-redirects` auf `1.16.0`
- `dompurify` auf `3.4.2`
- `fast-xml-parser` auf `5.7.2`
- `hono` auf `4.12.16`
- Root-`postcss` auf `8.5.13`
- `@anthropic-ai/sdk` auf `0.92.0`
- `@sentry/nextjs` auf `10.51.0`
- `resend` auf `6.12.2`
- Override: `edge-tts-universal -> uuid@14.0.0`
- Override: `exceljs -> uuid@14.0.0`
- Override: `resend -> svix@1.92.2`

### Offen / nicht sauber lokal fixbar

Nur noch:

- `next -> postcss@8.4.31`
- npm audit zaehlt das als 2 moderate Findings (`postcss` + `next` affected).

Wichtig:

- `npm audit --omit=dev --audit-level=high` hat Exit 0.
- `npm audit --omit=dev --audit-level=moderate` hat Exit 1 wegen `next -> postcss`.
- `npm audit fix --force` ist NICHT verwenden: npm will fuer dieses Thema `next@9.3.3` installieren, also einen kaputten Downgrade.
- Ein Override `next -> postcss@8.5.13` wurde getestet, aber `npm ls` markierte den Next-Baum als invalid, weil Next intern `postcss@8.4.31` exakt pinnt. Override wurde wieder entfernt.
- Naechste echte Loesung: warten, bis Next stable den internen PostCSS-Pin hebt, oder spaeter gezielt Next-Canary/Release pruefen.

## Verifikation in dieser Session

Ausgefuehrt und gruen:

```bash
npm audit --omit=dev --audit-level=high
npx vitest run __tests__/api/test-login.test.ts __tests__/lib/supabase/middleware.test.ts
npx vitest run lib/integrations/dwd/__tests__/parser.test.ts __tests__/lib/export.test.ts __tests__/lib/hilfe/pdf-receipt.test.ts __tests__/lib/hilfe/pdf-yearly-helper.test.ts __tests__/lib/hilfe/pdf-yearly-resident.test.ts modules/hilfe/services/__tests__/pdf-monthly-report.test.ts modules/hilfe/services/__tests__/email.test.ts __tests__/api/voice/tts.test.ts modules/care/services/channels/sms.test.ts modules/care/services/channels/voice.test.ts __tests__/guards/sms-provider-paths.test.ts __tests__/guards/tts-public-cache-guard.test.ts
npx vitest run __tests__/api/companion/chat.test.ts __tests__/api/companion/chat-streaming.test.ts __tests__/api/cron/digest-integration.test.ts __tests__/modules/voice/ai-disabled-fallback.test.ts __tests__/api/care/classify-task.test.ts __tests__/api/care/classify-task-route.test.ts modules/hilfe/services/__tests__/email.test.ts __tests__/lib/export.test.ts __tests__/api/voice/tts.test.ts modules/care/services/channels/sms.test.ts modules/care/services/channels/voice.test.ts
npm run lint
npx tsc --noEmit
npm run build
```

Zahlen:

- S-5 smoke: `20 passed`
- S-7 targeted dependency smoke: `54 passed`
- S-8 targeted dependency smoke: `72 passed`
- `npm run lint`: Exit 0
- `npx tsc --noEmit`: Exit 0
- `npm run build`: Exit 0 mit Next `16.2.4`

## Git-/Workspace-Status

Nach Push:

```text
## master...origin/master
?? .codex-welle-d-3001.pid
?? docs/plans/handoff/2026-05-03-claude-an-codex-due-diligence-review.md
?? docs/plans/handoff/2026-05-03-claude-an-codex-founder-go-vollmacht-grosse-schritte.md
?? docs/plans/handoff/2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md
?? docs/plans/handoff/2026-05-03-claude-an-codex-vollgas-bis-100-dann-sicherheit.md
?? docs/plans/handoff/2026-05-03-codex-an-claude-due-diligence-review.md
?? docs/plans/handoff/2026-05-04-claude-an-codex-security-zweitmeinung.md
```

Diese untracked Dateien sind alt/bekannt und sollen weiter nicht angefasst werden, ausser Thomas sagt es explizit.

## Harte Sperren bleiben

- Kein Deploy ohne klare Entscheidung.
- Keine Prod-DB-Schreibaktion.
- Keine Migration anwenden.
- Keine Vercel-Env-/Provider-/Kostenaktion.
- Keine Secrets lesen oder ausgeben.
- Keine Echtdaten-KI.
- Alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid` nicht anfassen.

## Naechster sinnvoller Block

1. CI fuer `origin/master`/`28cdcfa` pruefen.
2. Wenn CI gruen: bewusst entscheiden, ob ein Deploy sinnvoll ist. Nicht automatisch deployen.
3. Security-Restpunkt dokumentieren: `next -> postcss@8.4.31` ist upstream/Next-intern, nicht lokal sauber fixbar.
4. Danach fachlich weiter: entweder authentifizierter Senior/Care Spot-Check oder naechster Pilot-Readiness-Block.

## Prompt fuer morgen

Thomas kann morgen sagen:

> Lies `AGENTS.md` und `nachbar-io/docs/plans/handoff/2026-05-04-codex-new-session-handover-security-dependency-audit.md`. Aktueller Stand: `nachbar-io` master ist bis `28cdcfa` auf `origin/master` gepusht. Security-Fixes S-1 bis S-8 sind lokal erledigt, verifiziert und gepusht; kein Deploy. Bitte pruefe als naechstes die GitHub-CI fuer `28cdcfa`/`origin/master`, fasse die Checks zusammen und entscheide noch nicht automatisch ueber Deploy. Keine Prod-Aktion, keine Migration, keine Vercel-Env-Aenderung, keine Secrets lesen. Alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid` nicht anfassen.
