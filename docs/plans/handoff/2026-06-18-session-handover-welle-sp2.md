# Session-Übergabe 2026-06-18 → nächste Session: **AA (Auto-Annahme) bzw. my-day-Karte**

> **Vorgänger:** `docs/plans/handoff/2026-06-17-session-handover-welle-sp1.md` (SB + SP1-2/3). Diese Datei löst ihn als Einstieg ab.
> **Autoritatives Rezept:** `docs/plans/2026-06-12-spiele-senior-features-wellenplan.md` (Abschnitte „Welle SP1" inkl. SP1-4-Mini-Audit-Block, „Welle SP2", „Welle AA").

## 0. TL;DR — was zuerst tun
1. **Stand prüfen:** `cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io" && git log --oneline -6 && gh run list -L 4 -R ClaudeTheo/nachbar-io` — erwartet `origin/master = baa4661`, **CI grün** (E2E `27740185996` + CodeQL `27740185978` SUCCESS).
2. **SB + SP1 (1–4) + SP2 (1–2) sind KOMPLETT geshippt + CI-grün** (Detail §2). **Nächster Code-Schritt = AA (Auto-Annahme von Anrufen)** — größere Welle mit **neuer Consent-Migration + Mini-Audit PFLICHT** (§3). Kleinere Alternative: optionale **my-day-Tagesimpuls-Karte** (Rest SP1-3, kein Migration, §3).
3. **Reihenfolge nach Founder-Präferenz.** AA am besten in frischer Session (Migration + Mini-Audit brauchen vollen Kontext).

## 1. Git-/CI-Stand (exakt, 2026-06-18)
- **nachbar-io ist ein EIGENES Repo** unter `C:\Users\thoma\Claud Code\Handy APP\nachbar-io` — **NICHT im Worktree**. Für alles: **Bash mit absolutem Pfad** (`cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io" && …`). Glob/PowerShell sind auf den Worktree gesandboxt → Filesystem via Bash/Read mit absolutem Pfad.
- `origin/master = baa4661` (0/0 sauber). Diese Session über `d53a88b` (SP1-3-Stand):
  - `c09f4c1` feat(spiele): SP1-4 Teilnahme-Punkte
  - `6823b40` docs(spiele): SP1-4-Mini-Audit-Befunde im Wellenplan
  - `491f308` feat(spiele): SP2-1 Familienfoto-„Paare finden"
  - `baa4661` feat(senior): SP2-2 „Erinnerung der Woche"
- **Alle in `origin/master`, CI grün** (jeweils E2E-Multi-Agent + CodeQL SUCCESS), **kein Deploy** (workflow_dispatch). Full-Vitest lokal **5039 grün** (1 skipped), tsc/eslint/Wording-Guard clean.
- **⚠️ Test-Lauf-Gotcha (weiter aktuell):** verschachteltes **gitignored** Worktree `.claude/worktrees/elated-mestorf-e47719/` enthält stale Test-Dupes. Full-Vitest **immer** mit `npx vitest run --exclude "**/.claude/**"`, sonst falsche Failures (z. B. kreis-start/touch-targets-Dupes). Außerdem maskiert `… | tail` den Vitest-Exit-Code → für den echten Exit `${PIPESTATUS[0]}` lesen.
- **⚠️ CI-Infra-Flake (diese Session gesehen):** Ein Doc-Commit-E2E-Run failte in `3m24s` am Schritt **„Start local Supabase"** (Docker/Supabase-Startup auf dem Runner) — kein Code-/Testfehler, Build lief nie. Bei so einem Fast-Fail: `gh run rerun <id> --failed`. Der eigentliche Code-Commit lief danach voll grün (18 min).
- Working Tree: bewusst nicht-committete Reste (NIE `git add .`): `M …phase-b-quarantine-ship.md`, `?? .session-artifacts/`, `?? …codex-an-claude-*.md` (3), `?? scripts/run-e2e-cloud.mjs`.

## 2. Was diese Session geliefert hat (geshippt + CI-grün)

### SP1-4 — Teilnahme-Punkte (`c09f4c1`)
- `POST /api/spiele/teilnahme` vergibt die **hartkodierte** Aktion `daily_puzzle` (5 P., 1×/Tag via `awardPoints`-Tageslimit). Route ist **parameterlos** (`POST()` ohne Request, kein Body-Parsing → nimmt strukturell KEINE Spielergebnisse/keine Client-Aktion an), Cookie-Auth, unauth→401. Gehärtete Variante von `app/api/points/award`.
- `<TeilnahmePing>` (`modules/spiele/components/TeilnahmePing.tsx`, useRef-Single-Fire, fire-and-forget `.catch`) ist **GETRENNT** von `Tagesraetsel` gemountet → `Tagesraetsel` bleibt persistenzfrei (dessen „kein-fetch"-Test grün).
- Konstante `daily_puzzle {points:5,dailyLimit:1}` + Label in `modules/gamification/services/constants.ts`.
- **🟡 Pre-Check-/Mini-Audit-Befund (Code autoritativ):** Handover-Vorgänger forderte Closed-Pilot-Whitelist für `/api/spiele/*` „sonst 503" — **FALSCH**. Der `503 closed_pilot` (`lib/supabase/middleware.ts:181`) trifft NUR `!user`. Die Whitelist `CLOSED_PILOT_PUBLIC_API_PATHS` ist laut `feedback_closed_pilot_whitelist_pflege` ausschließlich für User-lose Routen (Cron/Webhook). `/api/spiele/teilnahme` ist authentifiziert → **NICHT** whitelisten (Aufnahme würde sie öffentlich machen, widerspricht der 401-Anforderung). **Festgenagelt per Test** in `__tests__/lib/closed-pilot.test.ts` (`isClosedPilotPublicApiPath('/api/spiele/teilnahme')`→false). Mini-Audit-Block im Wellenplan (`6823b40`).
- **🔴 Adversarialer Nachreview fand VORBESTEHENDE Gamification-RLS-Schwächen** (NICHT durch SP1-4 eingeführt — identischer Pfad wie `/api/points/award`, kein Admin-Eskalations-Risiko, Impact kosmetisch): `users_update_own` (Mig 001:316) ohne WITH-CHECK/Spalten-Guard → `total_points`/`points_level` selbst setzbar (Mig-198-Trigger schützt nur is_admin/role/trust_level); `points_log_insert_service` (Mig 138:39) `WITH CHECK (true)`; TOCTOU in `awardPoints`. **Als separater Founder-gated Task geflaggt: `task_9413477f`** (Chip „Gamification-RLS härten"). Details in der Auto-Memory `topics/security.md` (Stand 2026-06-17).

### SP2-1 — Familienfoto-„Paare finden" (`491f308`)
- Geteilte `modules/spiele/components/PaareFinden.tsx` — Flip/Paar-Mechanik **aus dem Kiosk extrahiert (DRY)**, matcht per `item.id`, Mismatch dreht nach 1s zurück, Senior-Default ohne Zug-Zähler/Score („Schön gespielt!"), Kiosk-Modus via `showMoves` + `cardClassName`.
- Reine `modules/spiele/services/paare-board.ts` → `planPaareBoard` (≥8→4×4, 6-7→4 Sp., 4-5→3 Sp., **<4→Emoji-Fallback**).
- Senior-Seite `app/(senior)/spiele/paare-finden/page.tsx` (Server liest Fotos via `getSeniorHouseholdPhotos`, SB-1-RLS + Signed-URLs). Kiosk-Seite auf die geteilte Komponente umgestellt. Einstieg via `kreis-start`-Sekundär-Link.
- **Keine neue API/Migration.** Adversarial reviewt (Refactor-Parität + Foto-Privacy) → 0 Findings.

### SP2-2 — „Erinnerung der Woche" (`baa4661`)
- Reine `modules/spiele/services/erinnerung-der-woche.service.ts` → `getErinnerungDerWoche(date, photos)` + `weekIndex` (deterministisch, DST-immun, Montag-ausgerichtet via `(absoluteDays+3)/7`): genau EIN captioniertes Foto pro Kalenderwoche, stabil die Woche, rotiert wöchentlich; nur Fotos mit Caption (`trim`) UND Signed-URL.
- `modules/care/components/senior/ErinnerungDerWoche.tsx` — dünn, verwendet **SB-2-`FamilienMomentCard` wieder** (neuer optionaler `heading`-Prop, Default „Neu von Ihrer Familie" → SB-2 byte-identisch).
- Eigene Seite `app/(senior)/erinnerung/page.tsx` via `kreis-start`-Link — bewusst **statt** Doppel-Foto-Karte auf dem Home. **Keine neue API/Migration.** Wording-Guard-Scan um `(senior)/erinnerung` + `ErinnerungDerWoche.tsx` erweitert. Adversarial reviewt → 0 Findings.

## 3. Empfohlene nächste Schritte

### Option A (klein, kein Migration): my-day-Tagesimpuls-Karte (Rest SP1-3)
- `app/(app)/my-day/page.tsx` (Erwachsenen-Seite): kleine density-aware „Tagesimpuls/Tagesrätsel"-Karte, `failureFree` aus `ui_mode==='simple'` ableiten (Muster ~`my-day/page.tsx:69`). Wiederverwendet `Tagesraetsel`/`getDailyQuestions`. Optional, schnell, TDD.

### Option B (groß, Mini-Audit PFLICHT): Welle AA — Auto-Annahme von Anrufen
Heute existiert Auto-Annahme NUR im Terminal-Pfad (`lib/video-calls/auto-answer.ts` + `KioskIncomingCall`). AA bringt sie in die `(senior)`-Shell, **aber nur mit zusätzlicher ausdrücklicher Senior-Einwilligung**. Plan: Wellenplan Abschnitt „Welle AA":
- **AA-0:** Pre-Check (`auto_answer|shouldAutoAnswer|KioskIncomingCall|GlobalCallListener`) + **Mini-Audit (PFLICHT, erster Todo)** — neuer Consent-Pfad auf `caregiver_links`, neue Senior-Route, Audit-Trail für Consent-Änderung, Rate-Limit. **Bei CRITICAL/HIGH: STOP + Founder.**
- **AA-1:** Migration `2026MMDDHHMMSS_auto_answer_senior_consent.sql` — `ALTER TABLE caregiver_links ADD COLUMN auto_answer_senior_consented_at TIMESTAMPTZ;`. **File-first, Prod-Apply = Rote Zone/Founder-Go.** Lokal gegen `npm run supabase:start` testen.
- **AA-2:** `shouldAutoAnswer` um Pflichtfeld `seniorConsentedAt` erweitern (`null` → nie Auto-Annahme). ⚠️ Bewusste Verschärfung: auch das Terminal nimmt dann erst nach Senior-Einwilligung an (bei 0 echten Nutzern verlustfrei — dem Founder beim Review nennen).
- **AA-3:** Senior-Opt-in-UI `app/(senior)/einstellungen/anrufe/page.tsx` + `app/api/senior/auto-answer-consent/route.ts` (nur der `resident` des Links darf setzen, schreibt Consent **+ Audit-Eintrag**). ⚠️ **Neue `/api/senior/*`-Route → Closed-Pilot prüfen** (authentifiziert → KEINE Whitelist, siehe SP1-4-Lehre oben).
- **AA-4:** Countdown-Overlay `components/video/AutoAnswerCountdown.tsx` (Muster aus `KioskIncomingCall`) + `GlobalCallListener` (seit S2-5 im `(senior)`-Layout) um den Auto-Annahme-Zweig erweitern.
- Mini-Audit-Block am Ende der Welle in den Wellenplan eintragen.

## 4. Durable Gotchas (nicht neu debuggen)
- **Plan-Texte gegen echten Code prüfen** (Pre-Check Pflicht, `.claude/rules/pre-check.md`). Lehre SP1-4: der Handover-„sonst 503"-Text war falsch — Code ist autoritativ.
- **`kreis-start` ist async Server-Komponente** → Unit-Tests via `render(await KreisStartPage())` + `@/lib/supabase/server` & `@/modules/care/services/senior-kiosk.service` mocken; `app/senior/preview/page.tsx` muss den Child eager `{await KreisStartPage()}`. Sekundär-Aktionen-Grid hat jetzt: Termine, Profil, Tagesrätsel, Paare finden, Erinnerung der Woche (4-Kachel-Regel der Haupt-Tiles bleibt unangetastet, eigene testids).
- **`GlobalCallListener` (nutzt `useRouter`) ist im `(senior)`-Layout** → Layout-Unit-Tests müssen ihn stubben (analog `BugReportButton`/`PushBanner`).
- **CI gated nur E2E-Multi-Agent + CodeQL, NICHT die Vitest-Unit-Suite** → vor jedem Push lokal `npx vitest run --exclude "**/.claude/**"` grün fahren.
- **Senior↔Foto-Uploader ist KEIN Auto-Chat-Kontakt** (SB-2): `FamilienMomentCard`-Sprachantwort fängt 403 `no_accepted_contact` senior-freundlich ab.
- **Wording-Guard** (`modules/spiele/__tests__/wording-guard.test.ts`) scannt `modules/spiele/**` + `app/(senior)/raetsel/**` + `app/(senior)/erinnerung/**` + `ErinnerungDerWoche.tsx` — **Bann-Wörter auch in Kommentaren** vermeiden (Liste inkl. `geistige|gedächtnis|konzentration|reaktion|abbau|therap|…`).
- **Signed-URL-Fotos** → `<img>` mit `{/* eslint-disable-next-line @next/next/no-img-element */}` (Muster aus SB-3/SB-2), nicht `next/image`.

## 5. Founder-Hand offen (rote Zone)
- SB-1-RLS-Mig `20260617120000_senior_household_kiosk_read.sql` **Prod-Apply** (file-first, noch nicht prod-applied).
- **`task_9413477f`** — vorbestehende Gamification-RLS-Härtung (neue Migration; Prod-Apply = Founder-Go). Nicht dringend (0 echte Nutzer, kein Admin-Risiko).
- PR #38 (Advisor Mig 199) + Dependabot #32–#36 mergen; PR #37 schließen (obsolet); Profi-FK 3a/3b Prod-Apply; §5 AVV-Versand.

## 6. Verifikations-Gate (vor Push) — bewährt
1. Pre-Check (frischer Grep) als erster Todo; Mini-Audit bei Auth/RLS/Migration.
2. RED-Tests zuerst (TDD), dann GREEN.
3. `npx tsc --noEmit` clean · `npx eslint <eigene Dateien>` clean · `npx vitest run --exclude "**/.claude/**"` grün (`${PIPESTATUS[0]}` lesen).
4. Nur gezielte Dateien stagen (NIE `git add .`). Trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
5. `git push origin master` (Variante A) → CI pollen (`gh run watch <id> --exit-status`) → grün bestätigen. **Kein Prod-Apply von Migrationen, kein Deploy ohne Founder-Go.**
