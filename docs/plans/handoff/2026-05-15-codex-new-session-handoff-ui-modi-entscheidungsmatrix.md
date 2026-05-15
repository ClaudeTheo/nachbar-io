# New-Session-Handover: UI-Modi Entscheidungsrunde

Datum: 2026-05-15  
Owner bisher: Codex  
Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`  
Branch: `master`, lokal `ahead 8` vor `origin/master` vor diesem Handoff-Commit  
Rote Gates: kein Push/Deploy/Prod-DB/Migration ohne Founder-Go

## Kurzstand

Die vier Bewohner-Oberflächen sind lokal technisch vorbereitet:

- `Jugend`: eigener dunkler Map-first-Jugendstart, lokale Preview `/jugend-ui-preview`
- `Aktiv`: normales Dashboard mit vollständiger Quartier-Funktionsdichte
- `Komfort`: ruhigeres Dashboard mit größerem Abstand und eigener Modus-Surface
- `Einfach`: Senior-Start `/kreis-start` mit vier großen Kacheln und Notruf-112-Leiste

Zusätzlich gibt es jetzt eine bearbeitbare Entscheidungsseite für Thomas:

- lokale URL: `http://127.0.0.1:3012/ui-modi-entscheidungsmatrix`
- enthält 52 Bewohner-Funktionen
- pro Funktion und pro UI kann Thomas wählen: `Lassen`, `Entfernen`, `Später`, `Ändern`, `Unsicher`
- pro Funktion gibt es ein Notizfeld
- Button `Zusammenfassung kopieren` erzeugt den Text, den Thomas in die nächste Session einfügen soll

Die Seite wurde bewusst nicht als lose unsichere Inline-HTML umgesetzt, weil die CSP Inline-Skripte blockt. Stattdessen:

- `public/ui-modi-entscheidungsmatrix.html`
- `public/ui-modi-entscheidungsmatrix.js`
- `app/ui-modi-entscheidungsmatrix/route.ts` liest beide Dateien und setzt den CSP-Nonce korrekt ein
- `lib/closed-pilot.ts` whitelisted `/ui-modi-entscheidungsmatrix`

## Relevante lokale Commits

- `7ff0c64 docs(ui): add editable generation mode decision matrix`
- `d058891 fix(ui): align senior preview with circle start`
- `e60db8a feat(ui): finish generation mode surfaces`
- `dea14d9 docs(pilot): add print brief draft`
- `3f0460b docs(architecture): add visual system map graphic`

Vor diesen Änderungen war `master` bereits lokal ahead; nicht blind pushen ohne Founder-Go.

## Geänderte Kern-Dateien

UI-Modi:

- `lib/user-modes.ts`
- `components/modes/UserModeSurface.tsx`
- `modules/onboarding/components/OnboardingFlow.tsx`
- `app/(app)/profile/page.tsx`
- `app/(app)/dashboard/page.tsx`
- `app/ui-modes-preview/**`
- `app/senior/preview/page.tsx`

Entscheidungsmatrix:

- `app/ui-modi-entscheidungsmatrix/route.ts`
- `public/ui-modi-entscheidungsmatrix.html`
- `public/ui-modi-entscheidungsmatrix.js`
- `lib/closed-pilot.ts`
- `__tests__/lib/closed-pilot.test.ts`

## Verifikation bisher

Für UI-Modi:

- gezielte Vitest UI-Modi: `51/51`
- Senior-Preview/Kreis-Start: `8/8`
- Playwright-Sichtprobe Desktop/Mobile für `/ui-modes-preview`
- Playwright-Sichtprobe mobil für `/jugend-ui-preview`, `/senior/preview`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

Für Entscheidungsmatrix:

- Playwright auf `http://127.0.0.1:3012/ui-modi-entscheidungsmatrix`
  - HTTP 200
  - 52 Tabellenzeilen
  - je Zeile 4 Auswahlfelder
  - Suche/Filter funktionieren
  - Zusammenfassung wird erzeugt
  - keine Console-Fehler
- `npx vitest run __tests__/lib/closed-pilot.test.ts` grün, 42 Tests
- `npx tsc --noEmit` grün
- `npm run lint` grün
- `npm run build` grün

## Lokaler Server

Der lokale Dev-Server lief zuletzt auf:

`http://127.0.0.1:3012`

Falls er in der neuen Session nicht mehr läuft:

```bash
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
npx next dev --webpack -H 127.0.0.1 -p 3012
```

Warum `--webpack`: Turbopack-Dev hing in dieser Session einmal beim Kompilieren der neuen Preview. Build mit Turbopack war grün.

## Was Thomas in der neuen Session liefern soll

Thomas soll die Seite öffnen, Entscheidungen setzen und dann den erzeugten Text kopieren:

1. `http://127.0.0.1:3012/ui-modi-entscheidungsmatrix` öffnen
2. pro Funktion und UI auswählen
3. Notizen ergänzen
4. `Zusammenfassung kopieren` drücken
5. den kopierten Text in die neue Codex-Session einfügen

## Nächster Umsetzungspfad nach Thomas' Input

Wenn Thomas die Zusammenfassung einfügt:

1. Zusammenfassung parsen und in `docs/plans/` als Entscheidungsstand dokumentieren.
2. Abweichungen gruppieren:
   - reine Sichtbarkeit/Navigationsentscheidungen
   - Copy-/Benennungsänderungen
   - echte Produkt-/Datenrisiken
   - Pilot-0-bewusst-nicht-bauen
3. Codebase-weiten Pre-Check machen, bevor neue Filter/Flags/Routes gebaut werden.
4. Minimalen technischen Plan ableiten:
   - wahrscheinlich `lib/user-modes.ts` erweitern oder neue `mode-feature-visibility` Registry
   - `DiscoverGrid`, Navigation, Dashboard-Fokusleisten, Senior-Start und Jugend-UI daran anbinden
   - Tests zuerst für Sichtbarkeit je Modus
5. Umsetzung lokal, keine DB/Migration/Prod-Aktion ohne Founder-Go.

## Exakter Startprompt für Thomas

Thomas kann in der neuen Session exakt Folgendes schreiben:

```text
Lies bitte zuerst AGENTS.md und dann diese Übergabe:
nachbar-io/docs/plans/handoff/2026-05-15-codex-new-session-handoff-ui-modi-entscheidungsmatrix.md

Ich habe die bearbeitbare UI-Modi-Entscheidungsmatrix unter
http://127.0.0.1:3012/ui-modi-entscheidungsmatrix
ausgefüllt. Hier ist die kopierte Zusammenfassung:

[HIER MEINE ZUSAMMENFASSUNG EINFÜGEN]

Aufgabe:
1. Werte meine Entscheidungen aus.
2. Schreibe daraus einen klaren Umsetzungsplan für Jugend, Aktiv, Komfort und Einfach.
3. Setze die sicheren lokalen UI-Anpassungen autonom um.
4. Keine Prod-DB, keine Migration, kein Deploy und kein Push ohne mein Go.
5. Wenn Entscheidungen widersprüchlich oder riskant sind, markiere sie als Rückfrage statt zu raten.
```

## Falls Thomas noch nicht ausgefüllt hat

Dann soll die neue Session ihn nicht drängen, sondern sagen:

- erst Matrix ausfüllen
- dann `Zusammenfassung kopieren`
- dann den Text senden

Ohne diese Zusammenfassung sollte nicht breit an Sichtbarkeitslogik gebaut werden.
