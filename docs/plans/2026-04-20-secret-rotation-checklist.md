# Secret-Rotation — Checkliste (Stand 2026-04-20)

**Anlass 1:** Session 2026-04-20 (Cleanup + Local-Stack). Die komplette Prod-`.env.local` wurde via `Read` und `head -40` im Claude-Code-Session-Kontext sichtbar. Zusaetzlich zeigt Git-History-Audit, dass drei Werte vorher bereits in committed Plan-/Backup-Dateien standen.

**Anlass 2 (hinzu 2026-04-20 spaet):** Vercel Security-Incident-Benachrichtigung. Unauthorized access zu internen Vercel-Systemen. Laut Mail sind **unsere** Credentials nicht im bestaetigten Kompromittiert-Set, aber Vercel empfiehlt allen Kunden Rotation + Activity-Log-Review + Sensitive-Flag. Quelle: Security Bulletin von Vercel (E-Mail).

Werte in dieser Checkliste sind **nicht ausgeschrieben**. Der Founder kennt die Identifier aus Vercel / den Anbieter-Dashboards.

---

## P-1 — VOR jeder Rotation: Vercel-Activity-Log pruefen

Wenn du hier was Auffaelliges findest, **nicht rotieren** — erst Vercel-Support kontaktieren (Incident-Response braucht Evidence).

- [ ] https://vercel.com/dashboard → Account Settings → **Activity** (persoenliches Log)
- [ ] Team Settings → **Activity** (Team-Log, falls Team existiert)
- [ ] **Worauf achten:**
  - Logins aus unbekannten Laendern / IPs
  - Env-Var-Reads oder -Writes die nicht du warst
  - Neue Deploy-Hooks, neue Webhooks, neue Team-Mitglieder
  - Ungewoehnliche API-Key-Erstellung im Vercel-Account
- [ ] Zeitraum: mindestens die letzten 30 Tage
- [ ] Ergebnis-Option:
  - **Alles sauber:** weiter mit P0/P1 unten.
  - **Auffaellig:** STOP → Vercel-Support kontaktieren (siehe Sprechvorlage in `2026-04-21-vercel-incident-sprechvorlagen.md`).

## P-0 — NACH jeder Rotation: als "Sensitive" markieren in Vercel

Vercel hat zwei Env-Var-Klassen:
- **Plain**: nach Setzen im Dashboard lesbar.
- **Sensitive**: nach Setzen **nicht mehr lesbar**, encrypted-at-rest, nur an Runtime ausgeliefert.

**Beim Wiedereintragen der rotierten Werte** in Vercel-Envs (Production + Preview + Development): die folgenden Variablen als **Sensitive** eintragen:

- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `CARE_ENCRYPTION_KEY`, `CIVIC_ENCRYPTION_KEY`, `RESIDENT_HASH_SECRET`
- [ ] `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `TAVILY_API_KEY`
- [ ] `TWILIO_AUTH_TOKEN`, `RESEND_API_KEY`
- [ ] `KV_REST_API_TOKEN`, `KV_URL`, `REDIS_URL`, `KV_REST_API_READ_ONLY_TOKEN`
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] `CRON_SECRET`, `INTERNAL_API_SECRET`
- [ ] `VAPID_PRIVATE_KEY`

**Nicht sensitive** (per Design public, bleiben Plain):
- Alles mit `NEXT_PUBLIC_*`-Prefix (wird ins Client-Bundle gebaked)

---

## Regeln fuer die Rotation

- **Reihenfolge P1 → P2 → P3** abarbeiten.
- Pro Key: zuerst im Anbieter-Dashboard rotieren, neuen Wert notieren, dann parallel in Vercel (alle Envs: Production / Preview / Development) und in `.env.cloud.local` setzen. Alter Wert wird gleichzeitig inaktiv.
- **Nicht** im Claude-Chat die neuen Werte ausschreiben. Nur "done" melden.
- Nach jeder Rotation: kurzer Smoke-Test auf Prod (z.B. Login, Ein-Feature-Trigger).
- Wenn ein Rotate einen User-Flow bricht (z.B. Push-Subscriptions weg), vor der Rotation ankuendigen / dokumentieren.

---

## P1 — Sofort rotieren (hohes Missbrauchs-Potential, keine Nebeneffekte)

| # | Variable | Wo rotieren | Wo updaten | Risiko bei Leak |
|---|---|---|---|---|
| 1.1 | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → "Roll service role key" | Vercel envs + `.env.cloud.local` | Full-DB-Access, RLS-Bypass |
| 1.2 | `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Vercel envs + `.env.cloud.local` | API-Missbrauch, hohe Kosten |
| 1.3 | `OPENAI_API_KEY` | platform.openai.com → API Keys | Vercel envs + `.env.cloud.local` | API-Missbrauch, hohe Kosten |
| 1.4 | `GOOGLE_AI_API_KEY` | aistudio.google.com → API Key | Vercel envs + `.env.cloud.local` | API-Missbrauch |
| 1.5 | `RESEND_API_KEY` | resend.com → API Keys | Vercel envs + `.env.cloud.local` | Phishing in deinem Domain-Namen |
| 1.6 | `TWILIO_AUTH_TOKEN` | console.twilio.com → Auth Token → Roll | Vercel envs + `.env.cloud.local` | SMS-Missbrauch, Phishing, Kosten |
| 1.7 | `KV_REST_API_TOKEN` + `REDIS_URL` (Upstash) | console.upstash.com → Redis Database → Reset Password | Vercel envs + `.env.cloud.local` | Session-Manipulation, Rate-Limit-Bypass |
| 1.8 | `TAVILY_API_KEY` | tavily.com → Dashboard | Vercel envs + `.env.cloud.local` | API-Missbrauch |
| 1.9 | `STRIPE_SECRET_KEY` (Test-Mode) | dashboard.stripe.com → API keys → Test mode → Roll | Vercel envs + `.env.cloud.local` | Test-Zahlungen im Namen, Test-Kunden-Daten |
| 1.10 | `STRIPE_WEBHOOK_SECRET` | dashboard.stripe.com → Webhooks → Endpoint → Reveal/Reset | Vercel envs + `.env.cloud.local` | Gefaelschte Webhook-Events |

## P2 — Rotieren mit Plan (Nebeneffekte beachten)

| # | Variable | Wo rotieren | Zusaetzlicher Schritt | Risiko bei Leak |
|---|---|---|---|---|
| 2.1 | `VAPID_PRIVATE_KEY` (+ `NEXT_PUBLIC_VAPID_PUBLIC_KEY` als Paar) | `npx web-push generate-vapid-keys` lokal | Alle bestehenden Push-Subscriptions werden ungueltig → User muessen neu opt-in. Bei 0 echten Users aktuell unkritisch. | Push-Notifications im Namen der App senden |
| 2.2 | `TURN_CREDENTIAL` + `TURN_USERNAME` (Metered) | metered.ca Dashboard → Application → Regenerate / neuer User | Bei Video-Calls muss kurz der neue Key ueberall sein, sonst Audio/Video-Ausfall | Relay-Missbrauch auf Metered-Konto |
| 2.3 | `CRON_SECRET` | lokal neu generieren (`openssl rand -hex 32`) | GitHub Actions Secret updaten + Vercel Env | Cron-Jobs trigger-bar |
| 2.4 | `INTERNAL_API_SECRET` | lokal neu generieren | Alle Services die diese Secret nutzen gleichzeitig — Code-Pfad pruefen | Interne Endpoints rufbar |

## P3 — Erst mit Migrations-Plan rotieren

| # | Variable | Warum speziell | Plan noetig |
|---|---|---|---|
| 3.1 | `CARE_ENCRYPTION_KEY` | AES-verschluesselte Care-Felder werden mit altem Key unentschluesselbar | Re-Encryption-Migration schreiben (alle betroffenen Rows einmalig mit altem Key entschluesseln + mit neuem Key verschluesseln). Nicht trivial, Testen auf Branch. |
| 3.2 | `CIVIC_ENCRYPTION_KEY` | Analog zu 3.1 fuer Civic-Daten | Re-Encryption-Migration |
| 3.3 | `RESIDENT_HASH_SECRET` | HMAC fuer User-Hashes — wenn die persistent irgendwo gespeichert sind (Audit-Logs, Dedupe-Keys), passen alte und neue Hashes nicht mehr. | Vorher: `grep -ri "resident_hash\|RESIDENT_HASH" .` → Usage kartieren. Dann entscheiden: rotieren + Historie-Hashes als "legacy" markieren, oder on-the-fly Doppel-Hashing. |

## Nicht rotieren (per Design public)

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key, RLS schuetzt)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (public, bleibt paarweise zum privaten Key)
- `NEXT_PUBLIC_SENTRY_DSN` (per Design public)
- `NEXT_PUBLIC_MAPTILER_KEY` (public, ggf. Domain-Lock pruefen)
- `NEXT_PUBLIC_TURN_URL` (nur URL, kein Secret)
- `VERCEL_OIDC_TOKEN` (kurzlebig, regeneriert sich automatisch)

---

## Zusaetzliche Git-History-Befunde (P0 — vor P1 ansehen)

Folgende Werte standen bereits VOR der heutigen Session in committed Dateien im **Parent-Repo**:

| Variable | Commit | Datei | Status |
|---|---|---|---|
| `RESEND_API_KEY` | `b352bd6` (hinzugefuegt) → `1e7db82` (Security-Fix K1+K2 "entfernt") | `docs/backup-2026-03-16/memory-backup/project_arzt_portal.md` | In History erreichbar via `git show b352bd6:...`. **Sub-String-Check 2026-04-20 belegt: Key ist identisch mit dem in aktueller `.env.cloud.local`.** Rotation 1e7db82 war nicht vollstaendig. |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | `f0bbf33` | `docs/plans/2026-04-06-metered-turn-entscheidung.md` | Noch nicht bereinigt |
| `NEXT_PUBLIC_TURN_USERNAME` | `f0bbf33` | `docs/plans/2026-04-06-metered-turn-entscheidung.md` | Noch nicht bereinigt |

**Konsequenz:** Die drei Values sind unabhaengig von der heutigen Session schon seit Wochen in Git-History. Bei P1.5 (Resend) und P2.2 (TURN) entsprechend Dringlichkeit hoch.

Optional: nach der Rotation die betreffenden Dateien **aus der History entfernen** (`git filter-repo` / BFG) — aber das ist destruktiv und braucht Founder-Go, nur sinnvoll wenn Repo je publik ist oder wird.

## Zusaetzlicher Befund: hardcoded Key im untracked Test-Script

`tests/interaction/run-interaction-tests-v2.sh` (Parent-Repo, nicht committed, auf Platte) enthaelt `SKEY=<sb_secret_...>` und `ANON=<jwt>` hardcoded.

**Empfehlung:** Nach Rotation von P1.1 (Service-Role-Key) dieses Skript entweder
- loeschen (wenn es nicht mehr gebraucht wird),
- in `.env.*.local`-driven umbauen (`SKEY="${SUPABASE_SERVICE_ROLE_KEY}"` via dotenv-load),
- oder in `backups/` verschieben.

Solange das Skript mit alten Werten auf Platte liegt, gilt der Service-Role-Key effektiv als "lokal ausserhalb von .env.* exponiert".

---

## Nach erfolgter Rotation

1. `.env.cloud.local` mit neuen Werten befuellen (Founder, nicht Claude).
2. Vercel-Envs auf Production + Preview + Development updaten.
3. Prod-Smoke-Test (Login, ein-zwei Feature-Trigger).
4. Diese Checkliste mit Datum abhaken (Datei behalten als Audit-Spur).
5. Memory-Eintrag: `feedback_secret_hygiene.md` oder aehnlich, damit die Lektion nicht verloren geht.
