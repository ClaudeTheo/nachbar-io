# Session-Übergabe 2026-06-16 → nächste Session: **Welle SB (Senior-Bildschirm)**

> **Für die nächste Claude-Session.** Schritt 3 (Chat-Unify) ist geshippt + CI-grün → **S2 komplett**.
> Nächster Code-Schritt = **Welle SB**. Diese Datei ist der Einstieg; die Auto-Memory
> `project_session_handover.md` zeigt hierher. **GO-Status:** Reihenfolge S1→S2→**SB**→SP1→SP2→AA
> hat Founder-Go (2026-06-12). Bauen + Push + CI laufen autonom (Variante A). **ABER:** die RLS-Migration
> ist **file-first** — **kein Prod-Apply ohne separaten Founder-Go**; und der **Mini-Audit ist Pflicht** und
> der **erste** Schritt — **bei CRITICAL/HIGH: STOP + Founder.**

## 0. TL;DR — was zuerst tun
1. **Stand prüfen:** `cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io" && git log --oneline -3 && gh run list -L 4 -R ClaudeTheo/nachbar-io` — erwartet `origin/master = 3150853`, CI grün.
2. **Autoritatives Rezept lesen:** `docs/plans/2026-06-12-spiele-senior-features-wellenplan.md`, Abschnitt **„Welle SB — Senior-Bildschirm"** (ab ~Z.132): Tasks **SB-0 … SB-4** mit fertiger Migration-SQL, Datei:Zeile-Liste, DoD. **Diese Übergabe = Kontext + Stand + Gotchas; der Plan = die Schritt-für-Schritt-Liste.**
3. **SB-0 zuerst:** Pre-Check (frischer Grep) **+ Mini-Audit** (`.claude/rules/security-mini-audit.md`). Erst danach Code.

## 1. Git-/CI-Stand (exakt, 2026-06-16)
- **nachbar-io ist ein EIGENES Repo** unter `C:\Users\thoma\Claud Code\Handy APP\nachbar-io` — **NICHT im Worktree**. Für alles: **Bash mit absolutem Pfad** (`cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io" && …`). Das PowerShell-Tool ist auf den Worktree gesandboxt und erreicht nachbar-io NICHT.
- `origin/master = 3150853` (`fix(e2e): s12 …`) — **S2-3 Chat-Unify geshippt, S2 komplett (Schritte 1–7).** CI grün (E2E Multi-Agent `27630585564` + CodeQL `27630586644` SUCCESS). **NICHT prod-deployed** (workflow_dispatch only).
- Working Tree sauber bis auf **bewusst nicht-committete** Reste (NIE `git add .`): `M docs/plans/handoff/2026-06-13-…-quarantine-ship.md`, `?? .session-artifacts/`, `?? docs/plans/handoff/2026-06-13-codex-an-claude-*.md` (3), `?? scripts/run-e2e-cloud.mjs`. **Beim Commit nur gezielte SB-Dateien stagen.**

## 2. Was Welle SB ist (Zusammenfassung — Details im Plan)
**Ziel:** Der Senior-Bildschirm lebt von der Familie. Alles auf **vorhandener** Terminal-/Care-Infrastruktur — **kein neuer Datentyp, keine neue Angehörigen-UI** (Foto-Upload + `KioskReminderForm` existieren).
- **SB-0** (erster Todo): Pre-Check + **Mini-Audit Pflicht** (RLS-Lese-Pass auf `kiosk_photos`/`kiosk_reminders`, Trigger-Inventar, Privilege-Sweep, Audit-Trail für die Quittung, Rate-Limit für neue Routen). **CRITICAL/HIGH → STOP.**
- **SB-1** RLS-Migration: verifizierte Haushaltsmitglieder dürfen Fotos/Zettel ihres Haushalts SELECTen (bisher nur Caregiver + Uploader). **File-first.**
- **SB-2** „Erster gemeinsamer Moment" (S3): neuestes Familienfoto groß auf `kreis-start` + Ein-Tap-Sprachantwort. Komponente `modules/care/components/senior/FamilienMomentCard.tsx`, **unter** dem Kachel-Grid (4-Kacheln-Regel unangetastet).
- **SB-3** Foto-Karussell als Ruhezustand: `SeniorScreensaver.tsx` + `app/api/senior/photos/route.ts` (Signed URLs) + Mount in `app/(senior)/layout.tsx`. `useIdleTimer`/`ScreensaverOverlay`-Muster **wiederverwenden**, nicht neu bauen.
- **SB-4** Sticky Notes + „Gesehen"-Quittung: `StickyNotesList.tsx` + `app/api/senior/reminders/[id]/acknowledge/route.ts`. Quittung setzt `acknowledged_at` per **Admin-Client mit eigenen Checks** (RLS-UPDATE bewusst NICHT geöffnet) → Push an `created_by` **ohne Zettel-Inhalt** (Datensparsamkeit). `safeInsertNotification` + `sendPush` aus S2 wiederverwenden.

## 3. Pre-Check schon vorab verifiziert (2026-06-16, Code-autoritativ — trotzdem in SB-0 frisch gegengrepen)
Die Plan-SQL für SB-1 ist **schema-valide** — keine bösen Überraschungen erwartet:
- `household_members` existiert (`supabase/migrations/001_initial_schema.sql:50`) **mit `verified_at TIMESTAMPTZ` (:56)** und `user_id`/`household_id`. Die Plan-Policy `hm.verified_at IS NOT NULL` ist gültig.
- `kiosk_photos` (`083_kiosk_photos_reminders.sql:7`) hat `household_id` + `visible` → Plan-SQL `visible = true AND household_id IN (…)` ist gültig.
- **RLS-Lücke bestätigt:** `kiosk_photos_select` (`083:27`) deckt nur Caregiver (via `caregiver_links`) **OR** `uploaded_by`. `kiosk_reminders_select` (`083:80`) analog. Der Senior/Resident kann seine eigenen Haushaltsdaten NICHT lesen → genau das schließt SB-1. UPDATE (`acknowledged_at`) bleibt zu → Quittung via SB-4-Route (Admin-Client).
- **Mig-Nummerierung:** neue Mig als Timestamp `2026MMDDHHMMSS_senior_household_kiosk_read.sql`. Vor dem Anlegen `ls supabase/migrations | sort | tail -3` gegen Kollision (Achtung: PR #38 belegt Nr `199`).

## 4. Nicht verhandelbare Regeln (aus dem Plan + Repo-Regeln)
- **Mini-Audit Pflicht** (`.claude/rules/security-mini-audit.md`): erster Todo, Pflicht-3-Zeiler-Block **am Ende der Welle SB im Wellenplan** eintragen. CRITICAL/HIGH → STOP + Founder.
- **Pre-Check** (`.claude/rules/pre-check.md`): erster Todo, frischer Grep — Plan ist NICHT autoritativ, **Code ist autoritativ** (Lehre Schritt 3, s.u.).
- **TDD strikt** (`.claude/rules/testing.md`): RED-Test zuerst (RLS-Verhalten, API-Routen, RTL).
- **Migration file-first** (`.claude/rules/db-migrations.md`): Datei committen, lokal gegen Local-Stack testen (`npm run supabase:start`). **Prod-Apply = Rote Zone, separater Founder-Go.**
- **Senior-Mode:** ≥80 px Touch-Targets, ≥4.5:1 Kontrast, max. 4 Taps; `kreis-start` behält **exakt 4 Kacheln** (Stickys/Moment kommen DARUNTER).
- **API-Response-Format:** Listen als Array (nie `{ items: [...] }`).
- **Datensparsamkeit:** Quittungs-Push ohne Zettel-Inhalt („Ihr Zettel wurde gesehen ❤").
- **Bann-Wörter** (kein Medizinprodukt): keine „Gedächtnistraining/Therapie/Prävention…"-Sprache (gilt für SP1/SP2, hier nur am Rande relevant).

## 5. Durable Gotchas (NICHT neu debuggen — Lehren aus Schritt 3)
- **Plan-Texte gegen echten Code prüfen.** In Schritt 3 war der Plan an zwei Stellen falsch: `/chat` war KEIN Superset von `/messages` (Anfrage-Annahme lebt auf `/kontakte`), und `/chat` hatte **keine** Test-`data-testid`s. Für SB heißt das: vor dem Bauen die Service-/Komponenten-Realität greppen (existiert `lib/services/device.service.ts` Signed-URL-Muster? Wie genau mountet `app/(senior)/layout.tsx`? — Plan nennt sie, aber verifizieren).
- **Anzeigenamen sind privacy-gated:** `get_display_names`-RPC / `other_display_name` liefern Namen erst nach bestehender Verbindung. Bei Tests keine Namen von noch-nicht-verbundenen Usern asserten.
- **CI-E2E läuft gegen LOKALEN Supabase-Stack** (nicht Prod), `--project=multi-agent` (`scenarios/s[0-46-9]*`) + `--project=senior-terminal` (s5) + Smoke (s7). **s13 ist `test.skip(!process.env.E2E_LIVE)`** → im Standard-CI immer übersprungen.
- **CI-Infra-Flake:** gelegentlich `toomanyrequests: Rate exceeded` beim Docker-Image-Pull (AWS-ECR) → Job stirbt im „Start local Supabase". KEIN Code-Problem → `gh run rerun <run-id> -R ClaudeTheo/nachbar-io --failed`.
- **CI beobachten:** `gh run watch` ist flaky → Poll-Loop im Hintergrund (`gh run view <id> --json status --jq .status`, alle 30 s). E2E dauert ~20 min.
- **gitleaks pre-commit** ist aktiv (lief sauber) — keine secret-haltigen Dateien stagen.

## 6. Verifikations-Gate (vor Push, in dieser Reihenfolge)
1. SB-0 Pre-Check + Mini-Audit-Block geschrieben (Findings 0 oder STOP).
2. RED-Tests vorhanden (RLS-Erwartung SB-1, API SB-3/SB-4, RTL SB-2/3/4).
3. `npx tsc --noEmit` clean.
4. `npm run lint` clean (E2E-Dateien sind vom Lint ausgenommen = ok).
5. Lokaler Local-Stack-Test der RLS-Migration (`npm run supabase:start`, Policy-Verhalten prüfen) wenn möglich; sonst Vitest/Integration.
6. Push → CI (multi-agent + senior-terminal + smoke) **grün abwarten, bevor „fertig" gemeldet wird** (nicht vorab annehmen).

## 7. Commit + Push
- **Nur gezielte SB-Dateien stagen** (`git add <pfad> …`), NIE `git add .`.
- Commit-Messages englisch (siehe Plan-Vorschläge je Task), Trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- `git push origin master` (Variante A, autonom) → CI pollen → grün bestätigen. **Prod-Apply der Migration NICHT** ohne separaten Founder-Go.
- Diese Übergabe + der Wellenplan-Update (Mini-Audit-Block) gehen mit dem SB-Push mit.

## 8. Definition of Done (SB)
Senior sieht im Leerlauf Familienfotos, auf dem Home den neuesten Familien-Moment + offene Zettel, kann mit einem Tap quittieren — Familie bekommt die Quittung als Push **ohne Inhalt**. Kein neuer Datentyp, keine neue Angehörigen-UI. RLS-Migration file-first + lokal getestet. Mini-Audit-Block im Wellenplan. CI grün.

## 9. Danach
SP1 (Tagesrätsel + „Memory"→„Paare finden"-Rename; Founder muss die 50 Entwurfsfragen prüfen) → SP2 (Familienfoto-Spiele) → AA (Auto-Annahme, Consent-Mig + **Mini-Audit Pflicht**). Founder-Hand offen (rote Zone): PR #38 (Advisor-Mig 199) + Dependabot #32–#36 mergen, PR #37 schließen, Profi-FK 3a/3b Prod-Apply, §5 AVV-Versand.
