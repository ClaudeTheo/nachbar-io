# Session-Handover fuer 2026-05-02

Stand: 2026-05-01 nach Push von lokaler Smoke-Angleichung und Bad-Saeckingen-Link-Fix.

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
- Working Tree nach Push: clean
- Lokal/Remote: synchron

Letzte relevante Commits:

- `526ab8a fix(municipal): normalize bad saeckingen links`
- `9456511 fix(e2e): align local smoke coverage`
- `abafca4 fix(info-hub): update Bad Saeckingen service links`
- `7c0a15f docs(handoff): record production deploy lessons`
- `41aaf9b fix(e2e): normalize local supabase smoke env`

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

1. Repo/CI-Stand klaeren:
   - `git status --short --branch`
   - GitHub Actions Status fuer Push `526ab8a`
   - Vercel Deployment Status

2. Production-Basis-Smoke:
   - Startseite, Login, Register
   - Admin nur als Founder
   - Keine Vercel-Env-Aenderung, keine DB-Aenderung

3. Quartier-Link-Smoke:
   - `Rathaus & Infos` / Services
   - Wiki-Links in City Services
   - `/quartier-info` Rathaus-Links
   - Mangelmelder-Hinweislinks

4. Breitere Bereichstests fortsetzen:
   - Auth/Registration/Invite
   - Dashboard/Senior Mode
   - Hilfe/Marktplatz/Meldungen
   - Care/Check-in/SOS nur mit synthetischen Testdaten
   - Admin/Audit/Feature-Flags nur lesend

5. Danach entscheiden:
   - Wenn CI + Production-Smoke gruen: Stand als deploybar dokumentieren.
   - Wenn Links in Production trotz Code-Fix kaputt bleiben: pruefen, ob die betroffene UI die Normalizer-Schicht umgeht oder ob eine DB-Seite/HTML-Route ausserhalb der App betroffen ist.
   - Prod-Migrationen 176/177 bleiben aus, bis Founder explizit neues Go gibt.

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
npx playwright test --config=tests/e2e/playwright.config.ts --project=multi-agent --workers=1 --timeout=60000
```

## Nicht vergessen

- Keine echten Pilot-/Pflege-/Medizin-/Personendaten.
- Keine lokalen Windows-Prebuild-Deploys fuer Production.
- Bei Push/Deploy/Prod-DB/Env/Flag-Schaltern immer Founder-Go abwarten.
