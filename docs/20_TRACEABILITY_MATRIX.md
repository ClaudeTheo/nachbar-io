# Nachbar.io — Traceability Matrix

**Version:** 1.0
**Datum:** 2026-03-12
**Zweck:** Rueckverfolgbarkeit von Anforderungen ueber Code bis zu Tests

## 1. Uebersicht

Diese Matrix stellt die Verbindung her zwischen:
- **Anforderungen** (funktional + nicht-funktional)
- **Quellcode** (Implementierung)
- **Tests** (Verifizierung)
- **FMEA-Referenz** (Risikoanalyse)

## 2. Sicherheitskritische Anforderungen

### 2.1 SOS-Modul

| REQ-ID | Anforderung | Quellcode | Tests | FMEA | Status |
|--------|-------------|-----------|-------|------|--------|
| REQ-SOS-001 | SOS-Alert muss erstellt und gespeichert werden | `app/api/care/sos/route.ts` (POST) | `app/api/care/sos/route.test.ts` (14 Tests) | FM-SOS-01 | VERIFIZIERT |
| REQ-SOS-002 | EmergencyBanner bei Notfall-Kategorie IMMER anzeigen | `components/care/SosCategoryPicker.tsx`, `components/EmergencyBanner.tsx` | `EmergencyBanner.test.tsx` (9 Tests), `SosCategoryPicker.test.tsx` (13 Tests) | FM-NB-02 | VERIFIZIERT |
| REQ-SOS-003 | 112/110 Links muessen tel:-Links sein | `components/EmergencyBanner.tsx` | `EmergencyBanner.test.tsx` (Zeile 24-33) | FM-NB-03 | VERIFIZIERT |
| REQ-SOS-004 | Escape darf EmergencyBanner NICHT schliessen | `components/EmergencyBanner.tsx` (onKeyDown) | `EmergencyBanner.test.tsx` (Zeile 72-80) | FM-NB-02 | VERIFIZIERT |
| REQ-SOS-005 | Feature-Gate prueft Abo-Plan vor SOS | `app/api/care/sos/route.ts`, `lib/care/permissions.ts` | `route.test.ts` (Feature-Gate Tests) | FM-SOS-03 | VERIFIZIERT |
| REQ-SOS-006 | notes-Feld muss AES-256-GCM verschluesselt werden (DSGVO Art. 9) | `app/api/care/sos/route.ts` → `lib/care/field-encryption.ts` | `route.test.ts` (Verschluesselungs-Test), `field-encryption.test.ts` (22 Tests) | — | VERIFIZIERT |
| REQ-SOS-007 | Helfer auf Level 1-3 werden benachrichtigt | `app/api/care/sos/route.ts`, `lib/care/notifications.ts` | `route.test.ts` (Helfer-Benachrichtigung), `notifications.test.ts` (13 Tests) | FM-SOS-01 | VERIFIZIERT |
| REQ-SOS-008 | Fallback-Kaskade: Push→SMS→Voice | `lib/care/notifications.ts` | `notifications.test.ts` (Fallback-Tests) | FM-SOS-01 | VERIFIZIERT |
| REQ-SOS-009 | SMS/Voice mit 3 Retries + Exponential Backoff | `lib/care/channels/sms.ts`, `voice.ts` | Unit-Tests (Retry-Logik) | FM-SOS-01 | VERIFIZIERT |
| REQ-SOS-010 | Eskalation nach konfigurierter Zeit | `app/api/care/cron/escalation/route.ts`, `lib/care/escalation.ts` | `escalation.test.ts` (6 Tests), `cron-escalation-route.test.ts` | FM-SOS-02 | VERIFIZIERT |
| REQ-SOS-011 | Audit-Log bei SOS-Ereignissen | `app/api/care/sos/route.ts` → `lib/care/audit.ts` | `route.test.ts` (Audit-Log Tests) | — | VERIFIZIERT |

### 2.2 Check-in-Modul

| REQ-ID | Anforderung | Quellcode | Tests | FMEA | Status |
|--------|-------------|-----------|-------|------|--------|
| REQ-CI-001 | Check-in mit 3 Status-Werten (ok, not_well, need_help) | `app/api/care/checkin/route.ts` (POST) | `route.test.ts` (17 Tests) | FM-CI-01 | VERIFIZIERT |
| REQ-CI-002 | note-Feld muss verschluesselt werden (DSGVO Art. 9) | `app/api/care/checkin/route.ts` → `field-encryption.ts` | `route.test.ts` (Verschluesselungs-Test) | — | VERIFIZIERT |
| REQ-CI-003 | Angehoerige bei not_well benachrichtigen | `app/api/care/checkin/route.ts` | `route.test.ts` (Angehoerigen-Tests) | FM-CI-02 | VERIFIZIERT |
| REQ-CI-004 | Auto-SOS bei need_help ausloesen | `app/api/care/checkin/route.ts` | `route.test.ts` (Auto-SOS Tests) | FM-CI-03 | VERIFIZIERT |
| REQ-CI-005 | Check-in-Historie mit Entschluesselung zurueckgeben | `app/api/care/checkin/route.ts` (GET) | `route.test.ts` (GET-Tests) | — | VERIFIZIERT |
| REQ-CI-006 | AlarmScreen: "Aus" sendet auto-Check-in | `components/care/AlarmScreen.tsx` | `AlarmScreen.test.tsx` (11 Tests) | FM-CI-04 | VERIFIZIERT |
| REQ-CI-007 | AlarmScreen: "Schlummern" verzoegert um 10 Min. | `components/care/AlarmScreen.tsx` | `AlarmScreen.test.tsx` (Snooze-Test) | — | VERIFIZIERT |

### 2.3 Medikamenten-Modul

| REQ-ID | Anforderung | Quellcode | Tests | FMEA | Status |
|--------|-------------|-----------|-------|------|--------|
| REQ-MED-001 | Medikamenten-Karte zeigt Name, Dosierung, Zeit | `components/care/MedicationCard.tsx` | `MedicationCard.test.tsx` (19 Tests) | FM-MED-01 | VERIFIZIERT |
| REQ-MED-002 | 5 Status-Werte: pending, taken, skipped, snoozed, missed | `components/care/MedicationCard.tsx` | `MedicationCard.test.tsx` (Status-Badge Tests) | FM-MED-02 | VERIFIZIERT |
| REQ-MED-003 | Aktions-Buttons nur bei pending-Status | `components/care/MedicationCard.tsx` | `MedicationCard.test.tsx` (Aktions-Tests) | FM-MED-03 | VERIFIZIERT |
| REQ-MED-004 | Intervall-Medikamente korrekt berechnen | `app/api/care/cron/medications/route.ts` | Cron-Tests | FM-MED-04 | VERIFIZIERT |

### 2.4 Senior-Modus

| REQ-ID | Anforderung | Quellcode | Tests | FMEA | Status |
|--------|-------------|-----------|-------|------|--------|
| REQ-SR-001 | Minimum 80px Touch-Targets fuer Haupt-Buttons | Alle Senior-Komponenten (`style={{ minHeight: '80px' }}`) | `SosButton.test.tsx`, `AlarmScreen.test.tsx`, `CheckinDialog.test.tsx`, `SeniorCheckinButtons.test.tsx`, `MedicationCard.test.tsx` | FM-NB-04 | VERIFIZIERT |
| REQ-SR-002 | touchAction: manipulation (kein Doppelklick-Zoom) | Alle Senior-Buttons | Alle Komponenten-Tests (touchAction-Pruefung) | — | VERIFIZIERT |
| REQ-SR-003 | Maximal 4 Taps fuer jede Aktion | Senior-Navigation: Home → Funktion → Aktion → Bestaetigung | E2E S5 + S9 (Szenarien) | — | TEILWEISE |
| REQ-SR-004 | SOS-Button immer sichtbar und erreichbar | `components/care/SosButton.tsx` | `SosButton.test.tsx` (9 Tests) | FM-SOS-04 | VERIFIZIERT |

### 2.5 Querschnittsanforderungen

| REQ-ID | Anforderung | Quellcode | Tests | FMEA | Status |
|--------|-------------|-----------|-------|------|--------|
| REQ-QS-001 | Strukturiertes JSON-Logging | `lib/care/logger.ts` | `logger.test.ts` (9 Tests) | FM-SYS-03 | VERIFIZIERT |
| REQ-QS-002 | Cron-Heartbeat-Monitoring | `lib/care/cron-heartbeat.ts` | `cron-heartbeat.test.ts` (10 Tests) | FM-SYS-01 | VERIFIZIERT |
| REQ-QS-003 | Error Boundary fuer Care-Komponenten | `components/care/CareErrorBoundary.tsx` | `CareErrorBoundary.test.tsx` (8 Tests) | FM-SYS-02 | VERIFIZIERT |
| REQ-QS-004 | Authentifizierung auf allen API-Endpunkten | `lib/care/api-helpers.ts` (requireAuth) | Alle route.test.ts (401-Tests) | — | VERIFIZIERT |
| REQ-QS-005 | Zugriffskontrolle (IDOR-Schutz) | `lib/care/api-helpers.ts` (requireCareAccess) | Route-Tests (Zugriffskontrolle) | — | VERIFIZIERT |
| REQ-QS-006 | AES-256-GCM Verschluesselung aller Gesundheitsdaten | `lib/care/field-encryption.ts` | `field-encryption.test.ts` (22 Tests) | — | VERIFIZIERT |

## 3. Test-Abdeckungs-Zusammenfassung

| Test-Typ | Anzahl Tests | Dateien | Status |
|----------|-------------|---------|--------|
| Unit-Tests (Vitest) | 272 | 24 | BESTANDEN |
| API-Route-Tests | 31 | 2 | BESTANDEN |
| Komponenten-Tests | 103 | 8 | BESTANDEN |
| Verschluesselungs-Tests | 22 | 1 | BESTANDEN |
| E2E-Szenarien (Playwright) | ~50 | 9 | BEREIT |

## 4. Nicht-abgedeckte Anforderungen

| REQ-ID | Anforderung | Grund | Geplant |
|--------|-------------|-------|---------|
| REQ-SR-003 | Max 4 Taps | Nur teilweise in E2E, kein formaler Tap-Count | Woche 9-12 |
| REQ-QS-007 | Barrierefreiheit (WCAG 2.1 AA) | axe-core-Tests fehlen | Woche 9-12 |
| REQ-QS-008 | Daten-Loeschfristen | Auto-Deletion nicht implementiert | Woche 9-12 |
| REQ-QS-009 | CSP-Header | Noch nicht in next.config.ts | Woche 5-8 |

## 5. Aenderungshistorie

| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.0 | 2026-03-12 | Erstversion mit 30 Anforderungen, 272 Tests |
