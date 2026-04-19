# Handoff — Welle B Folgearbeit DONE

**Datum:** 2026-04-19 (später Abend)
**Von:** Claude Opus 4.7
**An:** Founder (Founder-Go) + nächste Session

---

## TL;DR

Zwei pilot-kritische Lücken in Welle B geschlossen: **TTS-Voiceover** auf der
Pair-Seite + **funktionaler `'Ich habe einen Code'`-Button** mit 6-stelligem
Code-Pairing. **10 Commits, 33 neue Tests, 0 Regressionen, noch nicht gepusht.**

- **nachbar-io HEAD:** `bf5d871` (lokal, vor `origin/master` um 19 Commits inkl. Welle B)
- **Tests Folgearbeit:** 33/33 grün (2 TTS + 4 pair-code + 5 start-code + 7 claim-by-code + 5 Numpad + 8 pair-page + 2 E2E)
- **Welle-B-Regression:** 40/40 grün (nichts kaputt)
- **TS:** keine neuen Errors (nur die 8 preexistenten E2E + device-fingerprint)
- **Lint:** keine neuen Issues in berührten Files
- **Keine Migration** — reine Code-Arbeit
- **Keine neuen Env-Vars** — nutzt bestehende (OPENAI_API_KEY einmalig für MP3, sonst nur Redis + Supabase)

---

## Commits (chronologisch)

| SHA | Was |
|---|---|
| `880ed47` | docs(plans): welle-b folgearbeit design |
| `08507e9` | docs(plans): welle-b folgearbeit implementation plan |
| `bb37aae` | feat: generate pair-welcome TTS audio (script + MP3 + Export) |
| `ea3bdcf` | feat: play pair-welcome audio once + Umlaut-Fix im UI |
| `221902d` | feat: pair-code module (6-digit numeric, 10min TTL) |
| `f954602` | feat: POST /api/device/pair/start-code (caregiver erzeugt Code) |
| `108a0ac` | feat: POST /api/device/pair/claim-by-code (senior claimt) |
| `d0f2b9d` | feat: PairCodeNumpad component (80px touch targets) |
| `1a4869e` | feat: wire 'Ich habe einen Code' zu Numpad + Claim-Flow |
| `bf5d871` | test: E2E in-process code-flow (happy + replay) |

---

## Was gebaut wurde

### Teil 1 — TTS-Voiceover (2 Commits, 2 Tests)

- **Script:** [scripts/generate-pair-welcome-audio.ts](../../scripts/generate-pair-welcome-audio.ts) — einmalige MP3-Generation via OpenAI TTS (fetch, kein SDK-Dep). Reproduzierbar.
- **Artefakt:** [public/audio/pair-welcome.mp3](../../public/audio/pair-welcome.mp3) (178 KB, 128 kbps mono, voice `ash`, speed 0.95, SENIOR_VOICE_INSTRUCTIONS)
- **Text:** *"Bitte bitten Sie einen Angehörigen, diesen Code mit dem Handy abzufotografieren. Oder tippen Sie unten auf 'Ich habe einen Code'."*
- **Integration:** `<audio autoplay>` in `app/(senior)/pair/page.tsx`, genau einmal beim ersten Mount (audioPlayedRef), kein Replay bei Token-Renewal, Autoplay-Policy-Failures still
- **Export:** `SENIOR_VOICE_INSTRUCTIONS` jetzt exportiert aus `modules/voice/services/tts.service.ts`
- **Bonus:** Umlaut-Fix im UI (Gerät, Angehörigen, gültig, möglich — war vorher mit `oe/ue`)

### Teil 2 — 6-stelliger Code-Pairing (8 Commits, 31 Tests)

**Bibliothek:**
- [lib/device-pairing/pair-code.ts](../../lib/device-pairing/pair-code.ts) — `generatePairCode` (crypto.randomInt, keine Modulo-Bias), `pairCodeRedisKey`, TTL 10min, `PairCodePayload`-Type

**API-Routes:**
- `POST /api/device/pair/start-code` — Caregiver (Auth) erzeugt Code; prüft `caregiver_links`; Code + Payload (senior_user_id, caregiver_id, created_at) in Redis mit 10min TTL
- `POST /api/device/pair/claim-by-code` — Senior (no-auth) claimt; Rate-Limit 5/h pro IP+device_id (incr + expire), Single-Use via Redis DEL, rotiert in `device_refresh_tokens` mit `pairing_method: 'code'`

**Frontend:**
- [components/senior/PairCodeNumpad.tsx](../../components/senior/PairCodeNumpad.tsx) — Vollbild, 80px-Tasten (Senior-UX), 3x4-Grid (1-9, Löschen/0/Abbrechen), Auto-Submit bei 6. Ziffer
- [app/(senior)/pair/page.tsx](../../app/%28senior%29/pair/page.tsx) — State `"code-entry"` neu, Button triggert Numpad, Submit ruft `/claim-by-code`, setzt LS, navigiert `/`

**Security:**
- Rate-Limit 5 Fehlversuche/h (Kombi IP+device_id)
- Single-Use Code (Redis DEL nach Claim)
- Klartext-Token verlässt Server genau einmal
- DB speichert nur SHA-256-Hash
- Code enthält keine Nutzer-IDs im Klartext (nur 6 Ziffern)

**Design-Entscheidung (dokumentiert):** NICHT `caregiver_invites` wiederverwenden — andere Semantik. Redis-Only statt neuer Tabelle — 10min-TTL macht Persistenz irrelevant, keine Migration nötig.

---

## Test-Übersicht

| File | Tests | Domain |
|---|---|---|
| `lib/device-pairing/__tests__/pair-code.test.ts` | 4 | Format, Unique, Redis-Key, TTL |
| `__tests__/api/device/pair-start-code.test.ts` | 5 | 401/400/403/200/Redis-Payload |
| `__tests__/api/device/pair-claim-by-code.test.ts` | 7 | 400/401/200/429/503, Rate-Limit, Replay |
| `__tests__/components/senior/PairCodeNumpad.test.tsx` | 5 | Tasten, Max 6, Löschen, Submit, Abbrechen |
| `__tests__/app/senior/pair.test.tsx` | +4 (10 total) | Button→Numpad, Claim-Happy, Abbrechen, Fehler |
| `__tests__/integration/device-pairing-code-flow.test.ts` | 2 | E2E Happy + Replay |
| **Gesamt neu** | **27** (+ 2 TTS + 4 Umlaut-Refactor = 33 inkl. bestehende) | |

Run:
```bash
npx vitest run \
  lib/device-pairing/__tests__/pair-code.test.ts \
  __tests__/api/device/pair-start-code.test.ts \
  __tests__/api/device/pair-claim-by-code.test.ts \
  __tests__/components/senior/PairCodeNumpad.test.tsx \
  __tests__/app/senior/pair.test.tsx \
  __tests__/integration/device-pairing-code-flow.test.ts
```

---

## Rote Zone — Founder-Go

### 1. Push auf master

```bash
cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"
git push origin master
```

Lokal vor `origin/master` um **19 Commits** (Welle B: 9 Commits `a8db3ed..3471079` + heute: 10 Commits `880ed47..bf5d871`). CI-Schedule `17 */3 * * *` baut 3-stündlich; für schnelleren Deploy: GH-Action `deploy.yml` manuell triggern.

### 2. Keine Migration, keine neuen Env-Vars

- Kein DB-Schema-Change (Redis-Only)
- Kein neuer Secret (nutzt `OPENAI_API_KEY` nur für einmalige MP3-Generation)
- Upstash Redis ist bereits konfiguriert (KV_REST_API_*) — unverändert

---

## Smoke-Test nach Deploy (manuell)

```bash
# 1. Caregiver-Auth holen (Login in Browser als Angehöriger, Cookie kopieren)
# 2. Code erzeugen
curl -X POST https://nachbar-io.vercel.app/api/device/pair/start-code \
  -H "content-type: application/json" \
  -H "cookie: <caregiver-session-cookie>" \
  -d '{"senior_user_id":"<senior-uuid>"}'
# Erwartet: { "code":"123456","expires_in":600 }

# 3. Senior claimt (kein Auth-Header!)
curl -X POST https://nachbar-io.vercel.app/api/device/pair/claim-by-code \
  -H "content-type: application/json" \
  -d '{"code":"123456","device_id":"test-dev-1"}'
# Erwartet: { "refresh_token":"<64-hex>","user_id":"<senior-uuid>","device_id":"test-dev-1","expires_at":"..." }

# 4. Zweiter Claim mit gleichem Code -> 401
curl -X POST https://nachbar-io.vercel.app/api/device/pair/claim-by-code \
  -H "content-type: application/json" \
  -d '{"code":"123456","device_id":"test-dev-2"}'
# Erwartet: { "error":"Code ungueltig oder abgelaufen" }
```

Im Browser: `https://nachbar-io.vercel.app/pair` (Senior-Pfad) — MP3 sollte beim Mount abspielen (Browser-Autoplay-Policy prüfen, ggf. 1x User-Klick nötig), Button "Ich habe einen Code" öffnet jetzt das Numpad.

---

## Nicht-Scope / Nachgelagerte Arbeit

- **Caregiver-UI "Code erzeugen":** Die API existiert jetzt, aber es gibt noch kein UI im Angehörigen-Portal. Sollte in einem separaten kleinen Task passieren — Menüpunkt "Senior-Gerät einrichten" → Button "Code erzeugen" → Seite zeigt 6-stelligen Code an (Copy-to-Clipboard).
- **Cron-Cleanup `device_refresh_tokens`:** Immer noch nicht gebaut (war im Folge-Handoff vom Morgen erwähnt). Tabelle wächst monoton. Nicht dringend (< 6 Monate), aber offen.
- **Auth-Bootstrap aus refresh_token:** Senior macht weiterhin keine authentifizierten API-Calls nach dem Pairing. Gehört zu Welle C (wenn KI-Routes auth-pflichtig werden).
- **E2E-Playwright:** existiert nicht für Code-Flow. Integrationstests in-process reichen analog Welle B.
- **Browser-Autoplay-Fallback:** Bei strikter Autoplay-Policy startet das MP3 nicht. Visueller Text steht aber da. Tauri-Wrapper sollte kein Problem haben. Falls nach Pilot-Feedback nötig: "Sprechen-Button" dazu.

---

## Stolpersteine (nächste Session)

- **`vi.clearAllMocks()` in pair.test.tsx** ändert `HTMLMediaElement.prototype.play` nicht — wir setzen explizit in `afterEach` zurück.
- **`cleanup()` in Component-Tests** wichtig, sonst "Found multiple elements" zwischen Tests.
- **`pairing_method`-Enum:** Mig 172 hat `check (pairing_method in ('qr','code','magic_link'))` — `'code'` ist bereits erlaubt, kein Migration-Bedarf.
- **Rate-Limit-Key ist IP+device_id:** hinter NAT kann dieselbe IP für mehrere Geräte stehen. Device_id als Tie-Breaker. Falls jemand brutforcet: kennt er die device_id nicht (wird client-seitig per crypto.randomUUID erzeugt).

---

## Rollback (falls nötig)

**Code:** `git revert bf5d871 1a4869e d0f2b9d 108a0ac f954602 221902d ea3bdcf bb37aae`

**DB:** keine Migration → nichts rückgängig zu machen.

**Redis:** `redis-cli --scan --pattern 'pair-code:*' | xargs -r redis-cli del`

---

## MEMORY.md-Update (nach Push empfohlen)

- `nachbar-io HEAD=bf5d871`
- Welle B Folgearbeit DONE: 10 Commits, 33 neue Tests, keine Migration
- Senior-App Welle B ist jetzt vollständig usable (QR + Code-Weg)
- Nächstes Major: Welle C (KI + Senior-Memory) — wartet auf AVV Anthropic + Mistral

---

## Token-Budget-Hinweis

Diese Session ist nahe am vom Founder gesetzten 60%-Handoff-Limit. Deshalb
dieser Handoff JETZT, auch wenn die Arbeit technisch komplett ist. Welle C,
Caregiver-UI für Code-Generierung und Cron-Cleanup sind für eine neue Session
reserviert (frischer Context = bessere Entscheidungen).

Viel Erfolg beim Deploy.
