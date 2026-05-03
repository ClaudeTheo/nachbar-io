# Codex New-Session Handover — Founder-Regeln + Welle-D-Stand

Stand: 2026-05-03 abends, nach Founder-Update zu Push-/Deploy-Vollautonomie und nach lokalem Welle-D-Preview-Block.

## Wichtigste Aenderung

Founder hat am 2026-05-03 abends die Push-/Deploy-Regeln geaendert:

- Codex entscheidet `git push origin master` und Vercel-Deploys ab jetzt selbst nach Ermessen.
- Kein Founder-Go pro Welle mehr noetig.
- Gilt sofort, aber nur solange keine Auto-Stop-Trigger greifen.

Quelle:

- `docs/plans/handoff/2026-05-03-claude-an-codex-push-deploy-vollautonomie.md`
- Founder-Message 2026-05-03 abends in dieser Session.

Repo-Regel wurde angepasst:

- `AGENTS.md` im Repo ist mit dieser neuen Regel zu synchronisieren bzw. wurde in dieser Session korrigiert.

## Harte Linien bleiben

Weiterhin Founder-Go pflichtig:

- Prod-DB-Schreibaktion (`apply_migration`, `execute_sql INSERT/UPDATE/DELETE`).
- Prod-Migrationen.
- Vercel-Env-Aenderungen (Secrets, neue/geloeschte/geaenderte Vars).
- Provider-Live-Schaltungen ohne AVV (KI, Stripe, Twilio etc.).
- Neue laufende Kosten.
- Verarbeitung echter personenbezogener Daten durch KI ohne AVV.
- Loeschen lokaler Altlasten/Logs ohne klare Freigabe.

Autonom erlaubt, nach eigener sauberer Verifikation:

- `git push origin master`.
- `git push --force-with-lease`, wenn lokale Verifikation gruen ist und keine fremden Commits ueberschrieben werden.
- `gh workflow run deploy.yml`.
- `vercel deploy --prod` ohne `--prebuilt` (Vercel/Linux-Remote-Build).
- Production-Rollback via Vercel-UI.

Wichtig fuer Windows:

- Kein `vercel build --prod` + `vercel deploy --prebuilt --prod` fuer Production von Windows.
- Sichere Pfade sind GitHub Actions/Linux oder `vercel deploy --prod` ohne `--prebuilt`.

## Auto-Stop-Trigger

Codex stoppt sich selbst und geht zurueck zu Push-Go-pro-Welle, wenn:

1. Prod `users` Eintraege mit `is_test_user IS NOT TRUE` > 0 hat, also echte Pilot-Familien onboarden.
2. Der Code Migrationen voraussetzt, die nicht auf Prod sind.
3. Ein Deploy neue Provider-Calls live machen wuerde, fuer die kein AVV existiert.
4. `NEXT_PUBLIC_PILOT_MODE` auf `false` stehen wuerde.

Wenn ein Stop-Trigger greift: nicht weiter pushen/deployen, kurz begruenden und Alternativpfad vorschlagen.

## Founder-Erwartung an Codex

- Bestmoegliche Loesung liefern, keine Halb-Loesungen.
- Founder widersprechen, wenn eine Anweisung belegbar schaedlich waere.
- Bessere Alternativen vorschlagen, wenn Founders konkrete Idee suboptimal ist.
- Bei rotem CI, fehlenden Tests, fremden Branch-Commits oder Risiko fuer Daten/Secrets stoppen statt blind ausfuehren.
- Keine Pause-Empfehlungen. Founder entscheidet Tempo.
- Keine Beschwichtigung. Rote Tests und Bugs klar benennen.
- Wenn unklar: Founder direkt fragen, nicht Claude.

Disziplin bleibt:

- Pre-Check vor Neubau.
- TDD strict pro Verhaltensaenderung: RED vor GREEN.
- Lokale Verifikation vor Push.
- INBOX-Eintrag pro Welle als Audit-Trail.
- Doku-Note in `docs/plans/` fuer groessere Wellen.
- Bei Schiefgang sofort Rollback statt Vertuschen.

## Memory-Arbeitsteilung

- Codex schreibt Repo-Doku: `docs/plans/`, `docs/plans/handoff/INBOX.md`, Handover-Notes, `AGENTS.md`.
- Claude schreibt Auto-Memory + Vault.
- Keine parallele Wahrheit.
- Bei Konflikt: Code ist autoritativ vor Plan-Texten. Neue direkte Founder-Anweisung ist autoritativ vor alten Repo-Regeln.

## Echte Repo-Lage beim Schreiben

Die Claude-Notiz nannte als Wiedereinstieg:

- `nachbar-io master HEAD d3fa315, gepusht, ahead 0`
- Welle D freigegeben, nicht gestartet.

Das ist inzwischen veraltet. Echte lokale Lage laut Git:

- Workspace: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
- Branch: `master`
- `HEAD` vor dieser Rewrite-Doku: `b13c4bc docs(handoff): add wave d local preview handover`
- `origin/master`: `6fe0ab4 docs(handoff): record wave d senior care check`
- Lokal: `master...origin/master [ahead 2]`
- Untracked: `.codex-welle-d-3001.pid`
- Untracked neu durch Claude/Founder-Bridge: `docs/plans/handoff/2026-05-03-claude-an-codex-push-deploy-vollautonomie.md`

Die `d3fa315`-Angabe ist also historisch, nicht aktueller Stand.

## Welle-D-Stand

Bereits lokal erledigt:

1. `b920a83 fix(senior-care): polish entry touch targets`
   - `/senior` leitet auf `/senior/home`.
   - Emergency-Banner: 112/110 bleiben priorisiert, 80px Touch-Ziele.
   - Consent-Karte: 80px Touch-Ziel.
   - Consent-Copy: freiwillige ausdrueckliche Einwilligung + jederzeit widerrufbar.
2. `6fe0ab4 docs(handoff): record wave d senior care check`
   - Welle-D-Spotcheck-Handover.
   - Bereits auf `origin/master`.
3. `6a71342 fix(senior-care): add local entry previews`
   - Lokale UI-Preview-Routen:
     - `/senior/preview`
     - `/care/preview`
     - `/care/consent/preview`
   - Keine Auth, keine Care-DB, kein Care-Seeding.
   - Preview-Pfade nur non-production aktiv.
4. `b13c4bc docs(handoff): add wave d local preview handover`
   - Alte Folgeuebergabe geschrieben, wird durch diese neue Uebergabe ersetzt.

## Welle-D-Preview Details

Neue/extrahierte Komponenten:

- `components/senior/SeniorHomeActions.tsx`
- `modules/care/components/CareHubTileGrid.tsx`
- `modules/care/components/consent/CareConsentNotice.tsx`
- `lib/local-ui-preview.ts`

Neue Preview-Routen:

- `app/senior/preview/page.tsx`
- `app/senior/preview/SeniorLocalPreviewClient.tsx`
- `app/(app)/care/preview/page.tsx`
- `app/(app)/care/consent/preview/page.tsx`
- `app/(app)/care/consent/preview/CareConsentLocalPreviewClient.tsx`

Guard-/Bypass-Aenderungen:

- `lib/closed-pilot.ts`: Preview-Pfade oeffentlich im Closed-Pilot.
- `components/AuthSessionProvider.tsx`: Preview-Pfade clientseitig public.
- `modules/care/components/consent/CareDisclaimer.tsx`: Kein Disclaimer-Overlay fuer Preview.
- `modules/care/components/sos/CareAlarmProvider.tsx`: Kein Alarm fuer Preview.
- `modules/care/hooks/useAlarm.ts`: optional `{ disabled }`, damit Preview keinen `/api/care/checkin/status`-Fetch ausloest.

## Verifikation Welle D Preview

Fresh Commands, bereits ausgefuehrt:

```powershell
npx vitest run __tests__/middleware/closed-pilot.test.ts __tests__/app/senior/local-preview.test.tsx __tests__/app/care/local-preview.test.tsx __tests__/components/AuthSessionProvider.test.ts modules/care/components/consent/CareDisclaimer.test.ts modules/care/components/sos/CareAlarmProvider.test.ts components/EmergencyBanner.test.tsx __tests__/components/care/ConsentFeatureCard.test.tsx __tests__/app/care/consent-page.test.tsx __tests__/app/senior/entry-redirect.test.ts
npx eslint __tests__/middleware/closed-pilot.test.ts __tests__/app/senior/local-preview.test.tsx __tests__/app/care/local-preview.test.tsx __tests__/components/AuthSessionProvider.test.ts modules/care/components/consent/CareDisclaimer.test.ts modules/care/components/sos/CareAlarmProvider.test.ts components/AuthSessionProvider.tsx components/senior/SeniorHomeActions.tsx app/senior/home/page.tsx app/senior/preview/page.tsx app/senior/preview/SeniorLocalPreviewClient.tsx modules/care/components/CareHubTileGrid.tsx 'app/(app)/care/page.tsx' 'app/(app)/care/preview/page.tsx' modules/care/components/consent/CareConsentNotice.tsx modules/care/components/consent/CareDisclaimer.tsx modules/care/components/sos/CareAlarmProvider.tsx modules/care/hooks/useAlarm.ts 'app/(app)/care/consent/page.tsx' 'app/(app)/care/consent/preview/page.tsx' 'app/(app)/care/consent/preview/CareConsentLocalPreviewClient.tsx' lib/closed-pilot.ts lib/local-ui-preview.ts --no-warn-ignored
npx tsc --noEmit
npm run build:local
```

Ergebnis:

- Vitest: 10 Dateien / 46 Tests passed.
- ESLint: passed.
- TypeScript: passed.
- `build:local`: passed.
- Browser-Smoke lokal auf `http://localhost:3000` mit 390px Viewport:
  - `/senior/preview`
  - `/care/preview`
  - `/care/consent/preview`
  - keine Console-Warnings/Errors
  - keine nichtstatischen 4xx/5xx
  - kein horizontaler Overflow

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert` erschien wie gewohnt im lokalen Build.
- Kein Build-Fehler.

## Lokale Reste

- `.codex-welle-d-3001.pid` bleibt untracked.
  - Nicht loeschen ohne explizite Freigabe.
- Vorhandener Dev-Server auf Port `3000`, PID beim letzten Check: `57180`.
  - Nicht von Codex gestartet.
  - Nicht gestoppt.
- `output/codex-dev-3003.*.log` entstand kurzzeitig beim Versuch, einen zweiten Dev-Server zu starten.
  - `output/` ist nicht Teil des Git-Status.

## Naechster sinnvoller Block

1. Diese neue Regel-/Handover-Welle abschliessen:
   - `AGENTS.md` mit neuer Push-/Deploy-Autonomie synchronisieren.
   - Claude-Brief `docs/plans/handoff/2026-05-03-claude-an-codex-push-deploy-vollautonomie.md` einchecken.
   - INBOX-Zeile fuer diesen Regel-/Handover-Block setzen.
2. Danach wegen neuer Regel nach eigener Verifikation pushen:
   - `git push origin master`
   - CI beobachten.
3. Deploy-Entscheidung getrennt treffen:
   - Nicht jeder Doku-Commit muss live.
   - App-Code `6a71342` ist eine lokale Preview-Funktion, production-guarded.
   - Wenn Deploy sinnvoll ist: Linux-Remote-Pfad nutzen (`gh workflow run deploy.yml` oder `vercel deploy --prod` ohne `--prebuilt`).
4. Danach naechster Produktblock:
   - Authentifizierter lokaler Spot-Check fuer `/senior`, `/senior/home`, `/care`, `/care/consent` mit frischer synthetischer Test-Auth ohne Care-Daten-Seeding.

## Kurzprompt fuer neue Session

Arbeite in `C:\Users\thoma\Claud Code\Handy APP\nachbar-io` auf `master`. Lies zuerst `AGENTS.md`, `docs/plans/handoff/INBOX.md`, `docs/plans/handoff/2026-05-03-claude-an-codex-push-deploy-vollautonomie.md` und diese Datei `docs/plans/2026-05-03-codex-new-session-handover.md`. Wichtig: Push und Vercel-Deploy sind seit Founder-Update 2026-05-03 abends autonom erlaubt; Rote Zone bleiben Prod-DB-Schreibaktionen, Prod-Migrationen, Vercel-Env-Aenderungen, Provider-Live-Schaltungen ohne AVV, neue laufende Kosten und echte personenbezogene KI-Verarbeitung ohne AVV. Echte lokale Git-Lage ist autoritativ, nicht die alte `d3fa315`-Notiz. `.codex-welle-d-3001.pid` nicht loeschen. Naechster Block: Regel-/Handover-Welle verifizieren, pushen, CI beobachten; Deploy nur bewusst entscheiden.

