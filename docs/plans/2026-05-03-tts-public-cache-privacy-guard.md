# TTS Public-Cache Privacy Guard

Stand: 2026-05-03 abend

## Ausloeser

Claude-Handoff `docs/plans/handoff/2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md`
blockiert M4 bis M4.0/M4.1 Founder-Hand. Als naechster enger, nicht-roter
Block wurde der TTS-Cache-Privacy-Guard gewaehlt.

Keine Prod-Aktion, kein Deploy, keine Migration, keine Vercel-Env-Aenderung,
keine Provider-Live-Schaltung, keine neuen Kosten.

## Pre-Check

Gelaufen:

```powershell
rg -n "tts.*cache|cache.*tts|TTS.*Cache|voice_tts_cache|tts_cache|public.*cache|audio" app modules lib __tests__ supabase docs -g '!node_modules'
rg -n "api/voice/tts" app modules lib __tests__ docs -g '!node_modules'
rg -n "cache:\s*['\"]public['\"]|\"cache\"\s*:\s*\"public\"" app modules lib __tests__ docs -g '!node_modules'
rg -n "synthesizeSpeech\(|computeCacheKey\(|tts-cache|X-TTS-Cache" app modules lib __tests__ docs -g '!node_modules'
```

Befund:

- TTS-Service existiert in `modules/voice/services/tts.service.ts`.
- Route existiert in `app/api/voice/tts/route.ts`.
- Public-Storage-Bucket `tts-cache` stammt aus Migration 168 und ist bewusst
  public-readable.
- Aktueller Code ist bereits default-private:
  - `TtsRequest.cache?: "public"`
  - `publicCache: params.cache === "public"`
  - Route reicht nur `body.cache === "public"` weiter.
  - Ohne Opt-in liefert der Service `X-TTS-Cache: disabled` und nutzt keinen
    `tts-cache` HEAD/GET/Upload.
- Aktuelle Produktions-Aufrufer von `/api/voice/tts` setzen **kein**
  `cache: "public"`.

## Aktuelle Produktions-Aufrufer

Alle aktuellen Produktions-Aufrufer nutzen private/default TTS ohne Public-Cache:

| Datei | Zweck | Public Cache |
|---|---|---|
| `modules/voice/hooks/useTtsPlayback.ts` | Vorlesen aus UI/Companion-Kontext | Nein |
| `modules/voice/engines/sentence-stream-tts.ts` | Satzweises TTS-Playback | Nein |
| `modules/voice/components/companion/VoiceSettings.tsx` | Stimmenvorschau | Nein |
| `modules/voice/components/companion/TTSButton.tsx` | Companion-/Text-Vorlesen | Nein |
| `modules/praevention/components/SessionScreen.tsx` | Praeventionssession-Ausgabe | Nein |

## Guard

Neues Testfile:

`__tests__/guards/tts-public-cache-guard.test.ts`

Der Guard prueft:

- Service und Route bleiben default-private.
- Public Cache wird nur als exaktes `cache: "public"` Opt-in akzeptiert.
- Jeder Produktions-Aufrufer, der kuenftig `cache: "public"` setzt, muss in
  dieser Datei dokumentiert sein.

Damit kann spaeter bewusst ein Standardphrasen-Aufrufer oeffentlich cachen,
aber private Texte landen nicht still im public-readable Storage.

## TDD

RED:

```powershell
npx vitest run __tests__/guards/tts-public-cache-guard.test.ts
```

Erwarteter Failure:

- Diese Inventar-/Guard-Doku fehlte.

GREEN:

- Inventar-/Guard-Doku angelegt.
- Keine Runtime-Logik geaendert.
- Kein M4-Code begonnen.

## Verifikation

Lokal gelaufen:

- `npx vitest run __tests__/guards/tts-public-cache-guard.test.ts`
  -> 1 Datei / 2 Tests passed.
- `npx vitest run __tests__/guards/tts-public-cache-guard.test.ts __tests__/api/voice/tts.test.ts __tests__/hooks/useTtsPlayback.test.ts __tests__/lib/voice/sentence-stream-tts.test.ts`
  -> 4 Dateien / 35 Tests passed.
- `npx eslint __tests__/guards/tts-public-cache-guard.test.ts --no-warn-ignored`
  -> gruen.
- `git diff --check`
  -> keine Whitespace-Fehler; nur bekannte CRLF-Warnung fuer `INBOX.md`.
- `npx tsc --noEmit`
  -> gruen.
- `npx vitest run --changed`
  -> 1 Datei / 2 Tests passed.
- `npm run lint`
  -> gruen.

`npm run build:local` wurde nicht erneut ausgefuehrt, weil diese Welle keine
Runtime-Datei aendert; sie ergaenzt nur Guard-Test, Inventar-Doku und INBOX.
