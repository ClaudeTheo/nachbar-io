# Nachbar.io — Risk Register (ISO 14971 angelehnt)

**Version:** 1.0
**Datum:** 2026-03-12
**Autor:** Validierungsteam
**Naechste Ueberpruefung:** 2026-06-12

## 1. Zweck

Dieses Risk Register dokumentiert alle identifizierten Risiken fuer das Care-Modul
von Nachbar.io gemaess dem Risikomanagement-Prozess (angelehnt an ISO 14971).
Es dient als lebendes Dokument und wird bei jeder wesentlichen Aenderung aktualisiert.

## 2. Risikobewertungsmethodik

### Schweregrad (S)
| Stufe | Bezeichnung | Definition |
|-------|-------------|------------|
| 5 | Katastrophal | Tod oder schwere Verletzung |
| 4 | Kritisch | Schwere gesundheitliche Schaeden |
| 3 | Ernst | Mittlere gesundheitliche Schaeden, erhebliche Verzoegerung |
| 2 | Geringfuegig | Leichte Unannehmlichkeiten, kurze Verzoegerung |
| 1 | Vernachlaessigbar | Keine Auswirkung auf Gesundheit oder Sicherheit |

### Eintrittswahrscheinlichkeit (P)
| Stufe | Bezeichnung | Definition |
|-------|-------------|------------|
| 5 | Haeufig | Tritt regelmaessig auf (>1x/Woche) |
| 4 | Wahrscheinlich | Tritt gelegentlich auf (1x/Monat) |
| 3 | Moeglich | Kann auftreten (1x/Quartal) |
| 2 | Unwahrscheinlich | Selten (1x/Jahr) |
| 1 | Fernliegend | Theoretisch moeglich (<1x/10 Jahre) |

### Risikoprioritaet (RPN = S × P)
| RPN | Einstufung | Handlung |
|-----|------------|----------|
| 15-25 | KRITISCH | Sofortige Massnahme erforderlich |
| 8-14 | HOCH | Massnahme innerhalb 30 Tagen |
| 4-7 | MITTEL | Massnahme innerhalb 90 Tagen |
| 1-3 | NIEDRIG | Akzeptabel, Monitoring |

## 3. Risk Register

### 3.1 Sicherheitskritische Risiken

| ID | Risiko | Modul | S | P | RPN | Status | Massnahme | Verantwortlich |
|----|--------|-------|---|---|-----|--------|-----------|----------------|
| R-001 | SOS-Alert wird nicht zugestellt (Push-Fehler) | SOS | 4 | 3 | 12 | MITIGIERT | Fallback-Kaskade: Push→SMS→Voice (3 Retries) | Entwicklung |
| R-002 | EmergencyBanner wird nicht angezeigt bei Notfall | SOS | 5 | 2 | 10 | MITIGIERT | Komponenten-Tests (FMEA FM-NB-02), Focus-Trap, Escape-Block | Entwicklung |
| R-003 | Eskalations-Cron faellt aus (keine Weiterleitung) | SOS | 4 | 3 | 12 | MITIGIERT | Cron-Heartbeat-Monitoring, DB-Retry (3x), Admin-Alert | Entwicklung |
| R-004 | Check-in-Verpasst wird nicht erkannt | Check-in | 3 | 3 | 9 | MITIGIERT | Cron-basierte Ueberpruefung, Heartbeat-Status | Entwicklung |
| R-005 | Medikamenten-Erinnerung wird nicht gesendet | Medikamente | 4 | 2 | 8 | MITIGIERT | Intervall-Bug behoben, Zeitpunkte statt Stunden-Zaehler | Entwicklung |
| R-006 | Falsche Medikamenten-Zeit bei Intervall-Typ | Medikamente | 3 | 2 | 6 | MITIGIERT | Berechnung korrigiert (every_hours → Zeitpunkte), Tests | Entwicklung |
| R-007 | Sensible Gesundheitsdaten werden unverschluesselt gespeichert | DSGVO | 5 | 1 | 5 | MITIGIERT | AES-256-GCM Feld-Verschluesselung, 22 Tests verifiziert | Entwicklung |
| R-008 | IDOR-Zugriff auf fremde Patientendaten | DSGVO | 5 | 1 | 5 | MITIGIERT | requireCareAccess() auf allen Endpunkten, RLS-Policies | Entwicklung |

### 3.2 Betriebliche Risiken

| ID | Risiko | Modul | S | P | RPN | Status | Massnahme | Verantwortlich |
|----|--------|-------|---|---|-----|--------|-----------|----------------|
| R-009 | Supabase-Service nicht erreichbar | Infrastruktur | 3 | 2 | 6 | OFFEN | Multi-Region-Failover evaluieren (Woche 9-12) | Betrieb |
| R-010 | SMS/Voice-Kanaele ueberlasten bei Massenalarm | SOS | 3 | 2 | 6 | TEILWEISE | Twilio Rate-Limits beachten, Queue-Begrenzung | Entwicklung |
| R-011 | Pilotnutzer verstehen UI nicht (Senior) | UX | 2 | 3 | 6 | OFFEN | Pilot-Feedback auswerten, Usability-Tests | Produkt |
| R-012 | CSP-Header fehlen (XSS-Risiko) | Sicherheit | 3 | 2 | 6 | OFFEN | CSP in next.config.ts implementieren | Entwicklung |

### 3.3 Regulatorische Risiken

| ID | Risiko | Modul | S | P | RPN | Status | Massnahme | Verantwortlich |
|----|--------|-------|---|---|-----|--------|-----------|----------------|
| R-013 | Fehlklassifizierung als Medizinprodukt durch Behoerde | Regulatorisch | 4 | 1 | 4 | MITIGIERT | MDCG 2019-11 Fragebogen, Intended Use Statement, Disclaimer | Recht |
| R-014 | DSGVO-Verstoss durch fehlende Loeschfristen | DSGVO | 4 | 2 | 8 | TEILWEISE | Auto-Deletion in DSFA geplant, noch nicht implementiert | Entwicklung |
| R-015 | Fehlende AVV mit Supabase/Twilio | DSGVO | 3 | 2 | 6 | OFFEN | AVV-Pruefung in Woche 9-12 geplant | Recht |
| R-016 | Unzureichende Dokumentation fuer Audit | Regulatorisch | 2 | 3 | 6 | TEILWEISE | Risk Register + Traceability Matrix erstellt | Validierung |

### 3.4 Datenschutz-Risiken

| ID | Risiko | Modul | S | P | RPN | Status | Massnahme | Verantwortlich |
|----|--------|-------|---|---|-----|--------|-----------|----------------|
| R-017 | Audit-Log enthaelt unverschluesselte PII | DSGVO | 3 | 2 | 6 | MITIGIERT | Audit-Log speichert nur IDs, keine Klartexte | Entwicklung |
| R-018 | Helfer sieht Daten fremder Senioren | DSGVO | 4 | 1 | 4 | MITIGIERT | assigned_seniors-Check in getCareRole(), RLS | Entwicklung |
| R-019 | Browser-Cache speichert Gesundheitsdaten | DSGVO | 3 | 2 | 6 | OFFEN | Cache-Control Header setzen, SWR-Caching pruefen | Entwicklung |

## 4. Risiko-Trend

| Datum | KRITISCH | HOCH | MITTEL | NIEDRIG | Total |
|-------|----------|------|--------|---------|-------|
| 2026-03-12 (FMEA) | 3 | 4 | 10 | 6 | 23 |
| 2026-03-12 (nach Sofortfixes) | 0 | 4 | 10 | 6 | 20 |
| 2026-03-12 (Risk Register v1.0) | 0 | 3 | 11 | 5 | 19 |

## 5. Offene Massnahmen

| ID | Massnahme | Prioritaet | Frist | Status |
|----|-----------|------------|-------|--------|
| M-001 | CSP-Header implementieren | HOCH | 2026-03-31 | OFFEN |
| M-002 | Auto-Deletion fuer abgelaufene Daten | HOCH | 2026-04-30 | OFFEN |
| M-003 | AVV-Pruefung Supabase/Twilio | MITTEL | 2026-05-15 | OFFEN |
| M-004 | Supabase Multi-Region evaluieren | MITTEL | 2026-06-01 | OFFEN |
| M-005 | Cache-Control Header fuer Care-Seiten | MITTEL | 2026-04-15 | OFFEN |
| M-006 | Security Penetration Test extern | HOCH | 2026-05-31 | OFFEN |
| M-007 | Usability-Test mit Pilot-Senioren | MITTEL | 2026-04-30 | OFFEN |

## 6. Anhang

### Referenzen
- FMEA: `docs/16_FMEA_CARE_MODUL.md`
- Security Audit: `SECURITY_AUDIT_2026-03-12.md`
- DSFA: `docs/18_DSFA_CARE_MODUL.md`
- MDCG 2019-11: `docs/17_MDCG_2019_11_FRAGEBOGEN.md`
- Intended Use: `docs/15_INTENDED_USE_STATEMENT.md`
- Gap Analysis: `VALIDATION_COMPLIANCE_GAP_ANALYSIS.md`

### Aenderungshistorie
| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.0 | 2026-03-12 | Erstversion basierend auf FMEA + Security Audit |
