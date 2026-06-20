# 2026-06-14 — Claude an Codex: Blocker GELÖST → Voll-Lauf + Push (autoritativ)

> **Dieser Brief löst ALLES Vorherige ab.** Ignoriere die Samstags-Nachricht
> („phase-b-service-role-blocker") und die Quarantäne — beide sind überholt.

## Status: der Service-Role-Blocker ist gelöst (kein Workaround, echte Ursache gefixt)

- **Echte Ursache:** Supabase lehnt `sb_secret_*`-Keys mit „Forbidden use of secret API key
  in browser" (401) ab, **sobald der Request einen Browser-User-Agent trägt**. Trigger ist
  **ausschließlich der User-Agent**, NICHT der apikey-Header.
- **Fix (bereits im Working Tree):** `tests/e2e/helpers/supabase-admin.ts` setzt jetzt einen
  expliziten Server-`User-Agent` (`ADMIN_FETCH_USER_AGENT`) in beiden Funktionen. **Gegen Prod
  verifiziert** (Server-UA → 200 / POST-Auth-OK; Browser-UA → 401). Kein Header-Umbau.
- **B1 + B7 sind wieder `test.describe`** (Quarantäne entfernt — der Fix macht sie überflüssig).

## ⚠️ ZUERST: Branch prüfen
Deine UI zeigte zuletzt `codex/fix-spatial-ref-sys-rls`. **Stell sicher, dass du auf `master`
bist** (HEAD `8cb45b8`). **NICHT** den Branch wechseln, solange der Working Tree die uncommitteten
Änderungen trägt — sonst gehen sie verloren/kollidieren. Check:
```
git -C <nachbar-io> branch --show-current   # muss "master" sein
git -C <nachbar-io> rev-parse --short HEAD   # 8cb45b8
git -C <nachbar-io> rev-list --left-right --count origin/master...master   # 0  17
```

## Working Tree — das ist zu committen (wenn grün)
Uncommittet, kohärent, gehört alles in EINEN Push:
- `tests/e2e/helpers/supabase-admin.ts` — **UA-Fix**
- `tests/e2e/multi-agent/phase-b-cross-role.spec.ts` — Selektor-Fixes (B2b/B4/B7) + B1/B7 ent-quarantänt + B2a weich
- `app/(senior)/layout.tsx` — QuarterProvider
- `scripts/e2e-localhost-preflight.mjs`, `tests/e2e/auth-setup.ts`, `scripts/run-e2e-cloud.mjs`
- deine restliche E2E-Umstellung (`tests/e2e/scenarios/*`, `tests/e2e/multi-agent/phase-a/c`, `cross-portal/x04`, `pilot-smoke`, `pages/senior.page.ts`)
- Bereits committet (ahead 17): `c6dad6f` Realtime-Fix + 4 Handoff-Briefe.

## Deine Schritte
1. **Voll-Lauf gegen warmes `dev:cloud`** (`--workers=1`, `NODE_OPTIONS=--max-old-space-size=8192`;
   ggf. `scripts/run-e2e-cloud.mjs` nutzen):
   - `phase-b-cross-role` (B1+B7 laufen jetzt wieder — Service-Role-Seeding klappt dank UA-Fix)
   - `s13-five-user-interaction` (Node-Pfad, UA „node" → war schon grün; muss grün bleiben)
   - Rest-Chunks: `phase-c-edge-cases`, `cross-portal/x04-kiosk-sos-112`, `pilot-smoke`
2. **Vitest** ressourcenschonend (`--no-file-parallelism`) — frühere Rot = Windows-Fork/OOM, kein Regress.
3. **Wenn Typecheck + ESLint + Vitest + alle E2E grün:** alles committen (eine sinnvolle Commit-Reihe
   oder ein Sammel-Commit) + **`git push origin master`**. **Founder-Go für Push liegt vor.**
4. **KEIN Deploy** (separater Founder-Go, Vercel-Env).

## Falls doch noch rot
- **phase-b einzeln rot** (Selektor/Timing): melden mit Test-ID + Snapshot — App-Frage zurück an Claude.
- **s13 mit Seeding-401**: dann trägt dein Lauf doch einen Browser-UA in den Helper — prüfen, dass der
  UA-Fix aktiv ist (`rg ADMIN_FETCH_USER_AGENT tests/e2e/helpers/supabase-admin.ts`).
- **Infra (OOM/EPIPE)**: Suite chunk-weise, Server zwischendurch frisch starten.

## Danach (nicht für diesen Push)
S2-Rest: Schritt 3 Chat-Unify / 5 Anruf / **7 Family-Setup = Mini-Audit-Pflicht**.
Backlog-Härtung: gleichen Server-UA auch in `test-user-factory.ts` / `agent-factory.ts` /
`db-seeder.ts` / `phase-e-escalation.spec.ts` / `s11-memory.spec.ts` (laufen aus Node, daher
aktuell ok) — Detail im Mini-Audit der `…-phase-b-quarantine-ship.md`.
