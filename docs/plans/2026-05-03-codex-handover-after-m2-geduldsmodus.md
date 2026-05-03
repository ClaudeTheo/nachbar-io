# Codex Handover nach M2 Geduldsmodus

Stand: 2026-05-03 spaeter Nachmittag
Branch: `master`
HEAD: `53e0ee1 feat(voice): add patience mode preference`

## Kurzstand

M2 ist fertig, committed und gepusht. Der Voice-Companion hat jetzt eine
stigmaneutrale Option "Sehr einfache Antworten". Technisch liegt sie in
`users.voice_preferences.patienceMode` und wirkt nur auf die Struktur der
Companion-Antworten, nicht auf TTS-Tempo und nicht auf Praevention.

## Was erledigt wurde

- `VoicePreferences` um `patienceMode?: boolean` erweitert.
- `useVoicePreferences` normalisiert fehlende Altwerte auf `false`.
- `VoiceSettings` zeigt den Toggle "Sehr einfache Antworten".
- `processChat` liest `voice_preferences.patienceMode`.
- `buildSystemPrompt` fuegt bei aktivem Modus den Abschnitt
  `SEHR EINFACHE ANTWORTEN` hinzu.
- Tests fuer Prompt, UI und API-Weitergabe wurden test-first ergaenzt.
- Doku: `docs/plans/2026-05-03-m2-geduldsmodus.md`.

## Verifikation

Lokal:

- `npm run test`: 530 Testdateien, 3977 passed, 1 skipped.
- `npm run lint`: gruen.
- `npx tsc --noEmit`: gruen.
- `npm run build:local`: gruen.
- Wording-Check im Voice-/Profil-Code: keine stigmatisierenden UI-Treffer
  ausserhalb der Guardrail-Tests.

GitHub Actions fuer `53e0ee1`:

- CodeQL Security Analysis: success.
- Smoke Tests (S7): success.
- Multi-Agent Tests (S1-S6): success.

## Lokaler Zustand

`git status --short --branch`:

```text
## master...origin/master
?? .codex-welle-d-3001.pid
```

Die PID-Datei ist lokal untracked und darf weiter nicht geloescht werden.

## Keine roten Zonen beruehrt

- Keine Prod-DB-Writes.
- Keine Migration.
- Keine Vercel-Env-Aenderung.
- Keine neuen Kosten.
- Keine neuen Provider-Calls.
- Keine echten personenbezogenen Daten.

## Naechster sinnvoller Block

Empfehlung: **M4 Phase 0 weiter vorbereiten, aber noch keinen Generator bauen.**

Warum:

- Wirtschaftlich ist der Pflegekassen-/Wohnumfeld-Hebel stark.
- Der Code hat bereits PDF-Infrastruktur, aber der fachliche Anspruch muss
  vorher wasserdicht sein.
- Founder klaert parallel mit Pflegestuetzpunkt/Pflegeberatung, ob und wie ein
  Sprachassistenz-/Familien-App-Bundle als wohnumfeldverbessernde Massnahme
  formuliert werden darf.

Kleinster Codex-Block danach:

- Kein PDF-Generator.
- Kein Antrag.
- Nur ein internes M4-Wording-/Unterlagen-Schema als Doku:
  - Welche Aussagen sind erlaubt?
  - Welche Nachweise braucht eine Familie?
  - Welche Felder darf die App sammeln?
  - Welche Formulierungen vermeiden Erstattungsversprechen?

Falls Founder fuer M4 noch keine Fachstellenantwort hat:

Alternative kleiner Block: **Voice-Provider-Adapter-Pre-Check fuer Welle V**.
Nur Pre-Check und Adapterplan, keine Mistral/Azure-Calls, keine AVV-Umgehung.

## In einfachen Worten

Jetzt nicht blind das naechste Feature bauen. Erst den Pflegekassen-Hebel
sauber absichern. Wenn Thomas vom Pflegestuetzpunkt eine positive oder
brauchbare Antwort hat, kann Codex daraus den naechsten kleinen Doku-/Schema-
Block machen. Erst danach lohnt sich der PDF-Antragshelfer.
