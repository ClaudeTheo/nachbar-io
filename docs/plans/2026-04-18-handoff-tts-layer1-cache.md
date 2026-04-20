# Handoff — TTS-Latenz fixen via Layer-1 Phrase-Cache

Stand: 2026-04-18, nachmittags

## Warum dieses Handoff

Live-Test war heute durch zwei Dinge blockiert (siehe
`2026-04-18-handoff-live-test-blocked-voice-latency.md`):
1. Chrome-MCP disconnected
2. **AI-Voice zu langsam** — "Sprache der KI geht nur beim Testen, Antwort dauert zu lange"

Dieses Handoff adressiert Blocker **2** mit dem guenstigsten und
schnellsten Fix: **Supabase-Storage-Cache fuer wiederholte TTS-Phrasen**.
Kein Provider-Wechsel, keine Kosten, kein Modell-Training.

Erwarteter Effekt:
- **Cache-Hit (80% der Antworten laut Annahme):** 0ms TTS-Latenz (nur CDN)
- **Cache-Miss (20%):** unveraendert OpenAI gpt-4o-mini-tts ~500ms + parallel Upload
- Response-Laenge halbiert (Prompt-Update) → TTS-Zeit bei Misses halb so lang

Layer 2 (Kokoro self-hosted auf Pi/VM) und Layer 3 (Cartesia Fallback)
kommen nur, falls Layer 1 nicht reicht. Erstmal messen.

## Aktueller Stack

- TTS-Provider: **OpenAI `gpt-4o-mini-tts`**, MP3, kein Streaming in Reality
- Entry: `app/api/voice/tts/route.ts:15-38` → `modules/voice/services/tts.service.ts:64-107`
- Voice-Default: `ash`, Speed `0.95`, `SENIOR_VOICE_INSTRUCTIONS` (Konstante)
- System-Prompt: `modules/voice/services/system-prompt.ts:81-239`
  - Regel `Halte Antworten kurz (2-3 Saetze)` existiert — wird offensichtlich nicht eingehalten

## Datei-Struktur — wo was liegt

Alle Pfade relativ zum Repo-Root `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\`.
Keine neuen Ordner noetig — alle Verzeichnisse existieren bereits.

```
nachbar-io/
├── supabase/migrations/
│   └── 168_tts_phrase_cache_bucket.sql          ← NEU (Schritt 2)
│
├── modules/voice/services/
│   ├── tts.service.ts                           ← ERWEITERN (Schritt 3 Hauptarbeit)
│   ├── system-prompt.ts                         ← ERWEITERN (Schritt 1)
│   └── __tests__/
│       └── system-prompt.test.ts                ← NEU oder ERWEITERN (Test Schritt 1)
│
├── app/api/voice/tts/
│   └── route.ts                                 ← UNVERAENDERT (Thin-Wrapper, Logik bleibt in Service)
│
├── __tests__/api/voice/
│   └── tts.test.ts                              ← ERWEITERN (Cache-Hit/Miss-Tests Schritt 3)
│
└── docs/plans/
    └── 2026-04-18-handoff-tts-layer1-cache.md   ← dieses Dokument
```

**Reihenfolge (zwingend in dieser Order, TDD strict):**
1. **Schritt 1** — `system-prompt.test.ts` (rot) → `system-prompt.ts` (gruen) → Commit
2. **Schritt 2** — `168_tts_phrase_cache_bucket.sql` committen, dann Prod-Apply
3. **Schritt 3** — `__tests__/api/voice/tts.test.ts` erweitern (rot) → `tts.service.ts` erweitern (gruen) → Commit
4. Manueller Smoke-Test gegen Prod, dann Vercel-Deploy

**Env-Vars (pruefen vor Schritt 3, nicht erneut setzen):**
- `.env.local` + Vercel-Project `nachbar-io` muessen haben:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`

## Plan — 3 Teilschritte

### Schritt 1 — System-Prompt verschaerfen (10 Min, kostenlos)

Datei: `modules/voice/services/system-prompt.ts`

Aenderungen:
- In `PHASE1_GUARDRAILS` (oder eigener `HARTE_LAENGE` Block) harte Regel ergaenzen:
  ```
  ANTWORT-LAENGE (nicht verhandelbar):
  - Maximal 2 Saetze pro Antwort.
  - Maximal 30 Woerter. Laengere Antworten werden abgeschnitten.
  - Keine Einleitungen ("Gerne...", "Natuerlich..."). Direkt die Info.
  - Kein Nachklapp ("Kann ich sonst noch helfen?") — nur bei Mut-Stufe 3/4.
  ```
- Bestehende weiche Regel `Halte Antworten kurz (2-3 Saetze)` ENTFERNEN oder
  durch harte ersetzen. Nicht beides — sonst Widerspruch.

TDD:
- Neuer Test `modules/voice/services/__tests__/system-prompt.test.ts`:
  - `buildSystemPrompt({...}, { mutLevel: 1 })` enthaelt Substring
    "Maximal 2 Saetze" und "Maximal 30 Woerter".
- Snapshot-Test falls schon vorhanden updaten.

### Schritt 2 — Supabase-Storage-Bucket `tts-cache` anlegen (neue Migration)

Datei: `supabase/migrations/168_tts_phrase_cache_bucket.sql`

```sql
-- 168 — TTS Phrase-Cache Bucket
-- Public read (CDN-servable), service-role write only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tts-cache', 'tts-cache', true, 5242880, array['audio/mpeg'])
on conflict (id) do nothing;

-- Lesen: jeder (auch anon) — URLs sind per Hash unauffindbar ohne Input-Text
create policy "tts-cache public read"
  on storage.objects for select
  using (bucket_id = 'tts-cache');

-- Schreiben: nur service_role (aus Next.js API mit SUPABASE_SERVICE_ROLE_KEY)
create policy "tts-cache service write"
  on storage.objects for insert
  with check (bucket_id = 'tts-cache' and auth.role() = 'service_role');

create policy "tts-cache service update"
  on storage.objects for update
  using (bucket_id = 'tts-cache' and auth.role() = 'service_role');
```

Deploy: via Migrations-Runner ODER direkt auf Prod (Bucket-Erstellung ist
idempotent und safe — kein Drift-Risiko). **File-first beachten** (User-Regel):
erst Migration in `supabase/migrations/` committen, dann Bucket/SQL anwenden.

Check nach Deploy:
- `select id, public from storage.buckets where id = 'tts-cache';`
- Bucket sichtbar im Supabase-Dashboard unter Storage

### Schritt 3 — `tts.service.ts` um Cache-Pfad erweitern (Hauptarbeit)

Datei: `modules/voice/services/tts.service.ts`

Neues Verhalten `synthesizeSpeech(params)`:

1. `validateTtsInput(params)` — wie bisher
2. **Cache-Key bauen:**
   ```ts
   const cacheKey = await computeCacheKey({ text, voice, speed, instructionsVersion: "v1" });
   // sha-256 hex, 64 chars. instructionsVersion hart-coded, bei Prompt-Wechsel bumpen.
   ```
3. **Cache-Hit pruefen** via `supabase.storage.from('tts-cache').createSignedUrl()`
   oder direktem Fetch an Public-URL mit HEAD:
   - Public-URL: `${SUPABASE_URL}/storage/v1/object/public/tts-cache/${cacheKey}.mp3`
   - Schneller Weg: einfach `fetch(publicUrl, { method: 'HEAD' })` — wenn 200, Hit.
4. **Hit:** Redirect 302 auf Public-URL **oder** Proxy-Stream (Redirect schneller,
   aber einige Audio-Player haben Probleme mit 302 → Testen. Fallback: Stream).
5. **Miss:** OpenAI-Call wie bisher, aber:
   - Response-Body **tee-en**: einer Branch zum Client (sofort), andere zu
     Supabase-Storage-Upload.
   - Upload nicht blockieren — `ctx.waitUntil(uploadToStorage(...))` oder
     async `.then()` ohne `await`. Bei Upload-Fehler: warn-log, nicht fehlschlagen.

Key-Funktionen:
```ts
async function computeCacheKey(input: { text: string; voice: string; speed: number; instructionsVersion: string }): Promise<string> {
  const payload = JSON.stringify(input);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkCacheHit(key: string): Promise<string | null> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tts-cache/${key}.mp3`;
  const res = await fetch(url, { method: 'HEAD' });
  return res.ok ? url : null;
}

async function uploadToCache(key: string, audio: ArrayBuffer): Promise<void> {
  const serviceClient = createServiceClient(); // mit SUPABASE_SERVICE_ROLE_KEY
  await serviceClient.storage.from('tts-cache').upload(`${key}.mp3`, audio, {
    contentType: 'audio/mpeg',
    upsert: false,
  });
}
```

Streaming-Tee-Pattern (wichtig — nicht erst warten und dann uploaden, sonst
verlieren wir den Streaming-Vorteil):
```ts
const [clientStream, cacheStream] = res.body!.tee();

// Upload im Hintergrund — darf den Response nicht blockieren
queueMicrotask(async () => {
  try {
    const buf = await new Response(cacheStream).arrayBuffer();
    await uploadToCache(cacheKey, buf);
  } catch (err) {
    console.warn('[voice/tts] cache-upload failed:', err);
  }
});

return new Response(clientStream, { status: 200, headers: {...} });
```

Env-Vars die gebraucht werden (sollten alle schon da sein):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Pruefen: `.env.local` + Vercel-Env haben alle drei.

### TDD fuer Schritt 3

Neue Tests `__tests__/api/voice/tts.test.ts` (existiert schon — erweitern):

1. **Cache-Hit:** `fetch` mock liefert `{ ok: true }` auf HEAD →
   Service returned 302 oder Stream von Public-URL. Kein OpenAI-Call.
2. **Cache-Miss:** HEAD mock liefert `{ ok: false }`. OpenAI-mock liefert
   Audio-Stream. Service returned Stream. `uploadToCache` mock wurde aufgerufen.
3. **Upload-Fehler darf Response nicht killen:** Upload-mock throws →
   Client bekommt trotzdem 200 + Audio.
4. **Cache-Key-Determinismus:** Gleiche Inputs → gleicher Hash. Andere
   `speed` → anderer Hash.

Alle Tests mit `vi.mock('node:crypto')` oder echter `crypto.subtle` — SubtleCrypto ist in Node 20+ global verfuegbar.

Command: `npx vitest run modules/voice/services/__tests__ __tests__/api/voice`

## Acceptance-Kriterien

Bevor du in die naechste Session auslaeufst — alle pruefen:

- [ ] `168_tts_phrase_cache_bucket.sql` auf Prod applied, Bucket existiert
- [ ] System-Prompt enthaelt harte 2-Saetze-Regel + Test gruen
- [ ] Cache-Hit liefert Audio ohne OpenAI-Call (manueller Check: Netzwerk-Tab)
- [ ] Cache-Miss triggert Upload (manueller Check: Supabase-Storage-Dashboard
      zeigt neue `.mp3` nach einem TTS-Call)
- [ ] Alle existierenden TTS-Tests weiterhin gruen
- [ ] Neue Cache-Tests gruen
- [ ] Kein Regression in `quartier-info-vorlesen` (auch wenn der Test aktuell
      pre-existing failure ist — nicht verschlimmern)
- [ ] Commit + Push + Vercel-Deploy (`npx vercel --prod --yes`)
- [ ] Live-Test: "Guten Morgen" 2× sagen — 2. Mal **spuerbar schneller**

## Messen vor/nach

Damit du weisst ob's wirklich schneller ist:

```ts
// tts.service.ts — Logging in synthesizeSpeech() einbauen
const t0 = Date.now();
// ... cache check
const tCache = Date.now();
// ... openai call start
const tOpenaiStart = Date.now();
// ... first byte
const tFirstByte = Date.now();
console.log('[tts-metrics]', { cacheHit, ms_cache: tCache-t0, ms_openai_ttfb: tFirstByte-tOpenaiStart });
```

Vercel-Logs nach 10-20 Calls anschauen. Ziel: Cache-Hit-Rate >60% nach
paar Minuten Nutzung, TTFB auf Hit <100ms.

## Nicht verwechseln / Fallstricke

- **Public-URL-Datenschutz:** Cache-Key ist SHA-256 — nicht rueckwaerts aufloesbar.
  Aber: Wer den exakten Text kennt, kann die URL bauen. Fuer TTS unkritisch
  (Inhalt ist ohnehin fuer Nutzer gedacht). Nie fuer User-spezifische/sensible
  Texte cachen — z.B. **Namen in Begruessungen NIE im Cache-Key** haben.
  → Personalisiertes wie "Guten Morgen Thomas" wird niemals cache-hit. OK so.
  → Statische Texte wie "Hier sind die Muelltermine: ..." cachen sehr gut.
- **Prompt-Version:** `instructionsVersion: "v1"` im Key. Wenn du
  `SENIOR_VOICE_INSTRUCTIONS` aenderst, bumpen auf `"v2"` — sonst alte
  Audios werden weiter geliefert.
- **Supabase Smart-CDN:** Edges cachen bis zu 1h. Loeschen im Dashboard
  → Purge braucht paar Min bis global durch.
- **Vercel-Hobby-Limits:** Storage-Egress zaehlt bei Supabase, nicht Vercel.
  OK.
- **Deploy-Gotcha (bekannt):** Auto-Deploy-on-Push ist kaputt (Turbopack).
  Immer `npx vercel --prod --yes` manuell.
- **File-first (User-Regel):** Erst Migration-Datei committen, dann SQL
  auf Prod. Nie direkt Prod-SQL ohne File im Repo.
- **TDD strict (User-Regel):** Tests zuerst schreiben, rot sehen, dann Code.

## Nach diesem Handoff — falls Layer 1 nicht reicht

Wenn Cache-Hit-Rate <30% bleibt oder Miss-Latenz weiterhin stoert:
- **Layer 2:** Kokoro-82M auf Pi 5 (laeuft eh 24/7) oder €5 Hetzner VM.
  Deutsch unterstuetzt, ~300ms TTFB, Apache-2.
- **Layer 3:** OpenAI **Realtime API** (gleicher API-Key, speech-to-speech
  in 1 WebSocket statt Transcribe→LLM→TTS-Kette). Ersetzt dann auch
  `formulate` und `transcribe` Route.

Beides erst nach Messung. Erstmal Cache live, eine Woche nutzen, Metriken
anschauen.

## Referenzen

- Aktuelle Service: `modules/voice/services/tts.service.ts`
- Route: `app/api/voice/tts/route.ts`
- System-Prompt: `modules/voice/services/system-prompt.ts`
- Vorher-Handoff: `docs/plans/2026-04-18-handoff-live-test-blocked-voice-latency.md`
- Supabase-Smart-CDN Docs (extern): https://supabase.com/docs/guides/storage/cdn/smart-cdn
- ElevenLabs-Pattern (als Referenz, nicht 1:1 uebernehmen): https://elevenlabs.io/docs/cookbooks/text-to-speech/streaming-and-caching-with-supabase
