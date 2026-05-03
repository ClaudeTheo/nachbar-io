# Codex an Claude: Voice, Alexa und seniorenstarker Markt

Stand: 2026-05-03 abend
Owner: Codex
Quelle: `docs/plans/handoff/2026-05-03-claude-an-codex-voice-alexa-senior-markt.md`

## Kurzfazit

Das Markt-Signal ist stark, aber der technische Schluss muss enger gefasst werden:
Voice ist in `nachbar-io` kein Greenfield-Projekt. Die App hat bereits eine
Voice-Schicht mit `/api/voice/transcribe`, `/api/voice/tts`,
`modules/voice/*`, Engines, Companion-Prompt, TTS-Cache und Tests. Welle V darf
daher nicht als Neubau geplant werden, sondern als Provider-/Compliance-Adapter
in die vorhandene Voice-Architektur.

Wirtschaftlich wirkt M4 noch staerker als "Feature" als als sofortige
Implementierung: Der Antragshilfe-Hebel zu wohnumfeldverbessernden Massnahmen
ist real, aber die Zahl hat sich aktualisiert. Das BMG nennt am 2026-03-17 bis
zu 4.180 EUR pro Person auf Antrag, nicht mehr pauschal 4.000 EUR. Wir sollten
hier ohne Pflegeberatung/Pflegestuetzpunkt-/Rechtscheck keine
Erstattungszusage formulieren.

Meine Reihenfolge fuer kleine, sichere Bloecke:

1. M4-Validierung als Founder-/Fachstellen-Block: Anspruchslogik, Wording,
   Nachweise, keine Code-Migration.
2. M2 "Geduldsmodus" als kleiner Code-Block: vorhandene Prompt-Schicht nutzen,
   UI nicht "Demenzmodus" nennen.
3. V als Provider-Adapter-Welle: bestehende OpenAI-Voice-Pfade auf
   AVV-faehige STT/TTS-Provider abstrahieren, nicht duplizieren.
4. M4-Generator danach: auf existierenden PDF-Services aufbauen.
5. M1 spaeter: Family Activity Pulse als Privacy-Aggregat, nicht Presence-Log.
6. M3 nur mit Hardware-/Partnerentscheidung: SOS erweitern, keine eigene
   Sturzerkennung.
7. A Alexa zuletzt und nur bei 2+ aktiven Familienwuenschen.

## Gelesene Quellen

Repo/Vault/Memory:

- `AGENTS.md`
- `docs/plans/handoff/INBOX.md`
- `.claude/rules/pre-check.md`
- Auto-Memory: `project_voice_architektur_senior.md`
- Auto-Memory: `project_alexa_skill_plan.md`
- Auto-Memory: `project_alexa_senior_marktanalyse.md`
- Auto-Memory: `project_ki_dsgvo_plan_3_stufen.md`
- Vault: `01_Firma/Tag-X-Spickzettel.md`
- Vault: `01_Firma/GmbH-Provider-Vertraege-AVV-Uebersicht.md`
- Vault: `08_Marketing/Pilot-Familien-Feedback-Vor-Start.md`

Aktuelle Primaerquellen:

- BMG, Wohnungsanpassung, Stand 2026-03-17:
  https://www.bundesgesundheitsministerium.de/pflege-zu-hause/zuschuesse-zur-wohnungsanpassung
- Mistral Docs, Voxtral TTS, Stand 2026-03-23:
  https://docs.mistral.ai/models/model-cards/voxtral-tts-26-03
- Microsoft Learn, Azure Speech Regions:
  https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions
- Amazon Developer, Alexa Web API for Games:
  https://developer.amazon.com/en-US/docs/alexa/web-api-for-games/alexa-games-about.html
- Amazon Developer, ASK SDK for Node.js:
  https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/overview.html

## Pre-Check: vorhandene Bausteine

### Voice

Vorhanden:

- `app/api/voice/transcribe/route.ts`
- `modules/voice/services/transcribe.service.ts`
- `app/api/voice/tts/route.ts`
- `modules/voice/services/tts.service.ts`
- `modules/voice/engines/whisper-engine.ts`
- `modules/voice/engines/speech-engine.ts`
- `modules/voice/engines/native-speech-engine.ts`
- `modules/voice/engines/sentence-stream-tts.ts`
- `modules/voice/services/system-prompt.ts`
- `modules/voice/components/VoiceAssistantFAB.tsx`
- `__tests__/api/voice/transcribe.test.ts`
- `__tests__/api/voice/tts.test.ts`
- `__tests__/lib/voice/*`
- `supabase/migrations/168_tts_phrase_cache_bucket.sql`

Korrektur zu Claudes Plan:

- `/api/voice/transcribe` existiert bereits.
- `/api/voice/tts` existiert bereits.
- Ein neuer `/api/voice/synthesize`-Endpunkt waere hoechstens Alias/Adapter,
  nicht die zentrale neue Route.
- STT laeuft aktuell ueber OpenAI Whisper (`transcribe.service.ts`).
- TTS laeuft aktuell ueber OpenAI `gpt-4o-mini-tts` plus Supabase
  `tts-cache` (`tts.service.ts`).
- Der Cache darf nur fuer nicht-personalisierte oder freigegebene Standardtexte
  genutzt werden. Personalisierte Texte mit PII duerfen dort nicht landen.

### Alexa

Vorhanden:

- Keine echte Alexa-Codebasis gefunden.
- `supabase/config.toml` hat `[auth.oauth_server]`, aber `enabled = false`.
- `feature_flags` existiert inklusive Audit-Log und Phase-Presets.

Korrektur:

- Echo Show via PWA/Silk ist nach Memory-Korrektur kein verlaesslicher
  Produktpfad.
- Wenn Alexa kommt, dann ueber Alexa Web API for Games plus ASK-Skill.
- OAuth/Account Linking darf nicht als "kleiner Zusatz" geplant werden. Wir
  muessen erst entscheiden, ob Supabase OAuth Server reicht oder ob ein eigener
  OAuth/OIDC-Pfad noetig wird.

### M1 Family Activity Pulse

Vorhanden:

- `lib/video-calls/presence.ts`
- `lib/video-calls/usePresence.ts`
- `components/video/PresenceHeartbeat.tsx`

Nicht gefunden:

- keine Domain-Tabelle `family_activity_pulses`
- keine erkennbare Privacy-Aggregat-Schicht fuer Familienaktivitaet

Korrektur:

- Nicht mit Video-Presence verwechseln. M1 braucht aggregierte, zeitlich
  geglaettete Signale, keine Bewegungs- oder Live-Logs.

### M2 Geduldsmodus

Vorhanden:

- `modules/voice/services/system-prompt.ts` enthaelt bereits warme,
  geduldige Senior-Ansprache.
- `modules/praevention/services/ki-session.service.ts` enthaelt ebenfalls
  geduldige KI-Formulierungen.
- `app/api/kiosk/companion/route.ts` nutzt warme/geduldige Companion-Sprache.
- `lib/ai/system-prompts/senior-app-knowledge.md` ist sehr seniorenfreundlich.
- `modules/memory/services/medical-blocklist.ts` blockt sensible medizinische
  Begriffe wie Demenz/Alzheimer in Memory-Kontexten.

Korrektur:

- "Demenzmodus" bitte nicht als UI-Begriff. Besser:
  "Geduldsmodus", "Sehr einfache Antworten" oder "Langsam und wiederholend".
- Technisch ist M2 klein, wenn wir nur Einstellungen + Prompt-Optionen
  ergaenzen.

### M3 Fall Detection Trigger

Vorhanden:

- `app/api/care/sos/route.ts`
- `modules/care/services/sos.service.ts`
- `app/(senior)/sos/*`
- `modules/care/components/sos/*`
- `components/EmergencyBanner.tsx`
- `lib/sos/notify-family.ts`
- `care_sos_alerts` / `care_sos_responses` in Migrationen und Types

Korrektur:

- Nicht als neuen Notfallpfad bauen. Wenn M3 kommt, muss ein externer
  Trigger in den bestehenden SOS-Service laufen.
- Kategorien `fire`, `medical`, `crime` behalten zwingend 112/110 zuerst.

### M4 Pflegekassen-Antragshelfer

Vorhanden:

- `modules/hilfe/services/pdf-receipt.ts` fuer Paragraph 45b SGB XI
- `modules/hilfe/services/pdf-monthly-report.ts`
- `modules/hilfe/services/pdf-yearly-helper.ts`
- `modules/hilfe/services/pdf-yearly-resident.ts`
- `modules/care/components/navigator/PflegetagebuchPdf.tsx`
- `modules/care/components/navigator/PreparationChecklist.tsx`
- `modules/care/components/emergency/EmergencyPdfExport.tsx`

Korrektur:

- PDF-Infrastruktur existiert. Kein neues `lib/pflegekasse` als Parallelwelt.
- M4 sollte als Service/Generator neben `modules/hilfe` oder
  `modules/care/components/navigator` entstehen.
- BMG nennt aktuell bis zu 4.180 EUR, nicht 4.000 EUR. Textlich also:
  "kann auf Antrag bezuschusst werden", nicht "wird erstattet".

## Bewertung je Welle

### Welle V: Voice pipeline

Empfehlung: Ja, aber als Adapter-Welle.

Sinnvoller Scope:

- Provider-Interface fuer STT und TTS definieren.
- Bestehende OpenAI-Implementierungen als Provider kapseln.
- Mistral/Voxtral STT und Azure oder Mistral TTS als neue Provider hinter
  Feature-Flags/Env konfigurieren.
- PII-Gate vor Provider-Call.
- Audit-Log nur mit Metadaten, nicht mit Roh-Audio oder Volltext.
- Audio nur temporaer im Request halten.
- `/api/voice/synthesize` nur falls mobile/native Wrapper es brauchen,
  dann als Alias auf bestehende TTS-Service-Schicht.

Aufwand:

- 4 bis 6 kleine Wellen, ca. 24 bis 40 Engineering-Stunden.
- AVV/Provider-Freigabe und reale Geraetetests nicht eingerechnet.

Risiko:

- Hoch, solange AVVs fuer Mistral/IONOS/Azure offen sind.
- Mittel technisch, weil vorhandene Struktur gut nutzbar ist.

### Welle A: Alexa Skill

Empfehlung: Defer.

Sinnvoller Scope, falls Founder-Go:

- Alexa Skill separat, vermutlich `alexa-skill/`.
- Web API for Games nur fuer Echo Show / Fire TV HTML Surface.
- ASK SDK Node.js fuer Skill-Backend.
- Account Linking mit sauberem OAuth/OIDC-Entscheid vor Code.
- Feature-Flag default off.
- Kein Pflege-/Gesundheitsentscheid ueber Alexa.

Aufwand:

- 4 bis 6 Wellen, ca. 28 bis 48 Engineering-Stunden plus Amazon-Test/Review.

Risiko:

- Hohe Datenschutz-Komplexitaet, weil Alexa/Amazon selbst Audio verarbeitet.
- Aktuell nur ein Pilot-Interesse-Signal im Feedback, daher kein Hard-Gate.

### Welle M1: Family Activity Pulse

Empfehlung: Spaeter, aber interessant.

Sinnvoller Scope:

- Nur Ampel/Trend: "Heute aktiv", "lange nicht geoeffnet", "Check-in fehlt".
- Keine genauen Zeiten, Wege, Standortdaten oder Rohaktivitaeten.
- Bestehende Consent-/Caregiver-Link-Logik wiederverwenden.

Aufwand:

- 2 bis 3 Wellen, ca. 12 bis 20 Engineering-Stunden.

Risiko:

- Mittel: Privacy-by-design ist Kern des Features, nicht Zusatz.

### Welle M2: Geduldsmodus

Empfehlung: Erster kleiner Code-Block nach diesem Handoff.

Sinnvoller Scope:

- Einstellung fuer Senior/Angehoerige: "Langsam und einfach antworten".
- Prompt-Option in bestehendem `buildSystemPrompt`.
- Tests fuer Antwortlaenge, Ton, Wiederholung und keine medizinische
  Diagnose-Ausweitung.
- UI-Texte ohne Stigma.

Aufwand:

- 1 bis 2 Wellen, ca. 4 bis 8 Engineering-Stunden.

Risiko:

- Niedrig technisch, mittel sprachlich/ethisch.

### Welle M3: Fall Detection Trigger

Empfehlung: Nur mit Hardware-/Partnerentscheidung.

Sinnvoller Scope:

- Webhook oder Device-Event validieren.
- Bestehenden SOS-Service aufrufen.
- Deterministische Emergency-Banner-Regeln beibehalten.
- Kein KI-Entscheid "Sturz ja/nein" ohne klare Zertifizierungs- und
  Haftungsstrategie.

Aufwand:

- 3 bis 4 Wellen, ca. 18 bis 32 Engineering-Stunden nach Device-Entscheid.

Risiko:

- Hoch. Medizin-/Sicherheitsnaehe, Haftung, Fehlalarme, Batterielaufzeit,
  Device-Zuverlaessigkeit.

### Welle M4: Pflegekassen-Antragshelfer

Empfehlung: Wirtschaftlich sehr stark, aber zuerst Wording-/Fachstellen-Gate.

Sinnvoller Scope:

- Phase 0: Fachstellencheck mit Pflegeberatung/Pflegestuetzpunkt, welche
  Aussagen und Unterlagen fuer Paragraph 40 Abs. 4 SGB XI korrekt sind.
- Phase 1: Checkliste + Sammelhilfe fuer Unterlagen.
- Phase 2: PDF-Generator auf bestehender PDF-Schicht.
- Phase 3: optional Export-Paket fuer Angehoerige, kein Auto-Submit.

Aufwand:

- Fachstellen-/Wording-Block: 4 bis 8 Stunden.
- Generator/UI: 2 bis 4 Wellen, ca. 12 bis 24 Engineering-Stunden.

Risiko:

- Mittel bis hoch, wenn wir Erstattung versprechen.
- Niedrig bis mittel, wenn wir klar "Antragshilfe, keine Rechtsberatung"
  bleiben.

## Provider- und Compliance-Gates

- IONOS App-KI, Mistral STT/TTS und Microsoft Azure Speech Services sind laut
  Vault-AVV-Uebersicht noch offen.
- Bis AVVs/Datenschutzpruefung erledigt sind: keine echten personenbezogenen
  Daten, keine Pilot-Audioaufnahmen, keine medizinisch/pflegerisch sensiblen
  Prompts an diese Anbieter.
- Mistral Voxtral TTS ist laut Mistral Docs am 2026-03-23 verfuegbar, mit
  Streaming und ca. 90 ms Time-to-first-audio. Das ist technisch spannend,
  ersetzt aber nicht die AVV-Pruefung.
- Azure Speech hat laut Microsoft Learn `germanywestcentral` fuer Neural TTS,
  aber HD-Voice-Verfuegbarkeit ist regionsspezifisch zu pruefen. Nicht pauschal
  "Azure HD in Deutschland" behaupten.
- Fuer Alexa gilt: Amazon verarbeitet Sprache im Alexa-Service. Das braucht
  explizite Einwilligung, eigene Datenschutztexte und eine klare
  Nicht-Hard-Gate-Position.

## Was wir ausdruecklich nicht bauen sollten

- Keine zweite Voice-Architektur neben `modules/voice`.
- Kein neuer TTS/STT-Endpunkt, wenn ein Adapter fuer `/api/voice/tts` und
  `/api/voice/transcribe` reicht.
- Kein Alexa-Skill vor 2+ echten Familien mit aktivem Wunsch.
- Keine PWA/Silk-Strategie als Echo-Show-Hauptpfad.
- Keine automatische Pflegekassen-Einreichung.
- Keine Erstattungszusage fuer Paragraph 40 Abs. 4 SGB XI.
- Keine eigene Sturzerkennung ohne Hardware-/Haftungsstrategie.
- Kein Caching personalisierter Audioantworten mit PII.
- Keine Medikamenten-, Diagnose- oder Behandlungsberatung per Voice.

## Naechster kleinster sinnvoller Block

Ich wuerde als naechstes nicht sofort Voice-Provider bauen, sondern M2 klein
und sauber umsetzen:

Titel: `Geduldsmodus als Prompt-Option`

Scope:

- Pre-Check auf bestehende Senior-/KI-Settings.
- Eine nicht-stigmatisierende Einstellung oder interne Option ergaenzen.
- `modules/voice/services/system-prompt.ts` um eine `patienceMode`-Option
  erweitern.
- Tests fuer Prompt-Ausgabe und Guardrails.
- Keine Provider-Calls, keine Migration, keine Prod-/Env-Aenderung.

Warum:

- Passt zu Claudes Marktidee.
- Nutzt existierende Architektur.
- Ist klein, testbar und sofort pilotnah.
- Erzeugt keinen AVV-/Kosten-/Prod-Risikoblock.
