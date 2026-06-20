# 2026-06-13 — Claude an Codex: Phase-B-Stale-Selektoren gefixt → Gate fortsetzen + pushen

## TL;DR

Die 3 von dir gemeldeten Phase-B-Altlasten (B2b, B4a, B7) sind **gefixt** in
`tests/e2e/multi-agent/phase-b-cross-role.spec.ts` — rein test-seitig, **kein App-Change**.
Selektoren gegen den echten aktuellen Source verifiziert, **`tsc --noEmit` + ESLint grün**.
Deine uncommitteten Phase-B-Änderungen (B1-Guidelines-Gate, B2a `/checkin`, B3b `/hier-bei-mir`)
sind **erhalten** — ich habe nur ergänzt, nichts revertet. Die Datei enthält jetzt **deine + meine**
Änderungen; beim Push committest du sie **als Ganzes**.

## Die 3 Fixes (gegen Source verifiziert)

### B2b — `/care`-Selektor veraltet
- **Vorher:** `[data-testid='dashboard-caregivers'|'checkin-status'|'heartbeat']` — existiert nicht mehr.
- **Jetzt:** `getByRole("heading", { name: /Mein Tag/i })`.
- **Quelle:** `app/(app)/care/page.tsx` rendert den „Mein Tag"-Hub (PageHeader-Titel „Mein Tag").
  Identischer Selektor wie in S13 (dort bereits grün). `Aktive Hilfeanfragen` erscheint nur bei
  aktivem SOS — in B2 (Check-in, kein SOS) bewusst **nicht** asserten.

### B4a — Kategorie ist ein Radio, kein Button
- **Vorher:** `getByRole("button", { name: /einkaufen/i })` → Submit blieb disabled.
- **Jetzt:** `getByRole("radio", { name: /einkaufen/i })`.
- **Quelle:** `modules/hilfe/components/NewRequestForm.tsx:99` — `<button role="radio"
  aria-checked aria-label={HELP_CATEGORY_LABELS[cat]}>`. Accessible Name = „Einkaufen" (shopping).
  `#description` (Textarea) + Submit „Gesuch aufgeben" sind unverändert korrekt.

### B7 — keine Betreuer↔Senior-Konversation angelegt
- **Vorher:** suchte eine `conversation-card`, die nie existierte → B7a „keine Konversation",
  B7b harter Assert auf nie gesendete Nachricht.
- **Jetzt:** datenstabil per Service-Role eine **akzeptierte Konversation anlegen**, dann
  **direkte Navigation** auf `/messages/${conversationId}` (kein Karten-Klick-Flake — Muster aus S13):
  - Neuer lokaler Helper `createAcceptedConversation(userA, userB, note)` (1:1 aus S13),
    nutzt den **Shared-Helper** `supabaseAdmin` aus `tests/e2e/helpers/supabase-admin.ts`
    (kein Duplikat des Admin-Clients). Braucht **keinen** `caregiver_link` — nur `contact_links`
    (accepted) + `conversations` (geordnete Participants).
  - userIds aus `agents.angehoeriger.userId` (Betreuer/Tanja) + `agents.bewohner.userId`
    (Senior/Gertrude) — nach Login gesetzt (`TestAgent.userId`); Guards `expect(...).toBeTruthy()`.
  - B7a: Betreuer → `/messages/${id}`, fill `chat-input`, click `chat-send`, assert sichtbar.
  - B7b: Senior → `/messages/${id}` (gleiche id), assert Nachricht sichtbar.

## Static-Gates (von Claude geprüft)
- `npx tsc --noEmit` → **exit 0**.
- `npx eslint --no-ignore tests/e2e/multi-agent/phase-b-cross-role.spec.ts` → **exit 0**.

## Worauf bei deinem Lauf achten (Residual-Runtime-Risiken)
1. **B4:** `NewRequestForm` braucht `currentQuarter` (`useQuarter()`); ist der QuarterProvider auf
   `/hilfe/neu` ((app)-Shell) vorhanden, bleibt Submit nach Radio-Auswahl aktiv. ((app)-Shell hat
   den Provider; nur die (senior)-Shell musste nachgezogen werden.) Falls Submit doch disabled
   bleibt → Quarter-Context auf `/hilfe/neu` prüfen.
2. **B7b:** Senior (ui_mode=senior) navigiert auf `/messages/${id}` ((app)-Route). Der alte Test
   tat das schon; falls eine Middleware-Umleitung in die Senior-Shell auftaucht → melden (App-Frage,
   zurück an Claude).
3. `SUPABASE_SERVICE_ROLE_KEY` muss im Lauf-Env gesetzt sein (für `supabaseAdmin`) — ist in deinem
   `.env.cloud-current.local` der Fall (S13 nutzt es identisch).

## Deine nächsten Schritte
1. Phase B gegen laufenden `dev:cloud` erneut (gerne `--workers=1`, `NODE_OPTIONS=--max-old-space-size=8192`).
2. Zurückgestellte Chunks: `phase-c-edge-cases`, `cross-portal/x04-kiosk-sos-112`, `pilot-smoke`.
3. Vitest ressourcenschonend (`--no-file-parallelism`) — Rot war Windows-Fork/OOM, kein Regress.
4. Wenn Typecheck + ESLint + Vitest + alle E2E grün: **deine E2E-Änderungen + die Phase-B-Fixes
   (ganze `phase-b-cross-role.spec.ts`) + `app/(senior)/layout.tsx`** committen und
   `git push origin master` (Founder-Go für Push liegt vor). **Kein Deploy** (separater Founder-Go).

## Git-Stand
- `origin/master = fc0a54c` · lokaler `master = 5541ce4` (ahead 15; meine Realtime-Fix-Commits
  `c6dad6f` + `5541ce4` sind committet) · **Working Tree: deine E2E-Umstellung + meine Phase-B-Fixes,
  uncommittet** (bewusst — „nicht committen, nicht pushen, bis Phase B grün").
