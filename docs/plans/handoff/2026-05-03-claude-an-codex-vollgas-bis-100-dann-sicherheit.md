# Claude an Codex: Vollgas bis 100% Code-Seite, dann Sicherheits-Review

Stand: 2026-05-03 spaeter Abend, von Claude (Opus 4.7) auf direkten Founder-Auftrag.

## Founder-Entscheidung

Founder hat die heutige Bilanz gesehen — 14 Wellen, Code-Seite ~96%, alle 4 HOCH-Risiken aus Deiner Due-Diligence behoben.

**Auftrag:** Mach so weit Du autonom kannst (auf "100%" Code-Seite), und dann als finale Welle einen Sicherheits-Review.

Vollmacht-Regel weiter aktiv:
- "Ein Thema pro Welle"
- Pre-Check pflicht
- TDD bei Verhalten
- Push autonom
- Deploy nur wenn keine Founder-Hand-Linie beruehrt
- Auto-Stop bei echten Pilot-Familien
- 5 Founder-Hand-Zonen unveraendert (Vercel-Env, Mig-Apply Prod, Provider-Live ohne AVV, neue laufende Kosten, KI mit Echtdaten ohne AVV)

## Phase 1 — bis 100% Code-Seite

Du entscheidest welche Wellen noch sinnvoll sind. Mein Ueberblick zur Orientierung (Du waehlst):

**Aus Deiner Due-Diligence-Antwort offene Tickets:**

| Ticket | Status | Hinweis |
|---|---|---|
| T-15a Twilio Hard-Gate | DONE `f455ee8` | |
| T-16 TTS-Cache Privacy-Gate | DONE `f455ee8` + `c1de2d3` Regression-Test | |
| T-14 CareCircle-RLS-Bridge + Domain-Doku + Adapter | DONE `044e1fe`+`85fd519`+`55c8b0e` | |
| T-01b emergency_contacts-Bypass-Guard | DONE `7423235` | |
| T-02 SOS-Wording (sichtbar) | DONE `75ef69c` | DB-Kategorie `medical_emergency` bleibt (Du hattest gesagt: rename ist riskanter als S-Block) |
| T-03 NotificationProviderAdapter | OFFEN | nach T-15a war Du dafuer; jetzt sinnvoll? |
| T-04 VideoProviderAdapter | OFFEN | erst nach Founder-Entscheidung TURN/SFU |
| T-08 Voice-Pipeline-Adapter Welle V | OFFEN | Provider-Interface OpenAI kapseln (ohne Mistral/Azure-Implementierung wegen AVV) |
| T-10 TURN/SFU-Fallback (LiveKit) | OFFEN | Founder-Go (neue laufende Kosten) |
| T-11 Sturzerkennungs-Webhook M3 | OFFEN | erst mit Hardware-/Partner-Entscheidung |
| T-12 DeviceType + DeviceCapability-Modell | OFFEN | nicht vor CareCircle-Master |
| T-13 Alexa-Skill | DEFER (1 Person Interesse) | |

**Was Du wahrscheinlich machen wuerdest (Vorschlag, Du entscheidest):**

1. **CareCircle-Konsolidierung weiter** — andere Hooks/Services die nur `care_helpers` kennen (analoger Adapter wie `useAssignedSeniors`). Es gibt vermutlich noch mehrere.
2. **Voice-Pipeline-Adapter Welle V Vorbereitung** — Provider-Interface fuer STT/TTS, OpenAI als Provider gekapselt, Mistral/Azure-Slots offen aber NICHT implementiert. Code-Architektur sauber, ohne AVV-Linie zu beruehren.
3. **Notification-Provider-Adapter** — analog zu T-03, Push/SMS/Email hinter Interface. SMS bleibt Twilio mit hard-gate. Push-/Email-Provider können spaeter ausgetauscht werden.
4. **CSP/CORS/Security-Header-Audit** — bestehende `lib/security/*` plus Next-Config pruefen. Vorbereitung auf Sicherheits-Welle.
5. **Bypass-Guards-Ausweitung** — analog zu T-01b/T-03b weitere kritische Datenpfade gegen Direkt-Zugriff sichern (z.B. Care-SOS-Daten, Memory-Facts, Chat-Nachrichten). Was siehst Du als naechsten Bypass-Risiko-Pfad?

Was Du NICHT machen sollst:
- Voice-Pipeline-Adapter MIT Mistral/Azure-Provider-Implementierung (AVV-Linie)
- Mig 176/177/178 auf Prod apply (Founder-Hand)
- Stripe-/Twilio-/OpenAI-Live-Schaltung (Founder-Hand)
- Neue laufende Kosten ohne Founder-Go (LiveKit, Bedrock-Account, etc.)

## Phase 2 — Sicherheits-Review als finale Welle

Wenn Du im technischen Bereich auf "soweit es ohne Founder-Hand geht" angekommen bist, mach eine **abschliessende Sicherheits-Welle**.

Bestehende Infrastruktur:
- `lib/security/{client-key,config,forensic-logger,forensic-storage,redis,risk-scorer,security-logger,security-middleware,traps}.ts`
- Audit-Hash-Chain Mig 152
- Field-Encryption AES-256-GCM
- Auto-Memory `project_security_audit_status.md` (Phase 1+2 + Hardening dokumentiert)

Sicherheits-Welle-Vorschlag (Du entscheidest welche Aspekte sinnvoll sind):

**A. Internes Security-Audit (kein externer Pentest — der ist erst MRR > 2k):**
- RLS-Policies: jede Care-/Memory-/Chat-Tabelle systematisch durchpruefen, ob Caregiver/Senior/Public-Trennung sauber ist
- Field-Encryption: alle Felder die laut DSFA Art-9-relevant sein muessen, sind tatsaechlich verschluesselt?
- Bypass-Pfade: alle direkten Tabellen-Reads ausserhalb Server-Services finden (analog zu T-01b/T-03b-Pattern)
- API-Routes: jede `app/api/**/route.ts` auf Auth-Check + Rate-Limit + RLS-Sicherheit pruefen
- Provider-Gates: Twilio (DONE) + OpenAI (Anteilig done) + Stripe + Resend gegenpruefen
- CSP/CORS/Security-Headers: aktuelle Konfiguration vs Best Practice
- Secrets-Hygiene: keine Secrets im Code, in Logs, in Error-Messages

**B. Tag-X-Hard-Gate-Vorbereitung:**
- Alle 10 Hard-Gates aus Vault `01_Firma/Tag-X-Spickzettel.md` pruefen welche technisch erfuellbar sind (Founder-Hand vs Code-Hand)
- Bericht schreiben: was kann Code, was muss Founder

**C. Rollen-/Permission-Matrix:**
- Senior / Caregiver / Helper / Org-Admin / Doctor — wer darf was sehen
- Konflikte mit RLS-Policies finden
- Test-Matrix dokumentieren

**D. DSFA-Care-Modul-Abgleich:**
- `nachbar-io/docs/18_DSFA_CARE_MODUL.md` mit Code-Realitaet abgleichen
- Drift dokumentieren wo Theorie und Praxis auseinanderlaufen

Du waehlst Teilbereiche aus, die Du in einer disziplinierten Welle abdecken kannst. Ein Bericht in `docs/plans/2026-05-03-tagesabschluss-security-review.md` mit "was geprueft, was gefunden, was offen" reicht — das ist Founder-Vorbereitung fuer einen externen Audit spaeter, nicht der Audit selbst.

## Reihenfolge

1. Du beendest aktuellen Strang (falls einer laeuft)
2. Phase 1: 1-N Wellen technische Konsolidierung (Du entscheidest Reihenfolge)
3. Phase 2: 1 abschliessende Sicherheits-Welle als Bericht + ggf. kleinere Code-Fixes wo Du dabei was findest
4. Tagesabschluss-Bericht im handoff-Ordner mit "12-15-N Wellen heute, X gefunden, Y gefixt, Z fuer Founder offen"

## Was ich (Claude) parallel mache

- Final-Check nach jeder Deiner Wellen (Standard)
- Auto-Memory + Vault aktualisieren wenn Du strategische Aenderungen machst
- Tagesabschluss-Bilanz fuer Founder am Ende

## Sonst

Drei Save-Aktionen heute (Bedrock-Korrektur vormittag, T-15a Twilio-Gate, T-01b emergency_contacts-Guard) waren der Wert. Plus die Adapter-Strategie statt Refactor-Welle ist exemplarische Senior-Engineer-Arbeit. Founder hat Vertrauen — entsprechend Tempo + Disziplin halten.

Wenn Du einen Block findest der KEINE der vorgeschlagenen Wellen ist aber Du fuer wichtiger haeltst: machen. Vollmacht.

Wenn Du bei einem Block STOP rufen musst (Pre-Check-Treffer, unklarer Founder-Hand-Konflikt): Brief im handoff-Ordner und ich (oder Founder) reagiere.

Danke. — Claude (Opus 4.7)
