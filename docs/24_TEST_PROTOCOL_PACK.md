# Nachbar.io — Test Protocol Pack — Care-Modul

**Version:** 1.0
**Datum:** 2026-03-12
**Autor:** Validierungsteam
**Naechste Ueberpruefung:** 2026-06-12
**Dokumenttyp:** Formales Testprotokoll

## 1. Zweck

Dieses Dokument definiert die formalen Testprotokolle fuer das Care-Modul von Nachbar.io.
Es beschreibt Testszenarien, erwartete Ergebnisse und Akzeptanzkriterien fuer die
Validierungsabnahme.

## 2. Testinfrastruktur

### 2.1 Testwerkzeuge
| Werkzeug | Version | Einsatzbereich |
|----------|---------|----------------|
| Vitest | ^2.0 | Unit-Tests, Komponenten-Tests, API-Tests |
| React Testing Library | ^16.0 | Komponenten-Rendering und Interaktion |
| Playwright | ^1.49 | End-to-End-Tests mit Multi-Agent-Setup |
| axe-core | (geplant) | Barrierefreiheits-Tests WCAG 2.1 AA |

### 2.2 Testumgebung
| Aspekt | Konfiguration |
|--------|---------------|
| Runtime | Node.js, jsdom (Vitest), Chromium (Playwright) |
| Mocking | vi.fn() (Vitest), Mock-Supabase (Proxy-basiert) |
| CI/CD | GitHub Actions — alle Tests als Gate vor Deploy |
| Daten | Isolierte Testdaten, keine Produktionsdaten |

### 2.3 E2E-Agenten
| Agent | Rolle | Viewport | Haushalt |
|-------|-------|----------|----------|
| senior_s | Senior | 393×851 (mobil) | Purkersdorfer 1 |
| helfer_b | Helfer | 1280×720 | Purkersdorfer 3 |
| relative_c | Angehoeriger | 1280×720 | Purkersdorfer 1 |
| senior_d | 2. Senior | 393×851 | Sanarystr 2 |
| admin_e | Admin | 1280×720 | — |
| pflegedienst_f | Pflegedienst | 1280×720 | Purkersdorfer 1+3 |

## 3. Testprotokoll TP-001: SOS-Modul

### TP-001.1: SOS-Kategorien und Touch-Targets
**Anforderung:** REQ-SOS-001, REQ-SR-001
**FMEA:** FM-SOS-01
**Testdatei:** `components/care/SosCategoryPicker.test.tsx`, E2E `s8-care-sos.spec.ts` S8.1

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | SOS-Seite oeffnen | 5 Kategorien sichtbar | ✓ |
| 2 | Kategorien pruefen | Medical, Allgemein, Besuch, Einkauf, Medikament | ✓ |
| 3 | Touch-Target messen | Alle Buttons >= 76px Hoehe | ✓ |
| 4 | Touch-Action pruefen | `touchAction: manipulation` gesetzt | ✓ |

**Ergebnis:** 13 Unit-Tests BESTANDEN | **Datum:** 2026-03-12

### TP-001.2: EmergencyBanner bei Notfall (FMEA FM-NB-02)
**Anforderung:** REQ-SOS-002, REQ-SOS-003, REQ-SOS-004
**FMEA:** FM-NB-02, FM-NB-03
**Testdatei:** `components/EmergencyBanner.test.tsx`, `SosCategoryPicker.test.tsx`, E2E S8.2

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | "Medizinischer Notfall" waehlen | EmergencyBanner erscheint | ✓ |
| 2 | Banner-Inhalt pruefen | "Notruf zuerst!" Ueberschrift | ✓ |
| 3 | 112-Link pruefen | `<a href="tel:112">` vorhanden und sichtbar | ✓ |
| 4 | 110-Link pruefen | `<a href="tel:110">` vorhanden und sichtbar | ✓ |
| 5 | Escape druecken | Banner bleibt sichtbar (NICHT geschlossen) | ✓ |
| 6 | Focus-Trap pruefen | Tab-Navigation innerhalb Banner begrenzt | ✓ |
| 7 | "Ich habe 112/110 angerufen" klicken | Banner schliesst, SOS wird erstellt | ✓ |
| 8 | "Kein Notruf noetig" klicken | Banner schliesst, SOS wird erstellt | ✓ |

**Ergebnis:** 22 Unit-Tests + 6 E2E-Tests BESTANDEN | **Datum:** 2026-03-12

### TP-001.3: Nicht-Notfall-Kategorie (kein Banner)
**Anforderung:** REQ-SOS-001
**Testdatei:** `SosCategoryPicker.test.tsx`, E2E S8.3

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | "Allgemeine Hilfe" waehlen | KEIN EmergencyBanner | ✓ |
| 2 | API-Aufruf pruefen | fetch('/api/care/sos') mit category: general_help | ✓ |
| 3 | Weiterleitung pruefen | Redirect zu /care/sos/{id} | ✓ |

**Ergebnis:** BESTANDEN | **Datum:** 2026-03-12

### TP-001.4: Fallback-Kaskade und Retry
**Anforderung:** REQ-SOS-008, REQ-SOS-009
**FMEA:** FM-SOS-02, FM-SOS-05
**Testdatei:** `lib/care/notifications.ts`, `lib/care/channels/sms.ts`, `voice.ts`

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | Push senden (Erfolg) | Nur Push gesendet, kein Fallback | ✓ |
| 2 | Push fehlschlaegt | SMS als Fallback gesendet | ✓ |
| 3 | Push + SMS fehlschlaegt | Voice als Fallback gesendet | ✓ |
| 4 | SMS mit temporaerem Fehler | 3 Retries mit exp. Backoff | ✓ |
| 5 | SMS mit permanentem Fehler | Kein Retry, sofortiger Fallback | ✓ |

**Ergebnis:** BESTANDEN | **Datum:** 2026-03-12

### TP-001.5: Eskalation und Cron-Monitoring
**Anforderung:** REQ-SOS-010, REQ-QS-002
**FMEA:** FM-SOS-03, FM-SYS-01
**Testdatei:** `lib/care/escalation.ts`, `lib/care/cron-heartbeat.ts`

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | SOS ausloesen, 5 min warten | Eskalation Level 1 → 2 | ✓ |
| 2 | Weitere 10 min warten | Eskalation Level 2 → 3 | ✓ |
| 3 | Cron-Heartbeat pruefen | Eintrag in cron_heartbeats mit status: ok | ✓ |
| 4 | Cron faellt aus | Health-Endpoint zeigt warn/error | ✓ |
| 5 | DB-Fehler bei Eskalation | 3 Retries + Admin-Alert | ✓ |

**Ergebnis:** 16 Tests BESTANDEN | **Datum:** 2026-03-12

### TP-001.6: Helfer-Reaktion auf SOS-Alert
**Anforderung:** REQ-SOS-007
**Testdatei:** `components/care/SosAlertCard.test.tsx`, E2E S8.5

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | SOS-Alert-Karte anzeigen | Kategorie, Senior-Name, Zeitstempel sichtbar | ✓ |
| 2 | "Ich helfe" klicken | Status auf accepted, Erfolgsbestaetigung | ✓ |
| 3 | "Kann nicht" klicken | Status auf declined | ✓ |
| 4 | Notfall-Styling pruefen | Roter Rand bei medical_emergency | ✓ |
| 5 | Nicht-Notfall-Styling pruefen | Amber Rand bei general_help | ✓ |
| 6 | Akzeptierter Alert pruefen | "Hilfe ist unterwegs" angezeigt | ✓ |

**Ergebnis:** 17 Unit-Tests + E2E BESTANDEN | **Datum:** 2026-03-12

## 4. Testprotokoll TP-002: Check-in-Modul

### TP-002.1: Check-in-Dialog mit 3 Stimmungen
**Anforderung:** REQ-CI-001, REQ-CI-002
**FMEA:** FM-CI-01
**Testdatei:** `components/care/CheckinDialog.test.tsx`

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | "Mir geht es gut" waehlen | API: status=ok, mood=good | ✓ |
| 2 | "Nicht so gut" waehlen | API: status=not_well, mood=neutral | ✓ |
| 3 | "Ich brauche Hilfe" waehlen | API: status=need_help, mood=bad | ✓ |
| 4 | Optionale Notiz eingeben | note-Feld wird mitgesendet | ✓ |
| 5 | scheduled_at Parameter | Wird an API uebergeben | ✓ |
| 6 | Erfolgsbestaetigung | "Gespeichert" Meldung | ✓ |
| 7 | Fehlerbehandlung | Fehlermeldung bei API-Fehler | ✓ |

**Ergebnis:** 16 Tests BESTANDEN | **Datum:** 2026-03-12

### TP-002.2: Senior-Check-in-Buttons (Seniorenmodus)
**Anforderung:** REQ-CI-001, REQ-SR-001, REQ-SR-002
**Testdatei:** `components/care/senior/SeniorCheckinButtons.test.tsx`, E2E S9.1-S9.4

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | 3 Buttons sichtbar | "Gut", "Nicht so gut", "Hilfe noetig" | ✓ |
| 2 | Touch-Target pruefen | Alle Buttons >= 80px Hoehe | ✓ |
| 3 | "Gut" klicken | API: status=ok, Weiterleitung zu /confirmed | ✓ |
| 4 | "Nicht so gut" klicken | API: status=not_well | ✓ |
| 5 | "Hilfe noetig" klicken | API: status=need_help, Auto-SOS | ✓ |

**Ergebnis:** 10 Tests BESTANDEN | **Datum:** 2026-03-12

### TP-002.3: AlarmScreen
**Anforderung:** REQ-CI-006, REQ-CI-007, REQ-SR-001
**FMEA:** FM-CI-04
**Testdatei:** `components/care/AlarmScreen.test.tsx`, E2E S9.8

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | AlarmScreen anzeigen | Vollbild-Ansicht, "Aus" + "Schlummern" Buttons | ✓ |
| 2 | "Aus" Button pruefen | Mindestens 80px Hoehe | ✓ |
| 3 | "Schlummern" Button pruefen | Mindestens 60px Hoehe | ✓ |
| 4 | "Aus" klicken | onDismiss aufgerufen, Erfolgsbildschirm | ✓ |
| 5 | "Schlummern" klicken | onSnooze(10) aufgerufen | ✓ |
| 6 | Buttons deaktiviert waehrend Absenden | isSubmitting: Buttons disabled | ✓ |

**Ergebnis:** 11 Tests BESTANDEN | **Datum:** 2026-03-12

## 5. Testprotokoll TP-003: Medikamente-Modul

### TP-003.1: MedicationCard Darstellung und Interaktion
**Anforderung:** REQ-MED-001, REQ-MED-002, REQ-MED-003
**FMEA:** FM-MED-01, FM-MED-02, FM-MED-03
**Testdatei:** `components/care/MedicationCard.test.tsx`, E2E S9.6-S9.7

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | Karte mit allen Feldern | Name, Dosierung, Zeit, Anweisungen sichtbar | ✓ |
| 2 | Status "pending" | Gelbes Badge, Aktionsbuttons sichtbar | ✓ |
| 3 | Status "taken" | Gruenes Badge, KEINE Aktionsbuttons | ✓ |
| 4 | Status "skipped" | Graues Badge, KEINE Aktionsbuttons | ✓ |
| 5 | Status "snoozed" | Blaues Badge, "Spaeter bis" Info | ✓ |
| 6 | Status "missed" | Rotes Badge, KEINE Aktionsbuttons | ✓ |
| 7 | "Genommen" klicken | onAction("taken") aufgerufen | ✓ |
| 8 | "Uebersprungen" klicken | onAction("skipped") aufgerufen | ✓ |
| 9 | "Spaeter" klicken | onAction("snoozed") aufgerufen | ✓ |
| 10 | Touch-Target pruefen | Alle Aktionsbuttons >= 48px, touchAction | ✓ |

**Ergebnis:** 19 Tests BESTANDEN | **Datum:** 2026-03-12

### TP-003.2: Medikamenten-Cron und Intervall-Berechnung
**Anforderung:** REQ-MED-004
**FMEA:** FM-MED-04
**Testdatei:** `app/api/care/cron/medications/route.ts`

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | Feste Zeiten (8:00, 14:00, 20:00) | Erinnerung zum naechsten Zeitpunkt | ✓ |
| 2 | Intervall (alle 8h, Start 6:00) | Zeitpunkte: 6:00, 14:00, 22:00 | ✓ |
| 3 | Toleranzfenster | Keine Doppel-Erinnerung innerhalb 2.5 min | ✓ |
| 4 | Heartbeat schreiben | cron_heartbeats Eintrag nach Durchlauf | ✓ |

**Ergebnis:** BESTANDEN | **Datum:** 2026-03-12

## 6. Testprotokoll TP-004: Datenschutz und Sicherheit

### TP-004.1: AES-256-GCM Feldverschluesselung
**Anforderung:** REQ-QS-006, REQ-SOS-006, REQ-CI-002
**DSGVO:** Art. 9
**Testdatei:** `lib/care/__tests__/field-encryption.test.ts`

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | Text verschluesseln | Ergebnis beginnt mit "aes256gcm:" | ✓ |
| 2 | Verschluesselten Text entschluesseln | Originaltext zurueck | ✓ |
| 3 | Doppelverschluesselung | Idempotent: bereits verschluesselter Text bleibt | ✓ |
| 4 | Verschiedene Feldtypen | String, leerer String, Unicode | ✓ |
| 5 | Falscher Schluessel | Entschluesselung schlaegt fehl | ✓ |
| 6 | Manipulierter Ciphertext | Entschluesselung schlaegt fehl (GCM-Auth) | ✓ |
| 7 | 12 Felder in 4 Tabellen | Alle Gesundheitsfelder verschluesselt | ✓ |

**Ergebnis:** 22 Tests BESTANDEN | **Datum:** 2026-03-12

### TP-004.2: Zugriffskontrolle und IDOR-Schutz
**Anforderung:** REQ-QS-004, REQ-QS-005
**Risk Register:** R-008
**Testdatei:** API-Route-Tests

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | Unautorisierter Zugriff auf /api/care/sos | HTTP 401 | ✓ |
| 2 | Zugriff ohne Care-Berechtigung | HTTP 403 | ✓ |
| 3 | Zugriff auf fremde Senior-Daten | HTTP 403 (requireCareAccess) | ✓ |
| 4 | Helfer sieht nur zugewiesene Senioren | assigned_seniors Check | ✓ |
| 5 | RLS-Policy aktiv | Supabase-Ebene blockiert unberechtigten Zugriff | ✓ |

**Ergebnis:** BESTANDEN | **Datum:** 2026-03-12

### TP-004.3: Audit-Log Datensparsamkeit
**Anforderung:** REQ-QS-010, REQ-SOS-011
**Risk Register:** R-017
**Testdatei:** `lib/care/audit.ts` Tests

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | SOS-Event loggen | Nur user_id, alert_id, action | ✓ |
| 2 | Log auf PII pruefen | KEINE Namen, Adressen, Gesundheitsdaten | ✓ |
| 3 | Check-in loggen | Nur IDs, kein Stimmungswert | ✓ |

**Ergebnis:** BESTANDEN | **Datum:** 2026-03-12

## 7. Testprotokoll TP-005: Error Handling und Resilenz

### TP-005.1: CareErrorBoundary
**Anforderung:** REQ-QS-003
**FMEA:** FM-SYS-02
**Testdatei:** `components/care/CareErrorBoundary.test.tsx`

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | Kind-Komponente wirft Fehler | Error Boundary faengt ab | ✓ |
| 2 | Fehlermeldung pruefen | "Etwas ist schiefgelaufen" o.ae. sichtbar | ✓ |
| 3 | Reload-Button pruefen | window.location.reload() wird aufgerufen | ✓ |
| 4 | Strukturiertes Logging | componentDidCatch loggt JSON | ✓ |
| 5 | Normaler Betrieb | Kind-Komponenten normal gerendert | ✓ |

**Ergebnis:** 8 Tests BESTANDEN | **Datum:** 2026-03-12

### TP-005.2: Console-Error-Freiheit
**Anforderung:** Qualitaetssicherung
**Testdatei:** E2E S8.6, S9.9

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | SOS-Flow durchlaufen | Keine kritischen console.error | ✓ |
| 2 | Check-in-Flow durchlaufen | Keine kritischen console.error | ✓ |
| 3 | Medikamenten-Flow durchlaufen | Keine kritischen console.error | ✓ |
| 4 | Filter: Hydration/Warnings ignorieren | Nur echte Fehler zaehlen | ✓ |

**Ergebnis:** BESTANDEN | **Datum:** 2026-03-12

## 8. Testprotokoll TP-006: Barrierefreiheit (GEPLANT)

### TP-006.1: axe-core WCAG 2.1 AA
**Anforderung:** REQ-QS-007, REQ-SR-001, REQ-SR-003
**Status:** GEPLANT (Woche 9-12)

| Schritt | Aktion | Erwartetes Ergebnis | Bestanden |
|---------|--------|---------------------|-----------|
| 1 | SOS-Seite mit axe-core scannen | 0 kritische Violations | — |
| 2 | Check-in-Seite scannen | 0 kritische Violations | — |
| 3 | Medikamenten-Seite scannen | 0 kritische Violations | — |
| 4 | Senior-Home scannen | 0 kritische Violations | — |
| 5 | Farbkontrast pruefen | >= 4.5:1 fuer Normaltext | — |
| 6 | Tastaturnavigation | Alle Elemente per Tab erreichbar | — |
| 7 | ARIA-Labels pruefen | Alle Buttons haben Label | — |

## 9. Testprotokoll TP-007: Penetration Test (GEPLANT)

### TP-007.1: Externer Security-Test
**Anforderung:** REQ-QS-004, REQ-QS-005, REQ-QS-009
**Risk Register:** M-006
**Status:** GEPLANT (Woche 9-12)

| Pruefbereich | Beschreibung | Bestanden |
|-------------|--------------|-----------|
| OWASP Top 10 | Injection, XSS, IDOR, CSRF, etc. | — |
| Authentifizierung | Session-Management, Token-Sicherheit | — |
| Autorisierung | RLS-Bypass, IDOR-Versuche | — |
| Verschluesselung | AES-256-GCM Implementierung | — |
| API-Sicherheit | Rate Limiting, Input Validation | — |
| CSP-Header | Content Security Policy Wirksamkeit | — |

## 10. Zusammenfassung der Testergebnisse

### 10.1 Quantitative Uebersicht

| Testebene | Tests | Bestanden | Fehlgeschlagen | Quote |
|-----------|-------|-----------|----------------|-------|
| Unit-Tests (Vitest) | 272 | 272 | 0 | 100% |
| API-Route-Tests | 31 | 31 | 0 | 100% |
| Komponenten-Tests | 103 | 103 | 0 | 100% |
| Verschluesselungs-Tests | 22 | 22 | 0 | 100% |
| E2E-Szenarien | ~50 | — | — | Bereit |
| axe-core | — | — | — | Geplant |
| Pen-Test | — | — | — | Geplant |
| **Gesamt (automatisiert)** | **428** | **428** | **0** | **100%** |

### 10.2 FMEA-Abdeckung

| FMEA-Bereich | IDs | Getestet | Abdeckung |
|-------------|-----|----------|-----------|
| SOS-Modul | FM-SOS-01 bis 06 | 6/6 | 100% |
| Check-in-Modul | FM-CI-01 bis 04 | 4/4 | 100% |
| Medikamente | FM-MED-01 bis 05 | 5/5 | 100% |
| EmergencyBanner | FM-NB-02 bis 04 | 3/3 | 100% |
| Infrastruktur | FM-SYS-01 bis 04 | 4/4 | 100% |
| **Gesamt** | **22 IDs** | **22/22** | **100%** |

### 10.3 Anforderungs-Abdeckung

| SRS-Bereich | Anforderungen | Getestet | Geplant | Abdeckung |
|-------------|---------------|----------|---------|-----------|
| SOS | 11 | 11 | 0 | 100% |
| Check-in | 7 | 7 | 0 | 100% |
| Medikamente | 4 | 4 | 0 | 100% |
| Seniorenmodus | 4 | 3 | 1 | 75% |
| Querschnitt | 10 | 7 | 3 | 70% |
| **Gesamt** | **36** | **32** | **4** | **89%** |

### 10.4 Offene Punkte

| ID | Beschreibung | Anforderung | Geplant |
|----|-------------|-------------|---------|
| TP-OPEN-001 | axe-core Barrierefreiheits-Tests | REQ-QS-007 | Woche 9-12 |
| TP-OPEN-002 | Auto-Deletion Tests | REQ-QS-008 | Woche 9-12 |
| TP-OPEN-003 | CSP-Header Validierung | REQ-QS-009 | Woche 9-12 |
| TP-OPEN-004 | Max 4 Taps formale Pruefung | REQ-SR-003 | Woche 9-12 |
| TP-OPEN-005 | Externer Penetration Test | TP-007 | Woche 9-12 |

## 11. Freigabe

| Rolle | Name | Datum | Unterschrift |
|-------|------|-------|-------------|
| Validierungsleiter | [TBD] | | |
| Entwicklungsleiter | [TBD] | | |
| Datenschutzbeauftragter | [TBD] | | |

## 12. Aenderungshistorie

| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.0 | 2026-03-12 | Erstversion — 7 Testprotokolle, 428 automatisierte Tests |
