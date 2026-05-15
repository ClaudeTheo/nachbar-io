# Pilot 0 Registrierung: Abnahme und Brieftext

Datum: 2026-05-15
Autor: Codex
Scope: Pilot-Abnahme fuer den aktuellen Hausnummer-Code-Flow und drucknaher Arbeitsentwurf fuer Brief/QR. Keine Prod-DB-Schreibaktion, keine Migration, kein Deploy.

## Ergebnis

Der aktuelle Pilot-0-Registrierungsflow ist aus technischer Sicht bereit fuer eine manuelle Founder-Abnahme vor Briefdruck.

Aktuelles Modell:

- Ein bestehender `households.invite_code` pro Haushalt/Hausnummer dient als Hausnummer-Code.
- Erwachsene registrieren sich mit Hausnummer-Code aus dem Brief oder persoenlicher Einladung.
- Jugendliche 14-17 koennen mit Hausnummer-Code eingeschraenkt im Jugendmodus starten.
- Kinder unter 14 werden im Self-Service blockiert und brauchen Eltern-/Betreuerzugang.
- Kein Aushang-Code, keine Ersatzcode-Verwaltung, keine Zahlungs-/Wallet-/Job-Funktion.

## Verifikation 2026-05-15

Read-only Production-Check:

```text
https://nachbar-io.vercel.app/register
STATUS 200
HAS_HAUSNUMMER True
HAS_BRIEF True
HAS_AUSHANG False
```

Lokale gezielte Tests:

```text
npx vitest run __tests__/api/register-complete-bugfix.test.ts __tests__/app/register-entry.test.tsx __tests__/app/register-identity.test.tsx __tests__/lib/registration-service-ai-level.test.ts
4 Testdateien, 45 Tests passed
```

Lokaler Playwright-Copy-Check:

```text
npx playwright test tests/e2e/scenarios/s1-onboarding.spec.ts --config=tests/e2e/playwright.config.ts --project=multi-agent -g "S1.3" --reporter=list
3 passed
```

Hinweis: Es wurden keine echten Production-Registrierungen angelegt.

## Drei manuelle Abnahmetests vor Briefdruck

### Test 1: Erwachsener mit Hausnummer-Code

Ziel: Ein erwachsener Bewohner kann mit dem Brief-Code starten.

Schritte:

1. `/register` oeffnen.
2. "Hausnummer-Code" waehlen.
3. Gueltigen Test-Hausnummer-Code eingeben.
4. Erwachsenes Geburtsdatum verwenden.
5. Registrierung bis zum erwarteten naechsten Schritt durchgehen.

Erwartung:

- Code wird akzeptiert.
- Haushalt/Quartier werden erkannt.
- Kein Text spricht von Aushang.
- Kein Zahlungs- oder KI-Schritt wird erzwungen.

### Test 2: Jugendlicher 14-17 mit Hausnummer-Code

Ziel: Jugendliche koennen einfach starten, aber nur eingeschraenkt.

Schritte:

1. `/register` oeffnen.
2. Hausnummer-Code aus dem Brief nutzen.
3. Geburtsdatum 14-17 Jahre verwenden.
4. Registrierung abschliessen oder bis zur lokalen sicheren Testgrenze durchspielen.

Erwartung:

- Zugang wird nicht pauschal blockiert.
- Nutzer landet im Jugendmodus.
- Basiszugang ohne Zahlungen, sensitive Pflegefelder oder exakte Privatadressen.
- Text macht deutlich: eingeschraenkt und sicher.

### Test 3: Kind unter 14

Ziel: Unter 14 bleibt im Self-Service blockiert.

Schritte:

1. `/register` oeffnen.
2. Hausnummer-Code aus dem Brief nutzen.
3. Geburtsdatum unter 14 Jahre verwenden.

Erwartung:

- Registrierung wird vor Auth-User-Erstellung blockiert.
- Meldung verweist auf Eltern- oder Betreuerzugang.
- Keine harte technische Fehlermeldung.

## Brieftext Arbeitsfassung

### Betreff

Ihr Zugang zur QuartierApp fuer Bad Saeckingen

### Einstieg

Guten Tag,

wir testen in Ihrem Quartier eine einfache digitale Nachbarschaftshilfe fuer Bad Saeckingen. Sie koennen damit Hinweise aus der Umgebung sehen, Hilfe im Alltag besser organisieren und spaeter sicher mit Angehoerigen oder Nachbarn verbunden bleiben.

Der Pilot ist bewusst klein. Er soll zeigen, was im Alltag wirklich hilft und was noch einfacher werden muss.

### Hausnummer-Code

Fuer Ihre Adresse wurde ein Hausnummer-Code vorbereitet:

`{{HAUSNUMMER_CODE}}`

Bitte geben Sie diesen Code bei der Registrierung ein. Der Code ordnet Sie Ihrem Haushalt und Ihrem Quartier zu.

Bitte teilen Sie den Code nicht oeffentlich. Er ist fuer die Menschen in Ihrem Haushalt gedacht.

### Start

1. Oeffnen Sie:
   `{{REGISTRIERUNGS_LINK}}`
2. Waehlen Sie "Hausnummer-Code".
3. Geben Sie den Code aus diesem Brief ein.
4. Folgen Sie den weiteren Schritten.

Optional kann auf dem Brief ein QR-Code stehen, der direkt zur Registrierung fuehrt.

### Jugendliche 14-17

Jugendliche ab 14 Jahren koennen mit dem Hausnummer-Code ebenfalls starten. Sie erhalten einen eingeschraenkten Jugendmodus.

Im Jugendmodus gibt es keine Zahlungen, keine Auszahlungen, keine Wallet und keine Anzeige exakter privater Adressen.

### Kinder unter 14

Kinder unter 14 Jahren koennen sich nicht selbst registrieren. Wenn ein Kind Zugang benoetigt, soll dies ueber einen Eltern- oder Betreuerzugang vorbereitet werden.

### Angehoerige und Senioren

Wenn Sie fuer einen Angehoerigen oder eine Seniorin/einen Senior mitdenken, starten Sie bitte zunaechst mit Ihrem eigenen Zugang. Weitere Verknuepfungen werden nur bewusst eingerichtet und nicht automatisch oeffentlich sichtbar.

### Support

Wenn der Code nicht funktioniert oder Sie unsicher sind, melden Sie sich bitte direkt bei Thomas:

`{{SUPPORT_KONTAKT}}`

Bitte nennen Sie dabei nur Ihre Strasse und Hausnummer, nicht mehr Daten als noetig.

## QR-/Kurztext

Kurzfassung fuer QR-Karte oder Rueckseite:

```text
QuartierApp Bad Saeckingen

1. QR-Code scannen oder Link oeffnen.
2. "Hausnummer-Code" waehlen.
3. Code aus diesem Brief eingeben.

Der Code ist fuer Ihren Haushalt gedacht. Bitte nicht oeffentlich teilen.
Jugendliche ab 14 starten eingeschraenkt im Jugendmodus. Unter 14 bitte ueber Eltern oder Betreuer.
```

## Minimaler Admin-Scope

Muss vor Pilot oder sehr frueh sichtbar sein:

- Haushalte gesamt.
- Haushalte mit mindestens einer Registrierung.
- Haushalte ohne Registrierung.
- Jugendliche im Jugendmodus.
- Support noetig: ja/nein.

Kann spaeter:

- Detailauswertung nach Altersgruppen.
- Export-/Drucklogik.
- Ersatzcode-Verwaltung.
- komplexe Einladungsstatistik.

Bewusst nicht fuer Pilot 0:

- 3 Codes pro Hausnummer.
- oeffentlicher Aushang-Code.
- automatische Code-Rotation.
- Zahlungsstatus.
- Wallet/Coins/Guthaben.
- Job-Marktplatz.

## Offene Entscheidungen fuer Thomas

1. Soll der Brief nur an die ersten Pilotfamilien gehen oder an alle vorbereiteten Haushalte im Testgebiet?
2. Soll der Brief Senioren-/Angehoerigen-Setup jetzt schon erwaehnen oder fuer Pilot 0 bewusst auf Bewohnerzugang fokussieren?
3. Welche Support-Adresse/-Telefonnummer steht final auf dem Brief?

## Claude-Review

Der aktualisierte Review-Auftrag fuer Claude liegt unter:

`docs/plans/handoff/2026-05-15-codex-an-claude-pilot0-hausnummercode-review.md`
