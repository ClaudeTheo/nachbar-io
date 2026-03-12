# Nachbar.io — FMEA Care-Modul (Fehlermoeglich- und Einflussanalyse)

> Version 1.0 — Stand: 2026-03-12
> Methode: Prozess-FMEA nach VDA 4.2 / AIAG
> Scope: Alle sicherheitsrelevanten Care-Funktionen

---

## 1. RPZ-Bewertungsskala

**RPZ = Bedeutung (B) x Auftreten (A) x Entdeckung (E)**

| Wert | Bedeutung (B) | Auftreten (A) | Entdeckung (E) |
|------|---------------|---------------|-----------------|
| 1 | Kaum wahrnehmbar | Unwahrscheinlich (<1/10.000) | Sehr hoch (automatisch) |
| 2 | Gering | Sehr selten (1/5.000) | Hoch (Test + Monitoring) |
| 3 | Maessig | Selten (1/2.000) | Mittel (manuell pruefbar) |
| 4 | Hoch | Gelegentlich (1/500) | Gering (schwer zu finden) |
| 5 | Sehr hoch (Lebensgefahr) | Haeufig (1/100) | Keine Erkennung |

**Risikoschwellen:**
- **RPZ >= 60:** KRITISCH — Sofortmassnahme erforderlich
- **RPZ 30-59:** HOCH — Massnahme innerhalb 30 Tagen
- **RPZ 10-29:** MITTEL — Massnahme innerhalb 90 Tagen
- **RPZ < 10:** NIEDRIG — Akzeptabel, Monitoring ausreichend

---

## 2. FMEA-Tabelle: SOS-Modul

| ID | Fehlermodus | Fehlerfolge | B | Fehlerursache | A | Aktuelle Massnahme | E | RPZ | Status |
|----|------------|-------------|---|---------------|---|--------------------|---|-----|--------|
| FM-SOS-01 | SOS-Button reagiert nicht | Senior kann keinen Alarm ausloesen | 5 | JS-Fehler, Netzwerkausfall | 2 | Companion-Device als Backup, Error Boundary | 3 | 30 | HOCH |
| FM-SOS-02 | SOS-Alert wird nicht zugestellt | Helfer erfahren nichts vom Notfall | 5 | Push-Subscription abgelaufen, Browser-Permissions | 3 | Fallback-Kaskade (Push→SMS→Voice), enableFallback | 2 | 30 | HOCH |
| FM-SOS-03 | Eskalations-Cron faellt aus | Alert bleibt auf Stufe 1 stecken, keine Eskalation | 5 | Vercel Cron-Timeout, DB-Fehler | 2 | Cron-Heartbeat-Monitoring, DB-Retry (3x), Admin-Alert | 2 | 20 | MITTEL (war 60) |
| FM-SOS-04 | Push-Benachrichtigung unzuverlaessig | Helfer sieht Alert zu spaet | 4 | Browser-Throttling, DND-Modus, OS-Kill | 4 | Multi-Channel (Push+SMS+Voice ab Stufe 2) | 3 | 48 | HOCH |
| FM-SOS-05 | SMS/Voice-Zustellung scheitert | Kritische Eskalation (Stufe 3+) erreicht Helfer nicht | 5 | Twilio-Ausfall, falsche Telefonnummer | 2 | Retry-Logik (3x, exp. Backoff), permanente Fehler-Erkennung | 3 | 30 | HOCH |
| FM-SOS-06 | Helfer reagiert, aber kommt nicht | Senior wartet vergeblich auf Hilfe | 4 | Helfer verhindert nach Akzeptanz | 2 | Timer fuer accepted→arrived, Re-Eskalation moeglich | 3 | 24 | MITTEL |

---

## 3. FMEA-Tabelle: Check-in-Modul

| ID | Fehlermodus | Fehlerfolge | B | Fehlerursache | A | Aktuelle Massnahme | E | RPZ | Status |
|----|------------|-------------|---|---------------|---|--------------------|---|-----|--------|
| FM-CI-01 | Check-in-Cron faellt aus | Verpasste Check-ins werden nicht erkannt, keine Eskalation | 5 | Vercel Cron-Timeout, DB-Fehler | 2 | Cron-Heartbeat-Monitoring, Health-Endpoint | 2 | 20 | MITTEL (war 60) |
| FM-CI-02 | Auto-SOS bei Nicht-Antwort fehlerhaft | Falschalarm (Senior war nur beschaeftigt) | 3 | 60-Min-Fenster zu kurz, Senior vergisst Smartphone | 3 | Konfigurierbare Zeiten, zweite Erinnerung nach 30 Min | 2 | 18 | MITTEL |
| FM-CI-03 | Senior kann Check-in nicht abgeben | System denkt Senior antwortet nicht → falscher Auto-SOS | 3 | UI-Bug, Netzwerkfehler | 2 | Offline-Toleranz, Companion-Device, manuelle Eskalation stornierbar | 3 | 18 | MITTEL |
| FM-CI-04 | Check-in-Zeiten falsch konfiguriert | Erinnerungen kommen zu unguenstigen Zeiten, Senior ignoriert alle | 2 | Fehlkonfiguration durch Angehoerige | 2 | Default-Werte (08:00, 20:00), Validierung | 2 | 8 | NIEDRIG |

---

## 4. FMEA-Tabelle: Medikamenten-Modul

| ID | Fehlermodus | Fehlerfolge | B | Fehlerursache | A | Aktuelle Massnahme | E | RPZ | Status |
|----|------------|-------------|---|---------------|---|--------------------|---|-----|--------|
| FM-MED-01 | Medikamenten-Cron faellt aus | Keine Erinnerungen, Senior vergisst Medikament | 4 | Vercel Cron-Timeout, DB-Fehler | 2 | Cron-Heartbeat-Monitoring | 2 | 16 | MITTEL (war 40) |
| FM-MED-02 | Falscher Medikamentenname eingegeben | Senior nimmt falsches Medikament | 4 | Tippfehler bei Erfassung durch Angehoerige | 2 | Keine automatische Validierung (kein Medizinprodukt) | 4 | 32 | HOCH |
| FM-MED-03 | Erinnerung kommt, aber wird ignoriert | Senior nimmt Medikament nicht ein | 3 | Push-Benachrichtigung uebersehen, DND-Modus | 3 | Snooze-Funktion, Verpasst-Benachrichtigung an Angehoerige | 2 | 18 | MITTEL |
| FM-MED-04 | Doppelte Einnahme durch doppelte Erinnerung | Ueberdosierung moeglich | 4 | Cron sendet Erinnerung zweimal im 5-Min-Fenster | 1 | Toleranz-Fenster (2.5 Min), Log-Duplikat-Check | 2 | 8 | NIEDRIG |
| FM-MED-05 | Verschluesselung scheitert | Medikamentendaten im Klartext in DB | 3 | CARE_ENCRYPTION_KEY fehlt oder falsch | 1 | Env-Var-Validierung, Fallback-Warnung in Logs | 2 | 6 | NIEDRIG |

---

## 5. FMEA-Tabelle: Emergency-Banner

| ID | Fehlermodus | Fehlerfolge | B | Fehlerursache | A | Aktuelle Massnahme | E | RPZ | Status |
|----|------------|-------------|---|---------------|---|--------------------|---|-----|--------|
| FM-NB-02 | Banner wird geschlossen ohne 112 anzurufen | Senior ruft bei Notfall NICHT 112 an, Lebensgefahr | 5 | Escape-Taste, versehentlicher Klick | 1 | Escape blockiert, 2 explizite Buttons ("112 angerufen" vs "Kein Notruf noetig"), Focus-Trap | 2 | 10 | NIEDRIG (war 60) |
| FM-NB-03 | Banner wird bei Notfall NICHT angezeigt | Senior sieht 112-Hinweis nicht | 5 | Kategoriezuordnung fehlerhaft, Code-Regression | 1 | Hardcodierte Kategorie-Pruefung, Unit-Tests (10 Tests) | 2 | 10 | NIEDRIG |
| FM-NB-04 | tel:112 Link funktioniert nicht | Senior kann nicht direkt anrufen | 5 | Browser-Restriction, Desktop ohne Telefon | 2 | Nummer auch als Text sichtbar, manuell waehlbar | 2 | 20 | MITTEL |

---

## 6. FMEA-Tabelle: System/Infrastruktur

| ID | Fehlermodus | Fehlerfolge | B | Fehlerursache | A | Aktuelle Massnahme | E | RPZ | Status |
|----|------------|-------------|---|---------------|---|--------------------|---|-----|--------|
| FM-SYS-01 | Supabase-Ausfall | Gesamtes System nicht nutzbar | 5 | Cloud-Provider-Ausfall | 1 | EU Frankfurt Region, Supabase SLA 99.9% | 3 | 15 | MITTEL |
| FM-SYS-02 | Vercel-Ausfall | Frontend nicht erreichbar | 4 | Cloud-Provider-Ausfall | 1 | Vercel Edge Network, Multi-Region | 3 | 12 | MITTEL |
| FM-SYS-03 | CARE_ENCRYPTION_KEY kompromittiert | Alle Gesundheitsdaten lesbar | 5 | Env-Var-Leak, Git-Commit | 1 | Nur in Vercel + GitHub Secrets, nie in Code, .env.local in .gitignore | 3 | 15 | MITTEL |
| FM-SYS-04 | RLS-Policy fehlerhaft | Unbefugter Zugriff auf Senior-Daten | 4 | Code-Aenderung bricht Policy | 1 | requireCareAccess() Middleware, Supabase RLS auf allen Tabellen | 3 | 12 | MITTEL |

---

## 7. Zusammenfassung nach Risikostufe

| Stufe | Anzahl | IDs |
|-------|--------|-----|
| KRITISCH (RPZ >= 60) | 0 | — (alle 3 urspruenglich kritischen durch Sofortmassnahmen reduziert) |
| HOCH (RPZ 30-59) | 4 | FM-SOS-01, FM-SOS-02, FM-SOS-04, FM-MED-02 |
| MITTEL (RPZ 10-29) | 10 | FM-SOS-03, FM-SOS-05, FM-SOS-06, FM-CI-01–03, FM-MED-01, FM-MED-03, FM-NB-04, FM-SYS-01–04 |
| NIEDRIG (RPZ < 10) | 6 | FM-CI-04, FM-MED-04, FM-MED-05, FM-NB-02, FM-NB-03 |

### Sofortmassnahmen (bereits implementiert)

| Massnahme | Betroffene IDs | RPZ-Reduktion | Implementiert |
|-----------|---------------|---------------|---------------|
| Cron-Heartbeat-Monitoring | FM-SOS-03, FM-CI-01, FM-MED-01 | 60→20, 60→20, 40→16 | 2026-03-12 |
| EmergencyBanner 2-Button-Bestaetigung | FM-NB-02 | 60→10 | 2026-03-12 |
| Retry-Logik (SMS/Voice) | FM-SOS-05 | 45→30 | 2026-03-12 |
| Fallback-Kaskade (Push→SMS→Voice) | FM-SOS-02 | 45→30 | 2026-03-12 |
| DB-Retry + Admin-Alert (Eskalation) | FM-SOS-03 | Inkludiert in Heartbeat | 2026-03-12 |

### Offene Massnahmen (Woche 5-8)

| Massnahme | Betroffene IDs | Erwartete RPZ-Reduktion |
|-----------|---------------|------------------------|
| Komponenten-Tests fuer SosButton, AlarmScreen | FM-SOS-01 | 30→15 |
| Medikamenten-Validierung (Namens-Autocomplete) | FM-MED-02 | 32→16 |
| Strukturiertes Logging + Alerting | FM-SOS-04, FM-SYS-01-02 | Verbesserte Entdeckung |
| E2E-Tests fuer kritische Pfade | FM-NB-03, FM-NB-04 | 10→5 |

---

## 8. Naechste FMEA-Review

- **Termin:** Nach Abschluss Woche 5-8 Massnahmen
- **Trigger:** Jede neue Funktion im Care-Modul, jeder Sicherheitsvorfall
- **Verantwortlich:** Projektleiter + Entwicklung

---

*Erstellt am: 2026-03-12 | Methode: Prozess-FMEA | Naechste Review: 2026-05-12*
