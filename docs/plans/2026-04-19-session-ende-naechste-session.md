# Session-Ende 2026-04-19 + Aufgabe naechste Session

**Datum:** 2026-04-19 (spaeter Abend)
**Von:** Claude Opus 4.7
**An:** Naechste Session (morgen oder spaeter)

---

## Was heute passiert ist (Tagesbilanz)

| Block | Status |
|---|---|
| **Welle B Senior-App QR-Pairing** | ✅ LIVE — Mig 172, 4 Routes, +48 Tests, 10 Commits gepusht (`a8db3ed..09142ea`) |
| **Mig 168 TTS-Cache-Bucket** | ✅ LIVE — Bucket `tts-cache` (5 MB, audio/mpeg, public read, service-role write) |
| **DWD-Hitze-Sim Cleanup** | ✅ `sim-hitze-001` geloescht, count = 0 |
| **DEVICE_PAIRING_SECRET** | ✅ Vercel Production + Development gesetzt |
| **Vercel-Deploy** | ✅ Manueller Trigger 12:43, GH-Run [24627211306](https://github.com/ClaudeTheo/nachbar-io/actions/runs/24627211306) gruen |
| **Smoke-Test `/api/device/pair/*`** | ✅ Happy + Validation 400/401 alle wie erwartet |

**HEAD-Stand:**
- nachbar-io: `09142ea`
- Parent-Repo: `e5a58fb`

**Detail-Handoffs (im Repo):**
- `nachbar-io/docs/plans/2026-04-19-handoff-senior-app-welle-a-done.md` (Welle A)
- `nachbar-io/docs/plans/2026-04-19-handoff-senior-app-welle-b-done.md` (Welle B)

---

## Was als naechstes ansteht — Drei Wege, sortiert nach Wirkung

### Weg 1 — FOUNDER-Aktionen freischalten (HOECHSTER HEBEL)

Diese Schritte sind nicht-technisch und blocken alles andere:

| Aufgabe | Zeit | Wo | Bloeckt |
|---|---|---|---|
| AVV Anthropic signieren | ~10 min | https://www.anthropic.com/legal/dpa | Welle C komplett |
| AVV Mistral signieren | ~10 min | https://mistral.ai/terms/#data-processing-addendum | Welle C komplett |
| Google-Play-Account ($25) | ~30 min | https://play.google.com/console/signup | Welle E (Android) |
| 5–10 Familien in Bad Saeckingen ansprechen | Wochen | persoenlich | gesamtes Phase-1-Produkt |

**Solange diese vier offen sind, ist alle Tech-Arbeit Vorratshaltung fuer eine
App, die noch keiner installiert.**

### Weg 2 — Tech-Polish wenn AVV durch sind (Welle C)

Sobald AVV unterschrieben:

- ANTHROPIC_API_KEY + MISTRAL_API_KEY in Vercel setzen (`vercel env add` Production+Dev, Pattern wie DEVICE_PAIRING_SECRET heute)
- Welle C aus Plan starten: `nachbar-io/docs/plans/2026-04-19-senior-app-stufe1-implementation.md` Sektion „Welle C — KI + Senior-Memory"
- 9 Tasks (C1 Mig 173 → C9 Deploy + Smoke), geschaetzt ~7 Tage
- TDD strict, subagent-driven analog Welle B

### Weg 3 — Polish ohne Pilot-Wert (NUR wenn Du willst, ehrlich gesagt unnoetig)

Diese zwei Punkte habe ich heute als „lohnen sich" identifiziert, falls Du
trotzdem im Code arbeiten moechtest:

#### 3a) TTS-Voiceover auf Senior-Pair-Seite

**Warum:** Mig 168 (TTS-Bucket) ist seit heute LIVE. Pair-Seite koennte den
Senior beim Booten ansprechen: „Bitte bitten Sie einen Angehoerigen, diesen
Code mit dem Handy abzufotografieren." Macht das Geraet menschlicher,
besonders fuer Senioren mit schlechten Augen.

**Files:**
- `nachbar-io/app/(senior)/pair/page.tsx` — Hook fuer TTS einbauen
- `nachbar-io/lib/tts/` — vermutlich existiert schon ein Cache-Helper (pruefen!),
  sonst Layer-1-Lib aus `topics/voice.md` nachschlagen
- `nachbar-io/__tests__/app/senior/pair.test.tsx` — TTS-Mock hinzu

**Aufwand:** ~1 Stunde, +3-5 Tests

**TDD-Pfad:** Test fuer „TTS wird beim Mount aufgerufen mit erwartetem Text"
zuerst rot, dann Implementation, dann Refresh-Variante (TTS soll nicht bei
jedem 9-min-Renew erneut sprechen).

#### 3b) Cron-Cleanup fuer abgelaufene refresh_tokens

**Warum:** `device_refresh_tokens` waechst monoton. Bei jedem Pair + Rotation
landet ein neuer Eintrag, alte werden nur als revoked markiert, nie geloescht.
In 6 Monaten erste Schmerzen, in einem Jahr richtig viele.

**Files:**
- `nachbar-io/app/api/cron/cleanup-device-tokens/route.ts` — neuer Cron
- `nachbar-io/vercel.json` — neuen Schedule eintragen (z.B. taeglich 3 Uhr)
- Test: `nachbar-io/__tests__/api/cron/cleanup-device-tokens.test.ts`

**Logik:**
```sql
DELETE FROM device_refresh_tokens
WHERE expires_at < now() - interval '30 days'
   OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '30 days');
```

**Aufwand:** ~30 min, +2-3 Tests

**Vorsicht:** Service-Role-Client noetig (RLS blockt sonst). Pattern:
`feedback_cron_admin_client.md`.

---

## Empfehlung fuer naechste Session

**Wenn AVV signiert:** Direkt Welle C starten (Weg 2). Subagent-driven
analog heute.

**Wenn AVV NICHT signiert:** Nichts Tech-seitiges machen. Lieber zur Familie.
Der Pilot ist der Engpass, nicht der Code.

**Nur wenn Du unbedingt Code anfassen willst:** 3a (TTS-Voiceover) — hat den
hoechsten emotionalen Wert pro Stunde (echte Senior-UX), kostet ~1h.

---

## Start-Prompt fuer naechste Session

Copy-Paste:

```
Lies nachbar-io/docs/plans/2026-04-19-session-ende-naechste-session.md
und entscheide basierend auf meinem aktuellen Stand:

(A) AVV mit Anthropic + Mistral sind unterschrieben
    -> starte Welle C (KI + Senior-Memory) aus
       nachbar-io/docs/plans/2026-04-19-senior-app-stufe1-implementation.md
       Sektion "Welle C". Subagent-driven, TDD strict, kein Push bis
       Welle C komplett + Founder-Go.

(B) AVV NICHT unterschrieben
    -> nur TTS-Voiceover auf Senior-Pair-Seite (Polish, 3a im Handoff).
       Mig 168 ist LIVE, kannst direkt nutzen.

(C) Ich brauche kein Tech, sondern Hilfe beim Pilot-Onboarding
    -> sag was Du brauchst (Anschreiben, Flyer, Pitch fuer Familien-Treffen).
```

---

## MEMORY-Aktualisierung passiert war heute schon

In `~/.claude/projects/.../memory/MEMORY.md`:
- nachbar-io HEAD = `09142ea`
- Welle B + Mig 168 + Mig 172 markiert als LIVE
- DWD-Sim Cleanup als erledigt
- topics/senior-app.md angelegt

Naechste Session liest MEMORY.md automatisch beim Start.

---

## Bekannte Stolpersteine fuer naechste Session

- **Vercel-Preview-Branch** hat `DEVICE_PAIRING_SECRET` noch nicht — Vercel-CLI
  verlangt explizite Branch-Wahl (project setting). Nur relevant wenn Du
  Preview-Deploys testen willst.
- **Preexistente Test-Failures** (4 Stueck) und **TS-Errors in E2E** (8 Stueck)
  sind noch da, NICHT durch heutige Arbeit verschlechtert. Liste in
  `~/.claude/.../memory/project_test_status.md`.
- **PILOT_MODE-Flag** funktioniert faktisch nicht (Variable-Mismatch),
  Gating laeuft ueber DB-`feature_flags`-Tabelle. Steht in MEMORY.md Hauptindex.

---

Schoenes Wochenende / schoenen Abend. Bis morgen oder wann Du wiederkommst.
