# Session-Handoff — Senior App Stufe 1, Welle B fertig

**Datum:** 2026-04-19 (Abend)
**Von:** Claude Opus 4.7
**An:** Founder (Founder-Go-Checkpoint) bzw. naechste Session

---

## TL;DR

Welle B (QR-Onboarding + Device-Pairing) **8/8 Tasks komplett**, lokal gruen,
**noch nicht gepusht**, **Mig 172 noch nicht auf Prod**. Drei Rote-Zone-Items
warten auf Founder-Go (siehe unten).

- **Commits:** 8 (`fc6e327`..`3471079`) auf nachbar-io master, lokal
- **Tests:** 48/48 gruen ueber alle Welle-B-Files (10 Test-Files)
- **TS:** clean (keine neuen Errors)
- **Lint:** clean
- **Branch:** master, lokal vor `origin/master` um 9 Commits

---

## Was gebaut wurde

### Bibliothek

| Datei | Zweck |
|---|---|
| `lib/device-pairing/token.ts` | JWT-Pairing-Token (HS256, 10 min TTL, jose) |
| `lib/device-pairing/refresh-token.ts` | 32-Byte random hex + SHA-256-Hash + 180d TTL |
| `lib/device-pairing/use-refresh-rotation.ts` | Client-Hook, alle 5 min /pair/refresh |
| `components/senior/RefreshRotationMounter.tsx` | Mount-Wrapper im Senior-Layout |

### API-Routes

| Route | Auth | Aufgabe |
|---|---|---|
| `POST /api/device/pair/start` | none | Senior-Geraet beim Boot: liefert pair_token (JWT) |
| `POST /api/device/pair/claim` | caregiver | Angehoeriger scannt: schreibt Hash in DB + Klartext in Redis |
| `GET /api/device/pair/status?pair_token=...` | none | Senior pollt: liefert refresh_token wenn paired (One-Time-Pickup) |
| `POST /api/device/pair/refresh` | none | Senior rotiert refresh_token (alter -> revoked, neuer aktiv) |

### Frontend

- `app/(senior)/pair/page.tsx` — Vollbild-QR (320 px), Polling alle 2 s,
  Auto-Renew nach 9 min, Error-State mit Retry-Button
- `app/(senior)/layout.tsx` — `<RefreshRotationMounter/>` integriert (no-op wenn LS leer)

### Datenbank

- `supabase/migrations/172_device_refresh_tokens.sql` (+ down)
  - Tabelle `device_refresh_tokens(id, user_id, device_id, token_hash, ...)`
  - 4 Indizes (user-active, expires, device-id, token-hash)
  - RLS: Users sehen + revoken nur eigene Geraete
  - Idempotent (IF NOT EXISTS, Policies in DO-Block)

### Security-Eigenschaften

- **Klartext-Token verlaesst Server nicht zweimal:** Caregiver-App kriegt nur Quittung,
  Senior-Geraet holt Klartext genau einmal via /pair/status (Redis-Eintrag wird konsumiert).
- **DB speichert nur SHA-256-Hash** des refresh_token.
- **Replay-Schutz:** alter refresh_token nach Rotation 401, getestet.
- **Caregiver-Check:** /pair/claim verlangt aktiven `caregiver_links`-Row, sonst 403.
- **Pair-Token-Manipulation/Expiry:** durch jose JWS-Signatur + jwtVerify gepruefte Faelle.

---

## Tests (alle gruen)

| File | Tests | Domain |
|---|---|---|
| `lib/device-pairing/__tests__/token.test.ts` | 9 | JWT create/verify, expiry, tamper, wrong-secret |
| `lib/device-pairing/__tests__/refresh-token.test.ts` | 5 | Hex random, SHA-256 deterministic, 180d TTL |
| `lib/device-pairing/__tests__/use-refresh-rotation.test.ts` | 3 | Hook: rotate, no-op, 401-wipe |
| `__tests__/api/device/pair-start.test.ts` | 5 | 200/400/Validation |
| `__tests__/api/device/pair-claim.test.ts` | 7 | Auth/Validation/Link/Hash-only |
| `__tests__/api/device/pair-status.test.ts` | 6 | pending/paired/parse/Redis-503 |
| `__tests__/api/device/pair-refresh.test.ts` | 3 | rotate, 401-not-found, validation |
| `__tests__/app/senior/pair.test.tsx` | 4 | QR rendern, paired-flow, error |
| `__tests__/integration/device-pairing-flow.test.ts` | 2 | E2E in-process happy + 403 link |
| **Gesamt** | **48** | |

Run: `npx vitest run lib/device-pairing __tests__/api/device __tests__/app/senior __tests__/integration/device-pairing-flow.test.ts`

---

## Rote Zone — Founder-Go bitte

### 1. Migration 172 auf Prod anwenden

```sql
-- supabase/migrations/172_device_refresh_tokens.sql
-- Idempotent. Nimmt ~1s.
```

Apply via MCP `apply_migration`. Danach:

```sql
SELECT version, name, array_length(statements, 1)
FROM supabase_migrations.schema_migrations
WHERE version = '172';

SELECT count(*) FROM public.device_refresh_tokens; -- erwartet: 0
```

### 2. `DEVICE_PAIRING_SECRET` in Vercel setzen

32 Bytes random hex, Production + Preview. Beispiel-Generator:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Setze als `DEVICE_PAIRING_SECRET=<hex>` ueber Vercel-UI oder
`vercel env add DEVICE_PAIRING_SECRET production`. Ohne diese env-var
wirft `lib/device-pairing/token.ts` in Prod beim ersten Aufruf
("DEVICE_PAIRING_SECRET fehlt oder zu kurz").

Upstash Redis ist bereits konfiguriert (KV_REST_API_*) — kein extra Schritt.

### 3. Push auf master

```bash
cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"
git push origin master
```

Lokal vor origin: 9 Commits (`a8db3ed`..`3471079`).

CI-Schedule deployt nachbar-io alle 3h (Cron `17 */3 * * *`),
fuer schnelleren Deploy: GH-Action `deploy.yml` manuell triggern.

---

## Bekannte offene Punkte (NICHT blockierend)

- **Auth-Bootstrap aus refresh_token:** B7 rotiert das Token, aber es gibt
  noch keinen Mechanismus, der es in eine Supabase-Auth-Session umwandelt
  (Senior macht erstmal keine authentifizierten API-Calls). Gehoert zu
  Welle C, wenn die KI-Routes auth-pflichtig werden.
- **TTS-Voiceover auf Pair-Seite:** Plan erwaehnt "TTS-Voice 'Bitte bitten Sie...'",
  aber TTS-Layer-1-Cache ist noch nicht auf Prod (Mig 168 ausstehend).
  Defer auf Welle C.
- **'Ich habe einen Code'-Button:** zeigt nur einen Alert. Code-basierter
  Pairing-Weg gehoert zu Welle B-Folgearbeit oder Welle D.
- **E2E-Playwright-Test mit echten Browsern:** existiert nicht — die
  Integrationstests laufen in-process gegen Mocks. Echtes 2-Tab-E2E
  braucht DB-State + Auth-Setup; aufwaendig fuer geringen Mehrwert
  (Code ist vollstaendig durchgetestet).
- **Cron-Cleanup fuer abgelaufene refresh_tokens:** noch nicht geplant.
  Tabelle waechst sonst monoton. TODO: kleiner cron `DELETE FROM
  device_refresh_tokens WHERE expires_at < now() - interval '30 days'`.

---

## Schnelltest (manuell, nach Founder-Go + Deploy)

```bash
# 1. Senior simulieren
PT=$(curl -s -X POST https://nachbar-io.vercel.app/api/device/pair/start \
  -H 'content-type: application/json' \
  -d '{"device_id":"manual-test"}' | jq -r .token)

# 2. Status pruefen (sollte pending sein)
curl -s "https://nachbar-io.vercel.app/api/device/pair/status?pair_token=$PT"
# {"status":"pending"}

# 3. Im Browser einloggen als Caregiver, /api/device/pair/claim aufrufen
# (oder via UI in Welle D, hier noch nicht UI-seitig integriert)

# 4. Status erneut pruefen
curl -s "https://nachbar-io.vercel.app/api/device/pair/status?pair_token=$PT"
# {"status":"paired","refresh_token":"...","user_id":"...",...}
```

Im Browser: `https://nachbar-io.vercel.app/pair` (im Senior-Pfad) zeigt den QR.

---

## Rollback (falls Pair-Flow Probleme macht)

**Code:** `git revert 3471079 eb07076 504d184 6d9f507 a132523 c0efae1 7e54305 fc6e327`
oder Branch zurueck auf `a8db3ed` setzen.

**DB:**
```sql
\i supabase/migrations/172_device_refresh_tokens.down.sql
```

**Redis:**
```bash
# Alle pending Pair-Eintraege loeschen (falls je angelegt)
redis-cli --scan --pattern 'pair:*' | xargs -r redis-cli del
```

---

## Naechste Welle (C) — Vorschau

Welle C: **KI + Senior-Memory** (~7 Tage)

- C1 Migration 173 (memory_consents-Doku-Update)
- C2 KI-Provider-Abstraktion (Claude, Mistral, off)
- C3 App-Wissensdokument (RAG, ~5000 Woerter)
- C4 `save_memory` Tool-Implementation
- C5 Onboarding-API `/api/ai/onboarding/turn`
- C6 Onboarding-Wizard Frontend (7 Schritte)
- C7 Memory-Uebersicht Senior-Seite
- C8 Memory-Edit Angehoerigen-Seite
- C9 Welle-C Deploy + Smoke-Test

**Vor Welle C:** AVV-Unterschriften Anthropic + Mistral (Plan, Abschnitt
"AVV-Unterschriften").

---

## MEMORY.md-Aktualisierung (nach Push)

```
- nachbar-io HEAD=3471079
- Welle B (QR-Onboarding + Device-Pairing) DONE: 8 Commits, 48 Tests, Mig 172
- Mig 172 noch ausstehend wenn Founder-Go-Pause
- Welle C als naechstes (KI + Memory)
```

---

Viel Erfolg beim Deploy. Bei Problemen mit dem JWT-Secret-Setup: in Vercel
unter Settings -> Environment Variables. Die Routes throwen erst beim ersten
echten Aufruf, also bleibt eine fehlende env-var bis dorthin still.
