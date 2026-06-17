# Session-Übergabe 2026-06-17 → nächste Session: **SP1-4 + my-day-Karte / SP2**

> 🆕 **UPDATE 2026-06-17 #3 — FOUNDER-GATE FREIGEGEBEN, SP1-2-Daten + SP1-3 (Senior-UI) GESHIPPT.** Thomas hat die 50 Tagesrätsel-Fragen freigegeben (as-is). Daraufhin gebaut + committet:
> - **SP1-2-Daten (`b5bb17a`):** `modules/spiele/data/tagesraetsel-fragen.ts` (50 Fragen, 15 lokal) + Integritäts-Test; Entwurf-Doc auf `REVIEW-STATUS: FREIGEGEBEN`. Wording-Guard scannt die Datei (grün). **Lehre:** der Guard flaggte zuerst „**Therap**ie" in MEINEM Header-**Kommentar** → Bann-Wörter auch in Kommentaren vermeiden.
> - **SP1-3 (`de19a33`):** `modules/spiele/components/Tagesraetsel.tsx` (Prop `failureFree`: KEINE Rot-/Falsch-Markierung, Story nach jeder Antwort, ≥80px, **keine Persistenz/kein Score**) + `app/(senior)/raetsel/page.tsx` (Server berechnet die Tages-5 via `getDailyQuestions` → keine Hydration-Drift, `failureFree`) + Sekundär-Link „Tagesrätsel" auf `kreis-start` (volle Zeile, 4-Kachel-Regel intakt). Senior kann das Rätsel jetzt end-to-end spielen.
> - Verifiziert: alle Spiele-/Senior-Tests grün, `tsc`/eslint clean, kein Regress (kreis-start/touch-targets). Push + CI: siehe Git-Stand unten (origin nach Push = der `de19a33`-Tip).
>
> **OFFEN (nächste Session):**
> 1. **SP1-4 — Teilnahme-Punkte** (eigener Block, **neue API-Surface → Mini-Audit + Closed-Pilot-Whitelist PFLICHT**): `modules/gamification/services/constants.ts` `daily_puzzle: { points: 5, dailyLimit: 1 }` + `app/api/spiele/teilnahme/route.ts` (POST vergibt serverseitig die **hartkodierte** Aktion `daily_puzzle`, 401 unauth, **kein** Request-Feld für richtig/falsch — nimmt gar keine Ergebnisse an) + fire-and-forget-Ping vom Client **getrennt** von `Tagesraetsel` (z. B. `<TeilnahmePing>`-Komponente, damit `Tagesraetsel` persistenzfrei bleibt — sonst bricht der „kein-fetch-beim-Antworten"-Test) + Closed-Pilot-Whitelist für `/api/spiele/*` (sonst 503, siehe `feedback_closed_pilot_whitelist_pflege`).
> 2. **SP1-3-Rest — my-day-Tagesimpuls-Karte:** kleine density-aware Karte auf `app/(app)/my-day/page.tsx` (`failureFree` aus `ui_mode==='simple'`, Muster ~Z.69). Adult-Seite, optional.
> 3. **SP2 (ungated):** Familienfoto-„Paare finden" auf SB-3 (siehe §4 unten).
>
> ---
>
> **Für die nächste Claude/Codex-Session.** Welle **SB (Senior-Bildschirm) ist geshippt + CI-grün** (vorige Übergabe: `2026-06-16-session-handover-welle-sb.md`). Danach wurde der **ungated SP1-2-Kern** gebaut (Tagesrätsel-Rotations-Service + Wording-Guard + Kiosk-DRY-Refactor). **Der eigentliche Tagesrätsel-Inhalt (50 Fragen) ist Founder-gated** — siehe §3. Diese Datei ist der Einstieg; die Auto-Memory `project_session_handover.md` zeigt hierher.

## 0. TL;DR — was zuerst tun
1. **Stand prüfen:** `cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io" && git log --oneline -5 && gh run list -L 4 -R ClaudeTheo/nachbar-io` — erwartet `origin/master = e87cdbb`, CI grün.
2. **Founder-Gate klären (§3):** Hat Thomas die 50 Tagesrätsel-Fragen (`docs/plans/2026-06-12-tagesraetsel-fragen-entwurf.md`) faktengeprüft? 
   - **Ja →** SP1-2-Datendatei + SP1-3 (Senior-UI) + SP1-4 (Teilnahme-Punkte) bauen.
   - **Nein →** **SP2 (Familienfoto-Spiele)** ist der nächste **ungated** Code-Schritt (baut auf SB-3 `/api/senior/photos`). Siehe §4.
3. **Autoritatives Rezept:** `docs/plans/2026-06-12-spiele-senior-features-wellenplan.md` (Abschnitte „Welle SP1", „Welle SP2", „Welle AA").

## 1. Git-/CI-Stand (exakt, 2026-06-17)
- **nachbar-io ist ein EIGENES Repo** unter `C:\Users\thoma\Claud Code\Handy APP\nachbar-io` — **NICHT im Worktree**. Für alles: **Bash mit absolutem Pfad** (`cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io" && …`). PowerShell-Tool ist auf den Worktree gesandboxt.
- `origin/master = e87cdbb` (`feat(spiele): daily puzzle rotation service …`). Commits dieser Session über dem SB-Push (`dfe5d4b`): nur `e87cdbb` (SP1-2).
- **SB-Welle** davor: `ce52364` (SB-1 RLS) · `bbc9008` (SB-2) · `e6885d2` (SB-3) · `425a884` (SB-4) · `c6bec0f` (Test-Fixes) · `dfe5d4b` (Mini-Audit-Doc). Alle in `origin/master`, CI grün, **kein Deploy** (workflow_dispatch).
- **⚠️ Test-Lauf-Gotcha:** Ein verschachteltes **gitignored** Worktree `.claude/worktrees/elated-mestorf-e47719/` enthält stale Test-Dupes. Full-Vitest **immer** mit `npx vitest run --exclude "**/.claude/**"` laufen, sonst falsche Failures. Außerdem maskiert `... | tail` den Vitest-Exit-Code (tail exitet 0) → für den echten Exit `${PIPESTATUS[0]}` lesen, nicht der Pipe-Exit.
- Working Tree: nur bewusst nicht-committete Reste (NIE `git add .`): `M …phase-b-quarantine-ship.md`, `?? .session-artifacts/`, `?? …codex-an-claude-*.md` (3), `?? scripts/run-e2e-cloud.mjs`.

## 2. Was SP1-2 geliefert hat (ungated, geshippt)
**Neues Modul `modules/spiele`** (Pre-Check: existierte vorher nicht, kein Duplikat):
- `services/tagesraetsel.service.ts` — pure, generische `getDailyQuestions(date, fragen, count)` (dayOfYear-Rotation, deterministisch pro Kalendertag), plus `dayOfYear()` + `dailyCacheKey()`. **`dayOfYear` nutzt `Date.UTC`-Kalenderfelder → DST- und tageszeit-immun** (die alte Inline-Kiosk-Mathematik war über die Sommer-/Winterzeit-Grenze um einen Tag verschoben). Generisch über die Fragen-Form (Kiosk-`Question` + künftige `TagesraetselFrage`).
- `__tests__/wording-guard.test.ts` — Filesystem-Tripwire: scannt `modules/spiele/**` + `app/(senior)/raetsel/**` Produktiv-Quellen (ohne Test-Dateien) auf Medizinprodukt-/Therapie-Wording (`LEGAL_MARKETING_WORDING_GUARDRAILS.md`). Schlägt fehl, sobald ein Bann-Begriff eincheckt.
- **Kiosk-Quiz** (`app/(kiosk)/kiosk/games/quiz/page.tsx`) nutzt jetzt den Service (DRY) — kein Verhaltens-Change außer dem DST-/Cache-Key-Korrektheits-Fix.
- 14 Service+Guard-Tests grün; Full-Vitest 4990 grün; tsc + eslint clean. **Adversarisch reviewt (3 Agenten):** Guard-Regex auf die volle Bann-Liste erweitert, falsche „Cache-Key-Kollision"-Behauptung korrigiert (der alte Key kollidierte nicht — Bindestriche trennen; Zero-Padding ist nur Klarheit), DST-Regressionstests ergänzt.

**SP1-1** („Memory"→„Paare finden") war bereits erledigt (`app/(kiosk)/kiosk/games/paare-finden/page.tsx`).

## 3. 🔴 FOUNDER-GATE (blockiert SP1-Inhalt)
- Die 50 Tagesrätsel-Fragen in `docs/plans/2026-06-12-tagesraetsel-fragen-entwurf.md` sind **unreviewter KI-Entwurf (Review OPEN)**. KI-Entwurf ≠ Faktenprüfung.
- **Bis Thomas jede Frage geprüft hat, darf die Produktiv-Datendatei `modules/spiele/data/tagesraetsel-fragen.ts` NICHT befüllt werden** → das blockiert SP1-2-Datendatei, SP1-3 (Senior-UI `app/(senior)/raetsel/` + „Mein Tag"-Karte), SP1-4 (Teilnahme-Punkte).
- **Nach Founder-Go:** `modules/spiele/data/tagesraetsel-fragen.ts` aus den geprüften Fragen anlegen (Shape `TagesraetselFrage` aus dem Service), dann SP1-3 (failure-free UI, Wording-Guard schützt) + SP1-4 (Punkte nur für Teilnahme, nie Ergebnis — Route `app/api/spiele/teilnahme`).

## 4. Empfohlener nächster Code-Schritt, falls Gate offen: **Welle SP2** (ungated)
SP2 (Familienfoto-Spiele) hängt **nicht** an den Fragen, sondern an **SB-3 `/api/senior/photos`** (geshippt). Plan: Wellenplan Abschnitt „Welle SP2":
- **SP2-1 „Paare finden" mit Familienfotos:** Mechanik aus `app/(kiosk)/kiosk/games/paare-finden/page.tsx` in eine geteilte Komponente `modules/spiele/components/PaareFinden.tsx` extrahieren; Senior-Seite `app/(senior)/spiele/paare-finden/page.tsx` nutzt Signed-URLs aus `/api/senior/photos`; Grid skaliert nach Fotomenge; kein Timer/Score, Abschluss ohne Leistungs-Feedback.
- Mini-Audit nur falls neue Fläche/Migration — SP2 nutzt bestehende RLS (SB-1) + Foto-API, voraussichtlich **kein** neuer Auth/RLS-Trigger → Mini-Audit-Kurzcheck genügt, aber Pre-Check Pflicht.
- Danach **AA (Auto-Annahme)**: Consent-Mig + **Mini-Audit PFLICHT** (Adapter um `lib/video-calls/auto-answer.ts` + `GlobalCallListener`, der seit S2-5 im Senior-Layout hängt).

## 5. Durable Gotchas (nicht neu debuggen)
- **Plan-Texte gegen echten Code prüfen** (Pre-Check Pflicht). SP1-Pre-Check-Funde: kein `modules/spiele` vorher, Rotation in `quiz/page.tsx`, Bann-Regex in Wellenplan:270, 50-Fragen-Review OPEN.
- **`kreis-start` ist seit SB eine async Server-Komponente** → Unit-Tests via `render(await KreisStartPage())` + `@/lib/supabase/server` & `@/modules/care/services/senior-kiosk.service` mocken; `app/senior/preview/page.tsx` muss den Child eager `{await KreisStartPage()}`.
- **S2-5 (`3e7d86c`) hängte `GlobalCallListener` (nutzt `useRouter`) ungestubbt ins `(senior)/layout`** → Layout-Unit-Tests müssen `@/components/video/GlobalCallListener` stubben (analog `BugReportButton`/`PushBanner`). Sonst „No useRouter export …".
- **CI gated nur E2E-Multi-Agent + CodeQL, NICHT die Vitest-Unit-Suite** → vor jedem Push lokal `npx vitest run --exclude "**/.claude/**"` grün fahren.
- **Senior↔Foto-Uploader ist KEIN Auto-Chat-Kontakt** (SB-2): `getOrCreateConversation` braucht akzeptierten `contact_link` (sonst 403).

## 6. Verifikations-Gate (vor Push)
1. Pre-Check (frischer Grep) + ggf. Mini-Audit (bei Auth/RLS/Migration) als erster Todo.
2. RED-Tests zuerst (TDD).
3. `npx tsc --noEmit` clean · `npm run lint` (Worktree-Rauschen ignorieren, eigene Dateien clean) · `npx vitest run --exclude "**/.claude/**"` grün.
4. Nur gezielte Dateien stagen (NIE `git add .`). Trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
5. `git push origin master` (Variante A) → CI pollen → grün bestätigen. **Kein Prod-Apply von Migrationen, kein Deploy ohne Founder-Go.**

## 7. Definition of Done
- **SP1 (nach Gate):** Senior öffnet das Tagesrätsel in ≤2 Taps von kreis-start, 5 Fragen failure-free, kein Ergebnis gespeichert; Wording-Guard schützt die Bann-Liste; Punkte nur für Teilnahme.
- **SP2:** „Paare finden" mit Familienfotos (Signed-URLs aus SB-3), kein Timer/Score, Abschluss ohne Leistungs-Feedback.

## 8. Founder-Hand offen (rote Zone)
SB-RLS-Mig `20260617120000_senior_household_kiosk_read.sql` Prod-Apply (file-first) · 50-Fragen-Review (Gate oben) · PR #38 (Advisor Mig 199) + Dependabot #32–#36 mergen · PR #37 schließen · Profi-FK 3a/3b Prod-Apply · §5 AVV-Versand.
