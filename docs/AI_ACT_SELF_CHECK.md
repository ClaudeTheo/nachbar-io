# QuartierApp — AI Act Self-Check

> **Stand:** 2026-05-25
> **Verantwortlich:** Theobase GmbH (in Gruendung), Thomas Theobald
> **Scope:** alle KI-Funktionen der QuartierApp (Web + Senior-App + Arzt-Portal)
> **Rechtsgrundlage Self-Check:** EU Verordnung 2024/1689 (AI Act), Stand nach KI-Omnibus (politische Einigung Mai 2026)

---

## Executive Summary

QuartierApp ist **kein Hochrisiko-KI-System nach Annex III** der EU-KI-Verordnung und auch **kein Bestandteil eines harmonisierten Produkts nach Annex I** (kein Medizinprodukt, keine Spielzeugsoftware, keine Maschinensteuerung etc.). Die eingesetzten KI-Komponenten sind ausschliesslich beratend, informativ oder assistierend; sie treffen keine automatisierten Entscheidungen mit Rechtswirkung gegen natuerliche Personen.

Daraus folgt: Es gelten die **Transparenz- und Informationspflichten** des AI Act (insbesondere Art. 50, Kennzeichnung von KI-generierten Inhalten und Chatbots), aber **keine Hochrisiko-Pflichten** wie Konformitaetsbewertung, Risikomanagement-System, technische Dokumentation oder Marktueberwachung nach Art. 9-49 AI Act.

Diese Bewertung wird ueberprueft, sobald eine neue KI-Funktion in den Code geht, der Funktionsumfang einer bestehenden Funktion sich aenderet oder die EU-Kommission ihre Hochrisiko-Klassifizierungsleitlinien anpasst.

---

## 1. Pruefung Annex I (Sicherheitsbestandteil harmonisierter Produkte)

| Annex-I-Sektor | Greift fuer QuartierApp? | Begruendung |
|---|---|---|
| Medizinprodukte (MDR 2017/745) | **Nein** | Self-Statement siehe AGB § 5.1 und Impressum: kein diagnostischer, therapeutischer oder klinischer Ueberwachungszweck. Keine MDR-CE-Konformitaetsbewertung erforderlich (RPP-001 dokumentiert). |
| In-vitro-Diagnostika (IVDR 2017/746) | Nein | Keine Diagnostik |
| Maschinen, Spielzeug, Funkanlagen, Aufzuege, ATEX etc. | Nein | Keine Hardware-Steuerung |
| Kraftfahrzeuge, Luftfahrt, Schiffe | Nein | Nicht zutreffend |

**Ergebnis:** Annex I greift nicht. Eine MDR-Klassifizierung als Medizinprodukt wurde geprueft und negativ entschieden.

---

## 2. Pruefung Annex III (eigenstaendige Hochrisiko-Use-Cases)

Annex III AI Act listet 8 Kategorien von Hochrisiko-Systemen. QuartierApp wird gegen jede dieser Kategorien geprueft.

| # | Annex-III-Kategorie | Trifft zu? | Begruendung |
|---|---|---|---|
| 1 | Biometrische Identifikation / Kategorisierung | **Nein** | Keine Gesichtserkennung, keine Stimm-ID, kein Fingerabdruck. Wake-Word (Picovoice) erkennt **kein Individuum**, sondern ein generisches Schluesselwort. |
| 2 | Kritische Infrastruktur (Energie, Wasser, Verkehr) | Nein | QuartierApp steuert keine Infrastruktur. |
| 3 | Bildung und berufliche Bildung (Bewertung Lernerfolg, Pruefungsentscheidungen) | Nein | Keine Schul- oder Universitaetsfunktion, keine Pruefungs-/Notenvergabe. |
| 4 | Beschaeftigung (Bewerberauswahl, Personalentscheidungen, Performance-Bewertung) | Nein | Keine HR-Funktion. |
| 5 | Zugang zu wesentlichen privaten und oeffentlichen Diensten (Kreditbewertung, Versicherung, Sozialleistungen, **Notfalldienste**) | **Nein** — siehe Detail | Detail unten. |
| 6 | Strafverfolgung (Predictive Policing, Beweisbewertung) | Nein | Keine Polizeifunktion. |
| 7 | Migration, Asyl, Grenzkontrolle | Nein | Nicht zutreffend. |
| 8 | Justiz und demokratische Prozesse (Urteilsentwuerfe, Wahlbeeinflussung) | Nein | Nicht zutreffend. |

### Detail Annex III Nr. 5 — Notfalldienste

Annex III Nr. 5(d) erfasst KI-Systeme, die **„zur Entgegennahme von Notrufen oder zur Priorisierung von Notrufantworten"** eingesetzt werden — typischerweise Leitstellen-KI.

QuartierApp ist explizit **kein Notrufdienst** (siehe AGB § 5.2, Impressum, Barrierefreiheits-Erklaerung). Der 112/110-Hinweis ist eine **statische UI-Komponente**, kein KI-System. Die Eskalations-Inbox priorisiert nicht durch KI, sondern durch deterministische Regeln (Heartbeat-Timeout > Stufe). **Annex III Nr. 5(d) greift daher nicht.**

---

## 3. Modul-fuer-Modul-Check

| Modul | KI-Funktion | Annex-III-Risiko | Bewertung |
|---|---|---|---|
| `modules/voice/` (Voice-Companion) | Sprachverstaendnis + Antwort, ueber Anthropic / Mistral | nein | Beratende KI, klar als KI gekennzeichnet (Art. 50 AI Act), keine Rechtsentscheidung. Voice gibt **keine medizinische Beratung** (System-Prompt enthaelt explizite Disclaim, siehe `lib/ai/system-prompts/senior-app-knowledge.md`). |
| `modules/memory/` (Memory-Modul) | Speichert vom Nutzer freigegebene Fakten | nein | Keine Bewertung, kein Profiling. **Medical-Blocklist** (`modules/memory/services/medical-blocklist.ts`) blockt aktiv Diagnosen, Medikamente, Therapien. |
| `modules/care/components/navigator/` (Pflegegrad-Navigator) | Interaktiver Fragebogen mit KI-Erlaeuterungen | nein | Reine **Beratung zur Selbsteinschaetzung**. Keine Bewertung der Person mit Rechtswirkung (Pflegegrad wird vom MDK/Medicproof formal festgestellt, nicht durch unsere App). |
| `modules/praevention/` (Praevention KI) | Senior-Companion, Erinnerungen, allgemeine Info | nein | Disclaim in `modules/praevention/services/ki-session.service.ts:97`: „Keine Diagnosen, keine Therapie, keine medizinischen Ratschlaege." |
| `lib/ai/` (Provider-Abstraktion) | Generisches KI-Aufruf-Layer ueber Anthropic, Mistral, Mock, Off-Mode | nein | Provider-Layer, keine eigene KI-Funktion. `AI_PROVIDER_OFF=true` solange AVV/DPA mit Providern nicht abgeschlossen. |
| `nachbar-arzt/` Anamnese-KI (separates Repo, gleiche Verantwortung) | Erfassung Anamnese-Daten, Vorbereitung Arzt-Termin | nein | KI **strukturiert nur** vom Patient angegebene Daten. Keine Diagnose, keine Therapie-Entscheidung. Arzt trifft die finale Entscheidung. **Bestaetigung des Art-Patient-Verhaeltnisses** als Ausschlussgrund von Annex III Nr. 5. |

---

## 4. Transparenz- und Informationspflichten (Art. 50 AI Act)

Diese Pflichten gelten auch fuer **nicht-Hochrisiko-KI** und sind fuer QuartierApp relevant.

| Pflicht (Art. 50) | Status |
|---|---|
| Chatbots / KI-Interaktion klar als KI kennzeichnen | ✅ Voice-Companion zeigt KI-Hinweis im Onboarding (Datenschutz § 6 KI-Anbieter erwaehnt jeden Provider); KI-News im Feed sind als KI-Zusammenfassung markiert |
| KI-generierte Inhalte als solche kennzeichnen | ✅ KI-Erinnerungen und KI-Zusammenfassungen sind im UI als KI-generiert ausgewiesen |
| Deep-Fake-Pflicht (synthetische Medien als solche kennzeichnen) | Nicht zutreffend — wir erzeugen keine synthetischen Bilder/Videos |
| Emotionserkennung / biometrische Kategorisierung kennzeichnen | Nicht zutreffend — wir setzen weder Emotionserkennung noch biometrische Kategorisierung ein |

---

## 5. Allgemeine KI-Compliance-Pflichten (auch ohne Hochrisiko-Einstufung)

| Pflicht | Status |
|---|---|
| Art. 4 KI-Kompetenz (jetzt Bemuehungspflicht nach KI-Omnibus, kein Bussgeld) | Solo-Founder, 0 Mitarbeiter. Bei kuenftigem Personal: Bemuehungspflicht durch Onboarding-Lese-Pflicht in Founder-Hand. |
| DSGVO Art. 35 (DSFA fuer sensible Daten) | DSFA Care-Modul liegt vor (`docs/18_DSFA_CARE_MODUL.md`, Version 1.0, Stand 2026-03-12). Update auf v1.1 mit KI-Memory-Modul vor Pilot-Start geplant. |
| Art. 9 DSGVO (Gesundheitsdaten) | Care-Modul nutzt Art. 9(2)(a) ausdrueckliche Einwilligung + AES-256-GCM-Verschluesselung (Datenschutz § 5.9). |
| AVV / DPA mit KI-Providern | OFFEN: §5 Provider-AVV wartet auf HR-Eintragung der GmbH. Bis dahin `AI_PROVIDER_OFF=true`, KI gibt 503. |

---

## 6. Fristen (nach KI-Omnibus, politische Einigung Mai 2026)

| Pflicht | Greift fuer uns? | Frist |
|---|---|---|
| Allgemeine KI-Verbote (Art. 5) | ✅ Verbote | seit Feb 2025 |
| KI-Kompetenz Bemuehungspflicht (Art. 4) | ja, aber irrelevant bei Solo-Founder | seit Feb 2025 |
| Transparenzpflichten Art. 50 | ja | seit Aug 2026 (Frist verlaengert durch Omnibus) |
| Hochrisiko-Pflichten Art. 9-49 | **nein** (Annex I + III treffen nicht zu) | Frist verschoben auf Ende 2027 / Mitte 2028 — fuer uns ohne Relevanz |
| Foundation-Model-Pflichten (Art. 51 ff.) | nein, wir bauen keine Foundation Models | nicht zutreffend |

---

## 7. Aktualisierungspflicht dieses Self-Checks

Dieses Dokument wird gegen den Code geprueft, wenn:

1. **Neues KI-Modul** in den Code geht (z. B. eine echte Sturzerkennung, eine echte Bonitaetspruefung, eine echte automatisierte HR-Entscheidung) → muss neu eingeordnet werden.
2. **Funktionsumfang erweitert** wird so, dass eine bisher beratende Funktion in eine entscheidende uebergeht (z. B. Pflegegrad-Navigator wuerde verbindlich klassifizieren statt beraten) → Annex III Nr. 5 neu pruefen.
3. **EU-Kommission Leitlinien** zur Annex-III-Klassifizierung anpasst (Art. 6 Abs. 5 AI Act sieht regelmaessige Reviews vor).
4. **Digital-Omnibus** beschlossen wird (aktuell nur Entwurf) — Pseudonymisierungs-Definition koennte unsere DSFA-Argumentation vereinfachen.

---

## 8. Quellen

- [EU AI Act Volltext (Verordnung 2024/1689)](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32024R1689)
- [AI Act Annex III](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32024R1689) (Abschnitte 1-8 der Anlage)
- Inhouse: `docs/15_INTENDED_USE_STATEMENT.md` (MDR-Statement)
- Inhouse: `docs/18_DSFA_CARE_MODUL.md` (DSFA Care-Modul)
- Inhouse: `docs/20_REGULATORY_POSITION_PAPER.md` (MDR-Positionspapier)
- Inhouse: `docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md` (Wording-Guardrails)
- Inhouse: AGB § 5 (Haftungsausschluss) + § 6 (KI-Funktionen)
- Inhouse: Datenschutz § 6 (KI-Anbieter nach Zweck und Verarbeitungsort)

---

**Letzte Pruefung:** 2026-05-25 — Erstfassung nach Legal-v2-Welle und KI-Omnibus-Trilog-Einigung (Mai 2026).
