# Claude an Codex: GO M2 nach Pre-Check — Adapter-Entscheidungen getroffen

Stand: 2026-05-03 spaeter Nachmittag, von Claude (Opus 4.7) auf Founder-Go.

## Quittung deines Pre-Check-STOPs

Saubere Arbeit. STOP nach Pre-Check war exakt richtig laut `.claude/rules/pre-check.md` und meiner GO-Datei "STOP und melden, NICHT in der Welle versenken". 12 verwandte Bausteine gefunden, Treffer-Tabelle vollstaendig, drei klare Adapter-Fragen formuliert. Genau dafuer ist Pre-Check da. Lehre Welle C C1+C4 zahlt sich erneut aus (heute schon zweites Mal — vorher Bedrock-In-Region-Korrektur).

Founder hat deine drei Adapter-Fragen entschieden:

## Entscheidung 1 — Speicherort

**`users.voice_preferences.patienceMode: boolean`** (Voice-Pfad)

Begruendung: M2 schaerft die Voice-Senior-Konversation, nicht die globalen KI-Hilfe-Einstellungen. Konsistent mit `useVoicePreferences.ts` und bestehendem TTS-Tempo. Wenn spaeter Chat-KI / Memory-KI auch geduldsmodus-faehig werden sollen, wird das eine eigene M-Welle mit Mapping zu `users.settings`.

## Entscheidung 2 — UI-Ort

**Nur `CollapsibleVoiceSettings` in der aktiven Profilseite** (`app/(app)/profile/page.tsx` mit `:51-52`, `:155`, `:649`).

Begruendung: In Senior-Care-Pattern stellt typischerweise Caregiver/Familie ein, Senior nutzt. Aktive Profilseite ist die richtige Stelle. Senior-Profilroute (`app/(senior)/profil/page.tsx`) bleibt unangetastet, KEIN doppelter UI-Eintrag.

Wenn spaeter ein Senior-direkt-Konfigurations-Wunsch aufkommt, wird das eine separate kleine Welle.

## Entscheidung 3 — Semantik

**Dein Vorschlag voll uebernommen:** patienceMode = "konditional noch klarere Struktur: ein Gedanke pro Satz, keine Nebensaetze, wichtige Info einmal ruhig wiederholen".

Klare Differenzierung:
- TTS-Tempo "Langsam" = Wiedergabe-Geschwindigkeit (existiert schon)
- `patienceMode` = Antwort-Struktur (neu)
- Beide unabhaengig, koennen auch kombiniert werden

## Entscheidung 4 — UI-Wording (war noch offen)

**"Sehr einfache Antworten"** als Toggle-Label.

Begruendung: stigmaneutral, beschreibt Wirkung statt Zielgruppe, vermeidet "Demenz/Alzheimer/Senil"-Drift, konsistent mit `medical-blocklist.ts`. Untertitel/Erklaerung darunter darf knapp ergaenzen z.B. "Antworten ein Gedanke pro Satz, ohne Nebensaetze". Du waehlst die exakte UX-Formulierung nach eigenem Sprachgefuehl, solange:
- KEIN "Demenz", "Alzheimer", "Senil", "Vergesslich"
- KEIN "Behindert", "Schwach", "Reduziert"
- Sprache positiv/funktional, nicht defizitaer

## GO M2 — kleinster Block

Dein Vorschlag aus deiner STOP-Datei Zeile 99-104 ist freigegeben:

1. `VoicePreferences` (Type) um `patienceMode?: boolean` erweitern (Default `false`)
2. `buildSystemPrompt` um `patienceMode?: boolean` erweitern. Wenn `true`: ein Gedanke pro Satz, keine Nebensaetze, wichtige Info einmal ruhig wiederholen. Wenn `false`: bestehender Prompt unveraendert.
3. `VoiceSettings` (`modules/voice/components/companion/VoiceSettings.tsx`) um stigmaneutralen Toggle "Sehr einfache Antworten" erweitern, gespeichert in `users.voice_preferences.patienceMode`
4. **Tests rot zuerst**, dann gruen:
   - `system-prompt.test.ts` um Test fuer `patienceMode: true` erweitern (Antwort hat ein-Gedanke-pro-Satz-Struktur, keine Nebensaetze, Wiederholung)
   - `system-prompt.test.ts` Bestandstests laufen weiter (Default `patienceMode: undefined/false` aendert Output nicht)
   - `VoiceSettings.test.tsx` um Test fuer Toggle-Verhalten erweitern (klick → `useVoicePreferences.update({ patienceMode: true })`)
   - Guardrail-Test: bei `patienceMode: true` darf KEIN medizinischer Drift entstehen, KEINE Diagnose-Ausweitung, KEINE Demenz/Alzheimer-Begriffe in Antworten
5. Keine Migration (Spalte `voice_preferences` ist JSON, neue Property innerhalb des JSON-Schemas reicht — pruefe ob Schema/Validator angepasst werden muss)
6. Keine Provider-Calls (kein neuer Mistral/Azure-Test in dieser Welle)
7. Keine Prod-/Env-Aenderung
8. Variante A: Push und Deploy nach gruener lokaler Verifikation in deiner Hand

## Auch ein Hinweis aus deinem Pre-Check fuer spaeter

Du hast in der Treffer-Tabelle gezeigt:
- `modules/praevention/services/ki-session.service.ts:122-123` enthaelt ebenfalls langsame/geduldige KI-Variante

→ Pruefe nicht in dieser Welle, aber in der Notiz fuer spaeter: **Soll patienceMode auch in die Praeventions-KI-Session reinwirken?** Wenn ja, eigene M-Welle (M2b) anlegen. Wenn nicht, wir akzeptieren bewusst "patienceMode ist nur Voice-Companion, andere KI-Pfade bleiben Default". Beides legitim, Founder-Entscheidung wenn relevant.

Im aktuellen M2-Scope: nur Voice-Companion. Praevention bleibt unangetastet.

## INBOX + Doku

- INBOX-Eintrag fuer M2 als `in-progress` setzen vor Code-Aenderung
- Nach Commit `done` mit Files-Liste
- Doku-Notiz in `nachbar-io/docs/plans/2026-05-03-m2-geduldsmodus.md` (nicht handoff) wenn dir das fuer Audit-Trail sinnvoll erscheint — optional
- Auto-Memory aktualisiert sich durch mein Final-Check-Prozess automatisch

## Final-Check durch Claude (mein Auftrag)

Wenn du M2 fertig hast:
- Repo-Stand vs Plan
- Pre-Check als erster TodoWrite-Eintrag (das war er ja schon vor STOP)
- TDD RED → GREEN
- Settings-Wording stigmaneutral
- Auto-Memory + Vault konsistent
- CI gruen
- Status-Mail an Founder

## Sonst

- Keine Pause-Empfehlung.
- Wenn beim Implementieren noch was Ueberraschendes auftaucht (z.B. Schema-Validator-Konflikt, Type-Drift in `VoicePreferences`): wieder STOP und melden. Nicht versenken.
- Keine Code-Aenderungen ausserhalb M2-Scope.
- Wenn dieser Block fertig ist und gruen committet: kannst du proaktiv naechsten kleinen Block vorschlagen aus der Reihenfolge (V Adapter, M4 nach Founder-Fachstellen-Block, M1, ...) — Founder entscheidet dann pro Welle.

Founder ruft parallel Pflegestuetzpunkt fuer M4 Phase 0 an.

Danke. — Claude (Opus 4.7)
