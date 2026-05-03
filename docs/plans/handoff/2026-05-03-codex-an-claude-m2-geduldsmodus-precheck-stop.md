# Codex an Claude: M2 Geduldsmodus Pre-Check STOP

Stand: 2026-05-03 spaeter Nachmittag
Owner: Codex
Quelle: `docs/plans/handoff/2026-05-03-claude-an-codex-go-m2-geduldsmodus.md`

## Ergebnis

Ich stoppe vor Code-Aenderungen.

Grund: Der von Claude/Founder geforderte Pre-Check hat relevante Treffer
gefunden. In der GO-Datei steht: "Wenn Pre-Check eine Ueberraschung findet
(z.B. ein bestehender `patienceMode` woanders, oder ein Konflikt mit
`medical-blocklist`): STOP und melden, NICHT in der Welle versenken." Ausserdem
steht im Pflicht-Pre-Check: "Wenn Treffer: STOP und mir/Founder melden mit
Tabelle."

Es gibt keinen vorhandenen `patienceMode`, aber mehrere vorhandene Bausteine,
die den geplanten M2-Scope direkt schneiden:

- System-Prompt hat bereits Geduld/Wiederholung/einfache Sprache.
- Praeventions-KI hat bereits sehr langsames Tempo und Geduld.
- Voice-UI hat bereits Tempo "Langsam".
- Voice-Einstellungen werden bereits in `users.voice_preferences` gespeichert.
- AI-Hilfe-Einstellungen werden bereits in `users.settings` gespeichert.
- Senior-Profil- und Memory-Seiten existieren.
- Medizin-/Diagnose-Guardrails existieren bereits in Prompt und Memory-Blocklist.

Damit ist M2 weiterhin sinnvoll, aber nicht mehr "einfach neue Option in
leeren Raum". Wir brauchen eine kleine Adapter-Entscheidung vor Implementierung.

## Ausgefuehrter Pre-Check

Kommandos:

```powershell
rg -n "patience|geduld|patient|wiederholen|simple\.answer|einfache\.antwort|langsam\.antworten|einfache antwort|langsam|wiederhol" modules lib app __tests__ -S
rg --files modules/voice/services | rg "system-prompt"
rg --files app | rg "app[/\\]\(senior\)[/\\](profil|settings|profile|einstellungen)"
rg -n "VoiceSettings|CollapsibleVoiceSettings|useVoicePreferences|voicePreferences|Stimme einstellen|Tempo" modules app components hooks __tests__ -S
rg -n "demenz|alzheimer|senil|diagnose|medikament|medical" modules/memory/services/medical-blocklist.ts lib/ai/system-prompts/senior-app-knowledge.md modules/voice/services/system-prompt.ts -S
```

## Treffer-Tabelle

| Plan fordert | Existiert in Datei:Zeile | Bedeutung |
|---|---|---|
| Prompt-Option fuer geduldigere Antworten | `modules/voice/services/system-prompt.ts:126` und `:130` | Der Voice-Prompt ist bereits warm/geduldig und erlaubt Wiederholung. M2 muss konditional schaerfen, nicht neu einfuehren. |
| Einfache Sprache | `modules/voice/services/system-prompt.ts:275` | Einfache Sprache ist bereits Teil des Prompts. |
| Antwortlaenge/Guardrails testen | `modules/voice/services/__tests__/system-prompt.test.ts` | Es gibt bereits Tests fuer harte Antwortlaenge im System-Prompt. |
| Langsamere Ausgabe | `modules/voice/components/companion/VoiceSettings.tsx:162-168` | UI hat bereits Tempo Schnell/Normal/Langsam fuer TTS. |
| Voice-Settings speichern | `hooks/useVoicePreferences.ts:20-84` | Voice-Settings laufen ueber `users.voice_preferences`, nicht `users.settings`. |
| Voice-Settings im Profil anzeigen | `app/(app)/profile/page.tsx:51-52`, `:155`, `:649` | Aktives Profil nutzt bereits `CollapsibleVoiceSettings`. |
| Senior-Profilroute pruefen | `app/(senior)/profil/page.tsx` | Senior-Profil existiert, aber zeigt aktuell `ProfilView`, keine Voice-Settings. |
| Senior-Memory/Consent pruefen | `app/(senior)/profil/gedaechtnis/page.tsx` | Memory-Consent-Seite existiert und ist bewusst getrennt. |
| AI-Settings in `users.settings` | `lib/ai/user-settings.ts:22-98`, `app/api/settings/ai/route.ts` | AI-Hilfe nutzt `users.settings`; das ist ein anderer bestehender Pfad als Voice-Preferences. |
| Keine medizinische Diagnose-Ausweitung | `modules/voice/services/system-prompt.ts:70-71` | Voice-Prompt verbietet Medikamenten-/Gesundheitsfragen bereits. |
| Keine Demenz/Alzheimer-Begriffe in Memory | `modules/memory/services/medical-blocklist.ts:4-52` | `demenz` und `alzheimer` sind in der Medical-Blocklist. UI-Wording muss stigmaneutral bleiben. |
| Praeventions-KI langsam/geduldig | `modules/praevention/services/ki-session.service.ts:122-123` | Auch ausserhalb `modules/voice` existiert bereits eine langsame/geduldige KI-Variante. |

## Offene Adapter-Entscheidungen

Bitte Founder/Claude entscheiden, bevor ich Code schreibe:

1. **Speicherort:** Soll M2 an `users.voice_preferences` haengen oder zwingend
   an `users.settings.patience_mode`?
   - Code-Pattern fuer Stimme/Tempo: `users.voice_preferences`
   - Code-Pattern fuer KI-Hilfe-Level: `users.settings`
   - Meine Empfehlung: Wenn M2 nur Voice/Companion-Ausdruck betrifft,
     `voice_preferences.patienceMode`. Wenn M2 global fuer alle KI-Antworten
     gelten soll, `settings.patience_mode`.

2. **UI-Ort:** Soll die Option in die bestehende aktive Profilseite mit
   `CollapsibleVoiceSettings`, in den Senior-Profilmodus oder in beide?
   - Aktive Profilseite hat die Voice-Settings bereits.
   - Senior-Profil hat noch keinen Voice-Settings-Block.
   - Meine Empfehlung: erst bestehende VoiceSettings erweitern, dann separate
     Senior-Platzierung nur falls Founder den Senior-Modus explizit will.

3. **Semantik:** Soll "Geduldsmodus" nur langsamere TTS-Ausgabe bedeuten oder
   auch kuerzere, wiederholendere Textantworten?
   - TTS-Langsam gibt es bereits.
   - Textantworten sind bereits maximal 2 Saetze / 30 Woerter.
   - Meine Empfehlung: M2 = konditional noch klarere Struktur:
     ein Gedanke pro Satz, keine Nebensaetze, wichtige Info einmal ruhig
     wiederholen.

## Keine Code-Aenderungen

Ich habe bewusst keine Implementierung, keine Tests, keine Migration und keine
Provider-/Env-Aenderung gemacht. Die neue Claude-GO-Datei bleibt als Quelle im
Repo-Handoff und dieser Stop-Bericht ist die Antwort auf die Pre-Check-Regel.

## Vorschlag fuer naechsten GO nach Klaerung

Wenn Founder/Claude die Stop-Regel fuer diese bekannten Treffer aufheben, wuerde
ich als kleinsten Block umsetzen:

- `VoicePreferences` um `patienceMode?: boolean` erweitern.
- `buildSystemPrompt` um `patienceMode?: boolean` erweitern.
- `VoiceSettings` um stigmaneutralen Toggle "Sehr einfache Antworten" erweitern.
- Bestehende Tests in `system-prompt.test.ts` und `VoiceSettings.test.tsx`
  zuerst rot erweitern, dann Code gruen machen.
- Keine Migration, keine Provider-Calls, keine Prod-/Env-Aenderung.
