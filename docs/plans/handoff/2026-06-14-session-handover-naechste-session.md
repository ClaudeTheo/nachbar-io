# Session-Übergabe 2026-06-14 — S1/S2 GESHIPPT → nächste Session: S2-Rest

> **Für die nächste Claude-Session.** Diese Datei + die Auto-Memory `project_session_handover.md`
> sind der Einstieg. Erstellt am Ende einer langen S1/S2-Ship-Session.

## 0. TL;DR — was zuerst tun
1. **CI-Grün von `ef610c6` bestätigen:** `gh run list -L 3 -R ClaudeTheo/nachbar-io`. Beim
   Übergabe-Schreiben lief der E2E-Multi-Agent-Lauf noch (CodeQL war schon ✅). **Hohe Konfidenz
   grün** (der letzte Fix spiegelt einen bereits grünen Test, und der vorige Lauf war 93/95 mit nur
   einem Fehler, der jetzt gefixt ist). Falls rot: welcher Test? (siehe §3).
2. **Dann: S2-Rest bauen** (§5) — Schritt 3 (Chat-Unify, risikoärmster Start) → 5 (Anruf) → 7
   (Family-Setup; **Mini-Audit liegt schon grün vor**).

## 1. Git-/CI-Stand (exakt, 2026-06-14)
- Branch `master`, **`origin/master = local = ef610c6`**, in sync (0/0).
- **KEIN Deploy** ausgelöst (nachbar-io = `workflow_dispatch only`; Deploy = separater Founder-Go).
- Commits dieser Session (älteste zuerst), alle auf origin:
  - `c6dad6f` Realtime-Fix `lib/useUnreadCount.ts` (geteilte ref-gezählte Subscription — behob die s13-Chat-Flakes; Port aus PR #37, kosmetischer Badge-Teil weggelassen)
  - `5541ce4` / `fe6ad4d` / `8cb45b8` / `4f063d9` — Claude→Codex-Briefe (Realtime-Resume, phase-b-Selektor-Fixes, Quarantäne, FINAL)
  - `7f8a34b` S2-7 Family-Setup Mini-Audit (vorgezogen, GRÜN)
  - `da4713c` **E2E-Migration auf `(senior)`-Shell + Server-UA-Service-Role-Helper + `app/(senior)/layout.tsx` QuarterProvider** (der große Ship-Commit)
  - `ef610c6` Fix: Check-in-Page-Object tolerant gegen flag-gateten Check-in (greent S5.3 auf CI)

## 2. Was diese Session erreicht hat (die Saga, kompakt)
S1 (Eine Senior-Welt) + S2 Schritte 6/4/1/2 waren gebaut; Codex stoppte beim Push-Gate, weil ein
E2E-Test (s13) flakte. **Verlauf:**
- Claude fixte den **Realtime-Root-Cause** (`useUnreadCount` Doppel-Subscribe destabilisierte `/messages`) → Codex verifizierte s13+s6 = 16 passed.
- Übrig: `phase-b-cross-role.spec.ts` mit veralteten Test-Annahmen → Claude fixte B2b (`/care` „Mein Tag"-Heading), B4 (Kategorie = `role=radio`), B7 (Konversation per Shared-Helper anlegen).
- Dann **Infra-Blocker:** Service-Role-Seeding gegen Prod wurde abgelehnt. Erste Hypothese (apikey-Header) war FALSCH → eine spawn_task-Session fand die **echte Ursache: ein Browser-User-Agent** triggert die Ablehnung des neuen Secret-Key-Formats. **Fix:** expliziter Server-User-Agent im Test-Helper `tests/e2e/helpers/supabase-admin.ts` (`ADMIN_FETCH_USER_AGENT`), gegen Prod verifiziert. B1/B7 wieder ent-quarantänt.
- **Codex stürzte im finalen E2E-Lauf ab** (OOM auf der Windows-Maschine). Repo blieb sauber.
- **Claude übernahm:** Port 3000 freigemacht, frischen `dev:cloud` gegen Prod gestartet,
  **phase-b GRÜN gegen Prod** (14 passed, 1 flaky-retry, 1 skipped — global-setup-Seeding + B1 + B7
  beweisen, dass der UA-Fix das Service-Role-Seeding gegen Prod entsperrt). **s13** scheiterte
  zweimal an reiner Maschinen-Instabilität (Timeouts/Connection auf dem crash-belasteten Host, kein
  Code; war vorher grün). → Push `da4713c` unter Founder-autorisiertem Fallback.
- **CI von `da4713c`:** 93 passed, 1 skipped, **nur S5.3 failed** (Check-in-Test zu strikt für den
  flag-gateten Check-in auf dem lokalen CI-Stack). → Fix `ef610c6` (Page-Object tolerant, analog s9).
- Danach hat der Founder den **PC neu gestartet** (räumte die Zombie-Prozesse von Codex' Absturz weg).

## 3. Durable Lessons / Gotchas (NICHT erneut debuggen)
- **Service-Role-Seeding gegen Prod braucht einen Server-User-Agent.** Ein Browser-UA → 401
  „Forbidden use of secret API key in browser" (neues Secret-Key-Format). Gefixt in
  `supabase-admin.ts`. **Backlog-Härtung:** denselben Server-UA auch in `test-user-factory.ts`,
  `agent-factory.ts`, `db-seeder.ts`, `phase-e-escalation.spec.ts`, `s11-memory.spec.ts` (laufen
  aktuell aus Node mit UA „node" → ok, aber zur Härtung angleichen).
- **Der Senior-Check-in ist flag-gated** (`CHECKIN_MESSAGES_ENABLED` aus auf lokalem Stack/Pilot —
  Fable-Befund A3:1). Tests müssen „erfolgreich ODER kontrolliert gated" tolerieren (Muster: s9.2).
  S5.3 + das `SeniorCheckinPage`-Page-Object sind jetzt so gebaut.
- **CI-E2E läuft gegen einen LOKALEN Supabase-Stack** und fährt `--project=multi-agent
  --project=senior-terminal` (Szenarien s1–s13 + s5), **NICHT** `multi-agent-sim` (phase-a/b/c).
  D.h. **phase-b/Service-Role-UA wird von CI gar nicht exerziert** (lokaler Legacy-Key). phase-b
  nur lokal/Prod prüfen.
- **`dev:cloud`** = `node scripts/dev-server.mjs cloud` → lädt `.env.cloud-current.local` (Prod) in
  `process.env` (gewinnt gegen Next's lokale `.env.local`). Guard `ensureNoParallelNextDev`: erst
  einen evtl. laufenden `:3000`-Server killen, sonst startet er nicht.
- **Cloud-E2E lokal fahren:** `scripts/run-e2e-cloud.mjs` (untracked, nützlich — setzt Cloud-Env +
  E2E_LIVE/BASE_URL/ALLOW_CLOUD_LOCALHOST/CLEANUP, fährt gegen den laufenden `:3000`-Server).
  Aufruf-Beispiel phase-b: `node scripts/run-e2e-cloud.mjs --config=tests/e2e/playwright.config.ts
  --project=multi-agent-sim phase-b-cross-role.spec.ts --workers=1` (NODE_OPTIONS
  `--max-old-space-size=8192`). s13: `--project=multi-agent s13-five-user-interaction.spec.ts`.
  **Projekt-Zuordnung:** phase-a/b/c → `multi-agent-sim`; s1–s13 → `multi-agent`; s5 →
  `senior-terminal`. Filter relativ zu `testDir = tests/e2e`.
- **PowerShell-Tool ist auf den Worktree gesandboxt** (erreicht `nachbar-io` nicht). Für nachbar-io
  Bash nutzen; Prozess-Kills via `powershell.exe`-Subprozess aus Bash.
- **Secret-Hygiene:** Dateien mit Key-Wert/-Präfix (`…service-role-blocker.md`, der
  `…quarantine-ship.md` mit Auflösungsteil) wurden bewusst **NICHT** committet (Read/Write-Guard +
  gitleaks). Liegen untracked/uncommittet im Working Tree.

## 4. Working-Tree-Reste (uncommittet, bewusst — kein Konflikt mit neuem Code)
- `M docs/plans/handoff/2026-06-13-claude-an-codex-phase-b-quarantine-ship.md` (Key-Präfix → nicht committen)
- `?? .session-artifacts/` (Harness-Artefakte)
- `?? docs/plans/handoff/2026-06-13-codex-an-claude-*.md` (3 eingehende Codex-Notizen; eine enthält einen Key → nicht committen)
- `?? scripts/run-e2e-cloud.mjs` (nützlicher Cloud-E2E-Runner, von anderer Session; behalten)

## 5. NÄCHSTE SCHRITTE — S2-Rest (priorisiert)
Plan-Quelle: `docs/plans/2026-06-12-senior-welt-familienkreis-wellenplan.md`, Welle S2.
1. **Schritt 3 — Chat vereinheitlichen** (kein Mini-Audit, niedrigstes Risiko → guter Start):
   `/chat/[id]` kanonisch, `/messages/[id]` → Redirect-Shim. **Zuerst Inventar-Grep** (viele Stellen
   nutzen noch `/messages/...`), dann Shim + ggf. Umhängen. Befund C2:3.
2. **Schritt 5 — Anruf** (leichter Mini-Audit, `caregiver_links`-Scope): `GlobalCallListener`
   zusätzlich ins `(senior)`-Layout (klingelt dort heute nicht) + Anruf-Knopf in `MyCaregiversList`
   (Senior → Angehöriger). `care/status` hat schon `/video-call/${resident.id}`. Befund C2:4.
3. **Schritt 7 — Family-Setup** (A2:1/A2:3): (a) „Link teilen" in `SetupQrCard` (navigator.share/Copy
   der `setupUrl`); (b) „Gerät verbinden" auf `/care/meine-senioren/[seniorId]` ruft die bestehende
   Route `start-code` + zeigt den 6-stelligen Code groß (Senior-Numpad „Ich habe einen Code" → 
   `claim-by-code` existiert). **MINI-AUDIT LIEGT SCHON GRÜN VOR:**
   `docs/plans/handoff/2026-06-14-s2-7-family-setup-mini-audit.md` (`start-code` ist
   `caregiver_links`-autorisiert, `claim-by-code` hat Redis-Rate-Limit 5/IP/h + Single-Use +
   10-min-TTL; 2 LOW-Backlog PAIR-1 [kein dedizierter Audit-Log beim Claim] / PAIR-2 [Rate-Limit nur
   per-IP] — kein Pilot-Blocker). **S2-7 fügt keine neue Auth-/RLS-Fläche hinzu.**

**Arbeitsregeln:** TDD je Schritt (RED zuerst). Push = Founder-Go (für die S1/S2-Welle + CI-Greening
erteilt). Pre-Check (codebase-weit grep vor Neubau). Bei S2-7: Mini-Audit-Block ist schon erfüllt.

## 6. Danach (mittelfristig)
- **Fable-Wellen** (Plan: `docs/plans/2026-06-12-spiele-senior-features-wellenplan.md`): SB
  (Senior-Bildschirm — **Mini-Audit + RLS-Mig Pflicht**), SP1-Rest (Tagesrätsel — Founder muss die
  50 Entwurfs-Fragen faktisch prüfen), SP2 (Familienfoto-Spiele), AA (Auto-Annahme — **Mini-Audit +
  Consent-Mig Pflicht**).
- **Block-B/C der Fable-Analyse** (`docs/plans/2026-06-12-fable5-app-analyse-ergebnis.md`, 92
  Befunde): restliche Senior-Quickwins (A2:4/A2:5/A3:6/B3:3/B3:4/A4:2/A4:3/A1:5), DSGVO-Consent-UX
  (D4:1/D4:3/D4:4/D4:5, D3:1/D3:3), Pro-Community-/Pricing-Claims (C3:1/B2:1/B2:2/C1:1/C1:5),
  KI-Gateway „Stufe 0" vor KI-Go (D5:1/D5:4/D6:1/D6:2 + DSE-Anpassung D2:1 + AVV-Konsolidierung).

## 7. Founder-Hand offen (Rote Zone)
- **`9294485` (KI-Payload-Pseudonymisierung, Fables Top-Befund D1:1) pushen** — liegt lokal auf
  `master` ahead, ungepusht; Pre-Push-Mini-Audit + Founder-Go nötig. ⚠️ Prüfen: nach dem heutigen
  Push ist `master = ef610c6`; der `9294485`-Stand muss neu gegen den aktuellen master eingeordnet
  werden (war früher „ahead 1" über `22d0b91`).
- Profi-FK 3a/3b Prod-Apply, §5 AVV-Versand, Mig 196/199 Prod-Apply, Pilot-Familien-Akquise — siehe
  Auto-Memory `MEMORY.md` Offene-Punkte.

## 8. Kontext-Flags
- **Ultracode ist AN** (Workflow + adversariale Verifikation für substanzielle Tasks nutzen).
- Maschine ist nach dem Reboot sauber (Zombie-Prozesse weg).
