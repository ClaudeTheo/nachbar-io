# Kiosk Route-Group Deprecation Pre-Check

Stand: 2026-04-27

Arbeitsverzeichnis:

`C:\Users\thoma\Claud Code\Handy APP\nachbar-io`

## Anlass

Pi 5 / Hardware-Kiosk ist retired. Der Ordner `raspberry-pi/` wurde separat entfernt in Commit:

- `f08381b chore(cleanup): remove raspberry-pi/ folder (Pi 5 retired)`

Danach bleibt die Frage offen, ob die Web-Route-Group `app/(kiosk)/kiosk/*` ebenfalls deprecated oder entfernt werden soll.

## Kurzbefund

`/api/kiosk/companion` ist nicht isoliert tot. Die Route wird von `app/(kiosk)/kiosk/companion/page.tsx` genutzt und haengt an einer groesseren Kiosk-Weboberflaeche. Diese Route-Group ist seit Pi-5-Retirement ohne klaren aktiven Geraetekonsumenten, wurde aber zuletzt weiterhin von Next mitgebaut.

Der Senior-App-Stufe-1-Wrapper zielt auf `app/(senior)/*`, nicht auf `app/(kiosk)/*`.

## Code-Funde

| Bereich | Fundstellen | Einordnung | Risiko |
|---|---|---|---|
| Kiosk-Web-UI | `app/(kiosk)/kiosk/**` | eigene Route-Group mit Dashboard, Companion, Radio, News, Health, Sprechstunde, Spiele, Treffpunkt, Brett, Pflege-Ratgeber | mittel bis hoch, weil viele Seiten und UX-Flows |
| Companion API | `app/api/kiosk/companion/route.ts`, Caller in `app/(kiosk)/kiosk/companion/page.tsx` | KI-Begleiter fuer Kiosk-UI, nutzt Memory-Kontext | nicht isoliert entfernen |
| Kiosk TTS API | `app/api/kiosk/tts/route.ts`, Caller in `app/(kiosk)/kiosk/companion/page.tsx` | eigener TTS-Pfad innerhalb Kiosk | separat pruefen |
| Kiosk Login | `app/api/kiosk/login/route.ts`, `app/(kiosk)/kiosk/login/page.tsx`, `app/(kiosk)/kiosk/confirm/page.tsx` | QR/PIN Login, `kiosk_user_id` in localStorage | gemeinsamer Schnitt mit Kiosk-Group |
| Kiosk PIN Helper | `lib/kiosk-pin.ts`, `lib/__tests__/kiosk-pin.test.ts` | Helper fuer `users.settings.kiosk_pin` | erst entfernen, wenn Login/PIN-UI weg ist |
| Kiosk Notfallprofil | `app/api/care/emergency-profile/kiosk/route.ts`, `__tests__/api/emergency-profile-kiosk.test.ts`, `__tests__/integration/speed-dial-sos.test.ts` | SOS-/Notfallprofil-Read | behalten, bis Notfallpfad separat bewertet ist |
| Caregiver Kiosk-Inhalte | `app/(app)/care/kiosk/page.tsx`, `modules/care/components/kiosk/*`, `app/api/caregiver/kiosk-*` | Angehoerige schicken Foto/Erinnerung an Senior-Kiosk | nicht Teil des Companion-Cleanup |
| Terminal | `app/terminal/[token]/*`, `components/terminal/*`, `lib/terminal/*`, `e2e/kiosk-videochat.spec.ts` | alter/weiterer Terminal-Stack, nicht identisch mit `app/(kiosk)` | separat behandeln |
| Archivdoku | `docs/plans/archive/2026-03-13-rpi-senior-terminal-*`, `docs/plans/archive/2026-04-14-browser-route-audit.md` | Historie | behalten |

## Empfehlung

Nicht `/api/kiosk/companion` isoliert entfernen.

## Founder-Entscheidung

Thomas hat am 2026-04-27 Option 2 gewaehlt:

**Deprecation ohne Entfernung.**

Der alte Web-Kiosk bleibt im Code, wird aber als geparkt behandelt. Es werden keine Kiosk-Routen, APIs, Notfallpfade, Caregiver-Kiosk-Funktionen oder Terminal-Dateien geloescht. Der Fokus geht zurueck auf den Nachbar.io-Pilot.

Die geprueften Alternativen waren:

1. **Behalten fuer spaeter**
   - kein Code-Diff
   - Vorteil: kein Risiko fuer bestehende Tests/Flows
   - Nachteil: Altlast bleibt in Build und Code-Navigation

2. **Deprecation ohne Entfernung**
   - interne Doku + ggf. Kommentar/Banner in Kiosk-Einstieg
   - optional Tests als Legacy markieren
   - Vorteil: klare Produktentscheidung ohne grosser Schnitt
   - Nachteil: Code bleibt noch erhalten

3. **Route-Group gezielt entfernen**
   - separater Implementierungsplan
   - Reihenfolge:
     1. Kiosk-Web-UI `app/(kiosk)/kiosk/**`
     2. `app/api/kiosk/{companion,tts,login}`
     3. `lib/kiosk-pin.ts` + Tests
     4. danach gesondert pruefen: `app/api/care/emergency-profile/kiosk`, Caregiver-Kiosk, Terminal
   - Vorteil: echter Cleanup
   - Nachteil: groesserer Schnitt, Build/Test-Risiko

## Stop-Zonen

- Kein Push.
- Kein Deploy.
- Keine Prod-DB.
- Keine Secrets.
- Kein Loeschen von Notfall-, Caregiver- oder Terminal-Code ohne eigene Pre-Checks.

## Naechster sinnvoller Codex-Auftrag

Wenn Founder Option 2 oder 3 will:

1. Vorher `git status --short --branch`.
2. Erneuter `git grep` auf `app/(kiosk)`, `/api/kiosk`, `kiosk_pin`, `kiosk_user_id`, `emergency-profile/kiosk`, `app/terminal`, `modules/care/components/kiosk`.
3. Bei Option 3 erst Testliste erstellen, dann klein schneiden und nach jedem Schnitt `npx tsc --noEmit` plus relevante Tests laufen lassen.
