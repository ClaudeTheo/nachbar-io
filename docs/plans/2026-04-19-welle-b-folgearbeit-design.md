# Welle B Folgearbeit — TTS-Voiceover + Code-Pairing Design

**Datum:** 2026-04-19 (spaet abend)
**Autor:** Claude Opus 4.7
**Status:** Design genehmigt (Thomas), Implementierung pending
**Scope:** Zwei abgegrenzte Pakete nach Welle B (QR-Pairing), pilot-kritisch

---

## Kontext

Welle B (`09142ea`) liefert QR-Pairing live: Senior-Geraet zeigt QR, Angehoeriger
scannt, refresh_token wandert durch Redis in den LocalStorage des Senior-Geraets.
**Zwei offene Luecken** verhindern, dass Welle B im Pilot wirklich funktioniert:

1. **Kein Audio-Voiceover auf der Pair-Seite** — Senior sieht QR, versteht aber
   moeglicherweise nicht was zu tun ist (Sehschwaeche, Erstbenutzung).
2. **`'Ich habe einen Code'`-Button ist Stub** — wenn Angehoeriger remote ist
   (Telefon, nicht vor Ort), gibt es aktuell keinen Weg ausser QR-Scan.

Dieses Design schliesst beide Luecken.

---

## Teil 1 — TTS-Voiceover auf Pair-Seite

### Entscheidung

**Pre-gerenderte MP3 in `public/audio/pair-welcome.mp3`**, beim Mount einmalig
via `<audio autoplay>` abgespielt.

### Warum diese Loesung

- **Text ist statisch** — einmal erzeugt, Milliarden Male nutzbar
- **Kein Auth-Problem** — `/api/voice/tts` verlangt `requireAuth()`, Senior ist
  auf Pair-Seite nicht eingeloggt
- **Kein Cache-Miss** — CDN served direkt
- **Keine zusaetzliche Infrastruktur** — nutzt Next.js static-serving

### Abgelehnte Alternativen

| Ansatz | Warum nicht |
|---|---|
| Public-TTS-Route mit Whitelist | Overkill fuer 1 statischen Satz, mehr Angriffsflaeche, unnoetige Supabase-Storage-Calls |
| Browser Web Speech API | Stimme variiert je OS (Windows/Android/iOS) — bei Senioren zu inkonsistent |

### Produktion der MP3 (einmalig)

Script `scripts/generate-pair-welcome-audio.ts` (committed, reproduzierbar):
- OpenAI TTS `gpt-4o-mini-tts`, Voice `ash`, Speed `0.95`, SENIOR_VOICE_INSTRUCTIONS
- Ergebnis → `public/audio/pair-welcome.mp3`
- Text: "Bitte bitten Sie einen Angehoerigen, diesen Code mit dem Handy abzufotografieren. Oder tippen Sie unten auf 'Ich habe einen Code'."

### Abspiel-Logik

- Beim ersten Mount der Pair-Seite: `<audio>`-Element wird erstellt, `play()` aufgerufen
- **Nur einmal pro Seiten-Mount**, nicht bei 9-min-Token-Renewal
- Autoplay-Fehler (Browser-Policy) werden stumm geschluckt — der Text steht ja auch visuell da
- Kein Sound-Steuerelement (Senior soll nicht ueberfordert werden)

### Files

| Datei | Art |
|---|---|
| `scripts/generate-pair-welcome-audio.ts` | NEU (Script fuer einmalige Erzeugung) |
| `public/audio/pair-welcome.mp3` | NEU (generiert) |
| `app/(senior)/pair/page.tsx` | EDIT (Audio-Element + Once-Flag via useRef) |
| `__tests__/app/senior/pair.test.tsx` | EDIT (+2 Tests: Audio-Element rendert, play nur einmal) |

### Tests (TDD)

1. `rendert <audio> Element mit src=/audio/pair-welcome.mp3` — rot zuerst
2. `ruft play() genau einmal beim ersten Mount auf, nicht bei Token-Renewal`

---

## Teil 2 — 6-stelliger Code-Pairing

### Entscheidung

**Neuer Pairing-Flow mit 6-stelligem numerischem Code**, Redis-Only persistiert
(kein DB-Schema-Change). Semantisch getrennt von `caregiver_invites` (andere
Semantik: Care-Access-Einladung vs. Geraete-Pairing).

### Warum diese Loesung

- **Konsistent mit QR-Flow** — nutzt selbe Redis-Infrastruktur + selbe
  `device_refresh_tokens`-Tabelle beim Claim
- **Keine Migration** — schneller im Review, kein Rote-Zone-Founder-Go fuer DB
- **10-min TTL** macht Persistenz irrelevant (Redis-Restart sehr selten, Code
  lebt nur kurz)
- **`caregiver_invites` NICHT wiederverwenden:** andere Semantik (24h TTL,
  Einladung zu Care-Beziehung, 8-stellig mit Buchstaben). Adapter waere hacky,
  mixen fuehrt zu Bugs und Review-Risiko.

### Code-Format

- **6 Ziffern, rein numerisch** (0-9), z.B. `847302`
- Senior-UX-optimiert: Ziffern sind auf jedem Numpad, keine Buchstaben-Verwirrung
- 1 Mio Kombinationen × 10-min-TTL + Rate-Limit = genug Entropie

### Rate-Limiting (kritisch gegen Brute-Force)

- `/claim-by-code`: max **5 Fehlversuche pro IP + device_id**, dann **1h-Sperre**
- Rate-Limit-Infrastruktur existiert bereits (`lib/security/redis.ts`)

### Flow

```
Angehoeriger-App                  Senior-Geraet
────────────────                  ─────────────
1. Login (caregiver)
2. Waehlt senior_user_id
3. POST /pair/start-code
   ─ Auth: caregiver-Check via caregiver_links
   ─ Redis SET pair-code:847302 -> {senior_user_id, device_id?, claimed:false}
     TTL 10min
4. Zeigt "847302" auf Handy
5. Liest Code am Telefon vor ────► Senior tippt "847302" ins Numpad
                                   6. POST /pair/claim-by-code
                                      body: {code, device_id}
                                      ─ Rate-Limit-Check
                                      ─ Redis GET pair-code:847302
                                      ─ generateRefreshToken + hashRefreshToken
                                      ─ INSERT device_refresh_tokens (wie QR)
                                      ─ Redis DEL pair-code:847302 (replay-Schutz)
                                      ─ return {refresh_token, user_id, expires_at}
                                   7. LocalStorage setzen, navigate /
```

### Security-Eigenschaften

- **Single-Use:** Redis DEL sofort nach erfolgreichem Claim
- **TTL:** 10min im Redis, kein Langzeitspeicher
- **Klartext-Token verlaesst Server genau einmal** (wie QR-Flow)
- **DB speichert nur SHA-256-Hash** (wie QR-Flow)
- **Brute-Force-Schutz:** 5 Fehlversuche / IP+device_id → 1h Lock
- **Caregiver-Bindung:** Code enthaelt senior_user_id, Senior-Geraet kann nicht
  Codes von fremden Senioren claimen
- **Kein Email/Name-Leak** — Code enthaelt nur IDs

### Files

| Datei | Art |
|---|---|
| `lib/device-pairing/pair-code.ts` | NEU (generatePairCode, validatePairCode, Redis-Helper) |
| `lib/device-pairing/__tests__/pair-code.test.ts` | NEU (~5 Tests: Format, Entropie, Redis-Wrapper) |
| `app/api/device/pair/start-code/route.ts` | NEU (caregiver-Auth, erzeugt Code) |
| `__tests__/api/device/pair-start-code.test.ts` | NEU (~5 Tests: Auth, Validation, caregiver-Link) |
| `app/api/device/pair/claim-by-code/route.ts` | NEU (no-auth, Rate-Limit, Claim) |
| `__tests__/api/device/pair-claim-by-code.test.ts` | NEU (~7 Tests: Happy, falsche Codes, Lockout, Replay) |
| `components/senior/PairCodeNumpad.tsx` | NEU (Vollbild-Numpad, 80px-Tasten, 6-Zellen-Display) |
| `__tests__/components/senior/PairCodeNumpad.test.tsx` | NEU (~4 Tests: Tap, Delete, Submit bei 6 Ziffern) |
| `app/(senior)/pair/page.tsx` | EDIT (State `"code-entry"`, Button ruft Numpad auf) |
| `__tests__/app/senior/pair.test.tsx` | EDIT (+2 Tests: Numpad-Wechsel, Claim-Flow) |

### Tests (TDD-Reihenfolge)

Pro Task: Test rot → Implementation → gruen → naechster Task.

1. `pair-code.test.ts` — Format + Validator
2. `pair-start-code.test.ts` — Route Happy + Validation + Auth
3. `pair-claim-by-code.test.ts` — Claim Happy + Rate-Limit + Replay-Schutz
4. `PairCodeNumpad.test.tsx` — UI-Interaktion
5. `pair.test.tsx` — Integration Button → Numpad → Claim → Navigate

Erwartung: **~25 neue Tests**, alle gruen vor Commit.

### Abgelehnte Alternativen

| Ansatz | Warum nicht |
|---|---|
| `caregiver_invites` wiederverwenden | Andere Semantik (Care-Access-Einladung), 24h-TTL, 8-stellig, Adapter waere hacky |
| Neue DB-Tabelle `device_pair_codes` | Overhead fuer 10-min-Daten; Migration = Founder-Go; Redis reicht |
| 8-stellig | Senior-UX schlechter, Security-Gewinn minimal bei 10min+Rate-Limit |
| Buchstaben+Ziffern | Senior-UX Killer (Gross-/Kleinschreibung, Tastaturwechsel) |

---

## Arbeitsplan / Reihenfolge

1. **Teil 1 TTS** (~1h, ~2 Tests) — klein + sauber, committen
2. **Teil 2 Code-Pairing** (~3-4h, ~25 Tests) — subagent-driven-development
3. Pro Teil **eigene Commits**, TDD strict
4. **Kein Push** bis alles gruen + Founder-Go

## Rote-Zone-Items fuer Founder-Go (am Ende der Session)

- Push auf master (Welle B + Folgearbeit zusammen)
- Evtl. OpenAI API-Call fuer TTS-MP3-Erzeugung (einmalig, ~0.5 Cent)

## Risiken & Unknowns

- **Tauri-Wrapper + Autoplay:** muss getestet werden (vermutlich kein Problem,
  da Tauri = vollwertiges WebView). Fallback: kein Sound, visueller Text reicht.
- **Numpad-Focus-Handling:** bei Touch-only-Geraeten kein Keyboard-Fallback
  noetig; falls Desktop-Entwicklung → Tastatureingabe-Handling als Bonus.
- **Rate-Limit-Key:** IP kann hinter NAT geshared sein (Familie mit mehreren
  Geraeten). Mitigation: IP+device_id als Kombikey.

## Nicht-Scope (fuer spaetere Arbeit)

- E2E-Playwright-Test fuer Code-Flow (wie QR-Flow: Integration-Tests reichen)
- Angehoerigen-UI "Code erzeugen" im Caregiver-Portal — die Route existiert nach
  dieser Session, UI kommt separat (Welle D oder als kleiner Polish-Commit)
- "Code widerrufen"-Button fuer Angehoerigen (YAGNI: TTL 10min ist kurz genug)

## Migrationen

**Keine.** Beide Teile reine Code-Changes.

## Kommunikationsregeln

- Gruene Zone: TTS-Arbeit, Code-Pairing-Implementation, Tests, lokale Commits
- Gelbe Zone: OpenAI-Call fuer MP3-Erzeugung (kurz melden)
- Rote Zone: git push

---

## Naechste Schritte

1. Writing-plans skill aufrufen → detaillierten Implementation-Plan
2. Subagent-driven Ausfuehrung
3. Bei >60% Context-Nutzung: Stopp + Handoff-Doc + neue Session
