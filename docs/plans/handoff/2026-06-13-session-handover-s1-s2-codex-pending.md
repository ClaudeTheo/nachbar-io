# Session-Uebergabe — S1 komplett + S2 teilweise · Codex macht E2E + Push

> **Erstellt:** 2026-06-13 (Claude/Opus, Ultracode-Session). **Fuer:** die naechste Claude-Session, die Codex' Antwort einspielt.
> **Modus:** Ultracode ist AN → fuer substanzielle Tasks Workflow nutzen + adversarial verifizieren (hat in dieser Session real einen 2. Bug gefunden).

## 0. TL;DR — was die neue Session zuerst tun soll
1. **Codex arbeitet GERADE** an der E2E-Umstellung im selben `nachbar-io`-Repo (uncommittete Aenderungen in `tests/e2e/*` + `scripts/e2e-localhost-preflight.mjs` + `tests/e2e/auth-setup.ts` im Working Tree). **`tests/e2e/*` NICHT anfassen — gehoert Codex.**
2. **Der Founder spielt Codex' Antwort/Rapport ein.** Reagiere darauf:
   - **Hat Codex gepusht?** Pruefe `git -C <nachbar-io> rev-parse --short origin/master` (war `fc0a54c`; wenn != → Push lief). Dann CI: `gh run list -L 5 -R ClaudeTheo/nachbar-io` (CodeQL + e2e-tests.yml). **Kein Vercel-Deploy** erwartet (workflow_dispatch only) — das ist gewollt.
   - **Blocker/Frage von Codex** (z.B. pilot-smoke-Kriterium /hier-bei-mir): beantworten. Empfehlung dazu unten (§5).
3. **Danach S2-Rest weiter** (§5): Schritt 3 (Chat vereinheitlichen), 5 (Anruf-Knopf + GlobalCallListener), 7 (Family-Setup — **MINI-AUDIT-PFLICHT**).

## 1. Git-Stand (zum Zeitpunkt der Uebergabe)
- Repo `nachbar-io` (eigenes Repo unter `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`, NICHT im Worktree).
- `origin/master = fc0a54c` · `master = bdf3f89` · **ahead 12, UNGEPUSHT**.
- Working Tree: **uncommittete E2E-Aenderungen von Codex** (nicht anfassen, nicht committen, nicht reverten).
- Die 12 Commits (aelteste zuerst):
  - `f852def` S1 Legacy `app/senior/*` stillgelegt → Redirects in die `(senior)`-Shell
  - `72270e6` S1 SeniorStatusScreen: Auto-Redirect → Button (B3:2)
  - `0043f47` S1 SOS-Entwarnung „Mir geht es wieder gut" (A3:4)
  - `d5439d5` S1 „Hier bei mir" in die Senior-Shell (A4:4)
  - `a3a767c` S1 Teil E: E2E-Login-Ziel-Fix + Handover-Doc
  - `84e4d4f` Refactor: hier-bei-mir Container/View-Split
  - `12a57a9` S2-6 Tipp-Fallback Schreiben (A3:3)
  - `18e6e82` S2-4 „Mein Kreis" Reverse-View (C2:2)
  - `7867a92` docs: Codex-E2E-Prompt
  - `f7f130f` S2-1 Push-Benachrichtigung bei neuer Nachricht, datensparsam (C2:3)
  - `78262e9` docs: Codex-Prompt um Push erweitert
  - `bdf3f89` S2-2 Konversation aufloesen vor Chat-Oeffnen (C2:1)

## 2. Welle S1 — KOMPLETT (alle Plan-Schritte)
Plan: `docs/plans/2026-06-12-senior-welt-familienkreis-wellenplan.md`. Befunde: `2026-06-12-fable5-app-analyse-befunde-detail.md`.
- **Schritt 2** Legacy `app/senior/{page,home,checkin,help,news}` → reine Redirects in `(senior)`-Shell; `senior_checkins`-Insert raus (Geraete-Fallback `lib/services/device.service.ts` bleibt bewusst). Eingehende Refs umgestellt: `passkey.service.ts` (Login-Ziel ui_mode=senior → `/kreis-start`), `api/test/login`, `notifications` (checkin_reminder), `voice/tools.ts`.
- **Schritt 3** `SeniorStatusScreen`: Auto-Redirect → „Zurueck zur Startseite"-Button (WCAG 2.2.1). `+ /sos/status` role=status/aria-live.
- **Schritt 5** SOS-Entwarnung `SosAllClearButton` → `PATCH /api/care/sos/[id] {status:"cancelled"}` (owner-geprueft + Audit).
- **Schritt 4** Neue Route `app/(senior)/hier-bei-mir` (Container `page.tsx` + View `modules/info-hub/SeniorHierBeiMirView.tsx`), nutzt `modules/info-hub/useQuartierInfo` (geteilt mit `/quartier-info`).
  - **Route-Architektur-Entscheidung (Founder, Option 1):** `/hier-bei-mir` gehoert jetzt der `(senior)`-Shell; `(app)`-Dashboard-Kachel zeigt auf `/quartier-info` (identischer Inhalt). `(app)/hier-bei-mir` entfernt.
- **Teil E (E2E)** nur Login-Ziel in `tests/e2e/helpers/agent-factory.ts` gefixt; Rest = **Codex** (laufende Arbeit).

## 3. Welle S2 — teilweise (Reihenfolge nach „groesster Hebel")
- **Schritt 6** (`12a57a9`) Tipp-Fallback im Schreiben-Flow bei AI off (A3:3).
- **Schritt 4** (`18e6e82`) „Mein Kreis" zeigt dem Senior endlich seine Angehoerigen (C2:2): Hook `modules/care/hooks/useMyCaregivers` (RLS `caregiver_links_select_resident` = `auth.uid()=resident_id`), Komponente `MyCaregiversList`, `care/meine-senioren` rollenabhaengig.
- **Schritt 1** (`f7f130f`) Push-Benachrichtigung bei neuer Nachricht (C2:3): `modules/chat/services/messages.service.ts` → `notifyMessageRecipient`. **DATENSPARSAM** (nur „von <Vorname>", KEIN Inhalt). Cross-User-Insert via **service_role** (RLS `notif_insert_self_only`, Mig 076). **Mini-Audit: 0 CRITICAL/HIGH** (Block in der Commit-Message). Backlog: kein Rate-Limit auf messages-Route (Push folgt Nachrichten-Frequenz; nur conversation-participants).
- **Schritt 2** (`bdf3f89`) Tote Chat-Links repariert (C2:1): Hook `modules/care/hooks/useOpenCaregiverChat.ts` exportiert `useOpenCaregiverChat` (Bewohner→Angehoeriger, `/api/care/contact/chat`) + `useOpenResidentChat` (Angehoeriger→Bewohner, `/api/caregiver/chat`, Plus-gated). Gefixt: Dashboard „Verbundene Angehoerige", `MyCaregiversList` „Nachricht", **`care/status` „Nachricht"** (Letzteres vom adversarialen Review gefunden). Security-Review: **pass** (kein neuer Auth-Surface, RLS-Doppelschutz). Backlog: Rate-Limit + Audit-Trail auf Conversation-Creation, Cross-Quarter-403.

## 4. Mini-Audit-Stand / Sicherheit (durable)
- `notifications`: `notif_insert_self_only` (Mig 076) → Cross-User-Notifications IMMER via service_role-Client (Muster: `lib/services/meals.service.ts`).
- `conversations` RLS: `conversations_quarter_insert/select` = `(participant_1=auth.uid() OR participant_2=auth.uid()) AND quarter scope`. Conversation-Creation-Endpoints pruefen zusaetzlich `caregiver_links`. Kein IDOR.
- **Offene Backlog-Sicherheitspunkte (nicht von dieser Session eingefuehrt):** dediziertes Rate-Limit + Audit-Trail auf Conversation-Creation; Cross-Quarter-403-Fehlerbehandlung.

## 5. S2-Rest — offen (so weitermachen)
Plan-Quelle: `docs/plans/2026-06-12-senior-welt-familienkreis-wellenplan.md` (Welle S2).
- **Schritt 3 — Chat vereinheitlichen** (UI/Routing, kein Mini-Audit): `/chat/[id]` ist kanonisch; `/messages/[id]` → Redirect-Shim. Vorsicht: viele Stellen nutzen noch `/messages/...`. Erst Inventar (grep), dann Shim + ggf. Umhaengen.
- **Schritt 5 — Anruf** (leichter Mini-Audit, caregiver_links-Scope): `GlobalCallListener` zusaetzlich ins `(senior)`-Layout (heute klingelt es dort nicht) + Anruf-Knopf in `MyCaregiversList` (Senior→Angehoeriger). `care/status` hat schon `/video-call/${resident.id}` (Angehoeriger→Bewohner) — Muster pruefen.
- **Schritt 7 — Family-Setup** (**MINI-AUDIT-PFLICHT**: Pairing/Code): (a) „Link teilen" in `SetupQrCard`; (b) „Geraet verbinden" auf `/care/meine-senioren/[seniorId]` ruft `start-code`. Mini-Audit: Rate-Limit (Edge-konsistent?), Audit-Trail fuer Pairing-Claims, Code-Lookup-Brute-Force. STOP bei CRITICAL/HIGH.

## 6. Codex-Auftrag (laeuft) + Push
- Prompt: `docs/plans/handoff/2026-06-13-codex-e2e-senior-journey-prompt.md` (E2E umstellen → Pre-Push-Gate → `git push origin master`; **kein Deploy**). Spez: `docs/plans/2026-06-13-s1-e2e-senior-journey-umstellung-handover.md`.
- Founder-Go fuer Push erteilt. Deploy bleibt separater Founder-Go (Vercel-Env).
- **Erwartung nach Codex:** origin/master bewegt sich (12 Commits + Codex' E2E-Commit), CI laeuft (kein Auto-Deploy). Falls Push NICHT lief (Blocker), Codex' Rapport lesen + entscheiden.

## 7. Verifikations-/Arbeits-Fakten (durable, diese Session)
- nachbar-io: `npx tsc --noEmit` (ggf. stale `.next/types/validator.ts` loeschen), `npx eslint <files>`, `npx vitest run <files>`. Lokaler Dev-Screenshot: `npm run dev:cloud` (Port 3000) + Closed-Pilot-gewhitelisteter Pfad `/senior/preview` (temporaer ueberschreiben, danach `git restore`).
- Screenshots dieser Session (lokal, ungetrackt): `welle-s1-vorschau-full.png`, `welle-s2-schreiben.png`, `welle-s2-mein-kreis.png` (im Worktree-Root `.claude/worktrees/sweet-stonebraker-865146/`). SendUserFile-Kontingent war nach dem 1. Bild erschoepft.
- **Koordination:** master ist mit Codex geteilt. Claude → `app/(app)/dashboard|care`, `modules/care|info-hub|chat`, `app/(senior)`. Codex → `tests/e2e`. Nicht ueberschneiden.

## 8. Verwendete Workflows (Ultracode)
- Understand-Workflow (4 parallele Tiefen-Leser) + Review-Workflow (3 Skeptiker: correctness/security/completeness) pro substanziellem S2-Schritt. Der Review fand den 2. kaputten Link (`care/status`) — Muster beibehalten.
