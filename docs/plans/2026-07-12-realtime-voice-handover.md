# Handover Claude -> Codex: Realtime-Sprach-KI in Nachbar.io (live)

**Datum:** 2026-07-12 · **Owner-Bau:** Codex · **Plan/Compliance:** Claude
**Founder-Go:** liegt vor (2026-07-12) · **Deadline-Wunsch:** naechster Morgen 9 Uhr

## Auftrag (eine Zeile)

Die **neue OpenAI-Realtime-Sprach-KI** (Gespraech in Echtzeit, Nutzer kann
gleichzeitig reinreden = Barge-in) in Nachbar.io einbauen und **fuer alle
Nutzer live** schalten — inklusive Demo-Zugang, sodass Investoren dort sofort
mit der Stimme sprechen koennen. Gleiche Technik wie der Sprachtrainer der
lern-app.

## Founder-Entscheid + Compliance-Grenze (WICHTIG, wortgetreu umsetzen)

- **Founder waehlte ausdruecklich "fuer alle Nutzer live"** (AskUserQuestion 2026-07-12),
  in Kenntnis der Konsequenz: Realtime-Voice sendet **Live-Sprache echter Senioren
  an OpenAI**.
- **§5-AVV mit OpenAI ist damit bewusst NACHGELAGERT — offener Compliance-Punkt.**
  Nicht als Blocker behandeln, aber im Merge-/Rapport-Text als offener Punkt
  vermerken (AVV zeitnah nachziehen).
- **DSGVO-Minimum trotzdem Pflicht** (kein AVV-Ersatz, bremst nichts):
  1. **Transparenz-Hinweis vor dem ersten Sprechen:** kurzer, ruhiger Satz, dass
     die Stimme zur Verarbeitung an OpenAI uebertragen wird (einmalig pro Sitzung
     bestaetigen). Senior-tauglich formuliert.
  2. **Bestehende KI-Einwilligung als Voraussetzung:** `canUsePersonalAi()` bzw.
     der `ai_onboarding`-Consent muss vorliegen (siehe `lib/ai/user-settings.ts`).
  3. **Kein Speichern von Audio.** Weder Roh-Audio noch Transkript persistieren
     (nur fluechtig im Client waehrend der Sitzung).

## Was genau (Technik)

Eine echte **Realtime-Konversation** (nicht nur Vorlesen). Vorbild 1:1 die
lern-app — dort verifiziert und live:

**Referenz lern-app (anderes Repo, lesen erlaubt):**
`C:\Users\thoma\Documents\New project\lern-app\`
- `app/api/voice-trainer/session/route.ts` — Ephemeral-Token-Mint via
  `POST https://api.openai.com/v1/realtime/client_secrets`; `session.type:"realtime"`;
  `audio.output.voice:"marin"`; `audio.input.transcription:{model:"gpt-4o-mini-transcribe",language:"de"}`;
  **`turn_detection:{type:"semantic_vad",eagerness:"low",create_response:true,interrupt_response:true}`**
  (genau das = KI wartet auf Denkpausen UND laesst sich unterbrechen = "gleichzeitig reinreden").
- `app/sprechen/VoiceTrainerView.tsx` — WebRTC-Client (Mikro, Audio-Stream, Barge-in).
- `lib/voice-trainer/config.ts` — Modell `gpt-realtime-mini`, Session-Limit 10 min,
  Rate-Limit 8 Sessions/Stunde/User, Fail-closed-Gate.
- `lib/voice-trainer/prompt.ts` — server-seitiger System-Prompt-Bau (nicht vom Client).

**Kern-Settings fuer Nachbar.io (uebernehmen):**
- Modell: `gpt-realtime-mini` (env-override moeglich), Stimme: **marin**.
- STT: `gpt-4o-mini-transcribe`, Sprache de.
- `semantic_vad` / eagerness `low` / `interrupt_response:true` (Barge-in Pflicht — genau das ist der Wunsch).
- Ephemeral-Token server-seitig (OPENAI_API_KEY **nie** zum Client), Ablauf ~120 s.
- Session-Limit 10 min, Rate-Limit 8/h/User (Kosten! Realtime ist teuer).

## Pre-Check-Ergebnis (bestehende Infra — Adapter statt Neubau!)

- **Companion-UI existiert:** `modules/voice/components/companion/*`
  (`CompanionChat`, `DialogMode`, `VoiceSettings`, `TTSButton`, `AutoListenIndicator`).
  Die Realtime-Stimme soll sich HIER eingliedern (z. B. als Modus im Companion /
  neuer "Sprechen"-Einstieg), nicht als isolierte Parallel-UI.
- **WebRTC-Basis vorhanden:** `lib/webrtc/peer-connection.ts` + `types.ts`
  (bisher fuer 1:1-Video). Pruefen ob adaptierbar; Realtime nutzt eine eigene
  RTCPeerConnection gegen OpenAI — wahrscheinlich getrennt, aber Helfer wiederverwenden.
- **TTS marin/cedar ist bereits live gemergt** (`modules/voice/lib/voice-names.ts`,
  PR #94). Voice-Namen von dort nutzen, nicht neu definieren.
- **KI-Gate vorhanden:** `lib/ai/user-settings.ts` `canUsePersonalAi()` prueft
  assistance-level + `ai_onboarding`-Consent + `AI_PROVIDER_OFF`-Flag.

## Gating / "fuer alle live"

- **Eigenes Flag `REALTIME_VOICE_ENABLED`** (analog `VOICE_TRAINER_ENABLED` der
  lern-app): Feature nur aktiv wenn `OPENAI_API_KEY` gesetzt **und**
  `REALTIME_VOICE_ENABLED=1`. Ohne Flag: kein Button, Route antwortet 503.
- **`AI_PROVIDER_OFF`-Verhaeltnis klaeren:** Founder will die neue KI-Stimme (TTS
  marin/cedar **und** Realtime) fuer alle hoerbar. Sauberste Loesung vorschlagen —
  Optionen: (a) `AI_PROVIDER_OFF` aus + Realtime-Flag an, oder (b) Realtime an
  seinem eigenen Flag unabhaengig. Empfehlung im Rapport begruenden. Die finale
  Env-Setzung (Flag scharf) ist **Founder-Hand** (Vercel-Env, wie beim Demo-Token).
- Der **Demo-Zugang** ("Familie Beispiel") ist automatisch abgedeckt, sobald das
  Feature fuer alle live ist — Demo-User hat bereits `ai_onboarding`-Consent +
  assistance-level (Seed).

## System-Prompt (Senior + Sicherheit — Pflicht)

Server-seitig bauen (nicht Client). Muss enthalten:
- **Tonalitaet:** ruhig, warm, langsam, Siezen, einfache Saetze. Senior-first.
- **Medizin-Blocklist:** KEINE medizinische Beratung/Diagnose (Nachbar.io ist kein
  Medizinprodukt, RPP-001). Bei Gesundheitsfragen freundlich an Arzt/Fachstelle
  verweisen. Muster: bestehende Blocklist-Logik `modules/memory/*` /
  `lib/care/*`-Konventionen pruefen.
- **Notruf zuerst:** Bei Andeutung eines Notfalls sofort auf **112/110** hinweisen,
  nicht "ich helfe" spielen.
- Keine personenbezogenen Daten Dritter erfragen/ausgeben.

## Mini-Audit (PFLICHT — neuer Provider-/Auth-/Audio-Pfad)

Vor Merge dokumentieren (siehe `.claude/rules/security-mini-audit.md`):
- Neuer Token-Endpoint (Ephemeral-Mint): Auth (nur eingeloggt + Consent),
  Rate-Limit (8/h), keine IDOR (userId aus Session, nicht Body).
- Kein Audio/Transkript persistiert (RLS/Storage-Sweep).
- Kosten-Obergrenze (Session-Limit) greift server- UND clientseitig.
- OPENAI_API_KEY verlaesst Server nie.

## Umsetzung / Definition of Done

1. TDD: Session-Route (503 ohne Flag/Consent, 401 ohne Auth, Rate-Limit 429,
   Token-Mint mit korrektem Realtime-Body inkl. `interrupt_response:true`),
   Gating-Tests, Senior-UI-Render-Test.
2. Companion-Integration + Senior-taugliche Sprech-UI (grosser Button, klarer
   Status "hoert zu"/"spricht", sichtbarer Transparenz-Hinweis, Notruf bleibt sichtbar).
3. Mini-Audit-Block im Rapport.
4. CI-Gates gruen (Vitest + tsc + eslint, S7, S1-S6). **Vor PR-Push volle Suite,
   nicht nur neue Tests** (Lehre #91). `**/.codex-worktrees/**` ist seit #94 aus
   der Vitest-Config ausgeschlossen.
5. Einzeln reviewen (0 CRIT/HIGH), squash-mergen, EIN Deploy, Live-Smoke.
6. **Founder-Hand:** `REALTIME_VOICE_ENABLED=1` (+ ggf. `AI_PROVIDER_OFF` aus) in
   Vercel-Prod-Env setzen = finale Scharfschaltung. Danach Live-Smoke Realtime
   (Ephemeral-Token 200, WebRTC-Verbindung steht).

## Rote Zonen

- OPENAI_API_KEY liegt bereits in Vercel-Prod-Env (verifiziert 2026-07-12).
- Env-Flag scharf schalten = Founder-Hand. Neue laufende Kosten (Realtime-Minuten)
  = Founder ist informiert (Founder-Go liegt vor).
- Deploy nach Merge durch Codex ok (Founder-Go).

## Implementierungsstand Codex 2026-07-12

Status: lokaler Patch auf `codex/realtime-voice`, noch kein Push, kein PR, kein
Merge, kein Deploy und keine Env-Scharfschaltung.

- Neue fail-closed Route: `POST /api/voice/realtime/session`.
- Realtime-Konfiguration: `gpt-realtime-mini`, `marin`, deutsche Transkription,
  `semantic_vad` mit `eagerness: "low"` und `interrupt_response: true`.
- Auth und bestehendes `canUsePersonalAi()`-Gate werden vor dem Token-Mint
  geprüft. Damit bleiben Assistance-Level, `ai_onboarding`-Consent und
  `AI_PROVIDER_OFF` gemeinsam wirksam.
- Redis-basiertes, fail-closed Kostenlimit: acht Sitzungsstarts pro Stunde und
  Nutzer. Die Nutzer-ID kommt ausschließlich aus der authentifizierten Session.
- Companion-Seite integriert `Schreiben` und `Sprechen`. Der Sprechen-Einstieg
  wird serverseitig nur bei `OPENAI_API_KEY` plus
  `REALTIME_VOICE_ENABLED=1` gerendert.
- Die getrennte Senior-Shell erhält bei aktivem Gate eine 80px-Sekundäraktion
  auf `/kreis-start` und die eigene Route `/sprachbegleiter`. Das verbindliche
  Vier-Kachel-Layout bleibt unverändert; bei deaktiviertem Gate leitet die
  direkte Route zurück zur Senior-Startseite.
- `DialogMode` nutzt einen eigenen OpenAI-Realtime-WebRTC-Client. Der vorhandene
  `PeerConnectionManager` bleibt unverändert, weil dessen Supabase-Signaling,
  TURN-Konfiguration und Video-Lifecycle fachlich nicht zum direkten
  OpenAI-WebRTC-Call passen.
- Bestehende Stimmen-SSOT `DEFAULT_VOICE` wird wiederverwendet; TTS-Route und
  `voice-names.ts` brauchten keine Änderung.

### Security-Mini-Audit

| Prüffeld | Ergebnis / Beleg |
|---|---|
| Feature-Gate | Ohne `REALTIME_VOICE_ENABLED=1` oder ohne `OPENAI_API_KEY`: 503 vor Auth und ohne Upstream-Call. UI-Einstieg bleibt verborgen. |
| Auth | `requireAuth()` ist Pflicht; ohne Session 401. |
| Consent | `canUsePersonalAi()` prüft Assistance-Level, `ai_onboarding` und den bestehenden Provider-Kill-Switch; ohne Freigabe kein Token. |
| IDOR | Die Route akzeptiert keine Nutzer-ID und keinen Request-Body. Der Rate-Limit-Key stammt aus `auth.user.id`. |
| Rate-Limit | Upstash Redis, acht Starts pro Stunde/Nutzer, fail-closed bei fehlendem oder fehlerhaftem Redis. |
| API-Key | `OPENAI_API_KEY` wird nur serverseitig an `/v1/realtime/client_secrets` gesendet. Der Client erhält ausschließlich ein ca. 120 Sekunden gültiges Ephemeral-Secret. |
| Audio/Transkript | Keine DB-, Storage-, LocalStorage- oder SessionStorage-Schreiblogik. Audio läuft nur als MediaStream; Transkript-Events werden nicht verarbeitet oder im React-State gehalten. |
| Transparenz | Vor jedem Sitzungsstart muss der Hinweis auf OpenAI-Übertragung und Nicht-Speicherung bestätigt werden. |
| Medizin/Notruf | Serverprompt verbietet Beratung/Diagnose, verweist an Fachstellen und priorisiert 112/110. Die UI hält 112/110 sichtbar. |
| Sitzungsdauer | Der Server begrenzt den konfigurierbaren Wert auf maximal zehn Minuten und liefert ihn an den Client; der Client beendet die PeerConnection beim Ablauf. |

### Offene Grenzen vor Scharfschaltung

1. Der offene §5-AVV mit OpenAI bleibt trotz Founder-Entscheid ein
   Compliance-Restpunkt. Transparenz, Consent und Nicht-Speicherung ersetzen
   den AVV nicht.
2. Die OpenAI-Realtime-Session-Konfiguration bietet aktuell kein Feld für eine
   serverseitig erzwungene Maximaldauer. Das 10-Minuten-Limit ist deshalb vom
   Server definiert, aber im Browser durchgesetzt und von einem manipulierten
   Client umgehbar. Für eine harte Kostenobergrenze wäre ein serverkontrollierter
   Call-Lifecycle bzw. serverseitiger Hangup-Mechanismus nötig. Das bestehende
   8/h-Limit begrenzt Starts, nicht die Dauer eines manipulierten Calls.
3. Empfohlene Scharfschaltung bleibt: `AI_PROVIDER_OFF` erst bewusst aus und
   `REALTIME_VOICE_ENABLED=1` bewusst an. Das Realtime-Flag soll den globalen
   Provider-Kill-Switch nicht umgehen.

### Lokale Verifikation

- TDD-Rotlauf: 12 erwartete Fehler vor Implementierung.
- Realtime fokussiert: 4 Dateien, 19/19 Tests grün.
- Senior-Integration/Touchziele: 4 Dateien, 16/16 Tests grün.
- Voice-/Companion-Regression: 7 Dateien, 58/58 Tests grün.
- Volle Vitest-Suite: 753 Dateien, 5284 bestanden, 1 übersprungen.
- `npx tsc --noEmit`: grün.
- ESLint auf allen geänderten TS/TSX-Dateien: grün.
- `npm run build`: grün; `/api/voice/realtime/session`, `/companion` und
  `/sprachbegleiter` im Next.js-Route-Manifest enthalten.

---

## Härtung nach Claude Critical Review (2026-07-12)

Claude hat den Branch unabhängig verifiziert (volle Vitest-Suite 5284 grün + tsc
selbst nachgelaufen) und den Diff mit sechs adversarialen Review-Linsen geprüft.
Ergebnis: 0 CRITICAL, aber 1 HIGH + weitere Findings, die Codex' Selbst-Review
nicht gefunden hatte. Behoben in Nachtrag-Commit(s) auf demselben Branch:

- **#1 HIGH (behoben) — Mikrofon-Race in `lib/webrtc/realtime-voice.ts`:**
  Wurde die Sitzung während des asynchronen Aufbaus beendet (Unmount / Beenden-
  Knopf während `connecting` / Fehler), lief `cleanup()` ins Leere (mic noch
  null) und der danach auflösende `getUserMedia`-Stream blieb offen — Mikrofon-
  LED blieb an, plus verwaiste bezahlte OpenAI-Verbindung. Fix: `closed`-Flag,
  in `cleanup()` gesetzt, nach jedem `await` in `connect()` geprüft; der gerade
  erhaltene Stream wird gestoppt und der Aufbau abgebrochen.
- **#7 MED (behoben) — 80px-Touchziel (CLAUDE.md, nicht verhandelbar):**
  Consent-Checkbox-Zeile (48px) und Mikrofon-Schalter (48px) auf `min-h-[80px]`;
  Checkbox visuell auf `h-9 w-9`.
- **#5/#6 MED (behoben) — Test-Lücken:** Neuer `__tests__/lib/webrtc/
  realtime-voice.test.ts` (Race-Teardown, Track-Stop, Verbindungsabbruch —
  vorher war der ganze Client wegemockt) + Unmount-Teardown-Test in
  `DialogMode.test.tsx`.

### Bewusst NICHT geändert — dokumentierte Restpunkte

- **#3/#4 Kosten (Founder-Hand):** Die Session-Dauer bleibt clientseitig gekappt
  (OpenAI bietet kein Server-Feld; siehe oben). Ein Tages-/Concurrency-Cap auf
  *Starts* wirkt nur marginal gegen eine einzelne lange Session. **Wirksame
  Bremse = OpenAI-Budget-/Usage-Limit im OpenAI-Dashboard (Founder).** Für den
  Closed-Pilot mit wenigen vertrauenswürdigen Nutzern + Demo ist das Restrisiko
  vertretbar; vor breitem Public-Launch neu bewerten (serverseitiger Hangup).
- **#2 LOW — Consent-UI-Gate:** Der `ai_onboarding`-Consent wird serverseitig in
  der Route erzwungen (kein Audio ohne Consent an OpenAI), aber die Einstiege
  gaten im UI nur auf das Env-Flag. Rein UX (verwirrende Fehlermeldung statt
  ausgeblendetem Einstieg), kein Datenleck. Optionale Nachbesserung.
