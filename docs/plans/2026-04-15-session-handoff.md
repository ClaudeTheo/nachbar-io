# Session Handoff — Quartier / Map Live Polish

**Datum:** 2026-04-15  
**Repo:** `C:/Users/thoma/Documents/New project/nachbar-io`  
**Branch:** `master`  
**Aktueller Repo-Stand:** alle Produktfixes bis `7af4e05` sind auf `origin/master` gepusht.  
**Letzter live deployter Produktfix-Commit:** `7af4e05` (`Increase help tip tap target`)  
**Live-URL:** `https://nachbar-io.vercel.app`  
**Letzter Prod-Deploy:** `dpl_GN3CMK62gXrjnMwKqMz2rkZTwm4c`  
**Inspector:** `https://vercel.com/thomasth1977s-projects/nachbar-io/GN3CMK62gXrjnMwKqMz2rkZTwm4c`

## Wichtig

- Im Worktree liegen aktuell nur die erwarteten untracked Test-Artefakte:
  - `.playwright-cli/`
  - `output/`
- Diese Artefakte nicht committen.
- Der Chat-Kontext selbst ist nach Neustart nicht garantiert. Die verlässliche Quelle ist diese Datei.
- Nutze nur die Infos aus dieser Handoff-Datei als Wahrheit.
- Neue Deploy-Regel:
  - Keine Mikro-Deploys mehr für einzelne kleine UI-Fixes.
  - Mehrere zusammenhängende UX-/A11y-Fixes erst lokal bündeln, prüfen und dann in einem Paket einmal nach Produktion deployen.

## Was seit dem alten Handoff erledigt wurde

- `89ad822` — `Hide mobile version badge overlay`
  - Das fixe `V2.5`-Badge verdeckt auf Mobile in tieferen Bereichen von `/quartier-info` keine Inhalte mehr.
- `3688ff3` — `Widen quartier info layout on desktop`
  - `/quartier-info` bricht auf Desktop aus der zu schmalen Mobile-Spalte aus.
- `37aeed2` — `Improve quartier info accessibility cues`
  - Bottom-Nav-Kontraste erhöht.
  - Zurück-Link auf `/quartier-info` mit zugänglichem Namen versehen.
  - Versions-Badge innerhalb der Main-Landmark platziert.
- `fd7b56f` — `Fix nav role loading state build`
  - Build-Fix in `useNavRole()` nach dem Accessibility-Batch.
- `af1cc6c` — `Widen map layout on desktop`
  - `/map` nutzt auf Desktop eine breite Shell statt einer schmalen Mobile-Spalte.
  - Die Kartenfläche ist auf großen Viewports höher und ruhiger gesetzt.
- `12b2fda` — `Add mobile bottom spacing to map page`
  - Die Zeile `15 Nachbarn im Quartier` klebt auf Mobile nicht mehr direkt an der Bottom-Nav.
- `8832208` — `Improve map filter bar on mobile`
  - Die obere Kartenleiste auf `/map` ist auf Mobile luftiger.
  - Filterchips sind als klare Pills umgesetzt.
  - Filterbuttons haben `aria-pressed` und sprechende `aria-label`s.
- `491b47c` — `Fully hide mobile FABs when collapsed`
  - Bug-Report-FAB und Voice-FAB fahren im Hidden-Zustand jetzt vollständig unter den Mobile-Viewport.
  - Hidden-FABs fangen keine Pointer-Events mehr ab.
- `7af4e05` — `Increase help tip tap target`
  - `HelpTip`-Trigger von sehr klein auf ein mobiles Touch-Ziel vergroessert.
  - `aria-expanded` und `aria-haspopup="dialog"` ergänzt.

## Live verifiziert

### `/quartier-info`

- Mobile:
  - Versions-Badge überlagert keine Inhalte mehr.
  - `Veranstaltungen` und `Rathaus & Services` waren im Scrollbereich frei lesbar.
- Desktop:
  - Seite nutzt eine breitere Shell.
- Accessibility:
  - Live-`axe` auf Produktion meldete `0` Violations.
- Konsole:
  - nur erwartete Service-Worker-Logs.

### `/map`

- Desktop:
  - breite Shell ist live.
  - größere Kartenhöhe ist live.
- Mobile:
  - zusätzliche Bottom-Spacer sind live.
  - Filterleiste ist live luftiger und besser lesbar.
  - FABs liegen im Hidden-Zustand vollständig außerhalb des `664px`-Viewports.
  - Hidden-FABs haben `pointer-events: none`.
- Accessibility:
  - Live-`axe` auf den letzten `/map`-Checks meldete `0` Violations.
- Konsole:
  - nur erwartete Service-Worker-Logs.

## Noch nicht final live nachgeprüft

- Der zuletzt deployte `HelpTip`-Fix aus `7af4e05` ist live auf Produktion, wurde nach dem Deploy aber noch nicht separat mit einem frischen echten Live-Check gegen `/map` gemessen.
- Das ist der naechste erste Pflichtschritt vor weiteren UI-Aenderungen.

## Lokal verifiziert

- gezieltes `eslint` auf die geänderten Dateien war sauber
- mehrfaches `npm run build` war nach den Fixes sauber

## Relevante Dateien

- `app/(app)/layout.tsx`
- `app/(app)/quartier-info/page.tsx`
- `app/(app)/map/page.tsx`
- `app/globals.css`
- `components/BottomNav.tsx`
- `components/BugReportButton.tsx`
- `components/HelpTip.tsx`
- `components/LeafletKarte.tsx`
- `components/MapFilterBar.tsx`
- `components/nav/NavConfig.ts`
- `components/nav/NavItem.tsx`
- `lib/ui/fabVisibility.ts`
- `modules/voice/components/VoiceAssistantFAB.tsx`

## Bekannter Kontext

- Für stabile Einzelverifikationen funktionierte lokales Node-Playwright robuster als lange Playwright-CLI-Sessions.
- Nützlicher Live-Login für Produktionschecks:
  - `/api/test/login?email=agent_a@test.nachbar.local&password=TestPass123!&secret=e2e-test-secret-dev&next=/map`
- Relevante Artefakt-Ordner aus dieser Session:
  - `output/playwright/map-mobile-postdeploy/`
  - `output/playwright/map-fab-postdeploy/`
- Die Mobile-Bottom-Nav trägt aktuell `aria-label="Hauptnavigation"`, nicht `Hauptnavigation mobil`.

## Naechste sinnvolle Schritte

1. Zuerst einen echten Live-Check von `/map` Mobile gegen den bereits live ausgerollten `HelpTip`-Fix aus `7af4e05` machen.
   - Zielgröße des Help-Buttons prüfen
   - Tooltip-Position auf schmalem Viewport prüfen
   - Konsole prüfen
   - optional kurz `axe` mitlaufen lassen
2. Danach weitere `/map`-Punkte nicht einzeln deployen, sondern lokal zu einem Paket bündeln.
   - naheliegende Kandidaten:
   - Tooltip-Layout / Tooltip-Pfeil / Close-Hitbox
   - visuelle Dichte rund um Header und Kartenleiste
   - Feinschliff der Karten-Controls und Abstände im Mobile-Viewport
3. Erst wenn 2-4 sinnvolle zusammenhängende Fixes gesammelt und lokal geprüft sind:
   - einmal deployen
   - einmal final live gegen Produktion prüfen

## Exakter Startsatz fuer die naechste Session

Arbeite in `nachbar-io` auf `master` weiter. Der letzte live deployte Produktfix ist Commit `7af4e05`, live auf `https://nachbar-io.vercel.app` mit Deploy `dpl_GN3CMK62gXrjnMwKqMz2rkZTwm4c`. Lies `docs/plans/2026-04-15-session-handoff.md` und nutze nur diese Datei als Wahrheit. Committe `.playwright-cli/` und `output/` nicht. Mache als Erstes einen echten Live-Check von `/map` Mobile gegen den bereits live ausgerollten HelpTip-Tap-Target-Fix und suche danach weiter am nächsten UX-/Accessibility-Paket. Deploye nicht für Einzel-Fixes, sondern bündele mehrere sinnvolle `/map`-Verbesserungen lokal und deploye erst dann einmal nach Produktion.
