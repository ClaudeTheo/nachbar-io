# Nachbar.io — Validation Master Plan (VMP)

**Version:** 1.0
**Datum:** 2026-03-12
**Autor:** Validierungsteam
**Naechste Ueberpruefung:** 2026-06-12
**Dokumenttyp:** QMS-Kerndokument

## 1. Zweck und Geltungsbereich

### 1.1 Zweck
Dieser Validation Master Plan (VMP) definiert die uebergreifende Validierungsstrategie
fuer das Care-Modul von Nachbar.io. Er beschreibt Vorgehen, Verantwortlichkeiten,
Testansaetze und Akzeptanzkriterien, die sicherstellen, dass die Software ihren
bestimmungsgemaessen Zweck zuverlaessig erfuellt.

### 1.2 Geltungsbereich
- **Produkt:** Nachbar.io Care-Modul (SOS, Check-in, Medikamente, Termine)
- **Regulatorischer Status:** Lifestyle/Welfare Software — KEIN Medizinprodukt (MDCG 2019-11)
- **Pilotumgebung:** Bad Saeckingen (3 Strassen, ~30-40 Haushalte)
- **Ausgeschlossen:** Community-Funktionen (Hilfegesuche, Nachrichten, News, Karte)

### 1.3 Regulatorische Einordnung
| Aspekt | Einordnung | Nachweis |
|--------|------------|----------|
| EU MDR 2017/745 | NICHT anwendbar | `docs/17_MDCG_2019_11_FRAGEBOGEN.md` |
| IEC 62304 | NICHT anwendbar | Option A: Bewusst kein Medizinprodukt |
| DSGVO Art. 35 | DSFA erforderlich (Art. 9 Daten) | `docs/18_DSFA_CARE_MODUL.md` |
| ISO 14971 | Angelehnt (freiwillig) | `docs/19_RISK_REGISTER.md` |
| WCAG 2.1 AA | Ziel fuer Barrierefreiheit | Woche 9-12 |

## 2. Referenzdokumente

| ID | Dokument | Version | Pfad |
|----|----------|---------|------|
| DOC-01 | Intended Use Statement | 1.0 | `docs/15_INTENDED_USE_STATEMENT.md` |
| DOC-02 | FMEA Care-Modul | 1.0 | `docs/16_FMEA_CARE_MODUL.md` |
| DOC-03 | MDCG 2019-11 Fragebogen | 1.0 | `docs/17_MDCG_2019_11_FRAGEBOGEN.md` |
| DOC-04 | DSFA Care-Modul | 1.0 | `docs/18_DSFA_CARE_MODUL.md` |
| DOC-05 | Risk Register | 1.0 | `docs/19_RISK_REGISTER.md` |
| DOC-06 | Traceability Matrix | 1.0 | `docs/20_TRACEABILITY_MATRIX.md` |
| DOC-07 | Incident Response Plan | 1.0 | `docs/21_INCIDENT_RESPONSE_PLAN.md` |
| DOC-08 | Software Requirements Specification | 1.0 | `docs/23_SRS_CARE_MODUL.md` |
| DOC-09 | Test Protocol Pack | 1.0 | `docs/24_TEST_PROTOCOL_PACK.md` |
| DOC-10 | Security Audit | 1.0 | `SECURITY_AUDIT_2026-03-12.md` |

## 3. Validierungsstrategie

### 3.1 Validierungsansatz
Die Validierung folgt einem risikobasierten Ansatz (angelehnt an ISO 14971):

1. **Hazard Analysis (FMEA)** — Identifikation aller Fehlermodi (DOC-02)
2. **Risikobehandlung** — Massnahmen pro Fehlermodus, dokumentiert im Risk Register (DOC-05)
3. **Anforderungsdefinition** — SRS mit 32 funktionalen Anforderungen (DOC-08)
4. **Testdurchfuehrung** — Multi-Level-Teststrategie (siehe 3.2)
5. **Traceability** — Lueckenlose Rueckverfolgung Anforderung → Code → Test → Risiko (DOC-06)
6. **Abnahme** — Formale Testprotokolle mit Bestanden/Nicht-Bestanden (DOC-09)

### 3.2 Test-Ebenen

| Ebene | Werkzeug | Umfang | Aktueller Stand |
|-------|----------|--------|-----------------|
| **Unit Tests** | Vitest + React Testing Library | Einzelne Funktionen, Komponenten | 272 Tests, 24 Dateien |
| **API-Route Tests** | Vitest + Mock-Supabase | Endpunkt-Logik, Auth, Verschluesselung | 31 Tests, 2 Dateien |
| **Komponenten-Tests** | Vitest + RTL | Sicherheitskritische UI-Elemente | 103 Tests, 8 Dateien |
| **Verschluesselungs-Tests** | Vitest | AES-256-GCM Feld-Verschluesselung | 22 Tests, 1 Datei |
| **E2E-Tests** | Playwright Multi-Agent | Komplette Workflows mit 6 Agenten | ~50 Tests, 9 Szenarien |
| **Barrierefreiheit** | axe-core + Playwright | WCAG 2.1 AA Konformitaet | GEPLANT (Woche 9-12) |
| **Penetration Test** | Extern | Sicherheitsueberpruefung | GEPLANT (Woche 9-12) |

### 3.3 Testumgebung

| Komponente | Umgebung | Details |
|------------|----------|---------|
| Frontend | Vercel Preview | Next.js 16, automatische Preview-Deploys |
| Backend | Supabase EU Frankfurt | PostgreSQL, RLS, Realtime |
| CI/CD | GitHub Actions | Lint + Vitest als Gate vor Deploy |
| E2E | Playwright mit Chromium | 6 Test-Agenten, 4 Haushalte |
| Monitoring | /api/admin/health | Cron-Heartbeat, DB-Status, Push-Status |

## 4. Risikobasierte Priorisierung

### 4.1 Sicherheitskritische Funktionen (Prioritaet 1)
Diese Funktionen werden mit hoechster Intensitaet getestet:

| Funktion | FMEA-Referenz | RPN | Teststrategie |
|----------|---------------|-----|---------------|
| SOS-Alert Zustellung | FM-SOS-02 | 30 | Unit + API + E2E + Monitoring |
| EmergencyBanner (112/110) | FM-NB-02 | 10 | 22 Unit-Tests + E2E S8.2 |
| Eskalations-Cron | FM-SOS-03 | 20 | Heartbeat + DB-Retry + Admin-Alert |
| Fallback-Kaskade | FM-SOS-02 | 30 | Unit-Tests fuer jeden Kanal |
| Check-in Erkennung | FM-CI-01 | 20 | Cron + Heartbeat + E2E S9 |

### 4.2 Datenschutz-kritische Funktionen (Prioritaet 2)

| Funktion | Risk-Register | RPN | Teststrategie |
|----------|---------------|-----|---------------|
| AES-256-GCM Verschluesselung | R-007 | 5 | 22 dedizierte Tests |
| IDOR-Schutz (requireCareAccess) | R-008 | 5 | API-Route-Tests + RLS |
| Audit-Log (nur IDs) | R-017 | 6 | Unit-Tests |
| Helper-Zugriffskontrolle | R-018 | 4 | RLS + assigned_seniors Check |

### 4.3 Barrierefreiheit (Prioritaet 3)

| Funktion | Anforderung | Teststrategie |
|----------|-------------|---------------|
| 80px Touch-Targets | REQ-SR-001 | Komponenten-Tests (boundingBox) |
| Max 4 Taps | REQ-SR-003 | E2E Szenarien S5, S9 |
| 4.5:1 Kontrast | WCAG 2.1 AA | axe-core (geplant) |
| Screenreader | WCAG 2.1 AA | axe-core (geplant) |

## 5. Akzeptanzkriterien

### 5.1 Globale Kriterien
| Kriterium | Schwellenwert | Aktueller Stand |
|-----------|---------------|-----------------|
| Unit-Test Erfolgsrate | 100% | 272/272 (100%) |
| API-Test Erfolgsrate | 100% | 31/31 (100%) |
| Komponenten-Test Erfolgsrate | 100% | 103/103 (100%) |
| Kritische FMEA-Risiken (RPZ >= 60) | 0 | 0 (3 → 0 nach Sofortfixes) |
| Hohe FMEA-Risiken (RPZ 30-59) | <= 5 | 4 |
| E2E Szenario-Abdeckung | >= 80% der kritischen Pfade | 9 Szenarien definiert |
| DSGVO Art. 9 Verschluesselung | 100% der Gesundheitsfelder | 12 Felder, 4 Tabellen |
| Console-Errors in Produktion | 0 kritische | E2E S8.6, S9.9 pruefen |

### 5.2 Modul-spezifische Kriterien

**SOS-Modul:**
- EmergencyBanner erscheint bei medical/fire/crime in < 500ms
- 112/110 Links sind klickbar (tel: Protokoll)
- Escape schliesst Banner NICHT
- Fallback-Kaskade: Push → SMS → Voice in < 30s
- Eskalation nach konfigurierter Zeit (Standard: 5 min Level 1 → 2)

**Check-in-Modul:**
- 3 Statuswerte korrekt gespeichert und verschluesselt
- Auto-SOS bei need_help innerhalb 60s
- Cron erkennt verpasste Check-ins innerhalb 2 Cron-Zyklen

**Medikamente-Modul:**
- Erinnerungen zur konfigurierten Zeit (Toleranz: 2.5 min)
- Intervall-Berechnung korrekt (every_hours → Zeitpunkte)
- Status-Badges korrekt fuer alle 5 Zustaende

## 6. Verantwortlichkeiten

| Rolle | Verantwortung | Person |
|-------|---------------|--------|
| Validierungsleiter | VMP-Pflege, Testkoordination, Freigabe | [TBD] |
| Entwicklung | Implementierung, Unit/Komponenten-Tests | Entwicklungsteam |
| QA | E2E-Tests, Testprotokoll-Ausfuehrung | Tester (Pilotnutzer) |
| Datenschutz | DSFA-Review, AVV-Pruefung | DSB (extern) |
| Regulatorik | Zweckbestimmung, MDCG-Review | Recht (extern) |

## 7. Zeitplan

### 7.1 Abgeschlossene Phasen

| Phase | Zeitraum | Deliverables | Status |
|-------|----------|-------------|--------|
| Woche 1-2 | 2026-03-01 bis 2026-03-14 | Sofortfixes (IDOR, Retry, Fallback, Cron) | ABGESCHLOSSEN |
| Woche 3-4 | 2026-03-15 bis 2026-03-28 | Intended Use, MDCG, FMEA, DSFA | ABGESCHLOSSEN |
| Woche 5-8 | 2026-03-29 bis 2026-04-25 | Komponenten-Tests, E2E, Risk Register, Monitoring | ABGESCHLOSSEN |

### 7.2 Aktuelle Phase

| Phase | Zeitraum | Deliverables | Status |
|-------|----------|-------------|--------|
| Woche 9-12 | 2026-04-26 bis 2026-05-23 | VMP, SRS, Test Protocol Pack | IN ARBEIT |
| | | Barrierefreiheits-Tests (axe-core) | GEPLANT |
| | | Third-Party Risk Assessment | GEPLANT |
| | | Externer Penetration Test | GEPLANT |
| | | Pilotbericht + Claims Review | GEPLANT |

### 7.3 Meilensteine

| Meilenstein | Zieldatum | Abhaengigkeit |
|-------------|-----------|---------------|
| VMP + SRS + Testprotokolle fertig | 2026-03-12 | — |
| axe-core Tests implementiert | 2026-04-15 | VMP |
| AVV-Pruefung abgeschlossen | 2026-05-15 | DSFA (DOC-04) |
| Externer Pen-Test abgeschlossen | 2026-05-31 | Risk Register (DOC-05) |
| Pilotbericht | 2026-05-23 | Alle Tests bestanden |
| Validierungsabschluss | 2026-06-01 | Pilotbericht |

## 8. Abweichungsmanagement

### 8.1 Abweichungs-Kategorien
| Kategorie | Definition | Vorgehen |
|-----------|------------|----------|
| KRITISCH | Sicherheitsrelevanter Test schlaegt fehl | Sofortige Behebung, Retest, Dokumentation |
| WESENTLICH | Funktionaler Test schlaegt fehl | Behebung innerhalb 7 Tagen |
| GERINGFUEGIG | Kosmetisch, keine Funktionseinschraenkung | Backlog, naechstes Release |

### 8.2 Abweichungsprozess
1. Abweichung dokumentieren (GitHub Issue, Label: `validation-deviation`)
2. Ursachenanalyse (5-Why)
3. Massnahme definieren und umsetzen
4. Retest durchfuehren
5. Abweichung schliessen mit Nachweis

## 9. Change Control

### 9.1 Aenderungen am VMP
Aenderungen an diesem Dokument erfordern:
- Review durch Validierungsleiter
- Aktualisierung der Versionsnummer
- Eintrag in Aenderungshistorie (Abschnitt 12)

### 9.2 Aenderungen an der Software
Aenderungen an sicherheitskritischen Funktionen erfordern:
- Impact Assessment (welche FMEA-IDs betroffen?)
- Anpassung der Traceability Matrix (DOC-06)
- Regression-Tests (CI/CD-Gate: alle Tests muessen bestehen)
- Aktualisierung Risk Register (DOC-05) bei neuen Risiken

## 10. Dokumentations-Hierarchie

```
VMP (dieses Dokument)
├── Intended Use Statement (DOC-01)
├── FMEA Care-Modul (DOC-02)
│   └── Risk Register (DOC-05)
├── MDCG 2019-11 Fragebogen (DOC-03)
├── DSFA Care-Modul (DOC-04)
│   └── Incident Response Plan (DOC-07)
├── SRS Care-Modul (DOC-08)
│   └── Traceability Matrix (DOC-06)
└── Test Protocol Pack (DOC-09)
    ├── Unit-Test-Berichte (CI/CD)
    ├── E2E-Test-Berichte (Playwright)
    ├── axe-core-Berichte (geplant)
    └── Pen-Test-Bericht (extern, geplant)
```

## 11. Audit-Trail

Alle Validierungsaktivitaeten werden nachvollziehbar dokumentiert:

| Nachweis | Speicherort | Format |
|----------|-------------|--------|
| Test-Ergebnisse | GitHub Actions CI/CD Logs | JSON/XML |
| Code-Reviews | GitHub Pull Requests | Markdown |
| Aenderungshistorie | Git Commits (signiert) | Git Log |
| Abweichungen | GitHub Issues (Label: validation-deviation) | Markdown |
| Risiko-Aenderungen | Risk Register (DOC-05) Aenderungshistorie | Markdown |
| FMEA-Updates | FMEA (DOC-02) Aenderungshistorie | Markdown |

## 12. Aenderungshistorie

| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.0 | 2026-03-12 | Erstversion — VMP fuer Care-Modul |
