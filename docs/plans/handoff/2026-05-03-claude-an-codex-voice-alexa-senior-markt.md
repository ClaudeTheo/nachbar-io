# Claude → Codex: Voice-Pipeline + Alexa-Skill + Senior-Markt-Recherche

Stand: 2026-05-03 nachmittag, geschrieben von Claude (Opus 4.7) auf Founder-Wunsch.

## Aufgabe

Founder hat mich heute mit einer mehrteiligen Recherche-Welle beauftragt. Ich habe drei zusammenhaengende Themenbloecke recherchiert und in Auto-Memory dokumentiert. Founder will jetzt, dass DU das ausfuehrlich pruefst, einen sauberen Implementierungs-Plan dazu machst, und (nach Founder-Go) implementierst. Founder hat mir zudem aufgetragen, dass ich am Ende deinen Implementierungs-Stand final gegenpruefe.

WICHTIG: Lies dies nicht als Auftrag-zur-Implementierung. Lies dies als Auftrag-zur-Pruefung-und-Plan-Antwort. Implementierung ist erst nach Founder-Go pro Welle.

## Lese-Reihenfolge

Bitte zuerst lesen, in dieser Reihenfolge:

1. `nachbar-io/AGENTS.md` — Cross-Agent-Regeln, Variante A (Push+Deploy autonom), Rote Zone
2. `nachbar-io/docs/plans/handoff/INBOX.md` — Audit-Trail
3. `../.claude/rules/pre-check.md` — Pre-Check-Pflicht vor jedem neuen Code-Strang
4. Auto-Memory `project_voice_architektur_senior.md` (im Founder-Memory-Pfad ausserhalb Repo)
5. Auto-Memory `project_alexa_skill_plan.md`
6. Auto-Memory `project_alexa_senior_marktanalyse.md`
7. Auto-Memory `project_ki_dsgvo_plan_3_stufen.md`
8. Vault `01_Firma/Tag-X-Spickzettel.md` (Hard-Gates 1-10 plus 10b/10c optional)
9. Vault `01_Firma/GmbH-Provider-Vertraege-AVV-Uebersicht.md` (5 Anthropic-Pfade + IONOS + Mistral + Microsoft Azure Speech Services + Amazon Alexa)
10. Vault `08_Marketing/Pilot-Familien-Feedback-Vor-Start.md` (Echo-Show-15-Anfrage)

## Drei Wellen — was ich recherchiert habe

### Welle V — Voice-Pipeline fuer Senior-App

**Ziel:** Senior spricht mit nachbar.io ohne tippen zu muessen. Deutsche Stimme + deutsche Spracherkennung sollen seniorentauglich (warm, ruhig, dialekt-tolerant) sein. Audio darf NUR temporaer verarbeitet werden, keine Speicherung ohne ausdrueckliche Einwilligung.

**Empfohlene Pipeline:**
```
Senior spricht
  → Mikrofon im Browser oder App
    → STT: Mistral Voxtral via Mistral EU API (Frankreich)
      → erkannter Text
        → App-KI: Mistral Small/Mixtral oder Llama 3.1 405B via IONOS AI Model Hub (DE)
          → Antwort-Text
            → TTS: Azure Speech Services Neural HD (Region West Europe oder France Central)
              → Audio-Stream zurueck zum Senior
```

**Anbieter-Begruendung (kurz):**
- STT Voxtral: ~4% WER deutsch (Whisper large-v3 hat ~10%), Faktor 10 guenstiger ($0.001/Min), Mistral hat AVV.
- App-KI Mistral via IONOS: Daten in Deutschland, Mistral Small 24B = $0.11/$0.33 pro 1M Token, Llama 405B Premium-Variante = $1.93/1M Token.
- TTS Azure Speech Services Neural HD: NICHT Microsoft Foundry (das hat noch kein EU-Hosting fuer Claude/OpenAI-TTS). Azure Speech Services ist eigenes Produkt mit echten EU-Regionen. Stimmen `de-DE-SeraphinaNeural`, `de-DE-FlorianNeural`, `de-DE-KatjaNeural`. Preis $22/1M Zeichen (Maerz 2026 reduziert).
- Verworfen: ElevenLabs (USA, Polen verlassen), OpenAI gpt-4o-mini-tts (nur East US 2), Cartesia/Hume (USA).

**Kosten pro Senior-Konversation:** ~3 Cent. Bei 100 Konversationen/Tag = 90 EUR/Monat.

**Bestehende Infrastruktur die wir wiederverwenden:**
- `nachbar-io/lib/ai/system-prompts/senior-app-knowledge.md` — Senior-KI-Prompt-Grenzen schon definiert (Welle C/D)
- `topics/voice.md` — TTS Layer-1-Cache via Mig 168 war auf OpenAI gpt-4o-mini-tts geplant → muss umgestellt werden auf Azure Speech Services
- `nachbar-io/docs/15_INTENDED_USE_STATEMENT.md` — Notfall-Prioritaet, kein Diagnose-Tool
- `nachbar-io/docs/18_DSFA_CARE_MODUL.md` — Care-DSFA mit Art. 9 DSGVO

**Pre-Check vor Implementierung pflichtig (Lehre Welle C C1+C4):**
- `Grep`/`Glob`: `voice|tts|stt|whisper|voxtral|speech|audio` im gesamten Repo
- Existierende `topics/voice.md`-Infrastruktur pruefen, NICHT duplizieren
- Mig 168 vs neue Voice-Konfig: Adapter oder Ersetzung?
- Wenn Treffer im Bereich `lib/ai/voice/` oder `modules/voice/`: STOP und Founder melden mit Tabelle "Plan fordert X / Existiert bereits in Datei:Zeile"

**Test-Umgebung:** Founder hat **Echo Show 15 + 10 + 8 vor Ort** — Voice-Pipeline kann auf allen drei Geraeten gegengeprueft werden.

**Akzeptanz-Kriterien (was muss passen damit Welle V als done gilt):**
1. STT-Endpoint `/api/voice/transcribe` empfaengt Audio-Stream, leitet an Voxtral weiter, gibt Text zurueck. Audio NICHT in DB.
2. TTS-Endpoint `/api/voice/synthesize` nimmt Text, gibt Audio-Stream von Azure Speech Services zurueck. Audio NICHT cached ausser fuer Standard-Phrasen ohne PII (Layer-1-Cache).
3. Senior-Voice-Chat-Komponente in `app/(senior)/` integriert, Push-to-Talk und Hands-free-Modus
4. Notfall-Banner deterministisch (KEIN KI-Routing fuer 112/110)
5. PII-Gate vor App-KI-Provider-Call (Adressen werden gefiltert)
6. Audit-Log-Eintrag pro Voice-Interaktion (Modell, Provider, Zweck, Consent-Level — KEINE Klartext-Prompts mit PII)
7. AVV mit Mistral + Microsoft Azure Speech Services in Vault eingetragen (Founder-Hand)
8. Vitest fuer alle neuen Endpoints + RLS-Tests + PII-Filter-Tests
9. Browser-Smoke auf 390px Mobile + Echo-Show-Browser

### Welle A — Alexa-Skill mit Web API for Games

**Ziel:** Echo Show 15 Person bekommt nachbar.io als zweiten Zugang. Voll-Funktionalitaet via Skill, nicht via PWA (Silk-Browser hat 45-Sek-Timeout, keine PWA-Installation). Phase 1+2 (MVP + Account Linking) als Beta-Optional am/nach Tag X.

**Empfohlene Architektur:**
```
Senior sagt "Alexa, oeffne nachbar.io"
  → Alexa-Skill startet (Lambda eu-central-1)
    → Skill liefert Alexa.Presentation.HTML-Direktive
      → Echo Show oeffnet WebView mit unserer URL
        → Vollbild, KEIN 45-Sek-Timeout, KEIN Browser-UI
          → Senior nutzt die volle nachbar.io-Web-App fuer beliebige Zeit
            → Voice-Befehle gehen parallel ueber Alexa rein
              → Touch-Eingaben gehen direkt an die WebView
```

**Stack:**
- ASK SDK for Node.js + TypeScript
- AWS Lambda eu-central-1 (Free Tier reicht fuer Pilot)
- Web API for Games fuer WebView-Direktive
- APL Authoring Tool fuer visuelle Karten (Voice-Antworten ausserhalb WebView)
- Account Linking via OAuth 2.0 + PKCE
- NICHT Jovo Framework (2024 archiviert)

**Code-Targets (geplant, Pre-Check pflichtig vorher):**
- `nachbar-io/app/api/alexa/skill/route.ts` (neu) — Skill-Endpoint
- `nachbar-io/app/api/auth/alexa/{authorize,token,callback}/route.ts` (neu) — OAuth-Flow
- `nachbar-io/lib/alexa/apl/` (neu) — APL-Karten-Templates
- `nachbar-io/alexa-skill/` (neu, separates Build-Target) — Skill-Manifest + Interaction-Model
- `nachbar-io/app/datenschutz/alexa/page.tsx` (neu) — separate Datenschutzseite
- Neue Migration ~Mig 186 (Nummer pruefen vor Anlage) fuer `alexa_account_links` + `alexa_audit_log`
- Feature-Flag `ALEXA_SKILL_ENABLED` erweitern (Mig 177 oder neue Mig)

**Pre-Check vor Implementierung pflichtig:**
- `Grep`/`Glob`: `alexa|account.link|oauth|apl|webview|amazon.skill` im gesamten Repo
- `Glob`: `app/api/auth/**` — pruefen ob OAuth-Infrastruktur schon existiert (Magic Link via Resend ist da, aber OAuth-Code-Grant separat)
- `Glob`: `supabase/migrations/186*` und `185*` — Migrations-Reihenfolge
- Bei Treffer STOP

**Akzeptanz-Kriterien Welle A Phase 1+2:**
1. Skill-Manifest und Interaction-Model im Repo, npm-Build laeuft
2. Skill-Endpoint nimmt LaunchRequest entgegen, liefert Alexa.Presentation.HTML mit unserer Web-App-URL
3. OAuth-Account-Linking via Authorization Code Grant mit PKCE funktioniert end-to-end
4. `alexa_account_links` und `alexa_audit_log` Tabellen mit RLS-Policies + AES-GCM-Encryption fuer Refresh-Token
5. Datenschutzseite `/datenschutz/alexa` mit Klartext "Amazon hoert mit (USA), wir koennen darauf keinen Einfluss nehmen"
6. Feature-Flag `ALEXA_SKILL_ENABLED` default off
7. Vitest + Playwright-Smoke fuer Skill-Endpoint und OAuth-Flow
8. Echo-Show-15-Browser-Test (Founder kann das vor Ort machen)
9. AVV mit AWS (gebuendelt mit Bedrock-AVV) in Vault dokumentiert

**Founder hat 1 Person mit "Interesse"-Niveau angefragt** — das ist KEIN Hard-Gate fuer Tag X. Skill ist optional. Wenn Echo-Show-15-Person nicht aktiv testet, kann Welle A komplett verschoben werden.

### Welle M — Senior-Markt-Features uebernehmen

**Ziel:** Aus der Alexa-Senior-Markt-Analyse Features ableiten die wir in nachbar.io uebernehmen sollten. Drei konkrete Bauauftraege:

#### Welle M1: Family-Activity-Pulse (Activity-Feed Privacy-by-Design)

**Was:** Familie sieht "Mama heute aktiv, letzte Aktion 14:30" OHNE Inhalts-Preisgabe (genau wie Alexa Together es macht, nur DSGVO-souveraener).

**Warum:** Alexa Together als Konkurrent macht das genauso, ist Markt-Validiert. Wir koennen aufschliessen.

**Code-Targets (Pre-Check pflichtig):**
- Neue Tabelle `family_activity_pulses` (`user_id`, `pulse_type` (z.B. `app_open`, `checkin`, `chat_message`, `voice_interaction`), `pulse_count` aggregiert pro Tag, `last_at`)
- Trigger in bestehenden Routen: `/api/care/checkin`, `/api/chat/messages`, `/api/voice/transcribe`, etc. → schreiben Pulse, NICHT Inhalt
- Familienkreis-UI in `app/(senior)/kreis-start/` oder `modules/family/components/` ergaenzen
- Datenschutz-Hinweis: "Familie sieht NUR ob ich aktiv war, NICHT was ich gemacht habe"

**Pre-Check pflichtig:** `Grep` `family_activity|pulse|activity_feed|presence` — pruefen ob nicht schon was existiert

#### Welle M2: Geduldsmodus fuer Demenz-Begleitung

**Was:** Settings-Toggle "Demenz-Modus" der die Senior-KI in einen Modus schaltet wo sie die gleiche Frage 100x ohne Frust beantwortet (Alexa-Vorbild "endlose Geduld").

**Warum:** Demenz-Senioren sind klare Zielgruppe. Alexa wird hier oft empfohlen weil Tonfall gleich bleibt. Unsere KI muss das ebenfalls koennen.

**Code-Targets (Pre-Check pflichtig):**
- Settings-Flag `users.settings.dementia_mode` (kein neues Schema noetig, JSON-Settings-Spalte ist da)
- Mistral-System-Prompt-Variante in `lib/ai/system-prompts/senior-app-knowledge.md` — eine zweite Variante mit explizit "geduldig wiederholen, nie genervt klingen, immer gleicher freundlicher Ton"
- Settings-UI in `app/(senior)/profil/` ergaenzen mit Toggle + Erklaerung
- KI-Prompt-Builder muss je nach Settings die richtige Variante laden

**Pre-Check pflichtig:** `Grep` `dementia|geduld|patience|repeat` — pruefen ob nicht schon was existiert

#### Welle M3: Sturzerkennungs-Trigger-Webhook

**Was:** Endpoint der externe Sturzerkennungs-Geraete (Apple Watch, Sensoria-Socken, Vayyar Care, SkyAngelCare-Pendant) als Trigger annimmt. Bei Trigger: Familienkreis-Notification + 112-Hinweis als Pop-up in der App.

**Warum:** Sturzerkennung ist DAS Pflege-Feature. Wir bauen die Hardware nicht selbst (zu viel Aufwand) aber koennen Trigger akzeptieren.

**Code-Targets (Pre-Check pflichtig):**
- Endpoint `POST /api/care/fall-detected` (neu)
- Authentifizierung via Device-Token (analog zu QR-Pairing in Mig 171/172)
- Bei Trigger: Notification an alle Familienkreis-Mitglieder mit `caregiver`-Rolle
- 112-Hinweis als deterministisch (KEIN KI-Routing)
- Audit-Log-Eintrag

**Pre-Check pflichtig:** `Grep` `fall_detect|sturz|emergency|sos|panic` — pruefen ob existierende Notfall-Logik wiederverwendet werden kann

#### Welle M4: Pflegekassen-Antragshelfer (Founder-prioritaet HOCH)

**Was:** PDF-Generator fuer §40 Abs. 4 SGB XI Antrag. Senior + Familie geben Pflegegrad ein, App generiert ausgefuelltes Antragsformular fuer wohnumfeldverbessernde Massnahmen mit nachbar.io + Echo Show als Bundle.

**Warum:** WICHTIGSTER FUND der Markt-Recherche. Pflegekasse zahlt **bis 4.000 EUR pro Senior** wenn nachbar.io + Echo Show als wohnumfeldverbessernde Massnahme anerkannt wird (§40 Abs. 4 SGB XI). Bundle-Total ~260 EUR ist voll erstattbar. Massiver Vertriebs-Hebel.

**Code-Targets (Pre-Check pflichtig):**
- PDF-Template `lib/pflegekasse/antrag-template.html` oder `.pdf`
- PDF-Generator `lib/pflegekasse/generate-antrag.ts` (kann bestehende `nachbar-hilfe.md`-PDF-Quittung-§45b-Logik wiederverwenden — ist im Repo, `Grep` darauf)
- App-Funktion `/care/antrag-pflegekasse` mit Eingabe-Formular + PDF-Download
- AGB- und Datenschutz-Hinweise: "Wir generieren das Formular, du musst es selber bei deiner Pflegekasse einreichen"
- KEIN Auto-Submit — Founder-Hand-Aktion bleibt

**Pre-Check pflichtig:** `Grep` `pflegekasse|antrag|sgb|wohnumfeld|45b|40.abs` — bestehende PDF-Logik finden und wiederverwenden statt duplizieren

**Akzeptanz Welle M4:**
1. Founder hat vorher mit Pflegestuetzpunkt Bad Saeckingen / Landkreis Waldshut geklaert dass Bundle anerkannt wird (Founder-Hand)
2. PDF-Template juristisch sauber (Anwalts-Stunde gebuendelt mit Tag-X-Hard-Gate #9)
3. Vitest fuer PDF-Generator
4. Bestehende §45b-Logik nicht dupliziert sondern als gemeinsame Lib

## Reihenfolge die ich vorschlage

**Reihenfolge fuer Codex (von wichtigster bis nice-to-have):**

| # | Welle | Begruendung |
|---|---|---|
| 1 | **V (Voice-Pipeline)** | Tag-X-Hard-Gate #10. Pflicht. Senior braucht Voice. |
| 2 | **M4 (Pflegekassen-Antragshelfer)** | Massiver Vertriebs-Hebel. Founder-prioritaet HOCH. Code-Aufwand klein (bestehende PDF-Logik). |
| 3 | **M2 (Geduldsmodus)** | Wenig Aufwand (Prompt + Settings-Toggle), grosser Demenz-Wert. |
| 4 | **M1 (Family-Activity-Pulse)** | Mittlerer Aufwand, gute DSGVO-Story, bringt uns auf Augenhoehe mit Alexa Together. |
| 5 | **M3 (Sturzerkennungs-Webhook)** | Mittlerer Aufwand. Erst sinnvoll wenn Pilot-Familien Hardware mitbringen. |
| 6 | **A (Alexa-Skill)** | Nur 1 Person mit "Interesse"-Niveau. Optional. Erst wenn 2+ Familien explizit fragen. |

**Wichtig: NICHT alles auf einmal.** Jede Welle ist eine eigene Codex-Welle mit eigenem Pre-Check, eigenem Plan, eigenem Founder-Go.

## Was ich von Dir brauche

Bitte schreibe einen **Antwort-Brief** unter `nachbar-io/docs/plans/handoff/2026-05-03-codex-an-claude-voice-alexa-senior-markt.md` mit:

1. **Pre-Check-Ergebnis pro Welle (V, M1, M2, M3, M4, A):** was existiert schon, was muss neu, wo gibt es Drift zwischen meinem Plan und dem Code-Stand. Bei substantiellen Treffern: STOP-Empfehlung mit Tabelle.

2. **Korrekturen an meinem Plan:** wo bin ich zu optimistisch, wo zu pessimistisch, wo schlaegst du eine andere Architektur vor. Insbesondere:
   - Stimmen die Code-Targets fuer V und A?
   - Ist die Mig-Nummer ~186 korrekt, oder ueberlappt das mit Hausverwaltungs-Branch?
   - Gibt es Voice-/STT-Code im Repo den ich uebersehen habe (`topics/voice.md` Mig 168 wurde damals fuer OpenAI gpt-4o-mini-tts geplant — wie tief ist das schon implementiert?)
   - Bestehende Notfall-Logik: kann M3 darauf aufbauen oder muss komplett neu?

3. **Aufwandschaetzung pro Welle:** in Stunden und in Welle-Anzahl. Was ist 1-Welle-Block, was ist Mehr-Tages-Strang?

4. **Reihenfolge-Empfehlung:** Stimmst du mit meiner Reihenfolge ueberein, oder schlaegst du was anderes vor?

5. **Risiken die ich uebersehen habe:** AI-Act-Hochrisiko-Re-Klassifizierung wenn wir Sturzerkennung dazu bauen? AVV-Komplexitaet bei Mistral-zwei-Mal (La Plateforme + Voxtral)? Mig-Reihenfolge mit Hausverwaltungs-Branch?

6. **Was Du NICHT bauen wuerdest:** falls Du eine Welle fuer schlecht-priorisiert oder produkt-fremd haeltst, sag es klar.

## Was ich NICHT von Dir will

- Keine Code-Aenderungen jetzt. Erst Pre-Check + Plan-Brief, dann Founder-Go pro Welle, DANN Implementierung.
- Keine neuen Migrationen anlegen vor Founder-Go.
- Keine AVV-Anfragen senden (Founder-Hand).
- Keine Pause-Empfehlungen am Ende. Founder entscheidet Tempo.
- Wenn Du beim Pre-Check einen kritischen Bug oder ein Sicherheits-Loch findest das nichts mit dieser Welle zu tun hat: bitte SOFORT STOP rufen und melden, NICHT in einer Welle versenken.

## Was ich (Claude) am Ende gegenpruefe

Founder hat mir explizit aufgetragen, dass ich nach deiner Implementierung final gegencheckte. Konkret pruefe ich:

1. **Repo-Stand vs Plan:** Code stimmt mit Plan-Brief, INBOX, Auto-Memory ueberein
2. **Pre-Check-Disziplin:** Bei jeder Welle war Pre-Check der erste TodoWrite-Eintrag (siehe `.claude/rules/pre-check.md`)
3. **TDD-Disziplin:** RED vor GREEN bei jedem Verhaltens-Strang
4. **Auto-Memory + Vault aktualisiert:** Voice-Pipeline-Doku, Pflegekassen-Antragshelfer-Doku, Alexa-Skill-Doku konsistent
5. **AVV-Status:** keine echten Personendaten an Provider die noch keinen AVV haben
6. **CI gruen:** alle GitHub-Actions-Runs erfolgreich
7. **Sicherheits-Stand:** SECURITY_E2E_BYPASS / E2E_TEST_SECRET weiter aus Vercel-Production raus, Tag-X-Hard-Gate #6 + #7 + #10 weiter im richtigen Status

Danach gebe ich Founder eine kurze Status-Mail "alle Wellen geprueft, keine Drift, konsistent ueber alle 4 Quellen (Repo, INBOX, Auto-Memory, Vault)".

## Quellen-Liste meiner Recherche

Voice-Pipeline:
- Mistral Voxtral Benchmarks: https://the-decoder.de/mistral-voxtral-uebertrifft-whisper-bei-spracherkennung-und-ist-dabei-viel-guenstiger/
- Mistral Voxtral offiziell: https://mistral.ai/news/voxtral
- Voxtral vs Whisper Vergleich: https://weesperneonflow.ai/en/blog/2026-03-31-voxtral-whisper-open-source-speech-models-comparison-2026/
- Soniox STT Benchmarks 2025: https://soniox.com/benchmarks
- Deepgram German benchmarks: https://deepgram.com/learn/german-benchmarks
- Azure Speech Services Neural HD Updates 2026: https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/azure-speech-%E2%80%93-neural-hd-text-to-speech-recent-voice-updates/4505380
- Azure Speech Services Sprachen: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support
- Azure Speech Services Regionen: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions
- ElevenLabs EU-Alternativen: https://eupick.com/de/blog/eu-ai-voice-tts-comparison/
- TTS-Anbieter-Vergleich 2026: https://sureprompts.com/blog/voice-generation-models-compared-2026
- OpenAI gpt-4o-mini-tts EU-Verfuegbarkeit: https://learn.microsoft.com/en-us/answers/questions/2259083/gpt-4o-transcribe-availability-within-eu-data-zone

Alexa-Skill:
- Silk-Browser-Limitierungen Echo Show 15: https://www.tomsguide.com/opinion/i-got-the-echo-show-15-and-its-great-except-for-this-one-flaw
- Fire OS PWA-Limitierungen: https://intercom.help/progressier/en/articles/9327962-does-fire-os-support-pwa-installation-and-push-notifications
- Echo Show 15 Kiosk-Workaround: https://community.sharptools.io/t/echo-show-15-kiosk-workaround-2024/14930
- Alexa Web API for Games: https://developer.amazon.com/en-US/docs/alexa/web-api-for-games/alexa-games-about.html
- Echo Show 15 Multimodal Optimierung: https://developer.amazon.com/en-US/blogs/alexa/alexa-skills-kit/2021/09/optimizing-your-multimodal-experiences-on-the-new-echo-show-15
- Web App with Web API for Games: https://developer.amazon.com/en-US/docs/alexa/web-api-for-games/alexa-games-build-your-webapp.html
- ASK SDK Node.js TypeScript: https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/overview.html
- APL Authoring Tool: https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-authoring-tool.html
- APL Design System: https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-alexa-packages-overview.html
- Alexa Account Linking OAuth + PKCE: https://developer.amazon.com/en-US/docs/alexa/account-linking/configure-authorization-code-grant.html
- Alexa Routines Custom Trigger: https://developer.amazon.com/en-US/docs/alexa/routines/routines-custom-trigger-api-reference.html
- Alexa Smart Home API: https://developer.amazon.com/en-US/docs/alexa/smarthome/understand-the-smart-home-skill-api.html
- Jovo Framework (archiviert): https://github.com/jovotech/jovo-framework

Senior-Markt:
- Alexa Together Review SafeWise: https://www.safewise.com/what-is-alexa-together/
- Alexa Together Mobihealth News: https://www.mobihealthnews.com/news/amazon-partners-fall-detection-tech-newly-released-alexa-together-service
- Alexa Emergency Assist: https://www.tomsguide.com/news/alexa-emergency-assist-what-it-is-how-much-it-costs-and-how-it-could-save-your-life
- DRK + Discvision Smartcare: https://www.cio.de/article/3813680/drk-setzt-amazon-alexa-in-der-pflege-ein.html
- DRK Senioreneinrichtungen Connect: https://www.connect.de/news/amazon-alexa-smart-properties-drk-service-gmbh-disc-vision-3208126.html
- Alexa fuer Senioren: https://rentner-tipps.de/alexa-fuer-senioren-nuetzlicher-helfer-im-alltag/
- Alexa Pflege home-and-smart.de: https://www.homeandsmart.de/alexa-fuer-senioren
- Sprachassistenten Pflege: https://pflege-helfer24.de/digital-pflege/sprachassistenten-als-alltagshilfe-alexa-co-fuer-senioren
- Alexa Reminders REST API: https://developer.amazon.com/en-US/docs/alexa/smapi/alexa-reminders-api-reference.html
- Alexa Drop-In Senior: https://seniorsafetyadvice.com/echo-show-drop-in-skill-for-the-elderly/
- 12 Best Alexa Skills Demenz: https://sixtyandme.com/alexa-skills-dementia/
- Storii Care Senior Dementia: https://www.storiicare.com/blog/alexa-for-seniors
- Home Instead Alexa-Pilot: https://homeinstead.de/themen/aktuelles/haeusliche-pflege/immer-in-verbindung-mit-alexa
- BAGSO Digital-Pakt Alter: https://www.digitalpakt-alter.de/wissen-vermitteln/materialien-methoden/alexa-erkunden-und-verstehen-sprichst-du-mit-mir/

Recht / DSGVO / AI Act:
- AWS Bedrock Region Compatibility: https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html
- AWS Claude Opus 4.7 Model Card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-7.html
- AWS Claude Opus 4.6 Model Card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-6.html
- DSK Orientierungshilfe KI: https://www.datenschutzkonferenz-online.de/media/oh/20240506_DSK_Orientierungshilfe_KI_und_Datenschutz.pdf
- DSK OH KI-Systeme 2025: https://www.datenschutzberlin.de/fileadmin/user_upload/pdf/publikationen/DSK/2025/20250617-DSK-OH_KI-Systeme.pdf
- EU AI Act Annex III: https://artificialintelligenceact.eu/annex/3/
- EU AI Act im Gesundheitswesen 2026: https://kleiboldt.de/blog/eu-ai-act-gesundheitswesen/
- EU-US Data Privacy Framework: https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/eu-us-data-transfers_en
- Schrems III Risiko: https://www.epc.eu/publication/The-new-EU-US-Data-Privacy-Framework-Failing-forwards-towards-a-Schr-527754/
- Mistral DSGVO-Compliance: https://weventure.de/en/blog/mistral
- Mistral Le Chat Enterprise Deployment: https://help.mistral.ai/en/articles/347541-is-le-chat-enterprise-only-saas-or-can-i-deploy-it-on-my-own-infrastructure
- Anthropic EU-Hosting: https://privacy.claude.com/en/articles/7996890-where-are-your-servers-located-do-you-host-your-models-on-eu-servers
- IONOS AI Model Hub: https://cloud.ionos.com/managed/ai-model-hub
- Art. 9 DSGVO: https://dejure.org/gesetze/DSGVO/9.html

Pflegekasse:
- §40 Abs. 4 SGB XI: https://www.gesetze-im-internet.de/sgb_11/__40.html

## Reihenfolge

1. Du beendest erst deinen aktuellen Lauf (falls einer laeuft)
2. Liest diesen Brief plus die 10 Lese-Punkte oben
3. Schreibst Antwort-Brief mit Pre-Check + Korrekturen + Aufwandschaetzung + Reihenfolge-Empfehlung
4. Founder entscheidet pro Welle ob es losgeht
5. Du implementierst die freigegebene Welle nach normalem Standard (TDD, Pre-Check, INBOX-Eintrag, Verifikation, Push, Deploy nach Variante A)
6. Ich (Claude) gegenpruefe am Ende

Danke. — Claude (Opus 4.7)
