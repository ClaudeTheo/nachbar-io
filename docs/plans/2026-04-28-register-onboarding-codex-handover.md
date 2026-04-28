# Codex-Handover: Register-Onboarding und KI-Hilfe

Datum: 2026-04-28
Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
Branch: `master`
Dev-Server: `http://localhost:3000` laeuft aktuell ueber Node-Prozess `8724`
Browser-Stand: `http://localhost:3000/register/preview/ai-consent`

## Kurzstand

Der Register-Onboarding-Block ist lokal weitergebaut und verifiziert:

- Statische KI-Hilfe-Hinweise pro Register-Schritt sind eingebaut.
- Keine Audio-/TTS-Funktion fuer diese V1.
- Kein LLM-, OpenAI-, Anthropic-, Mistral- oder sonstiger KI-Call fuer die Hinweise.
- Keine neuen Backend-APIs fuer die Tour.
- Keine echten Pilot- oder Personendaten verwendet.
- Lokale Preview-Routen fuer einzelne Onboarding-Schritte sind vorhanden.
- Pilot-Strassen-Suggestions sind lokal verbessert.
- Der nervige Stale-Service-Worker-Effekt in lokaler Entwicklung ist gefixt.
- KI-Einwilligung wurde im UI deutlich strenger gemacht: aktive KI-Stufen brauchen nun eine ausdrueckliche Checkbox.
- Die lokale KI-Consent-Preview ist jetzt hard-blocked: Der Button zeigt nur eine Vorschau-Meldung und sendet keinen Register-/Magic-Link-Request.

## Wichtige Regeln fuer die naechste Session

- Kein Push, kein Deploy, keine Prod-DB.
- Keine echten Pilotdaten und keine echten Personendaten.
- Keine alten untracked Dateien, Logs, `output/` oder `.playwright-cli/` aufraeumen.
- `Link senden` nicht ohne ausdrueckliches Founder-Go klicken.
- V1 der Tour bleibt visuell und statisch: kein TTS, kein LLM, kein Browser Speech.
- Bei DSGVO-/Consent-Themen vorsichtig bleiben: UI ist verbessert, ersetzt aber keine juristische Pruefung.

## Erledigte Commits

```text
HEAD nach Update: fix(register): block submit in local consent preview
42ac818 fix(register): require explicit AI consent confirmation
9a5e81c fix(register): clarify pilot role preview copy
8af5db6 fix(dev): prevent stale service worker on register
fca1e66 feat(register): add local onboarding preview routes
5e625b4 fix(register): keep pilot streets visible
bd0fd45 test(register): cover all pilot street suggestions
af584a3 fix(register): suggest pilot streets from first letter
8e562f6 feat(register): add static KI-help onboarding hints
```

## Was genau erledigt wurde

### 1. Statische KI-Hilfe pro Onboarding-Schritt

Eingebaut wurden ruhige, seniorengerechte Orientierungssaetze pro Register-Schritt. Die Texte sind fest hinterlegt und beschreiben nur, was im jeweiligen Schritt passiert. Es wird keine echte KI-Aktivitaet behauptet.

Relevante Datei:

- `lib/ki-help/register-tour-content.ts`

Wiederverwendete Patterns/Komponenten:

- `components/ki-help/KiHelpPulseDot.tsx`
- bestehende Register-Step-Struktur
- bestehende Tests fuer Register-Flow

### 2. Pilot-Strassen-Suggestions

Die lokale Strassensuche wurde so angepasst, dass schon der erste Buchstabe die Pilot-Strassen vorschlagen kann. Beispiel: `P` zeigt `Purkersdorfer Strasse`.

Es sind insgesamt 3 Pilot-Strassen im Test-/Preview-Kontext abgedeckt. Die Suggestions bleiben sichtbar und verschwinden nicht wieder durch stale UI.

### 3. Lokale Preview-Routen

Es gibt nun lokale Vorschau-URLs fuer einzelne Register-Schritte:

- `/register/preview/identity`
- `/register/preview/pilot-role`
- `/register/preview/ai-consent`

Diese Vorschau nutzt Testdaten wie `test.person@example.invalid`. In Production fallen die Routen auf die normale Register-Seite zurueck.

Wichtig: Die sichtbaren Preview-Sprungbuttons wurden wieder entfernt, weil sie im UI verwirrt haben.

### 4. Service Worker in lokaler Entwicklung

Ursache fuer das zeitweise kaputte Verhalten war ein alter Service Worker, der lokale Next-Assets und Seiten gecacht hat. Dadurch kamen stale Bundles und alte UI-Zustaende zurueck.

Fix:

- In lokaler Entwicklung wird der Service Worker deregistriert.
- Lokale `nachbar-io`-Caches werden entfernt.
- Fetch-Handling wird auf lokalen Dev-Hosts umgangen.

Relevante Dateien:

- `components/ServiceWorkerRegistration.tsx`
- `public/sw.js`

### 5. Founder-Kommentare auf Pilot-Rolle umgesetzt

Umgesetzt:

- Preview-Sprungbuttons aus dem sichtbaren UI entfernt.
- KI-Hilfe-Text fuer Rollenwahl klarer formuliert.
- Rolle `Ich teste nur` in `Ich probiere nur testweise` geaendert.
- Beschreibung erklaert jetzt klarer den Unterschied zur echten Nutzung.
- Sichtbare Umlaute in Register-Rollen/Adresse/Identity korrigiert.

Neuer KI-Hinweis fuer Rollenwahl:

```text
Hier waehlen Sie, wie Sie teilnehmen: fuer sich selbst, als Unterstuetzung fuer jemanden, als Hilfe im Quartier oder nur testweise.
```

### 6. DSGVO-sensibler KI-Consent verbessert

Auf dem KI-Consent-Schritt wurde ein sichtbarer Datenschutzblock ergaenzt:

- KI-Hilfe ist freiwillig.
- Einwilligung kann spaeter widerrufen werden.
- Link zur Datenschutzerklaerung: `/datenschutz`
- Fuer aktive KI-Stufen `Basis` und `Alltag` ist eine explizite Checkbox erforderlich.
- Button bleibt fuer `Basis`/`Alltag` deaktiviert, bis die Checkbox gesetzt ist.
- `Aus` und `Spaeter entscheiden` bleiben ohne Checkbox moeglich.
- `Persoenlich (spaeter)` bleibt deaktiviert.

Wichtige Aussage fuer Founder-Frage "Link senden geht oder nicht":

- Technisch ja.
- Bei `Basis`/`Alltag` erst nach Auswahl plus Einwilligungs-Checkbox.
- Bei `Aus`/`Spaeter entscheiden` direkt.
- In der Preview waere nur Test-Mail `test.person@example.invalid` gesetzt.
- Trotzdem nicht ohne ausdrueckliches Founder-Go klicken, weil es ein echter Submit des Register-Formulars sein kann.

Nachtraegliches Sicherheits-Update in dieser Session:

- In der lokalen Preview `/register/preview/ai-consent` ist `Link senden` nun technisch blockiert.
- Nach Klick erscheint nur: `Vorschau: Es wird kein Link gesendet und keine Registrierung gespeichert.`
- Es wird kein `/api/register/complete` Request ausgeloest.
- Die echte Register-Seite bleibt unveraendert und kann nach Founder-Go weiterhin normal absenden.

## Tests und Verifikation

Ausgefuehrt und bestanden:

```text
npx vitest run __tests__/app/register-ai-consent.test.tsx
npx vitest run __tests__/app/register-ai-consent.test.tsx __tests__/app/register-page-dev-preview.test.tsx __tests__/app/register-pilot-role.test.tsx __tests__/lib/ki-help/register-tour-content.test.ts __tests__/app/register-page-ki-help-hint.test.tsx
npx eslint 'app/(auth)/register/components/RegisterStepAiConsent.tsx' '__tests__/app/register-ai-consent.test.tsx'
npx eslint 'app/(auth)/register/components/RegisterStepAiConsent.tsx' 'app/(auth)/register/preview/RegisterPreviewForm.tsx' '__tests__/app/register-page-dev-preview.test.tsx'
npx tsc --noEmit
```

Ergebnisse:

- AI-Consent-Test: 15 passed.
- Breiter Register/KI-Hilfe-Testblock nach Preview-Submit-Block: 32 passed.
- ESLint: passed.
- TypeScript: passed.

Browser-Verifikation:

- `/register` oeffnet lokal.
- `P` zeigt `Purkersdorfer Strasse`.
- `/register/preview/pilot-role` zeigt keine sichtbaren Preview-Sprungbuttons mehr.
- Rollen- und KI-Hilfe-Texte sind klarer.
- `/register/preview/ai-consent` zeigt Datenschutzblock, Widerrufshinweis, Datenschutz-Link und Checkbox.
- Button fuer `Alltag` bleibt vor Checkbox disabled.
- In `/register/preview/ai-consent`: Auswahl `Aus` plus Klick auf `Auswahl speichern und Link senden` zeigt die Vorschau-Block-Meldung und bleibt auf der Preview-Seite.
- Keine neuen Console-Errors bei der Pruefung.

## Aktueller Git-Status

Vor dieser Handover-Datei waren nur alte/unrelated untracked Dateien sichtbar:

- diverse `.codex-*.log` Dateien
- `.playwright-cli/`
- alte untracked Dokumente in `docs/plans/`
- `output/`
- einzelne alte Scripts

Diese Dateien nicht aufraeumen und nicht versehentlich in einen Commit ziehen.

Diese Handover-Datei wurde nach dem Preview-Submit-Block aktualisiert. Nur gezielt adden/committen, keine alten untracked Dateien mitnehmen.

## Offene Punkte

1. Entscheiden, ob Preview-Routen langfristig bleiben oder noch staerker hinter einem lokalen/dev Flag versteckt werden.
2. Juristische Pruefung der DSGVO-/KI-Einwilligungstexte einplanen.
3. Pruefen, ob Consent-Version, Consent-Copy und Audit-Details backendseitig spaeter noch genauer gespeichert werden muessen.
4. Spaeter fuer echte Adresssuche Deutschland/Schweiz eine saubere externe Datenquelle/API nur nach Lizenz- und DSGVO-Pruefung auswaehlen.

## Empfohlener naechster Schritt

Wenn die naechste Session direkt weitermacht:

1. Diese Datei lesen.
2. `git status --short` pruefen.
3. Dev-Server auf `http://localhost:3000` weiterverwenden oder neu starten.
4. Im Browser bei `/register/preview/ai-consent` weitermachen.
5. Weiter mit UI/DSGVO-Review oder naechstem Register-Feinschliff.
