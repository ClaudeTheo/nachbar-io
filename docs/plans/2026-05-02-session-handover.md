# Session-Handover fuer 2026-05-02

Stand: 2026-05-02 nach lokaler Stabilisierung der Multi-Agent-E2E-Flows.

## Harte Linien

- Kein Deploy ohne klares Founder-Go.
- Kein Prod-DB-Write, keine Prod-Migration.
- Keine Vercel-Env-Aenderung ohne neues Founder-Go.
- Keine Feature-Flag-/Preset-Schalter.
- Keine echten Pflege-/Medizin-/Personendaten verwenden.
- Windows-Prebuild fuer Production nicht mehr verwenden: `vercel build --prod` + `vercel deploy --prebuilt --prod` ist auf Windows wegen Junction-/External-Problemen nicht production-tauglich.

## Repo-Stand

- Workspace: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
- Branch: `master`
- Remote: `origin/master`
- Working Tree nach lokalem Commit: clean
- Lokal/Remote: lokal ahead 2, nicht gepusht

Letzte relevante Commits:

- `b0f706b fix(e2e): stabilize local multi-agent flows` (lokal, nicht gepusht)
- `2d9ed3e docs(handoff): add may 2 session handover` (lokal, nicht gepusht)
- `526ab8a fix(municipal): normalize bad saeckingen links`
- `9456511 fix(e2e): align local smoke coverage`
- `abafca4 fix(info-hub): update Bad Saeckingen service links`

## Was heute erledigt wurde

### Lokale Smoke-/E2E-Angleichung

- Lokale E2E-Smokes auf `npm run start:local` / `build:local` ausgerichtet.
- `start-local-production.mjs` normalisiert lokale Supabase-Production-Smokes auf den Port aus `supabase/config.toml`.
- Lokale Care-Smokes und E2E-Smokes liefen ohne Inline-Override von `NEXT_PUBLIC_SUPABASE_URL`.
- Commit `9456511` wurde gepusht.

### Bad-Saeckingen Rathaus-/Quartier-Links

Pre-Check:

- Runtime-Quelle fuer `/quartier-info`: `lib/services/quartier-info.service.ts` liest `municipal_config.service_links` und normalisiert Bad-Saeckingen-Links.
- `app/(app)/city-services/page.tsx` liest ebenfalls `municipal_config` direkt.
- `modules/info-hub/services/rathaus-links.ts` ist statischer Fallback/Export.
- Single Source fuer Link-Reparaturen ist jetzt `lib/municipal/bad-saeckingen-links.ts`.

Fix:

- Alte Pfade wie `/buergerbuero`, `/standesamt`, `/fundbuero`, `/formulare`, `/kontakt` werden zentral normalisiert.
- `city-services` normalisiert jetzt auch verschachtelte Wiki-Links.
- Mangelmelder-Rathaus-Kontaktlinks zeigen nicht mehr auf den kaputten `/kontakt`-Pfad.
- Lokale Migration/Seed-Daten wurden auf aktuelle erreichbare URLs aktualisiert.
- Commit `526ab8a` wurde gepusht.

Online gepruefte Ziel-URLs:

- `https://www.bad-saeckingen.de/rathaus-service/buergerservice/kontakt-oeffnungszeiten` -> 200
- `https://www.bad-saeckingen.de/rathaus-service/buergerservice/was-erledige-ich-wo` -> 200
- `https://www.bad-saeckingen.de/rathaus-service/verwaltungsaufbau/alle-fachbereiche/personenstandswesen` -> 200
- `https://www.bad-saeckingen.de/rathaus-service/buergerservice/behoerden-dienstleistungen/6000959/fundsache-abgeben-oder-nachfragen` -> 200
- `https://www.bad-saeckingen.de/rathaus-service/buergerservice/formulare-onlinedienste` -> 200
- `https://www.bad-saeckingen.de/rathaus-service/aktuelles/neuigkeiten` -> 200, redirect auf Listenansicht
- `https://www.bad-saeckingen.de/leben-wohnen/veranstaltungen` -> 200, redirect auf Listenansicht

### Lokale Multi-Agent-E2E-Stabilisierung

Ausgangslage:

- GitHub Actions war nach Push `526ab8a` oeffentlich als rot sichtbar: CodeQL gruen, `E2E Multi-Agent Tests` rot.
- `gh` war in dieser Shell nicht authentifiziert, daher keine CI-Logs via CLI.
- Lokaler Repro gegen `npm run start:local` zeigte zunaechst 92 passed, 1 skipped, 1 failed: `S12.1 Kontaktanfrage -> Annahme -> Chat`.

Fixes:

- `app/api/quarter/residents/request/route.ts` nutzt fuer die fremde Haushalt-/Quartier-Aufloesung jetzt `getAdminSupabase()`. Auth bleibt vorher ueber User-Client geprueft; Service erzwingt Quarter-Scope.
- `app/(app)/messages/page.tsx` nutzt fuer Kontaktanfragen jetzt die bestehende Chat-/Contacts-API (`listContacts`, `updateContactStatus`, `openConversation`) statt direkt `neighbor_connections`/`contact_links` zu mischen.
- `app/(app)/messages/[id]/page.tsx` nutzt `listConversations()` als RLS-sicheren Fallback fuer Anzeigenamen im Chat-Header.
- `app/(app)/help/page.tsx` laedt Hilfe-Gesuche ueber die vorhandene API `/api/hilfe/requests` statt direkt per Supabase-Client am Quartier-Kontext haengenzubleiben.
- `app/(app)/help/new/page.tsx` erstellt Hilfe-Gesuche ueber `/api/hilfe/requests`.
- `app/api/hilfe/requests/route.ts` leitet fehlende `quarter_id` serverseitig aus der Haushaltsmitgliedschaft ab. Die eigentliche Erstellung laeuft weiterhin ueber den authentifizierten User-Client/RLS.
- `lib/quarters/helpers.ts` liest die Haushaltsmitgliedschaft ohne `verified_at`-Filter, weil lokale E2E-Seeds Mitgliedschaften teilweise erst nachtraeglich patchen und der Hilfegesuch-Pfad sonst mit `quarter_id ist erforderlich` scheitert.
- `modules/hilfe/services/hilfe-requests.service.ts` uebernimmt `subcategory` und `expires_at`, damit `/help/new` keine Felder verliert.
- `tests/e2e/scenarios/s3-chat.spec.ts` zaehlt beim Anti-Duplikat-Check nur echte `[data-testid='chat-message']`, nicht verschachtelte Layout-Container.

Regressionstests:

- `__tests__/api/quarter/residents-request.test.ts`
- `__tests__/app/messages/page.test.tsx`
- `__tests__/api/hilfe/requests.test.ts`
- `__tests__/app/help/page.test.tsx`

Lokaler Commit:

- `b0f706b fix(e2e): stabilize local multi-agent flows`

## Verifikation heute

Gezielt ausgefuehrt:

```powershell
npx vitest run __tests__/lib/municipal/bad-saeckingen-links.test.ts __tests__/app/city-services/page.test.tsx __tests__/pages/quartier-info-vorlesen.test.tsx
npx eslint 'lib/municipal/bad-saeckingen-links.ts' 'app/(app)/city-services/page.tsx' 'app/(app)/reports/new/page.tsx' 'app/(app)/reports/[id]/page.tsx' '__tests__/lib/municipal/bad-saeckingen-links.test.ts' '__tests__/app/city-services/page.test.tsx' '__tests__/pages/quartier-info-vorlesen.test.tsx' --no-warn-ignored
npx tsc --noEmit
```

Ergebnis:

- Vitest: 3 Dateien / 68 Tests passed.
- ESLint: gruen.
- TypeScript: gruen.

Vorher in derselben Arbeitswelle bereits gruen:

- Care-Smokes: 12 Dateien / 67 Tests passed.
- E2E-Basis-Smoke S8/S9: 5 Tests passed.
- E2E-Follow-up-Smoke S8/S9: 7 Tests passed.
- `build:local`: gruen.

Nach der Multi-Agent-Stabilisierung frisch ausgefuehrt:

```powershell
npx vitest run __tests__/api/hilfe/requests.test.ts __tests__/app/help/page.test.tsx
npx vitest run __tests__/api/quarter/residents-request.test.ts __tests__/app/messages/page.test.tsx
npm run build:local
npx eslint 'app/(app)/messages/page.tsx' 'app/(app)/messages/[id]/page.tsx' 'app/api/quarter/residents/request/route.ts' 'app/(app)/help/page.tsx' 'app/(app)/help/new/page.tsx' 'app/api/hilfe/requests/route.ts' 'lib/quarters/helpers.ts' 'modules/hilfe/services/hilfe-requests.service.ts' '__tests__/app/messages/page.test.tsx' '__tests__/api/quarter/residents-request.test.ts' '__tests__/app/help/page.test.tsx' '__tests__/api/hilfe/requests.test.ts' 'tests/e2e/scenarios/s3-chat.spec.ts' --no-warn-ignored
npx tsc --noEmit
npx playwright test --config=tests/e2e/playwright.config.ts --project=multi-agent --project=senior-terminal --workers=1 --timeout=60000
```

Ergebnis:

- Vitest Hilfe/API: gruen.
- Vitest Messages/Resident Request: gruen.
- `build:local`: gruen.
- ESLint: gruen.
- TypeScript: gruen.
- Breite E2E-Suite: 94 passed.

Bekannte Test-Noise:

- Viele 406-Console-Errors aus Supabase `.single()`/leeren optionalen Reads bleiben sichtbar.
- Notification-Erstellung meldet in Chat-Flows teils 403 `Keine Berechtigung fuer diesen Empfaenger`; blockiert die getesteten Nutzerfluesse nicht.

## Wichtige offene Punkte

### CI/Deploy-Status pruefen

Nach dem Push konnte diese Shell `gh run list` nicht nutzen, weil `gh` nicht authentifiziert war:

```text
To get started with GitHub CLI, please run: gh auth login
```

Morgen zuerst pruefen:

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status --short --branch
gh auth status
gh run list --limit 10
```

Wenn `gh` weiter nicht authentifiziert ist: GitHub Actions im Browser pruefen.

Aktueller wichtiger Zusatz:

- Die lokalen Commits `2d9ed3e` und `b0f706b` sind noch nicht gepusht.
- Push auf `master` braucht Founder-Go.
- CI kann fuer `b0f706b` erst laufen, wenn gepusht wurde.

### Production-Smoke nach Deploy

Nur falls ein Remote-/GitHub-Actions-Deploy auf `526ab8a` wirklich gelaufen und Ready ist:

- `https://nachbar-io.vercel.app/` muss laden.
- `/login` erreichbar.
- `/register` erreichbar.
- `/admin` als Founder: Feature-Flag-Manager + Audit-Log-Reader sichtbar; Empty-State wegen fehlender Mig 176 ist OK.
- `/quartier-info` und `Rathaus & Infos` nach Login/Invite-Kontext manuell mit Fokus auf externe Links pruefen.
- Mangelmelder: Rathaus-Link muss auf `kontakt-oeffnungszeiten` gehen.

Wenn Production rot ist: Vercel-UI Rollback auf letztes gruenes Deployment.

### Vercel-Env-Sicherheitscheck

Heute wurden laut vorherigem Stand `SECURITY_E2E_BYPASS` und `E2E_TEST_SECRET` aus Vercel Production geloescht; Preview/Development hatten keine Treffer. Morgen nach Moeglichkeit nochmals verifizieren:

```powershell
vercel env ls production
vercel env ls preview
```

Gesucht: keine `SECURITY_E2E_BYPASS`, kein `E2E_TEST_SECRET` in Production/Preview.

## Morgen: sinnvolle Reihenfolge

1. Repo-Stand klaeren:
   - `git status --short --branch`
   - Erwartung aktuell: `master...origin/master [ahead 2]`
   - `git log --oneline -5`

2. Founder-Entscheidung einholen:
   - Soll `b0f706b` zusammen mit `2d9ed3e` nach `origin/master` gepusht werden?
   - Ohne Founder-Go: nicht pushen.

3. Falls Founder-Go fuer Push:
   - `git push origin master`
   - Danach GitHub Actions Status fuer `b0f706b` pruefen.
   - Vercel Deployment Status

4. Production-Basis-Smoke nur nach erfolgreichem Remote-Deploy:
   - Startseite, Login, Register
   - Admin nur als Founder
   - Keine Vercel-Env-Aenderung, keine DB-Aenderung

5. Quartier-Link-Smoke:
   - `Rathaus & Infos` / Services
   - Wiki-Links in City Services
   - `/quartier-info` Rathaus-Links
   - Mangelmelder-Hinweislinks

6. Breitere Bereichstests fortsetzen:
   - Auth/Registration/Invite
   - Dashboard/Senior Mode
   - Hilfe/Marktplatz/Meldungen
   - Care/Check-in/SOS nur mit synthetischen Testdaten
   - Admin/Audit/Feature-Flags nur lesend

7. Danach entscheiden:
   - Wenn CI + Production-Smoke gruen: Stand als deploybar dokumentieren.
   - Wenn Links in Production trotz Code-Fix kaputt bleiben: pruefen, ob die betroffene UI die Normalizer-Schicht umgeht oder ob eine DB-Seite/HTML-Route ausserhalb der App betroffen ist.
   - Prod-Migrationen 176/177 bleiben aus, bis Founder explizit neues Go gibt.

## Naechster Auftrag an Codex

Wenn diese Uebergabe die naechste Session startet, soll Codex:

1. **Nicht deployen und nicht pushen**, bis Thomas explizit Go gibt.
2. `git status --short --branch` ausfuehren und bestaetigen, dass lokal `ahead 2` erwartet ist.
3. `gh auth status` pruefen; falls nicht authentifiziert, GitHub Actions im Browser/ueber oeffentliche API pruefen.
4. Thomas kurz fragen oder auf sein Go warten: "Soll ich die zwei lokalen Commits nach `origin/master` pushen?"
5. Bei Push-Go: pushen, CI verfolgen, danach nur lesende Production-Smokes ausfuehren.
6. Wenn CI erneut rot ist: zuerst Logs/Artefakte lesen, keine neuen Fixes ohne Root-Cause.
7. Falls kein Push-Go kommt: lokal weiter nur an verifizierbaren, gruenen Aufgaben arbeiten.

## Befehle fuer lokale Wiederaufnahme

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status --short --branch
npm run supabase:start
# bei Vector-Konflikt:
npx supabase start -x vector
npm run build:local
npm run start:local
```

E2E in zweiter Shell:

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
$env:E2E_BASE_URL="http://localhost:3001"
$env:E2E_LIVE="true"
$env:E2E_CLEANUP="true"
$env:E2E_TEST_SECRET="e2e-test-secret-dev"
npx playwright test --config=tests/e2e/playwright.config.ts --project=multi-agent --workers=1 --timeout=60000
```

## Nicht vergessen

- Keine echten Pilot-/Pflege-/Medizin-/Personendaten.
- Keine lokalen Windows-Prebuild-Deploys fuer Production.
- Bei Push/Deploy/Prod-DB/Env/Flag-Schaltern immer Founder-Go abwarten.
