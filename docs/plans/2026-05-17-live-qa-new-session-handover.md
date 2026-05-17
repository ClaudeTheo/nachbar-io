# Neue Session Uebergabe - Live-QA und naechster Fix-Block - 2026-05-17

Stand: nach Production-Live-Abnahme mit Demo-Nutzern, Grafik-/Bedienbarkeitsmessung, Axe-Barrierefreiheit, Console-/Network-Pruefung und automatisierten Repo-Checks.

## Kurzurteil

Die App ist technisch live und fuer eine interne Demo nutzbar, aber noch nicht bereit fuer eine echte externe Senior-/Familien-Abnahme.

Gruen:

- Production lebt: `https://nachbar-io.vercel.app`
- `/api/health` -> `200 {"status":"ok"}`
- Build, TypeScript und ESLint gruen.
- Alle sieben Demo-Rollen koennen authentifiziert werden.
- Rollen-/Redirect-Logik der Demo-Nutzer stimmt.

Nicht gruen:

- Senior-Mode verletzt aktuell wichtige Bedienbarkeitsregeln.
- Jugendkarte erzeugt CSP-Console-Errors durch blockierten LGL-BW-Layer.
- Mehrere Seiten/Surfaces haben Accessibility-Befunde: fehlende H1, kleine Touch-Ziele, einzelne Kontrastprobleme.

## Harte Linien fuer die naechste Session

- Kein Prod-DB-Write ohne neues Founder-Go.
- Keine Prod-Migration ohne Founder-Go.
- Keine Secret-/Billing-/Auth-Konfigurationsaenderung ohne Founder-Go.
- Keine echten Stripe-Abos erzeugen.
- Keine Demo-Passwoerter ins Repo schreiben.
- Bei CSP-Aenderung: gezielt nur die benoetigte Bildquelle erlauben, nicht breit `*`.
- Bei Senior-Notfall-Fix: Notfallregel beachten: 112/110 zuerst.

## Aktueller Repo-Stand

- Workspace: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
- Branch: `master`
- Remote: `origin/master`
- Status vor dieser Uebergabe: `master...origin/master`
- Letzter Commit vor dieser Uebergabe: `649445d docs(handoff): record admin redirect demo users`

Letzte relevante App-Commits:

- `bb1fcad fix(auth): send admins to admin dashboard after login`
- `57bede9 fix(sos): improve emergency contrast`
- `78939ef fix(registration): accept formatted pilot invite codes`

## Verifikation in dieser Session

### Repo-/Build-Checks

Ausgefuehrt:

```powershell
npx tsc --noEmit
npm run lint
npm run build
npm run test
npx vitest run __tests__/app/senior/touch-targets.test.tsx --testTimeout=20000
```

Ergebnis:

- `npx tsc --noEmit`: gruen.
- `npm run lint`: gruen.
- `npm run build`: gruen.
- `npm run test`: 657 Testdateien passed, 4760 Tests passed, 1 skipped, aber 1 Testdatei im Gesamtlauf failed durch 5s Timeout.
- Isolierter Lauf `__tests__/app/senior/touch-targets.test.tsx --testTimeout=20000`: gruen, 2 passed.

Interpretation:

- Der Senior-Touch-Test ist inhaltlich gruen, aber im Voll-Lauf flaky/langsam. Das ist ein Test-Performance-Befund, kein direkter UI-Beweis.

### Live-Checks Public Routes

Geprueft gegen `https://nachbar-io.vercel.app`:

- `/`: 200
- `/login`: 200
- `/register`: 200
- `/datenschutz`: 200
- `/impressum`: 200
- `/barrierefreiheit`: 200
- `/sos`: ohne Auth redirectet kontrolliert auf `/`

Keine 500er, keine relevanten Public-Console-Errors.

### Demo-Rollen-Redirects

Alle Demo-Nutzer wurden ueber Supabase Direct Auth gegen Production authentifiziert. Passwort steht nicht in diesem Handover.

Ergebnis:

- `demo-free@test.nachbar.local` -> `/dashboard`
- `demo-eltern@test.nachbar.local` -> `/dashboard`
- `demo-jugend@test.nachbar.local` -> `/jugend`
- `demo-plus@test.nachbar.local` -> `/dashboard`
- `demo-senior@test.nachbar.local` -> `/kreis-start`
- `demo-pro-community@test.nachbar.local` -> `/dashboard`
- `demo-pro-medical@test.nachbar.local` -> `/dashboard`

Alle Redirects: OK.

## Wichtigste Findings

### P1 - Senior-Start ist fuer Live-Abnahme noch nicht Senior-sicher

Betroffene Route:

- `/kreis-start`

Probleme:

- Push-Banner-Buttons `Einschalten` und `Spaeter` sind nur ca. 56px hoch.
- Senior-Regel verlangt 80px Touch-Targets.
- BugReportButton ist ca. 48x48 und liegt ebenfalls auf der Senior-Oberflaeche.
- Auf `/kreis-start` ist keine dauerhafte 112-Notrufleiste sichtbar.

Wahrscheinliche Dateien:

- `components/senior/PushBanner.tsx`
- `components/BugReportButton.tsx`
- `app/(senior)/layout.tsx`
- `app/senior/layout.tsx`
- `app/(senior)/kreis-start/page.tsx`

Hinweis:

- `/senior/*` nutzt `app/senior/layout.tsx` mit Notruf-Leiste.
- `/kreis-start` liegt aber unter Route Group `app/(senior)` und nutzt `app/(senior)/layout.tsx`, dort fehlt die persistente Notruf-Leiste.

Empfohlener Fix:

1. `app/(senior)/layout.tsx` um eine persistente Notruf-112-Leiste ergaenzen oder gemeinsam nutzbare Senior-Notruf-Komponente extrahieren.
2. `PushBanner` im Senior-Kontext auf 80px Touch-Hoehe bringen.
3. BugReportButton im Senior-Kontext entweder 80px machen, anders positionieren oder fuer Senior-Device bewusst anders loesen.
4. Tests fuer `app/(senior)/layout.tsx` und PushBanner-Touch-Ziele ergaenzen.

### P1 - Senior-Notfall-Kachel Kontrastproblem

Betroffene Route:

- `/kreis-start`

Befund:

- Axe meldet `color-contrast` serious.
- Gemessene Kontrastprobleme im Notfall-Tile: weisser Text auf Emergency-Rot.

Datei:

- `app/(senior)/kreis-start/page.tsx`

Empfohlener Fix:

- Notfall-Kachel so stylen, dass sichtbarer Text WCAG AA erfuellt.
- Moegliche Wege: dunkleres Rot, staerkerer Text-Kontrast, klare Border/Inset oder Layout mit weissem Innenbereich und rotem Notfall-Header.
- Danach Screenshot + Axe fuer `/kreis-start` wiederholen.

### P1 - Jugendkarte blockiert LGL-BW-Hausumringe per CSP

Betroffene Route:

- `/jugend`

Befund:

- Console erzeugt viele CSP-Errors:
  - `Loading the image 'https://owsproxy.lgl-bw.de/...' violates Content Security Policy directive: img-src ...`
- Dadurch fehlen LGL-BW Hausumringe im Kartenlayer.

Dateien:

- `components/map/lgl-bw-outlines-layer.tsx`
- `lib/security/csp.ts`

Empfohlener Fix:

- `https://owsproxy.lgl-bw.de` gezielt in `img-src` aufnehmen.
- Falls WMS auch Fetch/Tile-Verhalten ueber andere Mechanismen nutzt, pruefen, ob `connect-src` ebenfalls noetig ist. Im Befund war es `img-src`.
- CSP-Tests ergaenzen/anpassen.
- `/jugend` nach Deploy/Local-Preview auf Console-Errors pruefen.

### P2 - Login/Register haben kein echtes H1

Betroffene Routes:

- `/login`
- `/register`

Befund:

- Axe: `page-has-heading-one`.
- Login zeigt `CardTitle`, aber kein echtes `<h1>`.

Dateien:

- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- ggf. Register-Step-Komponenten in `app/(auth)/register/components/`

Empfohlener Fix:

- Auf Login ein echtes `<h1>` fuer `Anmelden`/`Code eingeben` verwenden.
- Auf Register ein echtes `<h1>` fuer den aktuellen Hauptscreen oder stabilen Seitentitel verwenden.
- Visuell gleich lassen, semantisch korrigieren.

### P2 - Touch-Ziele unter 44px auf normalen Oberflaechen

Befunde:

- Login:
  - `Was ist QuartierApp?` ca. 20px hoch.
  - E-Mail-Input ca. 32px hoch.
  - `Jetzt registrieren` ca. 19px hoch.
- Dashboard:
  - Benachrichtigungsglocke ca. 36x36.
  - `Mehr entdecken` ca. 42px hoch.
- Legal-Footer:
  - einzelne Links, besonders `AGB`, knapp bzw. durch Messung als zu klein erkannt.

Dateien:

- `app/(auth)/login/page.tsx`
- `components/legal/LegalLinksFooter.tsx`
- `components/dashboard/DiscoverGrid.tsx`
- `app/(app)/dashboard/page.tsx`

Empfohlener Fix:

- Interaktive Ziele mindestens 44x44 px machen.
- Bei Senior-Kontext 80x80 px.
- Skip-Link (`Zum Inhalt springen`) nicht als Fehler behandeln, wenn bewusst visually hidden und bei Focus sichtbar. Tests sollten ihn ggf. aus Touch-Ziel-Messung ausschliessen.

### P2 - Dashboard/Jugend einzelne Kontrastprobleme

Befunde:

- Dashboard: `Bad Saeckingen - Karte` wurde als sehr schwacher Kontrast erkannt.
- Plus-Dashboard: rote Badge-Zahl auf Emergency-Rot ca. 3.76 statt 4.5.
- Jugend: Leaflet Controls/Attribution und Text `1 Nachbarn im Quartier ...` unter 4.5.

Dateien suchen:

```powershell
rg -n "Bad S|Karte|Leaflet|Nachbarn im Quartier|unread-badge|bg-emergency-red" app components modules
```

Empfohlener Fix:

- Karte/Overlay-Texte mit realem Hintergrund pruefen, nicht nur DOM-Messung.
- Badge ggf. dunkleres Rot oder dunkler Text/heller Hintergrund.
- Leaflet-Control-Kontrast gezielt ueberschreiben, ohne Kartenbedienung zu verschlechtern.

## Screenshots/Artefakte

Screenshots und JSON-Ergebnisse wurden temporaer unter `%TEMP%` abgelegt, nicht ins Repo geschrieben.

Wichtige Pfade dieser Session:

- `C:\Users\thoma\AppData\Local\Temp\nachbar-live-qa-1779030444314\result.json`
- `C:\Users\thoma\AppData\Local\Temp\nachbar-live-qa-accounts-1779030674429\accounts.json`
- `C:\Users\thoma\AppData\Local\Temp\nachbar-live-qa-accounts-1779030674429\account-senior.png`
- `C:\Users\thoma\AppData\Local\Temp\nachbar-live-qa-accounts-1779030674429\account-youth.png`
- `C:\Users\thoma\AppData\Local\Temp\nachbar-live-qa-1779030444314\public-login-mobile.png`
- `C:\Users\thoma\AppData\Local\Temp\nachbar-live-qa-1779030444314\public-register-mobile.png`

Hinweis:

- Temp-Artefakte koennen spaeter geloescht werden. Fuer dauerhaftes QA-Protokoll bei Bedarf gezielt einen Repo-Bericht in `docs/plans/` schreiben, aber keine Screenshots committen, ausser Founder verlangt es ausdruecklich.

## Empfohlener naechster Arbeitsblock

Name:

- `fix(senior): harden live acceptance accessibility`

Scope in dieser Reihenfolge:

1. Senior-Start `/kreis-start` reparieren:
   - 112-Leiste dauerhaft sichtbar.
   - PushBanner-Buttons 80px.
   - Notfall-Kachel Kontrast AA.
2. CSP fuer LGL-BW-Hausumringe:
   - `img-src https://owsproxy.lgl-bw.de`.
   - Test fuer CSP-Policy.
3. Login/Register semantische H1.
4. 44px Touch-Ziele fuer Login, Dashboard-Glocke, `Mehr entdecken`, Legal-Footer.
5. Danach komplette QA-Wiederholung:
   - `npx tsc --noEmit`
   - `npm run lint`
   - relevante Vitest-Tests
   - `npm run build`
   - Browser/Playwright fuer `/login`, `/register`, `/kreis-start`, `/jugend`, `/dashboard`

Kein Push/Deploy ohne Founder-Go.

## Startbefehle fuer naechste Session

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status --short --branch
Get-Content -Path docs\plans\2026-05-17-live-qa-new-session-handover.md
rg -n "PushBanner|kreis-start|Notfall|owsproxy|img-src|CardTitle|Mehr entdecken|Benachrichtigungen" app components lib __tests__
```

Dann zuerst die Senior-Fixes klein und testgetrieben umsetzen.

