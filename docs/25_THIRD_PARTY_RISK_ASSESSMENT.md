# Nachbar.io — Third-Party Risk Assessment & AVV-Pruefung

**Version:** 1.0
**Datum:** 2026-03-12
**Autor:** Validierungsteam
**Naechste Ueberpruefung:** 2026-06-12
**Dokumenttyp:** Datenschutz & Lieferanten-Risikobewertung

## 1. Zweck

Dieses Dokument bewertet alle Drittanbieter-Dienste, die im Care-Modul von Nachbar.io
personenbezogene Daten verarbeiten. Es dokumentiert den AVV-Status (Auftragsverarbeitungsvertrag)
und identifiziert Risiken gemaess DSGVO Art. 28.

## 2. Rechtsgrundlage

- **DSGVO Art. 28:** Auftragsverarbeiter muessen per AVV gebunden sein
- **DSGVO Art. 44-49:** Drittland-Transfers erfordern zusaetzliche Garantien
- **DSFA Care-Modul:** `docs/18_DSFA_CARE_MODUL.md` — Massnahmen M1-M3

## 3. Uebersicht der Drittanbieter

| # | Anbieter | Dienst | Daten | Standort | AVV-Status |
|---|----------|--------|-------|----------|------------|
| 1 | Supabase Inc. | Datenbank, Auth, Realtime | Alle personenbezogenen Daten | EU Frankfurt | PRUEFUNG NOETIG |
| 2 | Twilio Inc. | SMS, Voice | Telefonnummern, Nachrichtentexte | USA (EU Routing) | PRUEFUNG NOETIG |
| 3 | Vercel Inc. | Frontend-Hosting, Edge Functions | IP-Adressen, Cookies | EU (Edge) | PRUEFUNG NOETIG |
| 4 | GitHub Inc. | Source Code, CI/CD | Kein PII (Code-Repository) | USA | NICHT ERFORDERLICH |
| 5 | Open-Meteo | Wetter-API | Koordinaten (keine PII) | EU | NICHT ERFORDERLICH |

## 4. Detailbewertung

### 4.1 Supabase — Datenbank & Authentifizierung

**Dienst-Beschreibung:**
- PostgreSQL-Datenbank mit Row-Level-Security (RLS)
- Authentifizierung (E-Mail/Passwort, Magic Link)
- Realtime-Subscriptions (WebSocket)
- Storage (Profilbilder)

**Verarbeitete Daten:**
| Datenkategorie | DSGVO-Artikel | Verschluesselt |
|---------------|---------------|----------------|
| Name, E-Mail, Telefon | Art. 6 | Nein (Transport: TLS) |
| Passwort-Hashes | Art. 6 | Ja (bcrypt) |
| Medikamentennamen, Dosierungen | Art. 9 | Ja (AES-256-GCM) |
| Check-in-Stimmungen | Art. 9 | Ja (AES-256-GCM) |
| SOS-Kategorien, Notizen | Art. 9 | Ja (AES-256-GCM) |
| Termin-Notizen | Art. 9 | Ja (AES-256-GCM) |

**Sicherheitsbewertung:**

| Kriterium | Bewertung | Details |
|-----------|-----------|---------|
| Rechenzentrum | EU Frankfurt (aws-eu-central-1) | DSGVO-konform |
| Zertifizierungen | SOC 2 Type II | Jaehrlich erneuert |
| Verschluesselung at rest | AES-256 (Datenbank-Ebene) | Standard |
| Verschluesselung in transit | TLS 1.3 | Standard |
| Feld-Verschluesselung | Nicht nativ — von uns implementiert | AES-256-GCM |
| Backups | Point-in-Time Recovery | EU Frankfurt |
| Zugriffskontrolle | RLS-Policies + API-Keys | Konfiguriert |
| Incident Response | 24h SLA (Business Plan) | Verifizieren |

**Risiken:**

| Risiko | Wahrscheinlichkeit | Auswirkung | Mitigation |
|--------|-------------------|------------|------------|
| Supabase-Breach (DB-Zugriff) | Niedrig | Hoch | AES-256-GCM Feldverschluesselung macht Daten ohne Key unlesbar |
| Supabase-Ausfall | Niedrig | Mittel | Cron-Heartbeat erkennt Ausfall, Companion-Device als Backup |
| RLS-Policy Fehler | Niedrig | Hoch | requireCareAccess() als zusaetzliche Schutzschicht |
| Backup-Missbrauch durch Supabase-Personal | Sehr niedrig | Hoch | Feldverschluesselung schuetzt Art. 9 Daten |

**AVV-Pruefung:**

| Pruefpunkt | Status | Anmerkung |
|------------|--------|-----------|
| AVV / DPA vorhanden | ZU PRUEFEN | Supabase bietet Standard-DPA unter supabase.com/privacy |
| Unterauftragsverarbeiter gelistet | ZU PRUEFEN | AWS als Sub-Processor bekannt |
| Art. 28 Abs. 3 Mindestinhalte | ZU PRUEFEN | Weisungsgebundenheit, Vertraulichkeit, TOMs |
| Drittland-Transfer | NEIN (EU Frankfurt) | Kein SCCs noetig |
| Loeschpflicht bei Vertragsende | ZU PRUEFEN | Standard bei Supabase |
| Audit-Recht | ZU PRUEFEN | SOC 2 Report als Ersatz moeglich |

**Massnahme:** AVV pruefen und ggf. ergaenzen — **Frist: 2026-05-15**

---

### 4.2 Twilio — SMS & Voice-Anrufe

**Dienst-Beschreibung:**
- SMS-Versand fuer SOS-Benachrichtigungen (Fallback Level 2)
- Voice-Anrufe fuer SOS-Benachrichtigungen (Fallback Level 3)
- Absendernummer: +16292840474 (US-Nummer)

**Verarbeitete Daten:**
| Datenkategorie | DSGVO-Artikel | Verschluesselt |
|---------------|---------------|----------------|
| Empfaenger-Telefonnummer | Art. 6 | Transport: TLS |
| SMS-Nachrichtentext | Art. 6 (kein Art. 9 Inhalt) | Transport: TLS |
| Voice-Nachrichtentext (TwiML) | Art. 6 | Transport: TLS |

**Sicherheitsbewertung:**

| Kriterium | Bewertung | Details |
|-----------|-----------|---------|
| Rechenzentrum | USA (EU-Routing moeglich) | Drittland-Transfer! |
| Zertifizierungen | SOC 2 Type II, ISO 27001, PCI DSS | Umfangreich |
| Verschluesselung in transit | TLS 1.2+ | Standard |
| Datenspeicherung | 7-400 Tage (Log-Aufbewahrung) | Konfigurierbar |
| HIPAA-konform | Ja (Business Associate Agreement) | Fuer US-Gesundheitsdaten |
| EU-Datenlokalisierung | Optional (EU Interconnect) | Pruefen |

**Risiken:**

| Risiko | Wahrscheinlichkeit | Auswirkung | Mitigation |
|--------|-------------------|------------|------------|
| Drittland-Transfer (USA) | Hoch | Mittel | EU-SCCs erforderlich, Data Privacy Framework |
| Twilio-Breach | Niedrig | Niedrig | Nur Telefonnummern + generische Nachrichtentexte |
| SMS-Inhalt enthaelt Gesundheitsdaten | Niedrig | Mittel | Nachrichtentexte enthalten KEINE spezifischen Gesundheitsdaten |
| Twilio-Ausfall | Niedrig | Mittel | Fallback-Kaskade: Push ist primaerer Kanal |
| Log-Retention zu lang | Mittel | Niedrig | Retention-Period auf Minimum setzen |

**AVV-Pruefung:**

| Pruefpunkt | Status | Anmerkung |
|------------|--------|-----------|
| AVV / DPA vorhanden | ZU PRUEFEN | Twilio bietet Standard-DPA unter twilio.com/legal/data-protection |
| Unterauftragsverarbeiter gelistet | ZU PRUEFEN | AWS, Google Cloud als Sub-Processors |
| EU-US Data Privacy Framework | ZU PRUEFEN | Twilio nimmt teil (verifizieren) |
| SCCs (Standard Contractual Clauses) | ERFORDERLICH | Drittland-Transfer nach USA |
| Loeschpflicht | ZU PRUEFEN | Log-Retention konfigurieren |
| TOM-Nachweis | ZU PRUEFEN | SOC 2 + ISO 27001 Reports anfordern |

**Massnahme:** AVV + SCCs pruefen, Log-Retention minimieren — **Frist: 2026-05-15**

---

### 4.3 Vercel — Frontend-Hosting

**Dienst-Beschreibung:**
- Next.js Frontend-Hosting (SSR + Static)
- Edge Functions (API-Routes)
- Preview Deployments
- Analytics (optional, nicht aktiviert)

**Verarbeitete Daten:**
| Datenkategorie | DSGVO-Artikel | Verschluesselt |
|---------------|---------------|----------------|
| IP-Adressen (Server-Logs) | Art. 6 | Nein |
| Session-Cookies | Art. 6 | Ja (httpOnly, secure, sameSite) |
| Request-Headers | Art. 6 | Nein |

**Sicherheitsbewertung:**

| Kriterium | Bewertung | Details |
|-----------|-----------|---------|
| Rechenzentrum | Edge Network (EU-Knoten vorhanden) | Anfragen werden zum naechsten Edge geroutet |
| Zertifizierungen | SOC 2 Type II | Standard |
| Verschluesselung in transit | TLS 1.3 (HSTS) | Standard |
| Datenspeicherung | Server-Logs ~30 Tage | Standard |
| Analytics | NICHT aktiviert | Keine Tracking-Daten |
| DSGVO-Konformitaet | GDPR-ready (DPA verfuegbar) | Standard |

**Risiken:**

| Risiko | Wahrscheinlichkeit | Auswirkung | Mitigation |
|--------|-------------------|------------|------------|
| Drittland-Transfer (USA HQ) | Mittel | Niedrig | EU Edge, nur IP-Adressen in Logs |
| Vercel-Ausfall | Niedrig | Mittel | Edge Network mit Multi-Region |
| Server-Side Code Zugriff | Sehr niedrig | Mittel | Env-Vars verschluesselt, kein PII im Code |
| Log-Retention | Niedrig | Niedrig | Nur IP-Adressen, keine Gesundheitsdaten |

**AVV-Pruefung:**

| Pruefpunkt | Status | Anmerkung |
|------------|--------|-----------|
| AVV / DPA vorhanden | ZU PRUEFEN | Vercel bietet DPA unter vercel.com/legal/dpa |
| Datenminimierung | OK | Nur technisch notwendige Daten |
| SCCs | EMPFOHLEN | Fuer US-basierte Verarbeitung |
| Sub-Processors | ZU PRUEFEN | AWS, Cloudflare als Infra-Partner |

**Massnahme:** AVV pruefen und unterzeichnen — **Frist: 2026-05-15**

---

### 4.4 GitHub — Source Code & CI/CD

**Dienst-Beschreibung:**
- Git-Repository fuer Quellcode
- GitHub Actions fuer CI/CD (Lint, Test, Deploy)
- Issues fuer Bug-Tracking

**Verarbeitete Daten:**
- Quellcode (kein PII enthalten, .env in .gitignore)
- CI/CD-Logs (keine PII, nur Build-Output)
- Developer-Identitaeten (Git-Commits)

**Bewertung:** Kein AVV erforderlich — es werden keine personenbezogenen Daten von Endnutzern verarbeitet. Entwickler-Daten (Name, E-Mail in Commits) fallen nicht unter die DSFA.

---

### 4.5 Open-Meteo — Wetter-API

**Dienst-Beschreibung:**
- Wetter-Daten fuer Companion-Device (reTerminal)
- Abfrage: GET mit Koordinaten (Breiten-/Laengengrad)

**Verarbeitete Daten:**
- Geo-Koordinaten des Quartiers (oeffentlich bekannt, kein PII)
- Keine Nutzeridentifikation

**Bewertung:** Kein AVV erforderlich — keine personenbezogenen Daten werden uebermittelt.

## 5. Drittland-Transfer Bewertung

### 5.1 Uebersicht

| Anbieter | Hauptstandort | EU-Verarbeitung | Drittland-Transfer | Schutzgarantie |
|----------|--------------|-----------------|-------------------|----------------|
| Supabase | USA (HQ) | EU Frankfurt (DB) | NEIN | — |
| Twilio | USA | USA (mit EU-Routing) | JA | SCCs + DPF erforderlich |
| Vercel | USA | EU Edge Nodes | TEILWEISE | SCCs empfohlen |
| GitHub | USA | USA | NEIN (kein PII) | — |
| Open-Meteo | EU | EU | NEIN | — |

### 5.2 Bewertung nach Schrems II

Fuer Twilio (und potenziell Vercel) ist eine Transfer Impact Assessment (TIA) gemaess
Schrems II erforderlich:

1. **Art der uebermittelten Daten:** Telefonnummern + generische Nachrichtentexte (kein Art. 9)
2. **Zugriff durch US-Behoerden:** Theoretisch moeglich (FISA 702), aber:
   - Keine Gesundheitsdaten in Twilio-Nachrichten
   - Telefonnummern allein haben begrenzten Informationsgehalt
3. **Zusaetzliche Schutzmassnahmen:**
   - Nachrichtentexte enthalten keine Klarnamen oder Gesundheitsdetails
   - SOS-Benachrichtigungen verwenden generische Texte ("Ihr Nachbar benoetigt Hilfe")
   - Twilio ist EU-US Data Privacy Framework zertifiziert (zu verifizieren)

**Risiko-Einstufung:** AKZEPTABEL mit SCCs + TIA-Dokumentation

## 6. AVV-Aktionsplan

### 6.1 Sofort-Massnahmen (vor Produktionsbetrieb)

| # | Massnahme | Anbieter | Verantwortlich | Frist | Status |
|---|-----------|----------|---------------|-------|--------|
| A-001 | DPA pruefen und unterschreiben | Supabase | Recht | 2026-05-15 | OFFEN |
| A-002 | DPA + SCCs pruefen und unterschreiben | Twilio | Recht | 2026-05-15 | OFFEN |
| A-003 | DPA pruefen und unterschreiben | Vercel | Recht | 2026-05-15 | OFFEN |
| A-004 | Twilio Log-Retention auf Minimum setzen | Entwicklung | 2026-04-15 | OFFEN |
| A-005 | Transfer Impact Assessment (TIA) dokumentieren | Recht | 2026-05-15 | OFFEN |

### 6.2 Mittelfristige Massnahmen

| # | Massnahme | Verantwortlich | Frist | Status |
|---|-----------|---------------|-------|--------|
| A-006 | Sub-Processor-Listen aller Anbieter dokumentieren | Recht | 2026-06-15 | OFFEN |
| A-007 | Jaehrliche Ueberpruefung aller AVVs einplanen | Validierung | 2026-12-15 | OFFEN |
| A-008 | SOC 2 Reports von Supabase + Twilio anfordern | Recht | 2026-06-15 | OFFEN |
| A-009 | Twilio EU-Interconnect evaluieren | Entwicklung | 2026-06-15 | OFFEN |

## 7. Risiko-Zusammenfassung

| Anbieter | Gesamtrisiko | Begruendung |
|----------|-------------|-------------|
| **Supabase** | NIEDRIG | EU Frankfurt, Feldverschluesselung schuetzt Art. 9 Daten |
| **Twilio** | MITTEL | Drittland-Transfer, aber nur Telefonnummern + generische Texte |
| **Vercel** | NIEDRIG | EU Edge, nur IP-Adressen, keine Gesundheitsdaten |
| **GitHub** | NIEDRIG | Kein PII, nur Quellcode |
| **Open-Meteo** | VERNACHLAESSIGBAR | Kein PII |

**Gesamtbewertung:** Das Drittanbieter-Risiko ist mit den implementierten technischen
Massnahmen (AES-256-GCM Feldverschluesselung, RLS, Datenminimierung) beherrschbar.
AVV-Unterschriften fuer Supabase, Twilio und Vercel sind vor Produktionsbetrieb erforderlich.

## 8. Referenzen

| Dokument | Pfad |
|----------|------|
| DSFA Care-Modul (Massnahmen M1-M5) | `docs/18_DSFA_CARE_MODUL.md` |
| Risk Register (R-015: Fehlende AVVs) | `docs/19_RISK_REGISTER.md` |
| Incident Response Plan | `docs/21_INCIDENT_RESPONSE_PLAN.md` |
| Intended Use Statement | `docs/15_INTENDED_USE_STATEMENT.md` |

## 9. Aenderungshistorie

| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.0 | 2026-03-12 | Erstversion — 5 Anbieter bewertet, 9 Massnahmen definiert |
