# Nachbar.io — Datenschutz-Folgenabschaetzung (DSFA) Care-Modul

> Version 1.1 — Stand: 2026-05-25
> Rechtsgrundlage: DSGVO Art. 35 (Datenschutz-Folgenabschaetzung)
> Scope: Care-Modul (SOS, Check-in, Medikamente, Termine, Helfer) + KI-Komponenten (Memory, Voice-Companion, Praevention)
> Referenzen: `docs/AI_ACT_SELF_CHECK.md` (Annex-I/III-Negativ-Statement), `docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md`

## Aenderungen v1.0 → v1.1 (2026-05-25)

1. **Scope erweitert** um KI-Komponenten (Memory-Modul, Voice-Companion, Praevention-Companion).
2. **Indikatoren 8 + 9** (innovative Technologie / Drittlandtransfer) auf „bedingt zutreffend" gesetzt (Aktivierung erst nach AVV/SCC).
3. **Datenkategorien** um pseudonymisierte Memory-Embeddings ergaenzt.
4. **Empfaengerliste** um KI-Anbieter erweitert (Anthropic, OpenAI, Mistral AI, Picovoice).
5. **Neue Risiken R11-R13** (KI-Halluzination im Gesundheitskontext, Provider-Breach, Re-Identifikation aus Embeddings).
6. **Neue Sektion 4.6** KI-spezifische TOMs (Medical-Blocklist, Provider-Off-Switch, Pseudonymisierung, AI_PROVIDER_OFF).
7. **Massnahmenplan** um M11-M14 erweitert (AVV/DPA pro KI-Anbieter).
8. **Verweis** auf AI-Act-Self-Check als Annex-III-Negativ-Statement.

---

## 1. Schwellenwertanalyse: Ist eine DSFA erforderlich?

### Art. 35 Abs. 3 DSGVO — Pflichtfaelle

| Kriterium | Anwendbar? | Begruendung |
|---|---|---|
| a) Automatisierte Bewertung/Profiling mit Rechtswirkung | Nein | Keine automatisierten Einzelentscheidungen |
| b) Umfangreiche Verarbeitung besonderer Kategorien (Art. 9) | **JA** | Gesundheitsdaten (Medikamente, Check-in-Stimmung, SOS-Kategorie) |
| c) Systematische Ueberwachung oeffentlich zugaenglicher Bereiche | Nein | Keine Kamera-/Standort-Ueberwachung |

### EDSA-Leitlinien — Risiko-Indikatoren (WP 248)

| Indikator | Zutreffend? | Details |
|---|---|---|
| 1. Bewertung/Scoring | Nein | Kein Scoring |
| 2. Automatisierte Entscheidungsfindung | Teilweise | Auto-SOS bei Check-in-Timeout (aber stornierbar) |
| 3. Systematische Ueberwachung | Nein | Kein kontinuierliches Monitoring |
| 4. Sensible Daten (Art. 9) | **JA** | Gesundheitsdaten |
| 5. Grosse Datenmenge | Nein | ~30-40 Senioren (Pilotphase) |
| 6. Datensatz-Verknuepfung | Nein | Kein Matching verschiedener Quellen |
| 7. Schutzbeduerftigen Personen | **JA** | Senioren (vulnerable Gruppe) |
| 8. Innovative Technologie | **Bedingt JA** | KI/LLM-Komponenten (Memory, Voice, Praevention) sind aktuell deaktiviert (`AI_PROVIDER_OFF=true`). Aktivierung erst nach AVV/DPA. Solange deaktiviert: Standard-Webtechnologie. |
| 9. Datenuebergabe in Drittlaender | **Bedingt JA** | EU Frankfurt (Supabase, Vercel) bleibt. Bei KI-Aktivierung Anthropic / OpenAI (USA) ueber SCC + Zero-Data-Retention; Mistral AI (FR) als EU-Fallback; Picovoice lokal auf dem Endgeraet. |
| 10. Hinderung an Rechtsausuebung | Nein | Keine Zugangsbeschraenkung |

**Ergebnis: 2 fest + 2 bedingt zutreffend (4 + 7 fest; 8 + 9 bedingt nach KI-Aktivierung). Bei >= 2 Indikatoren ist eine DSFA ERFORDERLICH** — Bewertung in v1.1 weiterhin gegeben. Bei KI-Aktivierung muessen Indikatoren 8 und 9 explizit auf JA gesetzt werden.

---

## 2. Beschreibung der Verarbeitung

### 2.1 Verantwortlicher
Nachbar.io Betreiber (Pilotprojekt Bad Saeckingen)

### 2.2 Zweck der Verarbeitung
Koordination von Nachbarschaftshilfe und Senioren-Unterstuetzung im Quartier, einschliesslich:
- SOS-Alarmierung mit Eskalationskaskade
- Regelmaessige Wohlbefindensabfrage (Check-in)
- Medikamenten-Erinnerungen
- Termin-Erinnerungen
- Helfer-Koordination
- **KI-Memory** (Speicherung vom Nutzer freigegebener Fakten zur Personalisierung; aktiv nur nach Einwilligung; Medical-Blocklist gegen Gesundheitsdaten)
- **Voice-Companion** (Sprachverstaendnis + freundliche Begleitung; keine medizinische Beratung; klar als KI gekennzeichnet)
- **Praevention-Companion** (allgemeine Senior-Information; keine Diagnose/Therapie/medizinischen Ratschlaege)

### 2.3 Rechtsgrundlage

| Verarbeitung | Rechtsgrundlage | Artikel |
|---|---|---|
| Registrierung, Profil | Einwilligung | Art. 6(1)(a) |
| Gesundheitsdaten (Med., Check-in) | Ausdrueckliche Einwilligung | Art. 9(2)(a) |
| SOS-Weiterleitung an Helfer | Lebenswichtiges Interesse + Einwilligung | Art. 6(1)(d) + Art. 9(2)(c) |
| Benachrichtigungen (Push/SMS) | Vertragsdurchfuehrung | Art. 6(1)(b) |
| Audit-Log | Berechtigtes Interesse | Art. 6(1)(f) |
| KI-Memory (allgemeine Fakten) | Einwilligung | Art. 6(1)(a) |
| KI-Memory bei Gesundheitsbezug | Blocklist verhindert Speicherung; bei Umgehung waere Art. 9(2)(a) noetig | Art. 9(2)(a) |
| Voice-/Praevention-Companion | Einwilligung + Vertragsdurchfuehrung | Art. 6(1)(a) + (b) |

### 2.4 Kategorien betroffener Personen

| Kategorie | Anzahl (Pilot) | Besonderheit |
|---|---|---|
| Senioren | ~15-20 | Schutzbeduerfttige Personen |
| Angehoerige | ~20-30 | Zugriff auf Senior-Daten |
| Nachbar-Helfer | ~10-15 | Eingeschraenkter Zugriff |
| Pflegedienst-Mitarbeiter | ~5 | Professioneller Zugriff |

### 2.5 Verarbeitete Datenkategorien

| Datenkategorie | Beispiele | Art. 9? | Verschluesselt? |
|---|---|---|---|
| Identifikationsdaten | Name, E-Mail, Telefon | Nein | Nein (RLS-geschuetzt) |
| Adressdaten | Nur household_id (keine Klartextadresse) | Nein | Pseudonymisiert |
| Gesundheitsdaten | Medikamentennamen, Dosierung, Anweisungen | **Ja** | **AES-256-GCM** |
| Wohlbefinden | Check-in Stimmung (ok/nicht gut/brauche Hilfe), Notizen | **Ja** | **AES-256-GCM** |
| Notfalldaten | SOS-Kategorie, SOS-Notizen | **Ja** | **AES-256-GCM** |
| Termindaten | Termin-Typ, Ort, Notizen | **Ja** | **AES-256-GCM** |
| Nutzungsdaten | Logins, Audit-Log, Cron-Heartbeats | Nein | Nein |
| KI-Memory-Fakten | Pseudonymisierte Texte ueber Vorlieben, Familie, Kontext | Nein (Blocklist verhindert Art. 9) | Pseudonymisierung-Layer |
| Memory-Embeddings | Vektordarstellung der Fakten fuer Aehnlichkeitssuche | Nein | Vektor pseudonymisiert |
| Voice-Transkripte (transient) | STT-Rohtext bei Sprachverarbeitung | Bedingt Art. 9 bei Gesundheitssprache | In-Memory, kein persistentes Storage |

### 2.6 Empfaenger

| Empfaenger | Datenzugang | Rechtsgrundlage |
|---|---|---|
| Verifizierte Nachbar-Helfer | SOS-Alert (Kategorie, Stufe), Check-in-Status | Einwilligung Senior |
| Verifizierte Angehoerige | Alle Care-Daten des Seniors | Einwilligung Senior |
| Verifizierter Pflegedienst | Alle Care-Daten des Seniors | Einwilligung Senior |
| Supabase (Auftragsverarbeiter) | Alle Daten (verschluesselt) | AVV erforderlich |
| Vercel (Auftragsverarbeiter) | Nur Frontend-Assets, keine Daten | AVV erforderlich |
| Twilio (Auftragsverarbeiter) | Telefonnummer + Nachrichtentext bei SMS/Voice | AVV erforderlich |
| Anthropic PBC (USA) | KI-Eingabe (Companion-Prompt + Quartier-Kontext) | AVV/DPA + SCC + Zero-Data-Retention, aktiv erst nach Freigabe |
| OpenAI Inc. (USA) | Text fuer TTS (Vorlesen) | AVV/DPA + SCC, aktiv erst nach Freigabe |
| Mistral AI SAS (FR) | EU-Fallback Sprachverstaendnis | AVV/DPA, EU-Region |
| Picovoice Inc. | Wake-Word lokal auf Endgeraet | Kein Datentransfer |

### 2.7 Speicherdauer

| Daten | Aufbewahrungsfrist | Loeschung |
|---|---|---|
| Care-Profil | Bis Konto-Loeschung | Kaskaden-Loeschung |
| SOS-Alerts | 12 Monate nach Schliessung | Automatisch |
| Check-in-Eintraege | 12 Monate | Automatisch |
| Medikamenten-Logs | 12 Monate | Automatisch |
| Audit-Log | 24 Monate | Automatisch |
| Backups | 30 Tage (Supabase) | Automatisch |

---

## 3. Risikobewertung

### 3.1 Risikomatrix

| # | Risiko | Eintritts-WS | Schwere | Risiko-Score | Massnahme |
|---|--------|-------------|---------|-------------|-----------|
| R1 | Unbefugter Zugriff auf Gesundheitsdaten | Gering | Hoch | MITTEL | RLS, AES-256-GCM, requireCareAccess |
| R2 | Datenverlust durch Systemausfall | Gering | Hoch | MITTEL | Supabase Backups, Point-in-Time Recovery |
| R3 | Fehlbenachrichtigung (falscher Empfaenger) | Sehr gering | Hoch | NIEDRIG | RLS, Helfer-Verifizierung, assigned_seniors |
| R4 | Profilierung durch Check-in-Muster | Gering | Mittel | NIEDRIG | Keine KI-Analyse, nur Zaehlung |
| R5 | Daten-Exfiltration durch XSS/Injection | Gering | Hoch | MITTEL | CSP-Header, Input-Validierung, Parameterized Queries |
| R6 | Unberechtigte Weitergabe durch Helfer | Mittel | Mittel | MITTEL | Nutzungsbedingungen, Verifizierungspflicht, Widerruf |
| R7 | Verschluesselungs-Key kompromittiert | Sehr gering | Sehr hoch | MITTEL | Key nur in Env-Vars, nie in Code, Key-Rotation geplant |
| R8 | Twilio-Subprocessor Datenzugriff | Gering | Mittel | NIEDRIG | AVV mit Twilio, nur Telefonnummer + Nachricht |
| R9 | Falsche SOS-Eskalation verraet Zustand | Gering | Mittel | NIEDRIG | Kategorie verschluesselt, nur Stufe sichtbar |
| R10 | Betroffenenrechte nicht umsetzbar | Gering | Hoch | MITTEL | Loeschkaskade implementiert, Auskunft ueber Admin |
| R11 | KI-Halluzination im Gesundheitskontext (falsche medizinische Aussage) | Mittel | Hoch | MITTEL-HOCH | System-Prompt-Disclaim (`lib/ai/system-prompts/senior-app-knowledge.md`), Voice-Hausnotruf-Selbst-Abgrenzung (2026-05-25), Medical-Blocklist im Memory |
| R12 | KI-Provider-Breach (Anthropic, OpenAI) | Sehr gering | Hoch | MITTEL | SCC + Zero-Data-Retention, Pseudonymisierung vor Versand, `AI_PROVIDER_OFF=true` bis AVV/DPA |
| R13 | Re-Identifikation aus Memory-Embeddings | Gering | Mittel | NIEDRIG-MITTEL | Embeddings ohne direkte Identifier, Blocklist gegen Gesundheits-/Finanzdaten, RLS auf Memory-Tabelle |

### 3.2 Schwere-Bewertung nach Auswirkung auf Betroffene

| Auswirkung | Beispiel | Schwere |
|---|---|---|
| Physisch | Notfall nicht eskaliert → Gesundheitsschaden | Sehr hoch |
| Psychisch | Senior fuehlt sich ueberwacht/kontrolliert | Mittel |
| Materiell | Missbrauch von Gesundheitsdaten (Versicherung) | Hoch |
| Sozial | Nachbarn erfahren Medikamentenliste | Hoch |
| Diskriminierung | Arbeitgeber erfaehrt Pflegebeduerftigkeit | Hoch |

---

## 4. Technische und organisatorische Massnahmen (TOMs)

### 4.1 Vertraulichkeit

| Massnahme | Status | Details |
|---|---|---|
| AES-256-GCM Feldverschluesselung | Implementiert | Alle Art. 9 Felder (12 Felder in 4 Tabellen) |
| Row Level Security (RLS) | Implementiert | Alle Care-Tabellen, is_care_helper_for() |
| requireCareAccess() Middleware | Implementiert | Jede API-Route geprueft |
| CSP-Header | Implementiert | XSS-Schutz, Frame-Blocking |
| HTTPS-only | Implementiert | HSTS mit 2 Jahren max-age |
| Helfer-Verifizierung | Implementiert | Admin muss jeden Helfer freischalten |
| Invite-Code-System | Implementiert | Nur verifizierte Quartiersbewohner |

### 4.2 Integritaet

| Massnahme | Status | Details |
|---|---|---|
| Audit-Log | Implementiert | Alle sicherheitsrelevanten Aktionen protokolliert |
| Input-Validierung | Implementiert | Zod-Schemas fuer alle API-Eingaben |
| Parameterized Queries | Implementiert | Supabase Client (kein Raw SQL) |
| CSRF-Schutz | Implementiert | Next.js SameSite Cookies |
| Idempotente Verschluesselung | Implementiert | aes256gcm:-Praefix verhindert Doppelverschluesselung |

### 4.3 Verfuegbarkeit

| Massnahme | Status | Details |
|---|---|---|
| Supabase EU Frankfurt | Implementiert | DSGVO-konforme Region |
| Cron-Heartbeat-Monitoring | Implementiert | 4 Cron-Jobs ueberwacht |
| Fallback-Kaskade | Implementiert | Push → SMS → Voice |
| Retry-Logik | Implementiert | 3 Versuche mit exp. Backoff |
| Health-Endpoint | Implementiert | /api/admin/health mit Cron-Status |

### 4.4 Belastbarkeit

| Massnahme | Status | Details |
|---|---|---|
| Supabase Point-in-Time Recovery | Verfuegbar | Supabase Pro Plan |
| DB-Retry bei Eskalation | Implementiert | 3 Versuche + Admin-Alert |
| Graceful Degradation | Teilweise | Companion-Device als Backup |

### 4.5 KI-spezifische Massnahmen (neu in v1.1)

| Massnahme | Status | Details |
|---|---|---|
| Globaler Provider-Off-Switch (`AI_PROVIDER_OFF=true`) | Aktiv | Solange aktiv liefern alle KI-Endpunkte 503. Erst nach AVV/DPA + Founder-Go deaktivierbar. |
| Medical-Blocklist (Memory-Modul) | Implementiert | `modules/memory/services/medical-blocklist.ts` — blockt Diagnosen, Medikamente, Therapien, Vitalwerte vor Speicherung |
| `validateMemorySave` Pre-Save-Check | Implementiert | Pruefung jedes Memory-Eintrags gegen Blocklist + Consent |
| System-Prompt Selbst-Abgrenzung (Voice + Companion) | Implementiert | Hausnotruf-/Leitstelle-/Notrufdienst-Negativ-Statement in `modules/voice/services/system-prompt.ts` (Stand 2026-05-25) |
| Pseudonymisierungs-Layer vor Provider-Versand | Geplant | Wird vor erster Aktivierung implementiert; entfernt direkte Identifier aus KI-Prompt |
| KI-Kennzeichnung (Art. 50 AI Act) | Implementiert | Chatbot-Antworten klar als KI markiert, Erinnerungen mit KI-Kennzeichnung |
| Opt-out KI-Funktionen | Implementiert | Pro Funktion ueber Profil-Einstellungen abschaltbar |
| KI-News Caching (Layer-1) | Implementiert | Reduziert API-Aufrufe an Anthropic; senkt Anzahl Drittlandtransfers |
| Annex-I/III-Self-Check | Dokumentiert | `docs/AI_ACT_SELF_CHECK.md` — QuartierApp ist kein Hochrisiko-KI-System |

---

### 4.6 Betroffenenrechte

| Recht | Umsetzung | Status |
|---|---|---|
| Auskunft (Art. 15) | Admin-Export ueber Berichte-Modul | Implementiert |
| Berichtigung (Art. 16) | Profil-Bearbeitung, Medikamenten-Bearbeitung | Implementiert |
| Loeschung (Art. 17) | Kaskaden-Loeschung bei Konto-Loeschung | Geplant (Migration) |
| Einschraenkung (Art. 18) | Deaktivierung einzelner Module (z.B. Check-in) | Implementiert |
| Datenportabilitaet (Art. 20) | JSON-Export ueber Berichte-API | Implementiert |
| Widerspruch (Art. 21) | Helfer-Zuordnung widerrufbar | Implementiert |

---

## 5. Verbleibende Risiken (Restrisiko)

| # | Restrisiko | Bewertung | Begruendung |
|---|-----------|-----------|-------------|
| R1 | Insider-Angriff durch verifizierten Helfer | AKZEPTABEL | Verifizierungspflicht + Audit-Log + Widerrufsmoeglichkeit |
| R2 | Supabase-Breach | AKZEPTABEL | Feldverschluesselung macht Daten ohne Key unlesbar |
| R3 | Key-Kompromittierung | AKZEPTABEL | Key-Rotation geplant, Key nie in Code/Git |
| R4 | Netzwerkausfall bei SOS | AKZEPTABEL MIT EINSCHRAENKUNG | EmergencyBanner zeigt IMMER 112, Companion-Device als Backup |
| R5 | Profilierung durch aggregierte Daten | AKZEPTABEL | Keine KI-Analyse fuer Profiling, nur einfache Zaehlung in Berichten |
| R6 | KI-Halluzination im Senioren-Kontext (z. B. falsche Pflegegrad-Auskunft) | AKZEPTABEL MIT EINSCHRAENKUNG | System-Prompt-Disclaim ("So viel ich weiss..."), Verweis auf VdK/Pflegestuetzpunkte, Hausnotruf-Selbst-Abgrenzung (Stand 2026-05-25). Restrisiko verbleibt, wird durch klare KI-Kennzeichnung (Art. 50) und Opt-out reduziert. |
| R7 | KI-Provider-Drittlandtransfer (Anthropic, OpenAI USA) | AKZEPTABEL NACH AKTIVIERUNG | `AI_PROVIDER_OFF=true` bis AVV/SCC/Zero-Data-Retention dokumentiert. Mistral AI als EU-Fallback verfuegbar. Cloud-Act-Restrisiko bei normalen (nicht-medizinischen) Daten akzeptiert. |

---

## 6. Stellungnahme Datenschutzbeauftragter

> *[PLATZHALTER — Muss vor Produktivbetrieb durch DSB oder externe Beratung ausgefuellt werden]*
>
> Der Datenschutzbeauftragte wurde am _______ konsultiert.
> Stellungnahme: _______________________________________________________
> Datum: _______ | Unterschrift: _______

---

## 7. Konsultation Aufsichtsbehoerde (Art. 36)

### Ist eine Konsultation erforderlich?

Eine vorherige Konsultation der Aufsichtsbehoerde ist erforderlich, wenn das Restrisiko trotz Massnahmen HOCH bleibt.

**Bewertung: NEIN** — Alle Restrisiken sind durch technische und organisatorische Massnahmen auf ein akzeptables Niveau reduziert. Die Feldverschluesselung (AES-256-GCM) schuetzt Art. 9 Daten auch bei einem Breach.

---

## 8. Massnahmenplan

### Sofort (vor Produktivbetrieb)

| # | Massnahme | Verantwortlich | Frist |
|---|-----------|---------------|-------|
| M1 | AVV mit Supabase pruefen/unterzeichnen | Betreiber | Vor Launch |
| M2 | AVV mit Twilio pruefen/unterzeichnen | Betreiber | Vor SMS/Voice-Aktivierung |
| M3 | AVV mit Vercel pruefen/unterzeichnen | Betreiber | Vor Launch |
| M4 | DSB-Stellungnahme einholen | Betreiber | Vor Launch |
| M5 | Einwilligungsdialog (Art. 9) implementieren | Entwicklung | Vor Launch |
| M11 | AVV/DPA mit Anthropic (Claude) inkl. SCC + Zero-Data-Retention-Setting | Betreiber | Vor KI-Aktivierung |
| M12 | AVV/DPA mit OpenAI (TTS) inkl. SCC | Betreiber | Vor TTS-Aktivierung |
| M13 | AVV/DPA mit Mistral AI (EU-Fallback) | Betreiber | Vor EU-Fallback-Aktivierung |
| M14 | Pseudonymisierungs-Layer vor Provider-Versand implementieren | Entwicklung | Vor KI-Aktivierung |
| M15 | KI-Kennzeichnung (Art. 50 AI Act) in allen UI-Touchpoints konsistent | Entwicklung | Vor KI-Aktivierung |

### Mittelfristig (innerhalb 90 Tagen)

| # | Massnahme | Verantwortlich | Frist |
|---|-----------|---------------|-------|
| M6 | Key-Rotation-Mechanismus implementieren | Entwicklung | 90 Tage |
| M7 | Automatische Loeschkaskade (Aufbewahrungsfristen) | Entwicklung | 90 Tage |
| M8 | Datenschutz-Schulung fuer Helfer/Pflegedienst | Betreiber | 60 Tage |
| M9 | Incident-Response-Plan fuer Datenpannen | Betreiber | 60 Tage |
| M10 | Penetrationstest durch externen Dienstleister | Betreiber | 90 Tage |

---

## 9. Ergebnis

Die DSFA ergibt, dass die Verarbeitung von Gesundheitsdaten im Care-Modul von Nachbar.io mit den getroffenen technischen und organisatorischen Massnahmen **datenschutzkonform** durchgefuehrt werden kann. Die identifizierten Risiken sind durch die Kombination aus Feldverschluesselung, RLS, Zugriffskontrolle und Audit-Logging auf ein akzeptables Niveau reduziert.

**Vor dem Produktivbetrieb muessen die Massnahmen M1-M5 umgesetzt werden.**

---

*Erstellt am: 2026-03-12 | v1.1 ergaenzt: 2026-05-25 (KI-Komponenten) | Naechste Pruefung: 2026-11-25 (halbjaehrlich) oder bei wesentlichen Aenderungen, insbesondere bei Deaktivierung von `AI_PROVIDER_OFF`*
