# Codex New-Session-Handover nach Terminal-Haertung W3aw-W3ay

Datum: 2026-05-08 abend

## Fuer die naechste Session zuerst ausfuehren/lesen

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content -Raw AGENTS.md
Get-Content -Raw docs\plans\handoff\INBOX.md
Get-Content -Raw docs\plans\handoff\2026-05-08-codex-new-session-handover-after-terminal-hardening-w3aw-w3ay.md
Get-Content -Raw docs\plans\2026-05-08-terminal-foto-url-id-haertung-w3aw.md
Get-Content -Raw docs\plans\2026-05-08-terminal-sticky-ack-id-haertung-w3ax.md
Get-Content -Raw docs\plans\2026-05-08-terminal-reminder-datumsstring-haertung-w3ay.md
Get-Content -Raw "C:\Users\thoma\Documents\New project\firmen-gedaechtnis\06_KI-Zusammenarbeit\Uebergabe-an-naechste-Codex-Session-2026-05-08-Pilot-Akquise-Material.md"
```

## Rote Gates

Direkte Founder-Anweisung aus dieser Session hat Vorrang:

- Kein Push.
- Kein Deploy.
- Keine Prod-DB-Schreibaktion.
- Keine Prod-Migration.
- Keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.
- Stripe/Billing bleibt bis zur GmbH wartend.
- Bekannte untracked Altdateien nicht anfassen.

Wichtig: Aeltere AGENTS/Vault-Hinweise sprechen teils von Push/Deploy-Autonomie.
In dieser Session gilt explizit: kein Push/Deploy ohne neuen Founder-GO-Satz.

## Aktueller lokaler Stand

- Branch: `master`
- Status vor diesem Handover: `master...origin/master [ahead 140]`.
- Kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing gemacht.
- Arbeitsbaum vor diesem Handover hatte nur bekannte untracked Altdateien:
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\.codex-welle-d-3001.pid`
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-04-quartier-info-skalierung-auto-first.md`
  - alte `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-03-*` / `2026-05-04-*` Founder-/Claude-Handdateien

## Letzte relevante Commits

- `a59e323 fix(terminal): trim reminder date strings`
- `f9a7434 docs(handoff): claim terminal reminder date hardening`
- `d60e9bd fix(terminal): trim sticky ack ids`
- `9c25a11 docs(handoff): claim terminal sticky ack id hardening`
- `a89a705 fix(terminal): trim photo urls`
- `f24935e docs(handoff): claim terminal photo url hardening`
- `0ba1c54 docs(handoff): save terminal hardening w3ar w3av state`
- `0f54505 docs(handoff): claim terminal hardening handover w3ar w3av`

## Erledigt in W3aw

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\FamilienFotosScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\ScreensaverOverlay.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalDeviceListGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-08-terminal-foto-url-id-haertung-w3aw.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- Foto-URLs aus `/api/device/photos` werden in `FamilienFotosScreen` und
  `ScreensaverOverlay` vor `img src` getrimmt.
- RED zeigte vorher `src="  /familie.jpg  "` statt `src="/familie.jpg"`.

Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
npx eslint components\terminal\screens\FamilienFotosScreen.tsx components\terminal\ScreensaverOverlay.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

## Erledigt in W3ax

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\ErinnerungenScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-08-terminal-sticky-ack-id-haertung-w3ax.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- Sticky-IDs werden in der bestehenden `ErinnerungenScreen`-Normalisierung
  getrimmt.
- Klick auf Abhaken sendet `reminderId: "sticky-spaced"` statt
  `"  sticky-spaced  "` an `/api/device/reminder-ack`.

Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint components\terminal\screens\ErinnerungenScreen.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

## Erledigt in W3ay

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\ErinnerungenScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\AppointmentPopup.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-08-terminal-reminder-datumsstring-haertung-w3ay.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- Reminder-/Popup-Datumsstrings mit Rand-Leerzeichen werden als valide erkannt
  und getrimmt in State uebernommen.
- RED zeigte vorher, dass JavaScript `new Date("  2026-05-07T10:00:00.000Z  ")`
  als `Invalid Date` behandelt und valide API-Daten dadurch verworfen wurden.

Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint components\terminal\screens\ErinnerungenScreen.tsx components\terminal\AppointmentPopup.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnis der letzten breiten W3ay-Verifikation:

- gezielte und angrenzende Terminal-Vitest: 19 Tests gruen.
- gezieltes ESLint gruen.
- `git diff --check` gruen.
- `npx tsc --noEmit` gruen.
- `npm run build` gruen.

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert` ist erwartetes
  lokales Verhalten.

## Claude-/Vault-Hinweis 2026-05-08

Claude hat heute eine strategische Pilot-Akquise-Welle im Vault abgelegt, nicht
im Repo:

```text
C:\Users\thoma\Documents\New project\firmen-gedaechtnis\06_KI-Zusammenarbeit\Uebergabe-an-naechste-Codex-Session-2026-05-08-Pilot-Akquise-Material.md
```

Kernaussage:

- Reine Strategie-/Marketing-Welle, kein Code-Auftrag.
- Codex soll dazu nichts aktiv tun.
- Keine Marketingtexte ueberschreiben oder zusammenlegen ohne Founder-Go.
- Keine Multiplikator-Adressen verwenden, weitergeben oder anrufen.
- Cockpit liegt im Vault:
  `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\02_Projekte\Pilot-Readiness-Nachbar-io.md`.
- Memory-Pointer:
  `C:\Users\thoma\.claude\projects\C--Users-thoma-Claud-Code-Handy-APP\memory\project_pilot_akquise_strategie.md`.

Die dortige Pflichtliste vor erster echter Pilot-Familie nennt u.a.:

1. F-6-CSP-Welle gepusht + deployt.
2. Mig 188 Prod-Apply mit Founder-Go `MIGRATION-PROD-GO-188`.
3. OSM-POI-Cron-Schedule scharf mit Founder-Go.
4. HR-Eintragung GmbH.
5. AVV Anthropic + Mistral.
6. Vercel-Prod `NEXT_PUBLIC_PILOT_MODE=true` synchron zu `PILOT_MODE`.
7. AI-Test-User-Cleanup.
8. Mind. 5 Pilot-Familien zugesagt.
9. Erstgespraech + schriftliches Briefing je Familie.

Wichtig fuer die naechste Codex-Session: Punkte 1-3/7 sind technisch relevant,
aber in dieser Session war Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing
explizit ohne Founder-Go gesperrt.

## Naechste sinnvolle Kandidaten

Nur mit Pre-Check und echtem RED-Test anfassen:

1. Weitere Terminal-Fetch-Pfade auf echte Aktions-/Render-Fehler durch
   ungetrimmte IDs/URLs/Datumsstrings pruefen. Nicht mechanisch refactoren.
2. Dashboard-Fehleranzeige nur anfassen, wenn ein echter Runtime-Pfad
   nicht-string `error` in `TerminalPage` einspeisen kann.
3. F-6-CSP-Push/Deploy nur wenn Thomas in der Session explizit Push/Deploy-GO
   gibt. Ohne GO nicht starten.
4. Mig 188 Prod-Apply nur mit exakt neuem Founder-Go-Satz
   `MIGRATION-PROD-GO-188`.
5. OSM-POI-Cron-Schedule nur mit ausdruecklichem Founder-Go.

## Copy-Paste fuer Thomas

```text
Codex -> neue Session: bitte im Projekt C:\Users\thoma\Claud Code\Handy APP\nachbar-io weitermachen. Zuerst git status -sb, git log --oneline origin/master..HEAD, AGENTS.md, docs\plans\handoff\INBOX.md und docs\plans\handoff\2026-05-08-codex-new-session-handover-after-terminal-hardening-w3aw-w3ay.md lesen. Danach auch Claudes Vault-Hinweis lesen: C:\Users\thoma\Documents\New project\firmen-gedaechtnis\06_KI-Zusammenarbeit\Uebergabe-an-naechste-Codex-Session-2026-05-08-Pilot-Akquise-Material.md

Kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing ohne Founder-GO. Stripe/Billing bleibt bis zur GmbH wartend. Bekannte untracked Altdateien nicht anfassen.

Aktueller lokaler Stand: master ist nach Handover voraussichtlich ahead 141 gegen origin/master. Zuletzt erledigt: W3aw-W3ay Terminal-Haertung mit Pre-Check, TDD RED/GREEN, Vitest/ESLint/tsc/build gruen; ausserdem Claudes Vault-Akquise-Uebergabe gelesen. Naechste sinnvolle Kandidaten: nur echte RED-Faelle weiterhaerten oder mit explizitem Founder-Go F-6-CSP Push/Deploy, Mig 188 Prod-Apply bzw. OSM-Cron angehen.
```
