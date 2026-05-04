# F-2 KI-Routen Per-User-Rate-Limit

Stand: 2026-05-04

## Ziel

Security-Zweitmeinung F-2 lokal schliessen: eingeloggte Nutzer sollen
Anthropic/Mistral nicht unbegrenzt ueber die KI-Routen triggern koennen.

Scope dieser Welle:

- `/api/companion/chat`
- `/api/ai/onboarding/turn`
- Gemeinsames serverseitiges Tageslimit pro User ueber beide Routen.
- Kein Provider-Schalter, keine Vercel-Env-Aenderung, keine Prod-DB-Aktion,
  keine Migration, keine Secrets.

## Pre-Check

Vor Umsetzung gelesen/geprueft:

- `AGENTS.md`
- `nachbar-io/AGENTS.md`
- `docs/plans/handoff/INBOX.md`
- `docs/plans/2026-05-04-pilot-onboarding-polish-wave-c.md`
- `docs/plans/handoff/2026-05-04-claude-an-codex-security-zweitmeinung.md`
- `../.claude/rules/pre-check.md`
- `../.claude/rules/testing.md`

Repo-Suche:

- `rg "rateLimit|rate-limit|ratelimit|limit.*user|Redis|zadd|zcard|429|quota|daily|per-user" app lib modules __tests__ scripts package.json`
- `rg "companion/chat|ai/onboarding/turn|canUsePersonalAi|MAX_TOOLS_PER_TURN|provider|call" app/api/companion app/api/ai lib/ai modules/voice __tests__`

Ergebnis:

- Bestehendes IP/Middleware-Rate-Limit liegt in `lib/rate-limit.ts`, ist aber
  nicht per User/Tag und nicht providerkostenbezogen.
- Bestehende Redis-Security-Infrastruktur liegt in `lib/security/redis.ts`.
- Deshalb kein zweiter Unterbau und keine neue externe Dependency, sondern ein
  schmaler AI-Adapter `lib/ai/rate-limit.ts` auf vorhandenes Security-Redis.

## TDD

RED zuerst:

- `npx vitest run __tests__/lib/ai-rate-limit.test.ts`
  - erwarteter Fehler: `@/lib/ai/rate-limit` existierte noch nicht.
- `npx vitest run __tests__/api/companion/chat.test.ts -t "KI-Tageslimit"`
  - erwarteter Fehler: Route lief weiter bis zum Chat-Service/Provider.
- `npx vitest run app/api/ai/onboarding/turn/__tests__/route.test.ts -t "KI-Tageslimit"`
  - erwarteter Fehler: Route lief weiter bis `provider.chat`.
- Zusatz-RED: Redis-Schreibfehler im Adapter war ungefangen.
- Zusatz-RED: Eine bestaetigte `confirmTool`-Aktion im Companion-Chat wurde
  faelschlich vom KI-Tageslimit blockiert, obwohl dabei kein Provider-Call
  stattfindet.

GREEN nach Umsetzung:

- `npx vitest run __tests__/lib/ai-rate-limit.test.ts` -> 4 passed
- `npx vitest run __tests__/api/companion/chat.test.ts -t "KI-Tageslimit"` -> 1 passed
- `npx vitest run app/api/ai/onboarding/turn/__tests__/route.test.ts -t "KI-Tageslimit"` -> 1 passed
- `npx vitest run __tests__/lib/ai-rate-limit.test.ts __tests__/api/companion/chat.test.ts app/api/ai/onboarding/turn/__tests__/route.test.ts` -> 49 passed

## Umsetzung

- `lib/ai/rate-limit.ts`
  - `consumeAiDailyUserLimit({ userId })`
  - Redis-Key: `ai:daily:user:<userId>:<UTC-YYYY-MM-DD>`
  - Tageslimit: 100 KI-Anfragen pro User.
  - TTL: 48 Stunden beim ersten Tages-Call, damit alte Buckets automatisch
    verschwinden.
  - Redis fehlt oder wirft: fail-closed mit `unavailable: true`, statt
    unbegrenzt Providerkosten zu riskieren.
- `/api/companion/chat`
  - prueft das Limit nach Auth, KI-Toggle und JSON-Parse, aber vor
    `processChat`.
  - bestaetigte `confirmTool`-Aktionen werden nicht gegen das Tageslimit
    gezaehlt, weil sie keinen neuen Provider-Call ausloesen.
  - 429 bei erreichtem Tageslimit.
  - 503 wenn der KI-Nutzungsschutz nicht verfuegbar ist.
- `/api/ai/onboarding/turn`
  - prueft das Limit nach Auth, KI-Toggle, Body-Validation und Consent, aber vor
    Memory-Load und Provider-Call.
  - 429 bei erreichtem Tageslimit.
  - 503 wenn der KI-Nutzungsschutz nicht verfuegbar ist.

## Verifikation

- `npx vitest run __tests__/lib/ai-rate-limit.test.ts __tests__/api/companion/chat.test.ts app/api/ai/onboarding/turn/__tests__/route.test.ts` -> 49 passed
- `npx eslint lib/ai/rate-limit.ts __tests__/lib/ai-rate-limit.test.ts app/api/companion/chat/route.ts __tests__/api/companion/chat.test.ts app/api/ai/onboarding/turn/route.ts app/api/ai/onboarding/turn/__tests__/route.test.ts --no-warn-ignored` -> clean
- `npx tsc --noEmit` -> clean
- `npm run build` -> Exit 0; nur bekannte lokale Warnung:
  `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`

## Sperren

Nicht gemacht:

- Kein Prod-DB-Write.
- Keine Migration.
- Keine Vercel-Env-/Provider-/Kostenaktion.
- Keine Secrets gelesen.
- Keine echten personenbezogenen Daten oder KI-Verarbeitung.
- Kein Push.
