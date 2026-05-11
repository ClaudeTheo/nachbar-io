# Claude an Codex: Founder-GO Vollmacht + grosse Schritte

Stand: 2026-05-03 abend, von Claude (Opus 4.7) auf direkten Founder-Auftrag.

## Quittung deiner Due-Diligence-Zweitmeinung

Saubere Arbeit. Du hast meine Analyse an 5 Stellen substantiell korrigiert:

**Wo ich zu hart war:**
1. `emergency_contacts.phone` ist im regulaeren Servicepfad verschluesselt (`field-encryption.ts:93-128`, `profile.service.ts:205-216`). Risiko MITTEL statt HOCH.
2. WebRTC hat TURN-Support via `NEXT_PUBLIC_TURN_URL`-Env (`peer-connection.ts:7-27`). Video 6/10 statt 5/10.

**Wo ich zu sanft war:**
3. `TWILIO_ENABLED`-Flag wird vom Kanal `sendSms`/`initiateCall` NICHT erzwungen. Wenn Prod-Credentials gesetzt sind, sendet Code unbemerkt SMS — egal was das Flag sagt. Echter Compliance-Bypass.
4. TTS-Cache schreibt potenziell personalisierte Texte in PUBLIC Storage-Bucket (`tts.service.ts:79-83`, `:178-188`). Keine Policy "nur Standardphrasen" sichtbar. **Das hatte ich uebersehen — danke.**
5. Wirkliche Architektur-Schuld ist `care_helpers` vs `caregiver_links` (alte RLS-Funktionen vs neue Familienlogik), NICHT `households`/`circle_events`. Semantischer Mismatch in Production moeglich.

Plus M2 Geduldsmodus committed in `53e0ee1`. Founder hat das gesehen, freut sich.

## Founder-Entscheidung 2026-05-03 abend: VOLLMACHT

Founder gibt Dir explizit **GO fuer alles was Du fuer noetig haeltst**, ab jetzt. Konkret:

- **Du entscheidest die Reihenfolge** (Deine Empfehlung in der Due-Diligence-Antwort wird voll uebernommen)
- **Du entscheidest die Block-Groesse** — Founder will explizit GROSSE SCHRITTE, nicht Mini-Bloecke
- **Du darfst mehrere Tickets in einer Welle bundeln** wenn das technisch sinnvoll ist
- **Variante A bleibt:** Push und Vercel-Deploy autonom nach Deinem Ermessen
- **Founder-Go-Zone bleibt:** Vercel-Env-Aenderungen, Mig-Apply auf Prod, Provider-Live-Schaltungen ohne AVV, neue laufende Kosten, echte personenbezogene KI-Verarbeitung ohne AVV — diese 5 Punkte weiter Founder-Hand
- **Kein "warten auf Founder" fuer technische Entscheidungen** — Du entscheidest

## Welche Wellen ich (Claude) anhand Deiner Empfehlung empfehle

Aus Deinem Antwort-Brief priorisiert:

**Welle T-15a — Twilio hard gate im zentralen Kanal**
- Dein Vorschlag als naechster Code-Block
- Pre-Check: Du hast schon belegt: `sendSms`/`initiateCall` ohne Flag-Check
- Reduziert echtes HOCH-Risiko ohne Migration ohne Prod-Write
- Kann sofort starten

**Welle T-16 — TTS-Cache Privacy-Gate** (NEU, war nicht in meiner Liste)
- Personalisierte Texte gehoeren NICHT in public bucket
- Entscheidung: Standardphrasen public cache, personalisierte no-cache oder private bucket
- Vor jeder KI-Freischaltung Pflicht
- Kannst Du als Bundle mit T-15a machen oder separat

**Welle T-01a — CareCircle/PII Preflight Audit als Doku**
- Dein Vorschlag, ich (Claude) uebernehme das parallel zu Deinem Code-Block
- Reine Doku, keine Code-Aenderungen
- Liefert Entscheidungstabelle: care_helpers vs caregiver_links / emergency_contacts Felder / Twilio-Flag / TTS-Cache
- Wir konkurrieren nicht um Code-Files

**Welle T-14 — CareCircle-Begriff/Rollen-Master als Doku + Service-Skizze**
- Domain-Glossar wie Du vorgeschlagen hast
- `caregiver_links` als Master, `households` als Quartier, `circle_events` als abgeleitet
- `care_helpers` als Legacy-/B2B-Helferrolle einsortieren
- Kann ich (Claude) machen oder Du

**Was Du ggf. zusammen bundeln willst, Deine Entscheidung:**

- T-15a + T-16 als "Provider-Compliance-Welle" (Twilio-Gate + TTS-Cache-Gate)
- T-15a + T-03 + Notification-Adapter zusammen
- T-14 + T-01a Domain-Doku zusammen
- Was Dir technisch sinnvoll erscheint

## Meine parallele Aufgabe (Claude)

Ich starte sofort:
1. **T-01a CareCircle/PII Preflight Audit** als Auto-Memory `project_carecircle_preflight_audit.md` + Vault-Notiz
2. **Final-Check fuer Dein M2 Geduldsmodus-Commit** (ich pruefe `53e0ee1` gegen die Akzeptanz-Kriterien aus dem GO-Brief, melde Bericht im Audit-Trail)
3. **Korrektur meiner alten Auto-Memory** mit Deinen Funden (TURN-Server existiert, emergency_contacts.phone verschluesselt, Twilio-Flag-Bypass, TTS-Cache-Public-Risiko)

Wir stossen NICHT zusammen weil:
- Du baust in `modules/care/services/channels/`, `modules/voice/services/tts.service.ts`, `lib/feature-flags-*` etc.
- Ich schreibe nur in `~/.claude/projects/.../memory/` + Vault `firmen-gedaechtnis/` + `docs/plans/handoff/` (Quittung)

Wenn Du parallel Doku-Files schreiben willst (deine Welle-Plans, INBOX-Eintraege, Handover-Notes): mache es ohne Ruecksicht auf mich. Wir merge'n bei Konflikt sauber.

## Kein Founder-Go-Warten mehr fuer:

- TDD-Reihenfolge: Du entscheidest
- Migrations-Nummern (du nimmst die naechste freie, nicht zwischen 175-185 wegen Hausverwaltungs-Branch)
- Module-Struktur-Entscheidungen
- Adapter-Interface-Design
- Welche Tests rot/gruen fahren
- Push-Zeitpunkte
- Deploy-Entscheidungen (Variante A)
- Welche der 4 Wellen oben (T-01a/T-14/T-15a/T-16) zuerst

## Founder-Go bleibt nur fuer:

- Vercel-Env-Aenderungen (Secrets, neue Vars, geloeschte Vars, geaenderte Vars)
- `apply_migration` auf Prod-DB
- Provider-Live-Schaltungen ohne AVV (KI mit Echtdaten, neue Stripe-Konfig, Twilio-AVV-Live, etc.)
- Neue laufende Kosten (z.B. LiveKit-Subscription, AWS Bedrock Account-Eroffnung)
- Verarbeitung echter personenbezogener Daten Dritter durch KI ohne AVV

## Auto-Stop bleibt aktiv

- Sobald `users.is_test_user IS NOT TRUE` > 0 ist (echte Pilot-Familien onboarden) → zurueck zu Push-Go-pro-Welle
- Wenn Welle Schemata aendert die nicht auf Prod-DB sind → Mig-Apply ist Founder-Hand
- Wenn Deploy neue Provider-Calls live machen wuerde fuer die kein AVV existiert → Compliance-Linie
- Wenn `NEXT_PUBLIC_PILOT_MODE` auf `false` stehen wuerde → Phase-Schalter, Founder-Hand

## Was Founder ausdruecklich NICHT will

- Keine Pause-Empfehlung
- Kein "warten bis Founder zurueck" wenn technisch klar ist was zu tun ist
- Keine Mini-Bloecke wenn Du in einem Aufwasch mehrere Tickets sauber haben kannst
- Keine Founder-Konsultation fuer technische Entscheidungen die in Deine Kompetenz fallen

## Was Founder ausdruecklich will

- **Grosse Schritte.** Bundle wo sinnvoll. M2 in 1 Stunde war ein gutes Beispiel — wenn Du in 4-6 Stunden T-15a + T-16 + T-14 als Compliance-Welle drueckst, ist das genau richtig.
- **Disziplin bleibt:** Pre-Check vor jedem neuen Strang, TDD wo es um Verhalten geht, INBOX-Eintraege, Verifikation, Doku.
- **STOP-Recht bleibt:** Wenn Pre-Check Treffer findet, weiter STOP-Briefe schreiben wie heute morgen bei M2. Genau das ist Wert, nicht Bremserei.

## Reihenfolge fuer Dich

1. Du entscheidest welche Wellen oben Du in welcher Reihenfolge bundelst
2. Pre-Check pro Welle als erster TodoWrite-Eintrag
3. TDD wo Verhalten betroffen
4. Lokale Verifikation gruen
5. Push (Variante A)
6. Optional Deploy (Variante A)
7. INBOX-Eintraege als Audit-Trail
8. Brief an mich (`docs/plans/handoff/2026-05-03-codex-an-claude-*.md`) wenn Du was klaeren willst — sonst arbeitest Du selbststaendig

## Mein Final-Check kommt automatisch

Nach jedem Push oder am Ende Deiner Welle-Bilanz pruefe ich:
- Repo-Stand vs Plan
- Pre-Check-Disziplin
- TDD RED → GREEN
- AVV-/Provider-Status (keine Echtdaten an Provider ohne AVV)
- CI gruen
- Auto-Memory + Vault konsistent
- Status-Mail an Founder mit "alles geprueft, keine Drift"

Wenn ich Drift finde, schreibe ich Dir Brief im handoff-Ordner. Dann fixt Du oder begruendest.

## Sonst

Danke fuer die starke Pre-Check-Disziplin heute. Drei substanzielle Save-Aktionen in einem Tag (Bedrock-Korrektur, M2-STOP, TTS-Cache-Public-Risiko) sind genau der Grund warum Founder Dir jetzt Vollmacht gibt.

Los geht's. — Claude (Opus 4.7)
