# Session-Übergabe 2026-06-16 → nächste Session: **GO Schritt 3 (Chat vereinheitlichen)**

> **Für die nächste Claude-Session.** Founder-Entscheid: **Schritt 3 jetzt ausführen.** Diese Datei
> ist der Einstieg; die Auto-Memory `project_session_handover.md` (Banner oben) zeigt hierher.

## 0. TL;DR — was zuerst tun
1. **CI-Grün von `3e7d86c` bestätigen:** `gh run list -L 4 -R ClaudeTheo/nachbar-io`
   (war beim Schreiben grün: E2E Smoke+Multi-Agent + CodeQL alle success). Falls rot: erst klären.
2. **Dann Schritt 3 ausführen — das autoritative Rezept liegt fertig:**
   `docs/plans/2026-06-14-s2-3-chat-unify-migration.md` (Datei:Zeile-genau, Transforms, Verifikations-Gate,
   Rollback). **Diese Übergabe = Kontext + Reihenfolge + Gotchas; der Plan = die Schritt-für-Schritt-Liste.**
3. **Founder-GO für Push ist erteilt** (S1/S2-Welle inkl. CI-Greening). Push triggert KEINEN Deploy
   (nachbar-io = `workflow_dispatch only`).

## 1. Git-/CI-Stand (exakt, 2026-06-16)
- **nachbar-io ist ein EIGENES Repo** unter `C:\Users\thoma\Claud Code\Handy APP\nachbar-io` — **NICHT im
  Worktree** (der aktuelle Worktree gehört zum äußeren „Handy APP"-Workspace, dort liegt KEIN nachbar-io).
  Für alles an nachbar-io: **Bash mit absolutem Pfad** (`cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io" && …`).
- `origin/master = 3e7d86c` — S5.3-Fix (`b60b33c`) + S2-7 (`b8cce6f`) + S2-5 (`3e7d86c`) alle gepusht + **CI-grün**.
- Lokaler `master = c1dab36` **ahead 1 / ungepusht** = der Chat-Unify-Plan-Doku-Commit. **Geht beim
  Schritt-3-Push automatisch mit raus** — das ist gewollt.
- **Working-Tree-Reste — BEWUSST nicht committen** (teils Key-Präfixe → gitleaks/Secret-Guard):
  - `M docs/plans/handoff/2026-06-13-claude-an-codex-phase-b-quarantine-ship.md`
  - `?? .session-artifacts/` (Harness-Artefakte)
  - `?? docs/plans/handoff/2026-06-13-codex-an-claude-*.md` (3 eingehende Codex-Notizen)
  - `?? scripts/run-e2e-cloud.mjs` (nützlicher Cloud-E2E-Runner, behalten)
  → **Beim Commit IMMER nur die Migrations-Dateien gezielt stagen (`git add <pfad> …`), NIE `git add .`.**

## 2. Was Schritt 3 ist (Zusammenfassung — Details im Plan)
`/chat` + `/chat/[id]` (medienfähig, gruppenfähig, vom Dashboard schon genutzt) wird **kanonisch**;
`/messages` + `/messages/[id]` (Legacy, nur Text) werden **Redirect-Shims**. In **EINEM Commit**, weil
test-verflochten (ALLE Chat-E2E fahren `/messages`, 0 `/chat`).
- **Teil A — Shims:** `app/(app)/messages/[id]/page.tsx` → `redirect(\`/chat/${id}\`)` (Server-Component,
  async params); `app/(app)/messages/page.tsx` → `redirect("/chat")`.
- **Teil B — 11 App-Detail/Listen-Links** `/messages/${id}`→`/chat/${id}` bzw. `/messages`→`/chat`
  (care/contact, care/meine-senioren, experts ×2, leihboerse, marketplace, HouseInfoPanel ×2, my-day,
  notifications-Map ×3, lib/services/notifications.service-Map ×3, voice/tools ×2). **Exakte Zeilen im Plan.**
- **Teil C — E2E-Lockstep:** `pages/messages.page.ts` (Page-Object, zentral) + `s3`/`s6`/`s7`/`s12`/`s13`
  **MÜSSEN** mit (CI-gating). `phase-a`/`phase-b`/`pilot-smoke` aus Korrektheit auch (nicht CI-gating).
- **Mini-Audit: NICHT nötig** (reiner Routen-/Link-Umbau, keine Auth/RLS/Mig/Token-Fläche).

## 3. Durable Gotchas (NICHT neu debuggen)
- **PowerShell-Tool ist auf den Worktree gesandboxt** → erreicht `nachbar-io` NICHT. Bash + absoluter Pfad.
  Prozess-Kills via `powershell.exe`-Subprozess aus Bash.
- **CI-E2E läuft gegen einen LOKALEN Supabase-Stack** (nicht Prod) und fährt `--project=multi-agent`
  (`scenarios/s[0-46-9]*` = s1-4, s6-13) + `--project=senior-terminal` (s5) + separater Smoke-Job (s7).
  **NICHT** auf CI: `multi-agent-sim` (phase-*), `cross-portal`, `pilot-smoke`. → Push-gating für Schritt 3
  sind **nur s3/s6/s7/s12/s13** (+ deren Page-Object).
- **`/chat`-Selektoren:** Einzelchats = `a[href="/chat/<id>"]` (matcht `a[href^='/chat/']`); Gruppen =
  `a[href^='/chat-groups/']` (matcht NICHT `/chat/` — gut, Specs wollen 1:1). `/chat` zeigt die
  „Einzelchats"-Sektion erst, wenn `listConversations()` Daten liefert — s3/s12/s13 legen vorher
  Konversationen an, Liste ist also befüllt.
- **gitleaks pre-commit hook** ist aktiv (lief bisher sauber). Secret-haltige Dateien nicht stagen.
- **CI beobachten:** `gh run watch` ist flaky (bricht mit exit 1 ab) → stattdessen Poll-Loop im Hintergrund:
  `for i in $(seq 1 80); do s=$(gh run view <id> -R ClaudeTheo/nachbar-io --json status --jq .status); [ "$s" = completed ] && break; sleep 30; done` (mit `run_in_background: true`). E2E dauert ~22 min.
- **Vor Push:** `npx tsc --noEmit` + `npm run lint`. E2E-Test-Dateien sind vom Lint ausgenommen
  (Warnung „File ignored because of a matching ignore pattern" = ok, kein Fehler).

## 4. Verifikations-Gate (vor Push, in dieser Reihenfolge)
1. `npx tsc --noEmit` clean.
2. `npm run lint` clean (bzw. gezielt `npx eslint <geänderte src-Dateien>`).
3. **Grep-Gate:** `grep -rInE "/messages(/|\")" app components modules lib` → nur noch API-Pfade
   (`/api/...`, `conversations/[id]/messages`, `chat-groups/[id]/messages`, `prevention/messages`) +
   `https://api.anthropic.com/v1/messages`. **Keine Navigations-Treffer mehr.**
4. Lokaler E2E s3+s12 wenn der lokale Stack läuft (`npm run supabase:start` + Playwright), sonst direkt CI.
5. Push → CI (multi-agent + senior-terminal + smoke) grün abwarten.

## 5. Commit + Push
- **Nur Migrations-Dateien stagen** (Plan listet sie). Der lokale `c1dab36` (Plan-Doku) wandert beim Push mit.
- Commit-Message englisch, Trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- `git push origin master` → CI pollen → **grün bestätigen, bevor „fertig" gemeldet wird** (nicht vorab grün annehmen).

## 6. Definition of Done
`/chat` ist die einzige Chat-Oberfläche; `/messages*` leitet nur noch um; keine App-Stelle linkt
navigatorisch auf `/messages`; CI (s3/s6/s7/s12/s13 + s5) grün.

## 7. Danach (S2 ist damit komplett)
- **Fable-Wellen** `docs/plans/2026-06-12-spiele-senior-features-wellenplan.md`: SB (Senior-Bildschirm —
  RLS-Mig + Mini-Audit Pflicht), SP1-Rest (Tagesrätsel — Founder muss die 50 Entwurfsfragen prüfen),
  SP2 (Familienfoto-Spiele), AA (Auto-Annahme — Consent-Mig + Mini-Audit Pflicht).
- **Block-B/C der Fable-Analyse** (`docs/plans/2026-06-12-fable5-app-analyse-ergebnis.md`).
- **Founder-Hand (rote Zone):** `9294485` KI-Payload-Pseudonymisierung pushen (Pre-Push-Mini-Audit);
  Profi-FK 3a/3b Prod-Apply; §5 AVV-Versand; Mig 196/199 Prod-Apply — siehe Auto-Memory `MEMORY.md`.

## 8. Was diese Session (2026-06-14) erledigt hat
- **CI-Greening:** Vorige Übergabe schrieb „grün", CI war ROT (S5.3 hing 60s am gateten Check-in). Fix
  `b60b33c` (`SeniorCheckinPage.waitForCheckinResult` racet jetzt Navigation ODER Fehler-Alert, 10s).
- **S2-7 Family-Setup** `b8cce6f`: „Link teilen" in `SetupQrCard` + `PairSeniorDeviceCard` auf
  `/care/meine-senioren/[seniorId]`. Mini-Audit grün (`…/2026-06-14-s2-7-family-setup-mini-audit.md`).
- **S2-5 Anruf** `3e7d86c`: „Anrufen"-Button in `MyCaregiversList` + `GlobalCallListener` ins
  `(senior)`-Layout. Mini-Audit grün (`…/2026-06-14-s2-5-anruf-mini-audit.md`).
- **Schritt-3-Plan** `c1dab36` geschrieben (ungepusht).
- **S2 jetzt: Schritte 1/2/4/5/6/7 fertig — NUR Schritt 3 offen.**
