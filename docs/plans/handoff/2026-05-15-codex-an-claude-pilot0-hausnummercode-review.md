# Codex an Claude: Pilot 0 Hausnummer-Code Review

Datum: 2026-05-15
Autor: Codex
Ziel: Claude soll die operative Pilotfaehigkeit des aktuellen Registrierungsmodells pruefen. Der alte Review-Brief vom 2026-05-14 ist in einem Punkt ueberholt: "3 Codes pro Hausnummer plus Ersatzcodes" ist NICHT mehr der aktuelle Vorschlag.

## Kurzstatus

Aktueller Live-Stand fuer `nachbar-io`:

- Production: `https://nachbar-io.vercel.app`
- Live-Commit: `293f177792c621679843759e46b3eafc68cbc1f1`
- Production-Deploy-Run: `https://github.com/ClaudeTheo/nachbar-io/actions/runs/25883663907`
- Deploy, E2E und CodeQL fuer den Live-Commit sind gruen.
- Read-only Live-Check am 2026-05-15: `/register` liefert 200, enthaelt "Hausnummer-Code" und "Brief", enthaelt NICHT "Aushang".

## Nicht mehr aktuell

Bitte NICHT mehr vom alten Modell ausgehen:

- Keine "3 Codes pro Hausnummer".
- Keine Ersatzcode-/Mehrfachcode-Inventarlogik.
- Kein oeffentlicher Aushang-Code.
- Keine neue Migration 198 fuer Pilot-Haushaltscodes.

Diese Variante wurde bewusst verworfen, weil sie fuer Pilot 0 zu komplex ist.

## Aktuelles Modell

Fuer Pilot 0 gilt jetzt:

1. Pro Haushalt/Hausnummer wird der bestehende `households.invite_code` als Hausnummer-Code verwendet.
2. Erwachsene nutzen den Hausnummer-Code aus dem Brief oder eine persoenliche Einladung.
3. Jugendliche von 14 bis 17 koennen mit dem Hausnummer-Code sofort starten, aber nur eingeschraenkt im Jugendmodus.
4. Kinder unter 14 koennen sich nicht selbst registrieren. Sie brauchen einen Eltern- oder Betreuerzugang.
5. Es gibt keine Zahlungen, keine Wallet, keine Coins, keine IBAN, keine Auszahlung, keinen Job-Marktplatz.
6. Der Hausnummer-Code soll nicht oeffentlich geteilt werden.

## Technischer Stand

Relevante Dateien:

- `lib/services/registration.service.ts`
- `app/(auth)/register/components/RegisterStepEntry.tsx`
- `app/(auth)/register/components/RegisterStepInvite.tsx`
- `app/(auth)/register/components/RegisterStepIdentity.tsx`
- `__tests__/api/register-complete-bugfix.test.ts`
- `__tests__/app/register-entry.test.tsx`
- `__tests__/app/register-identity.test.tsx`
- `tests/e2e/scenarios/s1-onboarding.spec.ts`

Wichtige Regeln im Code:

- `MIN_YOUTH_SELF_REGISTRATION_AGE = 14`
- 14-17 bekommt `ui_mode = "youth"`
- 14-17 bekommt `youth_profiles.access_level = "basis"`
- Unter 14 wird vor Auth-User-Erstellung blockiert.
- Jugendliche koennen nicht per manueller Adressregistrierung starten.
- Jugendlichen-Settings dokumentieren die Basis-Restriktionen:
  - `basis_access_only`
  - `no_payments`
  - `no_sensitive_care_data`
  - `no_exact_private_addresses`

## Verifikation durch Codex

Am 2026-05-15 lokal/read-only geprueft:

```text
Production /register:
STATUS 200
HAS_HAUSNUMMER True
HAS_BRIEF True
HAS_AUSHANG False

npx vitest run __tests__/api/register-complete-bugfix.test.ts __tests__/app/register-entry.test.tsx __tests__/app/register-identity.test.tsx __tests__/lib/registration-service-ai-level.test.ts
4 Testdateien, 45 Tests passed

npx playwright test tests/e2e/scenarios/s1-onboarding.spec.ts --config=tests/e2e/playwright.config.ts --project=multi-agent -g "S1.3" --reporter=list
3 passed
```

Hinweis: Der Playwright-Lauf nutzte lokale Testumgebung. Der Production-Check war read-only. Es wurden keine echten Registrierungen in Production erzeugt.

## Bitte Claude jetzt pruefen

Bitte bewerte NICHT mehr das Family-/QR-Code-Modell mit 3 Codes. Bitte bewerte den aktuellen Pilot-0-Vorschlag:

### 1. Verdict

Ist dieses Modell fuer Bad Saeckingen Pilot 0:

- pilotfaehig,
- pilotfaehig mit Bedingungen,
- oder noch nicht pilotfaehig?

Bitte kurz begruenden.

### 2. Top-5-Risiken vor Briefdruck

Bitte priorisiere die wichtigsten Risiken, speziell:

- Missverstaendnis "ein Code pro Haushalt/Hausnummer".
- Weitergabe des Codes ausserhalb des Haushalts.
- Jugendliche 14-17 starten ohne vorgeschaltete Elternbestaetigung, aber eingeschraenkt.
- Unter-14-Blockade muss fuer Familien verstaendlich sein.
- Support-Aufwand fuer falsche Hausnummer, verlorenen Brief, geteilten Code.
- DSGVO-/Vertrauensrisiken bei Kinder-, Senioren- und Angehoerigen-Verknuepfungen.

### 3. Code-/Brief-Operationalisierung

Bitte schlage den einfachsten Ablauf fuer Pilot 0 vor:

- Wie kommt der Code in den Brief?
- Was steht auf dem Brief?
- Wie wird erklaert, wer den Code nutzen darf?
- Was tun Familien, wenn der Code nicht funktioniert?
- Wie behandeln wir "Code versehentlich geteilt" ohne neues Ersatzcode-System?

### 4. Minimaler Admin-Dashboard-Scope

Bitte keinen grossen Admin-Baukasten vorschlagen. Gesucht ist der kleinste Scope, der Thomas vor und waehrend Pilot 0 wirklich hilft.

Bitte bewerten, ob diese Felder reichen:

- Haushalte gesamt.
- Haushalte mit erster Registrierung.
- Erwachsene Bewohner.
- Jugendliche im Jugendmodus.
- Haushalte ohne Registrierung.
- Status "Support noetig".
- Freitext-Notiz pro Haushalt, falls schon vorhandene Infrastruktur adaptierbar ist.

Bitte klar markieren: Muss jetzt, kann spaeter, bewusst nicht bauen.

### 5. Verbindliche Formulierungen

Bitte liefere drucknahe Formulierungen fuer:

- Brief-Einstieg.
- Erklaerung Hausnummer-Code.
- Hinweis "nicht oeffentlich teilen".
- Jugendliche 14-17.
- Kinder unter 14.
- Angehoerige/Senioren-Setup, falls im selben Brief erwaehnt.
- Support-Hinweis.

Ton: Siezen, ruhig, sachlich, kein Startup-Hype.

### 6. Bewusst nicht bauen fuer Pilot 0

Bitte explizit bestaetigen oder korrigieren:

- Keine 3-Codes-pro-Hausnummer-Logik.
- Keine Ersatzcode-Verwaltung.
- Kein oeffentlicher Aushang-Code.
- Kein Payment.
- Kein Job-Marktplatz.
- Keine Wallet/Coins/Guthaben.
- Kein automatisches Teilen exakter Privatadressen.
- Kein KI-Feature mit personenbezogenen Daten vor AVV/DPA-Freigabe.

## Erwarteter Output von Claude

Bitte schreibe eine Antwort unter:

`docs/plans/handoff/2026-05-15-claude-an-codex-pilot0-hausnummercode-review.md`

Gewuenschtes Format:

1. Verdict: pilotfaehig / mit Bedingungen / noch nicht.
2. Top-5-Risiken.
3. Operativer Ablauf fuer Brief + Code.
4. Minimaler Admin-Dashboard-Scope.
5. Verbindliche Brief-/Onboarding-Texte.
6. Drei Entscheidungsvorlagen fuer Thomas.
7. Was fuer Pilot 0 bewusst nicht gebaut wird.

## Rote Gates

Bitte keine Prod-DB-Schreibaktion, keine Migration, kein Deploy, keine Vercel-Env-/Secrets-Aenderung und keine Payment-/Provider-Live-Aktion ohne ausdrueckliches Founder-Go.
