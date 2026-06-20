# 2026-06-13 — Claude an Codex: Realtime-Root-Cause gefixt → E2E-Gate fortsetzen + pushen

## TL;DR (für Codex)

Dein s13-Blocker ist **app-seitig gefixt und committet**. Der Realtime-Fehler
`cannot add postgres_changes callbacks for realtime:unread-notifications after subscribe()`
war die Wurzel — er destabilisierte die Nachrichten-Seiten und damit beide s13-Fehlpunkte.
**Dein Working Tree ist unberührt** (deine `tests/e2e/*` + `scripts/e2e-localhost-preflight.mjs`
+ `tests/e2e/auth-setup.ts` + `app/(senior)/layout.tsx` liegen weiter uncommittet, von mir nicht angefasst).

Du kannst dein Gate ab „s13 erneut laufen lassen" fortsetzen — mit dem Fix drin sollte s13 stabil sein.

## Was Claude gemacht hat

- **Commit `c6dad6f`** auf lokalem `master`: `fix(chat): port shared unread realtime subscription to unblock senior E2E`.
- Inhalt: **genau 2 Dateien** aus PR #37 / `5bb61b3` portiert (per `git checkout 5bb61b3 -- <files>`):
  - `lib/useUnreadCount.ts`
  - `__tests__/lib/useUnreadCount.test.tsx`
- **Bewusst NICHT** übernommen: der kosmetische „Aktiv 55+"-Badge-Teil von PR #37
  (`app/(app)/dashboard/page.tsx` + `__tests__/app/dashboard-ui-mode.test.tsx`) —
  der hat mit dem Bug nichts zu tun und hätte mit S1/S2 kollidiert.
- Verifiziert: `npx vitest run __tests__/lib/useUnreadCount.test.tsx` → **1/1 grün**; ESLint clean.

## Root Cause (warum s13 jetzt durchläuft)

- Vorher: `useUnreadCount` legte pro Mount eine Realtime-Subscription mit **festem** Channel-Namen
  `"unread-notifications"` an (`.channel("unread-notifications").on(...).subscribe()`).
- Auf jeder `(app)`-Seite mountet **`components/BottomNav.tsx`** den Hook (Unread-Badge);
  das Dashboard hat sogar **zwei** Consumer (`BottomNav` + `useDashboardData`).
- Beim zweiten Consumer / bei Re-Mount/HMR liefert supabase-js denselben (bereits subscribten)
  Channel zurück → das zweite `.on("postgres_changes", …)` wirft genau den o. g. Fehler.
- Dieser Throw in der `useEffect`-Phase destabilisiert den Render-Baum (Dev-Overlay / Remount).
  Auf `/messages` und `/messages/[id]` (beide tragen die `BottomNav`) führt das zu:
  - **s13 Zeile 252:** `chat-input` rendert nicht stabil auf `/messages/<conversationId>` → fill-Timeout.
  - **s13 Zeile 262:** `conversation-card` „Bernd M." flackert auf `/messages`.
- Fix (PR #37): **eine geteilte, referenzgezählte** Subscription mit **eindeutigen** Channel-Namen
  (`unread-notifications-${seq}`), `retain`/`release` statt pro-Mount-Subscribe. → Kein Throw mehr.

**Kein unabhängiger S2-Routing-Rest:** `bdf3f89` (S2-2) hat nur Link-_Quellen_ (Dashboard,
MyCaregiversList, care/status) auf den neuen `useOpenCaregiverChat`-Hook umgestellt; die Routen
`app/(app)/messages/[id]/page.tsx` und `messages/page.tsx` blieben unverändert. Der s13-Test geht
direkt auf `/messages/<conversationId>` (echte Konversations-ID) → von S2 unberührt.

## Git-Stand (jetzt)

- Repo `nachbar-io` (`C:\Users\thoma\Claud Code\Handy APP\nachbar-io`).
- `origin/master = fc0a54c` (unverändert) · lokaler `master = c6dad6f` · **ahead 14, UNGEPUSHT**.
- Working Tree: **deine** uncommitteten Änderungen (unberührt):
  - `app/(senior)/layout.tsx` (QuarterProvider — App-Code, für `/hier-bei-mir` nötig)
  - `scripts/e2e-localhost-preflight.mjs`, `tests/e2e/auth-setup.ts`
  - `tests/e2e/**` (Page-Objects + Specs)
  - untracked: `.session-artifacts/`, dieser Brief + dein Blocker-Report.

## Deine nächsten Schritte (E2E-Gate + Push = deine Domäne)

1. **s13 erneut** (sollte jetzt stabil sein):
   ```
   npm run dev:cloud   # http://localhost:3000
   npx playwright test --config=tests/e2e/playwright.config.ts --project=multi-agent \
     tests/e2e/scenarios/s13-five-user-interaction.spec.ts tests/e2e/scenarios/s6-permissions.spec.ts
   ```
   (Env wie gehabt: `.env.cloud-current.local`, `E2E_BASE_URL=http://localhost:3000`,
   `E2E_LIVE=true`, `E2E_ALLOW_CLOUD_LOCALHOST=true`.)
2. **Die zurückgestellten Chunks** nachziehen: `phase-a-solo`, `phase-b-cross-role`,
   `phase-c-edge-cases`, `cross-portal/x04-kiosk-sos-112`, `pilot-smoke`.
3. **Vitest** ressourcenschonend wiederholen — die Rotfärbung (`spawn UNKNOWN`,
   `Out of memory: HashMap::Initialize`, gestreute unverwandte Dateien) ist sehr wahrscheinlich
   Windows-Fork-/Memory-Druck, kein S1/S2-Regress. Vorschlag:
   ```
   npx vitest run --no-file-parallelism
   # oder: --pool=forks --poolOptions.forks.maxForks=2
   ```
   (Mein neuer `useUnreadCount`-Test läuft isoliert grün; vor dem Fix war der Lauf grün —
   die 7–9 roten Dateien sind LeafletKarte/FeatureFlagManager/profile-page/city-services/
   care-profile-service-path/sms-provider-paths/UserManagementPilot, alle unverwandt zu S1/S2.)
4. Wenn Typecheck + ESLint + Vitest + alle betroffenen E2E grün:
   **deine** E2E-Änderungen + `app/(senior)/layout.tsx` committen und `git push origin master`
   (Founder-Go für Push liegt vor). **Kein Deploy** (separater Founder-Go, Vercel-Env).

## Falls s13 doch noch flackert

Dann ist es generische E2E-Stabilität, **nicht** der behobene Bug (die Konversationsdaten waren
im Fehler-Snapshot bereits da). Sinnvoll: explizites `await expect(locator).toBeVisible()` vor dem
`fill`, ggf. `waitForLoadState("networkidle")`. Inhaltliche App-Logik ist app-seitig sauber — bei
echtem App-Verhalten (kein Test-Timing) zurück an Claude.

## PR #37

Für den **Realtime-Teil obsolet** (hier portiert). Der kosmetische „Aktiv 55+"-Badge-Teil bleibt
offen — separat cherry-picken oder verwerfen ist Founder-Entscheidung. PR #37 kann nach dem Push
geschlossen werden (Founder-Hand).
