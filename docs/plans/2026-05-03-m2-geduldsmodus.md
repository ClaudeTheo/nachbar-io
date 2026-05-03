# M2 Geduldsmodus

Stand: 2026-05-03 spaeter Nachmittag
Commit-Scope: kleiner Code-Block nach Founder-Freigabe

## Ziel

M2 ergaenzt den bestehenden Voice-/Companion-Pfad um eine stigmaneutrale Option
fuer sehr einfache Antworten. Die Option heisst im UI nicht "Demenzmodus",
sondern "Sehr einfache Antworten".

## Umsetzung

- `VoicePreferences` hat jetzt `patienceMode?: boolean`.
- Speicherung bleibt bei `users.voice_preferences`, passend zu Stimme, Tempo und
  Anrede.
- `VoiceSettings` zeigt einen Toggle "Sehr einfache Antworten".
- `useVoicePreferences` normalisiert fehlende Altwerte auf `false`.
- `processChat` liest `voice_preferences.patienceMode` und gibt es an
  `buildSystemPrompt` weiter.
- `buildSystemPrompt` fuegt nur bei aktivem Modus den Abschnitt
  `SEHR EINFACHE ANTWORTEN` hinzu.

## Guardrails

- Keine Migration.
- Keine Provider-Calls.
- Keine Prod-/Env-Aenderung.
- Kein UI-Wording mit Demenz, Alzheimer oder senil.
- Medizin-/Medikamenten-Guardrails bleiben unveraendert hart.

## Verifikation

Gezielte TDD-Verifikation:

```powershell
npm run test -- --run modules/voice/services/__tests__/system-prompt.test.ts __tests__/components/companion/VoiceSettings.test.tsx __tests__/api/companion/chat.test.ts
```

Ergebnis: 3 Testdateien, 29 Tests gruen.

Volle lokale Verifikation:

```powershell
npm run test
npm run lint
npx tsc --noEmit
npm run build:local
```

Ergebnis:

- Vitest: 530 Testdateien, 3977 passed, 1 skipped.
- ESLint: gruen.
- TypeScript: gruen.
- `build:local`: gruen.
- Wording-Check im Voice-/Profil-Code: keine Treffer fuer stigmatisierende
  Begriffe ausserhalb der Guardrail-Tests.
