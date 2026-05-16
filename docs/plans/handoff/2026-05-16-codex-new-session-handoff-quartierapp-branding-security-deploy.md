# Codex an neue Session: QuartierApp Branding, Rechtstexte, Privacy Defaults, Deploy

Datum: 2026-05-16
Autor: Codex
Repo: `nachbar-io`
Branch: `master`
Status: Gepusht, Production deployed, CI/E2E gruen.

## TL;DR

Thomas gab nach App-/Legal-/Security-Review das Go fuer lokale sichere Anpassungen und danach Push + Deploy.

Ergebnis:

- Sichtbares Produktbranding ist auf `QuartierApp` bereinigt.
- Impressum/AGB/Datenschutz/Barrierefreiheit wurden risikoaermer formuliert.
- Sentry Session Replay ist standardmaessig deaktiviert.
- Direkter SMS-/E-Mail-Einladungsversand ist im Pilot ohne explizites Env-Flag blockiert.
- Dashboard-Check-in-Kachel ist nur noch im Senior-Modus prominent; andere Modi zeigen zuerst `Gemeinschaft`.
- Production ist live: `https://nachbar-io.vercel.app/`
- Aktueller Head: `9a1a71e test(e2e): accept current care hub title`

Keine Prod-DB-Schreibaktion, keine Migration, keine RLS-/Secret-/Billing-Aenderung.

## Aktueller Stand

Letzte relevante Commits:

- `6c9d384 fix(app): harden pilot branding and privacy defaults`
  - Branding, Rechtstexte, Sentry Replay Default, Einladungsgating, sichtbare Texte/PDF-Footer, Passkey-RP-Name.
- `e8950ad test(app): align legal and plan branding expectations`
  - Unit-Tests auf neue sichere Rechtsform-/Brandingtexte angepasst.
- `9a1a71e test(e2e): accept current care hub title`
  - E2E-Spot-Check erwartet nun den aktuellen `/care`-Titel `Mein Tag` statt nur altes `Gesundheit`.

Deploy:

- Workflow: `Deploy to Vercel Production`
- Erfolgreicher Run: `25959081021`
- URL: `https://github.com/ClaudeTheo/nachbar-io/actions/runs/25959081021`
- Live-Check: `https://nachbar-io.vercel.app/` -> HTTP 200
- Live-Title: `QuartierApp - Geschlossener Pilot`
- Live-Check ergab: `QuartierApp` vorhanden, sichtbares `Nachbar.io`-Branding auf Landing nicht vorhanden.

CI:

- CodeQL: success fuer Head `9a1a71e`
- E2E Multi-Agent Tests: success fuer Head `9a1a71e`
- Deploy Workflow: success fuer Head `9a1a71e`

Hinweis: In der GitHub-Historie sind zwei fehlgeschlagene aeltere Runs sichtbar. Sie sind bereits abgearbeitet:

- Erster Deploy-Versuch scheiterte an alten Unit-Test-Erwartungen (`Theobase GmbH i.G.` / `Nachbar`-Plan-Namen).
- Ein E2E-Run scheiterte an alter Erwartung `Gesundheit` auf `/care`.
- Beide Ursachen sind mit `e8950ad` und `9a1a71e` gefixt; nachfolgende Runs sind gruen.

## Lokal verifiziert

Vor Push/Deploy:

```bash
npx vitest run __tests__/app/closed-pilot-metadata.test.ts __tests__/pages/quartier-info-vorlesen.test.tsx __tests__/app/marketplace-quartier-copy.test.tsx __tests__/lib/sos/notify-family.test.ts __tests__/lib/auth/passkey.test.ts lib/care/notifications.test.ts modules/care/services/notifications.test.ts
npx tsc --noEmit
npm run lint
npm run build
```

Nach CI-Blocker-Fix:

```bash
npx vitest run __tests__/app/legal-ai-copy.test.tsx lib/__tests__/stripe-config.test.ts
npm run test
```

Ergebnis kompletter lokaler Unit-Testlauf:

- 657 Testdateien passed
- 4755 Tests passed
- 1 skipped

Lokaler Playwright-S5-Test konnte nicht direkt gestartet werden, weil ein bestehender Next-Dev-Server auf Port `3012` lief und die Playwright-Config `3000` starten wollte. Der eigentliche Fix wurde danach ueber GitHub E2E verifiziert: success.

Browser-/Live-Checks:

- Lokal im In-App-Browser: `/`, `/impressum`, `/datenschutz`, `/agb`, `/barrierefreiheit`, `/b2b`
- Live per PowerShell `Invoke-WebRequest`:
  - HTTP 200
  - Title `QuartierApp - Geschlossener Pilot`
  - `QuartierApp` im HTML
  - kein sichtbares `Nachbar.io`-Branding-Match auf Landing

## Wichtig geaenderte Bereiche

### Branding

Sichtbare Produktnamen wurden von `Nachbar.io`/`Nachbar Plus` auf `QuartierApp`/`QuartierApp Plus` umgestellt, u.a.:

- `app/layout.tsx`
- `app/page.tsx`
- `app/b2b/page.tsx`
- `app/b2b/layout.tsx`
- `app/ui-modes-preview/UiModesPreviewClient.tsx`
- `lib/closed-pilot.ts`
- `lib/stripe.ts`
- `lib/services/subscription-check.service.ts`
- diverse Praevention-/Marketplace-/Hilfe-/Kiosk-/PDF-/Notification-Texte
- `lib/auth/passkey.ts` (`rpName: 'QuartierApp'`)

Bewusst belassen:

- technische Domain-/Mail-Infrastruktur wie `nachbar-io.vercel.app`, `@nachbar.io`, Kalender-UIDs und Organizer-Mailadressen.
- interne Code-Kommentare mit historischem Projektnamen, sofern nicht sichtbar oder rechtlich relevant.

### Recht/Compliance Copy

Geaendert:

- `app/impressum/page.tsx`
  - `Paragraf 5 DDG` statt `TMG`
  - altes Datum `27.04.2026` entfernt
  - Rechtsform neutral: `Theobase GmbH befindet sich in Gruendung`
  - Zahlung/USt/Pilot klarer getrennt
- `app/agb/page.tsx`
  - Stand `Mai 2026`
  - Pilot vs. spaetere kostenpflichtige Module klarer
  - alte Pi-Kiosk-Referenzen entfernt
- `app/datenschutz/page.tsx`
  - Sentry Session Replay nur noch als deaktiviert-by-default beschrieben
  - Pi-Kiosk-Referenz neutralisiert
- `app/barrierefreiheit/page.tsx`
  - Konformitaetsbehauptung entschaerft (`weitgehend konform`)
  - Stand `16. Mai 2026`

Grenze:

- Das ist keine anwaltliche Freigabe. Handelsregister-/GmbH-Status, Zahlungsstart, finale Verbraucherinfos und USt-Angaben muessen vor echtem Livebetrieb rechtlich geprueft werden.

### Privacy / Security Defaults

`instrumentation-client.ts`:

- `NEXT_PUBLIC_ENABLE_SENTRY_REPLAY === "true"` aktiviert Replay.
- Ohne Flag:
  - `replaysSessionSampleRate = 0`
  - `replaysOnErrorSampleRate = 0`
  - `Sentry.replayIntegration()` wird nicht geladen.

`components/InviteNeighborModal.tsx` und `lib/services/invitations.service.ts`:

- direkter Versand per SMS/E-Mail nur mit:
  - `INVITE_DIRECT_SEND_ENABLED=true` oder
  - `NEXT_PUBLIC_INVITE_DIRECT_SEND_ENABLED=true`
- sonst: Code/WhatsApp bleiben nutzbar; E-Mail/SMS wird serverseitig abgelehnt.

### UX

`app/(app)/dashboard/page.tsx`:

- Senior-Modus: erste Quick Action bleibt `Check-in` / `Wie geht es Ihnen?`
- andere Modi: erste Quick Action ist `Gemeinschaft` -> `/gruppen`

Vorheriger relevanter Commit:

- `9518dd2 fix(dashboard): gate checkin bubble to senior mode`

## Naechste Session: Startanweisung

1. `AGENTS.md` lesen.
2. Diese Datei lesen.
3. `git status --short --branch` pruefen.
4. Falls Thomas fragt "was nun": Status melden, nicht nochmal deployen.
5. Keine Prod-DB, keine Migration, kein weiterer Deploy/Push ohne neues klares Go.

## Offene Rueckfragen / Risiken

- Juristisch: echter Anwalt sollte Impressum/AGB/Datenschutz/Barrierefreiheit vor breiterer Oeffnung final pruefen.
- Firmenstatus: Sobald Handelsregistereintragung/USt-ID vorliegt, Impressum und Datenschutz aktualisieren.
- Zahlungsfunktionen: Paid-Plans sind textlich als spaeter geplant markiert; vor Aktivierung muessen Preis-, Laufzeit-, Kuendigungs- und Widerrufsinfos final sein.
- Technische Infrastruktur: `nachbar-io.vercel.app` und `@nachbar.io` sind weiterhin als technische Domain/Mailkennung im Code. Wenn die Marke voll auf `QuartierApp` umzieht, braucht es separate Domain-/Mail-/RP-ID-Entscheidung.
- GitHub Annotation: `actions/upload-artifact@v4` nutzt aktuell Node.js 20; GitHub warnt vor Umstellung ab 2026-06-02. Kein akuter Deploy-Blocker, aber Workflow-Pflege einplanen.

## Nicht gemacht

- Keine Datenbankmigration.
- Keine Prod-Supabase-Schreibaktion.
- Keine Secrets-/Billing-Aenderung.
- Keine neue externe Kostenstelle.
- Kein Versuch, Rechtsberatung zu ersetzen.
