# Nachbar.io — Software Requirements Specification (SRS) — Care-Modul

**Version:** 1.0
**Datum:** 2026-03-12
**Autor:** Validierungsteam
**Naechste Ueberpruefung:** 2026-06-12
**Dokumenttyp:** Anforderungsspezifikation

## 1. Einleitung

### 1.1 Zweck
Diese SRS definiert alle funktionalen und nicht-funktionalen Anforderungen an das Care-Modul
von Nachbar.io. Sie dient als verbindliche Grundlage fuer Implementierung, Testplanung
und Validierung.

### 1.2 Geltungsbereich
- **System:** Nachbar.io Care-Modul
- **Module:** SOS-Alarm, Check-in, Medikamente, Termine, Seniorenmodus
- **Nicht enthalten:** Community-Funktionen (Hilfegesuche, Nachrichten, News, Karte)

### 1.3 Referenzen
| ID | Dokument | Pfad |
|----|----------|------|
| DOC-01 | Intended Use Statement | `docs/15_INTENDED_USE_STATEMENT.md` |
| DOC-02 | FMEA Care-Modul | `docs/16_FMEA_CARE_MODUL.md` |
| DOC-04 | DSFA Care-Modul | `docs/18_DSFA_CARE_MODUL.md` |
| DOC-05 | Risk Register | `docs/19_RISK_REGISTER.md` |
| DOC-06 | Traceability Matrix | `docs/20_TRACEABILITY_MATRIX.md` |

### 1.4 Definitionen
| Begriff | Definition |
|---------|------------|
| Senior | Registrierter Nutzer mit Rolle `senior` im Care-Modul |
| Helfer | Registrierter Nutzer mit Rolle `helper` oder `relative` |
| SOS-Alert | Notfall-Hilfeersuchen, ausgeloest durch Senior |
| Check-in | Taegliche Statusmeldung des Seniors (ok / not_well / need_help) |
| Eskalation | Automatische Steigerung der Benachrichtigungs-Dringlichkeit |
| EmergencyBanner | Warnhinweis bei medizinischem Notfall mit 112/110 Nummern |
| RPN | Risk Priority Number (Schwere × Wahrscheinlichkeit) |

## 2. System-Uebersicht

### 2.1 Architektur
```
[Senior-Browser/PWA] ──→ [Next.js API Routes] ──→ [Supabase PostgreSQL]
                                │                         │
                                ├─→ [Push API]            ├─→ [RLS Policies]
                                ├─→ [Twilio SMS/Voice]    ├─→ [AES-256-GCM]
                                └─→ [Cron-Jobs]           └─→ [Audit-Log]
```

### 2.2 Benutzerrollen
| Rolle | Berechtigungen |
|-------|---------------|
| `senior` | SOS ausloesen, Check-in abgeben, Medikamente verwalten |
| `helper` | SOS-Alerts empfangen/annehmen, Check-in-Status sehen |
| `relative` | Wie helper + Medikamenten-Uebersicht + erweiterte Rechte |
| `care_service` | Wie relative + mehrere Senioren verwalten |
| `admin` | Alle Rechte + Nutzerverwaltung + Monitoring |

## 3. Funktionale Anforderungen — SOS-Modul

### REQ-SOS-001: SOS-Alert erstellen und speichern
**Prioritaet:** KRITISCH | **FMEA:** FM-SOS-01 | **Risk Register:** R-001
- Das System MUSS einen SOS-Alert in der Datenbank erstellen, wenn ein Senior eine Kategorie waehlt
- Der Alert MUSS die Felder `senior_id`, `category`, `status`, `notes` enthalten
- `notes` MUSS mit AES-256-GCM verschluesselt werden (REQ-SOS-006)
- Der initiale Status MUSS `triggered` sein
- **Testnachweis:** 14 API-Route-Tests in `app/api/care/sos/route.test.ts`

### REQ-SOS-002: EmergencyBanner bei Notfall-Kategorien
**Prioritaet:** KRITISCH | **FMEA:** FM-NB-02 | **Risk Register:** R-002
- Bei Kategorien `medical_emergency`, `fire`, `crime` MUSS das EmergencyBanner angezeigt werden
- Das Banner MUSS VOR jeder anderen Aktion erscheinen
- Das Banner MUSS die Nummern 112 und 110 als klickbare tel:-Links enthalten
- **Testnachweis:** 22 Tests (9 EmergencyBanner + 13 SosCategoryPicker)

### REQ-SOS-003: 112/110 als klickbare Links
**Prioritaet:** KRITISCH | **FMEA:** FM-NB-03
- Die Notrufnummern MUESSEN als `<a href="tel:112">` und `<a href="tel:110">` implementiert sein
- Die Nummern MUESSEN zusaetzlich als lesbarer Text sichtbar sein (Fallback bei Link-Fehler)
- **Testnachweis:** EmergencyBanner-Tests 24-33

### REQ-SOS-004: Escape darf EmergencyBanner nicht schliessen
**Prioritaet:** KRITISCH | **FMEA:** FM-NB-02
- Die Escape-Taste DARF das EmergencyBanner NICHT schliessen
- Das Banner MUSS einen Focus-Trap implementieren
- Nur explizite Buttons ("Ich habe 112/110 angerufen" / "Kein Notruf noetig") schliessen das Banner
- **Testnachweis:** EmergencyBanner-Tests 72-80, E2E S8.2

### REQ-SOS-005: Feature-Gate vor SOS-Erstellung
**Prioritaet:** HOCH | **FMEA:** FM-SOS-03
- Die API MUSS pruefen, ob der Nutzer einen Care-Plan mit SOS-Feature hat
- Ohne gueltigen Plan: HTTP 403 zurueckgeben
- **Testnachweis:** Feature-Gate-Tests in API-Route-Tests

### REQ-SOS-006: AES-256-GCM Verschluesselung fuer SOS-Daten
**Prioritaet:** KRITISCH | **DSGVO:** Art. 9 Abs. 2 | **Risk Register:** R-007
- `notes`, `category` MUESSEN vor dem Speichern mit AES-256-GCM verschluesselt werden
- Verschluesselte Felder MUESSEN das Prefix `aes256gcm:` tragen (Doppel-Verschluesselungs-Schutz)
- Der Schluessel MUSS als Umgebungsvariable `CARE_ENCRYPTION_KEY` bereitgestellt werden
- **Testnachweis:** 22 Tests in `lib/care/__tests__/field-encryption.test.ts`

### REQ-SOS-007: Helfer-Benachrichtigung auf Stufen 1-3
**Prioritaet:** KRITISCH | **FMEA:** FM-SOS-02 | **Risk Register:** R-001
- Level 1: Zugewiesene Helfer per Push benachrichtigen
- Level 2: Angehoerige per Push + SMS benachrichtigen
- Level 3: Alle Helfer + Pflegedienst per Push + SMS + Voice benachrichtigen
- **Testnachweis:** 13 Tests in Notification-Unit-Tests

### REQ-SOS-008: Fallback-Kaskade Push → SMS → Voice
**Prioritaet:** KRITISCH | **FMEA:** FM-SOS-02 | **Risk Register:** R-001
- Wenn Push fehlschlaegt: SMS als Fallback senden
- Wenn SMS fehlschlaegt: Voice-Anruf als Fallback
- Fallback MUSS automatisch bei `enableFallback: true` aktiviert sein
- **Testnachweis:** Fallback-Tests in `lib/care/notifications.ts`

### REQ-SOS-009: Retry-Logik fuer SMS und Voice
**Prioritaet:** HOCH | **FMEA:** FM-SOS-05
- SMS und Voice MUESSEN bei Fehlschlag 3x wiederholt werden
- Wartezeit: Exponentieller Backoff (1s, 2s, 4s)
- Permanente Fehler (ungueltige Nummer, blockiert) DUERFEN NICHT wiederholt werden
- **Testnachweis:** Unit-Tests in `lib/care/channels/sms.ts`, `voice.ts`

### REQ-SOS-010: Automatische Eskalation nach konfigurierter Zeit
**Prioritaet:** HOCH | **FMEA:** FM-SOS-03 | **Risk Register:** R-003
- Eskalation von Level 1 → 2 nach konfigurierter Zeit (Standard: 5 min)
- Eskalation von Level 2 → 3 nach weiterer konfigurierter Zeit (Standard: 10 min)
- Eskalations-Cron MUSS mit Heartbeat-Monitoring ueberwacht werden
- **Testnachweis:** 6 Tests in Escalation-Unit-Tests

### REQ-SOS-011: Audit-Log bei SOS-Ereignissen
**Prioritaet:** HOCH | **DSGVO:** Nachweispflicht
- Jedes SOS-Ereignis (Erstellung, Eskalation, Annahme, Abschluss) MUSS geloggt werden
- Audit-Log DARF nur IDs speichern, KEINE Klartextdaten (REQ-QS-010)
- **Testnachweis:** Audit-Tests in `lib/care/audit.ts`

## 4. Funktionale Anforderungen — Check-in-Modul

### REQ-CI-001: 3 Check-in-Statuswerte
**Prioritaet:** HOCH | **FMEA:** FM-CI-01 | **Risk Register:** R-004
- Das System MUSS genau 3 Statuswerte unterstuetzen: `ok`, `not_well`, `need_help`
- Die Zuordnung zu Stimmungen: ok → `good`, not_well → `neutral`, need_help → `bad`
- **Testnachweis:** 17 Tests in CheckinDialog + SeniorCheckinButtons

### REQ-CI-002: Verschluesselung des Notiz-Feldes
**Prioritaet:** KRITISCH | **DSGVO:** Art. 9 | **Risk Register:** R-007
- Das `note`-Feld MUSS mit AES-256-GCM verschluesselt werden
- **Testnachweis:** Verschluesselungs-Tests

### REQ-CI-003: Benachrichtigung bei not_well
**Prioritaet:** HOCH | **FMEA:** FM-CI-02
- Bei Status `not_well` MUESSEN zugewiesene Angehoerige benachrichtigt werden
- Benachrichtigung per Push (ggf. SMS-Fallback)
- **Testnachweis:** Relative-Notification-Tests

### REQ-CI-004: Auto-SOS bei need_help
**Prioritaet:** KRITISCH | **FMEA:** FM-CI-03
- Bei Status `need_help` MUSS automatisch ein SOS-Alert erstellt werden
- Kategorie: `general_help` (KEIN EmergencyBanner)
- **Testnachweis:** Auto-SOS-Tests in API-Route

### REQ-CI-005: Check-in-Verlauf mit Entschluesselung
**Prioritaet:** MITTEL
- GET-Anfragen MUESSEN verschluesselte Felder automatisch entschluesseln
- Nur autorisierte Nutzer (Helfer/Angehoerige/Senior selbst) duerfen Daten sehen
- **Testnachweis:** GET-Tests in API-Route

### REQ-CI-006: AlarmScreen "Aus" sendet Auto-Check-in
**Prioritaet:** HOCH | **FMEA:** FM-CI-04
- Der "Aus"-Button im AlarmScreen MUSS einen Check-in mit Status `ok` senden
- Der Button MUSS mindestens 80px hoch sein (Seniorenmodus)
- Nach erfolgreichem Check-in: Erfolgsbildschirm anzeigen
- **Testnachweis:** 11 AlarmScreen-Tests

### REQ-CI-007: AlarmScreen "Schlummern" verzoegert um 10 Minuten
**Prioritaet:** MITTEL
- Der "Schlummern"-Button MUSS `onSnooze(10)` aufrufen (10 Minuten)
- Button-Groesse: mindestens 60px
- **Testnachweis:** Snooze-Tests in AlarmScreen

## 5. Funktionale Anforderungen — Medikamente-Modul

### REQ-MED-001: Medikamentenkarte zeigt Name, Dosierung, Zeit
**Prioritaet:** HOCH | **FMEA:** FM-MED-01
- Die MedicationCard MUSS Medikamentenname, Dosierung (optional) und geplante Zeit anzeigen
- Zusaetzliche Anweisungen (instructions) werden bedingt angezeigt
- **Testnachweis:** 19 MedicationCard-Tests

### REQ-MED-002: 5 Medikamentenstatus-Werte
**Prioritaet:** HOCH | **FMEA:** FM-MED-02
- Unterstuetzte Status: `pending`, `taken`, `skipped`, `snoozed`, `missed`
- Jeder Status MUSS ein eindeutiges visuelles Badge haben
- **Testnachweis:** Status-Badge-Tests

### REQ-MED-003: Aktionsbuttons nur bei pending
**Prioritaet:** MITTEL | **FMEA:** FM-MED-03
- "Genommen", "Uebersprungen", "Spaeter" Buttons nur bei Status `pending` sichtbar
- Alle Buttons MUESSEN mindestens 48px Hoehe und `touchAction: manipulation` haben
- **Testnachweis:** Action-Button-Tests

### REQ-MED-004: Intervall-Medikamente korrekt berechnet
**Prioritaet:** HOCH | **FMEA:** FM-MED-04
- Bei `type: interval` mit `every_hours` MUESSEN konkrete Zeitpunkte berechnet werden
- Berechnung: Startzeit + N × every_hours innerhalb des Tages
- Toleranzfenster: 2.5 Minuten (keine Doppel-Erinnerungen)
- **Testnachweis:** Cron-Medications-Tests

## 6. Funktionale Anforderungen — Seniorenmodus

### REQ-SR-001: Mindestens 80px Touch-Targets fuer Hauptbuttons
**Prioritaet:** HOCH | **FMEA:** FM-NB-04
- Alle primaeren Aktionsbuttons im Seniorenmodus MUESSEN mindestens 80px hoch sein
- SOS-Button: mindestens 100px (Standardmodus) / 60px (Kompaktmodus)
- **Testnachweis:** Komponenten-Tests mit boundingBox-Pruefung

### REQ-SR-002: touchAction: manipulation
**Prioritaet:** MITTEL
- Alle Buttons im Seniorenmodus MUESSEN `touchAction: manipulation` setzen
- Verhindert unbeabsichtigtes Doppeltipp-Zoomen
- **Testnachweis:** Komponenten-Tests

### REQ-SR-003: Maximum 4 Taps pro Aktion
**Prioritaet:** HOCH
- Jede Aktion (SOS, Check-in, Medikament bestaetigen) DARF maximal 4 Taps erfordern
- Pfad: Home → Funktion → Aktion → Bestaetigung
- **Testnachweis:** E2E Szenarien S5, S9 (TEILWEISE)

### REQ-SR-004: SOS-Button immer sichtbar und erreichbar
**Prioritaet:** KRITISCH | **FMEA:** FM-SOS-04
- Der SOS-Button MUSS auf jeder Seite im Seniorenmodus sichtbar sein
- Der Button MUSS ein `aria-label` fuer Screenreader haben
- **Testnachweis:** 9 SosButton-Tests

## 7. Nicht-funktionale Anforderungen — Querschnitt

### REQ-QS-001: Strukturiertes JSON-Logging
**Prioritaet:** HOCH | **FMEA:** FM-SYS-03
- Alle sicherheitsrelevanten Aktionen MUESSEN im JSON-Format geloggt werden
- Log-Eintraege MUESSEN enthalten: Timestamp, Action, User-ID, Request-ID
- **Testnachweis:** 9 Logger-Tests

### REQ-QS-002: Cron-Heartbeat-Monitoring
**Prioritaet:** KRITISCH | **FMEA:** FM-SYS-01 | **Risk Register:** R-003, R-004
- Alle 4 Cron-Jobs MUESSEN einen Heartbeat in `cron_heartbeats` schreiben
- Status: `ok` bei Erfolg, `error` bei Fehler
- Health-Endpoint MUSS Cron-Status anzeigen (warn bei > 2× erwartetem Intervall)
- **Testnachweis:** 10 Heartbeat-Tests

### REQ-QS-003: Error Boundary fuer Care-Komponenten
**Prioritaet:** HOCH | **FMEA:** FM-SYS-02
- Ein React Error Boundary MUSS alle Care-Komponenten umschliessen
- Bei Fehler: Fehlermeldung + Reload-Button anzeigen
- Fehler MUSS mit strukturiertem Logging (componentDidCatch) geloggt werden
- **Testnachweis:** 8 CareErrorBoundary-Tests

### REQ-QS-004: Authentifizierung auf allen API-Endpunkten
**Prioritaet:** KRITISCH
- Jeder Care-API-Endpunkt MUSS `requireAuth()` oder `requireCareAccess()` aufrufen
- Unautorisierte Anfragen: HTTP 401
- **Testnachweis:** 401-Tests in allen API-Route-Tests

### REQ-QS-005: Zugangskontrolle (IDOR-Schutz)
**Prioritaet:** KRITISCH | **DSGVO:** Art. 5 | **Risk Register:** R-008
- `requireCareAccess()` MUSS auf allen Care-Endpunkten angewendet werden
- Nutzer duerfen NUR auf Daten zugreifen, fuer die sie berechtigt sind
- Supabase RLS-Policies MUESSEN als zusaetzliche Schutzschicht aktiv sein
- **Testnachweis:** Access-Control-Tests

### REQ-QS-006: AES-256-GCM Verschluesselung fuer alle Gesundheitsdaten
**Prioritaet:** KRITISCH | **DSGVO:** Art. 9 | **Risk Register:** R-007
- Betroffene Tabellen: `sos_alerts`, `checkins`, `medications`, `care_appointments`
- Betroffene Felder: `notes`, `category`, `medication_name`, `dosage`, `instructions`, `mood`, `status`
- Verschluesselung MUSS idempotent sein (aes256gcm:-Prefix verhindert Doppelverschluesselung)
- **Testnachweis:** 22 Verschluesselungs-Tests

### REQ-QS-007: WCAG 2.1 AA Barrierefreiheit
**Prioritaet:** HOCH
- Farbkontrast: mindestens 4.5:1 fuer Normaltext, 3:1 fuer Grosstext
- Tastaturnavigation: Alle interaktiven Elemente per Tab erreichbar
- Screenreader: ARIA-Labels fuer alle Buttons und Formulare
- **Testnachweis:** axe-core Tests (GEPLANT, Woche 9-12)

### REQ-QS-008: Automatische Datenloeschung
**Prioritaet:** HOCH | **DSGVO:** Art. 17 | **Risk Register:** R-014
- SOS-Alerts: Loeschung nach 12 Monaten
- Check-ins: Loeschung nach 12 Monaten
- Medikamente: Loeschung nach 12 Monaten
- Audit-Log: Loeschung nach 24 Monaten
- **Testnachweis:** GEPLANT (Auto-Deletion Migration)

### REQ-QS-009: Content Security Policy Header
**Prioritaet:** HOCH | **Risk Register:** R-012
- CSP-Header MUESSEN in next.config.ts konfiguriert sein
- Mindestens: `default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `frame-ancestors 'none'`
- **Testnachweis:** GEPLANT (Header-Validierung)

### REQ-QS-010: Audit-Log ohne Klartextdaten
**Prioritaet:** HOCH | **DSGVO:** Datenminimierung | **Risk Register:** R-017
- Audit-Log DARF nur User-IDs, Alert-IDs und Aktionstypen speichern
- KEINE Namen, Adressen, Gesundheitsdaten im Klartext
- **Testnachweis:** Audit-Tests

## 8. Systemschnittstellen

### 8.1 Externe Schnittstellen
| Schnittstelle | Zweck | Protokoll | Absicherung |
|--------------|-------|-----------|-------------|
| Supabase REST API | Datenbank CRUD | HTTPS | API-Key + RLS |
| Supabase Realtime | Live-Updates | WSS | JWT + RLS |
| Twilio SMS API | SMS-Versand | HTTPS | Account SID + Auth Token |
| Twilio Voice API | Voice-Anrufe | HTTPS | Account SID + Auth Token |
| Web Push API | Push-Benachrichtigungen | HTTPS | VAPID Keys |

### 8.2 Interne Schnittstellen
| Endpunkt | Methode | Zweck | Auth |
|----------|---------|-------|------|
| `/api/care/sos` | POST/GET | SOS erstellen/abfragen | requireCareAccess |
| `/api/care/checkin` | POST/GET | Check-in abgeben/abfragen | requireCareAccess |
| `/api/care/medications` | GET/POST/PATCH | Medikamente verwalten | requireCareAccess |
| `/api/care/cron/escalation` | POST | SOS-Eskalation (Cron) | CRON_SECRET |
| `/api/care/cron/checkin` | POST | Check-in-Ueberpruefung (Cron) | CRON_SECRET |
| `/api/care/cron/medications` | POST | Medikamenten-Erinnerung (Cron) | CRON_SECRET |
| `/api/care/cron/appointments` | POST | Termin-Erinnerung (Cron) | CRON_SECRET |
| `/api/admin/health` | GET | System-Health-Check | Admin-Rolle |

## 9. Anforderungs-Uebersicht

| Kategorie | Anzahl | KRITISCH | HOCH | MITTEL | Status |
|-----------|--------|----------|------|--------|--------|
| SOS-Modul | 11 | 7 | 3 | 1 | Alle getestet |
| Check-in-Modul | 7 | 2 | 3 | 2 | Alle getestet |
| Medikamente-Modul | 4 | 0 | 3 | 1 | Alle getestet |
| Seniorenmodus | 4 | 1 | 2 | 1 | 3 getestet, 1 teilweise |
| Querschnitt | 10 | 3 | 5 | 2 | 7 getestet, 3 geplant |
| **Gesamt** | **36** | **13** | **16** | **7** | **33 getestet** |

## 10. Aenderungshistorie

| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.0 | 2026-03-12 | Erstversion — 36 Anforderungen fuer Care-Modul |
