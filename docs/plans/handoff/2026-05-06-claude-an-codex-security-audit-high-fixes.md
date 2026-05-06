# Claude → Codex — Security-Audit HIGH-Fixes

**Datum:** 2026-05-06 abend
**Anlass:** Founder hat einen Sicherheits-Test angefragt. Claude hat unabhaengigen Code-Sweep gemacht und 2 HIGH-Befunde gefunden, die nicht durch F-1..F-5 oder OWASP NEW-1..5 abgedeckt waren. Beide sofort gefixt + gepusht.

## Was gepusht wurde (origin/master = cedd808)

### Commit 1 — `a4fc8d1` HIGH: Open Redirect in /auth/callback

**Befund:** `app/auth/callback/route.ts:12,19` ueberreichte den `?next=`-Param ungeprueft an `NextResponse.redirect(\`\${origin}\${next}\`)`. Mit `?next=//evil.com/foo` folgte der Browser nach erfolgreicher Magic-Link-Auth zur protocol-relative URL → Phishing-Hebel.

**Fix:**
- Neuer Helper `lib/auth/sanitize-next-path.ts` — pure function, blockiert `//`, `/\\`, absolute URLs, Strings ohne fuehrenden Slash. Custom-Fallback-Param (Callback nutzt `/after-login`, Test-Login nutzt `/dashboard`).
- `app/auth/callback/route.ts` mit Helper umgestellt.
- `app/api/test/login/route.ts` lokale `sanitizeNextPath` durch zentralen Import ersetzt — kein Code-Duplikat mehr.
- 8 neue Vitest-Faelle in `__tests__/lib/auth/sanitize-next-path.test.ts`.

### Commit 2 — `9001838` HIGH: F-2 Coverage-Gap in /api/care/classify-task

**Befund:** F-2 (`consumeAiDailyUserLimit`) war nur in `companion/chat` und `ai/onboarding/turn` montiert. `app/api/care/classify-task/route.ts` ist die **dritte AI-Route**, hatte `requireAuth` + `canUsePersonalAi`, aber **kein Daily-Cap**. Eingeloggte Nutzer konnten Anthropic/Mistral-Konto via Schleifen-Aufrufe leerziehen (DoW).

**Fix:**
- `consumeAiDailyUserLimit` nach `canUsePersonalAi`-Gate eingebaut, gleiches Pattern wie in `companion/chat`.
- 429 bei Limit erreicht, 503 bei Redis-unavailable (fail-closed).
- 3 neue Vitest-Faelle (allowed / limit / unavailable).

### Commit 3 — `cedd808` chore: npm audit fix

**Befund:** 4 moderate CVEs in deps.

**Fix:**
- Ohne `--force` durch: ip-address + express-rate-limit (transitiv).
- Verbleibende 2 sind via `next 16.2.4 → postcss <8.5.10` (GHSA-qx2v-qp2m-jg93). `npm audit fix --force` wuerde next auf 9.3.3 downgraden — katastrophal. Akzeptabel bis Next.js 16.x ein Patch released. Praktisches Risiko gering (untrusted CSS-Input zur Stringify findet bei Build-Time-CSS nicht statt).

## Verifikation

- `npx vitest run __tests__/api/test __tests__/lib/auth __tests__/api/care/classify-task-route.test.ts __tests__/api/companion __tests__/lib/closed-pilot.test.ts` → 54/54 gruen.
- `npx tsc --noEmit` → exit 0.
- `npx eslint <touched files>` → exit 0.
- `npm audit --audit-level=moderate` → 2 verbleibend (next/postcss, dokumentiert).

## Was NICHT gemacht wurde

Der Audit hat noch MEDIUM/LOW-Befunde, die nicht in dieser Welle waren. **Founder hat nur HIGH + audit-fix freigegeben.** Folgende sind offen — bei naechster Gelegenheit abarbeiten:

| Severity | Befund | Wo | Aufwand |
|---|---|---|---|
| MEDIUM | E) Cron-Bearer mit `===`-Compare statt `timingSafeEqual` (~25 Routen) | `app/api/cron/**/*.ts`, `app/api/care/cron/**`, `app/api/news/aggregate/route.ts`, `app/api/security/forensic-ingest/route.ts` | Helper `verifyCronSecret(authHeader)` zentralisieren, dann alle Routen | 1-2 h |
| MEDIUM | F) `isValidExternalUrl` SSRF-Luecken (IPv6 mapped, Hex/Octal, DNS-Rebind, `0`-Hostname) | `lib/webhooks.ts:55-77` | DNS-Resolve im Validator + `is-private-ip`-Library | 30-45 Min |
| MEDIUM | A) E2E-Bypass `===`-Compare nicht timing-safe | `lib/supabase/middleware.ts:54-58` | `timingSafeEqual` + `VERCEL_ENV !== "production"`-Hard-Gate | 15 Min |
| LOW | B) `app/api/quartier-info/route.ts` Service-Role ohne Auth-Check | dort | `requireAuth` ergaenzen oder explizit als public deklarieren | 10 Min |
| LOW | D) Encryption-Format ohne Versionierung | `modules/care/services/crypto.ts` | Format `aes256gcm:v1:...` fuer zukuenftige Rotation | 30 Min + Migration |
| LOW | C) Medical-Blocklist Bypass (Leetspeak/Unicode) | `modules/memory/services/medical-blocklist.ts:38-52` | Unicode-Normalisierung NFKD + Diacritic-Strip vor Match | 20 Min |

CLEAN-Befunde aus dem Sweep (zur Beruhigung):
- Stripe-Webhook (offizielle SDK, raw body)
- Twilio Hard-Gate fail-closed
- CORS (kein `Access-Control-Allow-Origin`-Header)
- Secrets-Hygiene (.env.example sauber, keine `console.log(process.env.X)`)
- AI-Memory-Tools Scope-Check
- Stripe + Anamnese-Token + Postfach-Routes mit User-Auth vor Service-Role

## Live-Tests gegen Production

Headers, WAF, Closed-Pilot funktionieren wie erwartet. Brute-Force-Trap (60 schnelle Requests auf `/api/health` mit `Mozilla/5.0`-UA) hat sofort Trap 5 ausgeloest → memory-bestaetigtes Verhalten. Geschuetzte Routes geben durchgaengig 403 "Zugriff voruebergehend gesperrt" oder 307 redirect zu /. Cron-Endpoint mit falschem Bearer → 401 ohne Info-Leak.

## Naechste Schritte

- **Codex (autonom):** Wenn du eine Welle gegen die MEDIUM-Reste planst, Cron-Bearer-Helper ist der dickste Block — gleicher Helper-Pattern wie `lib/webhooks.ts` `timingSafeEqual`. SSRF-Haertung danach.
- **Founder:** Live-Prod auf SHA `fe6687d` (vor diesem Push). Diese Fixes sind auf origin/master, aber NICHT deployed — Variante A: Push autonom, Deploy bewusst. Wenn Founder Deploy will: `vercel deploy --prod` (Linux-Build), Windows-prebuilt scheitert weiter.

— Claude
