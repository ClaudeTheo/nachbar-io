# Handoff — Secret-Rotation via Browser-Automation (neue Session)

**Ziel:** Alle 11 Provider-Keys in Vercel-Envs rotieren, per Browser-Automation (Claude-in-Chrome).
**Vorbedingung:** Vercel-Activity-Log 30 Tage wurde geprueft in der vorigen Session — sauber (ChatGPT-App-Grant war bewusst autorisiert durch Founder). Kein Incident-Escalation noetig.

---

## Kontext aus der vorigen Session

- **Dashboard-Launcher-Skript:** `scripts/open-rotation-dashboards.sh` — oeffnet alle URLs als Tabs
- **Rotation-Skript:** `scripts/rotate-secrets.sh` — hat interaktive Prompts, aber diese Session macht Browser-Automation statt interaktiv
- **Smoke-Test:** `scripts/smoke-test-prod.sh` — Baseline vor dieser Session: 5/5 gruen
- **Env-Liste** aus Vercel-Prod: 46 Vars (siehe `docs/plans/2026-04-21-vercel-baseline-snapshot.md`)
- **ChatGPT-OAuth-Grant:** 16h vor Session-Start autorisiert, read-write auf project/domain/deployment — Founder hat bestaetigt bewusst. **Nach abgeschlossener Rotation: Founder entscheidet ob revoken.**
- **Supabase-Blocker:** UI-Umbau — siehe unten, eigener Pfad

---

## Setup-Schritte (beim Start der neuen Session)

1. **Browser-Tools laden via ToolSearch:**
   ```
   select:mcp__Claude_in_Chrome__navigate,mcp__Claude_in_Chrome__get_page_text,
          mcp__Claude_in_Chrome__read_page,mcp__Claude_in_Chrome__tabs_context_mcp,
          mcp__Claude_in_Chrome__tabs_create_mcp,mcp__Claude_in_Chrome__find,
          mcp__Claude_in_Chrome__computer
   ```

2. **Tab-Kontext holen:** `mcp__Claude_in_Chrome__tabs_context_mcp` mit `createIfEmpty: true`

3. **Sanity-Check:** `vercel whoami` → muss `thomasth1977` liefern

4. **Baseline-Smoke:** `bash scripts/smoke-test-prod.sh` → muss 5/5 gruen sein VOR Rotation (damit man nachher weiss, was Rotation-Schaden vs. Prae-existent ist)

---

## Vercel-Env-Update-Pattern (pro Key)

Nach dem Kopieren des neuen Werts aus dem Provider-Dashboard:

```bash
# Bash-Variable (niemals im Chat ausgeschrieben — Secret bleibt in Variable + Tool-Output)
NEW_VAL="<der neue Wert aus dem Dashboard>"

for env in production preview development; do
  vercel env rm "KEY_NAME" "$env" --yes 2>/dev/null || true
  printf "%s" "$NEW_VAL" | vercel env add "KEY_NAME" "$env" --sensitive
done

# Variable clearen
NEW_VAL=""
```

**Wichtig:**
- `--sensitive` Pflicht fuer SECRET/API_KEY
- `NEXT_PUBLIC_*` bleibt **plain** (ohne `--sensitive`) — client-bundle sichtbar per Design
- Reihenfolge `rm` + `add` statt `add --force` (sauber, testbar)
- Wenn Tool-Output den neuen Wert enthaelt: das ist akzeptiert (Founder hat explizit "mach es" gesagt). Trotzdem sparsam mit `get_page_text` — nur wenn noetig.

---

## Rotation-Reihenfolge

**P0 zuerst** (History-exposed), **P1 danach** (Session-exposed), **Auto-Gen zum Schluss** (CRON/INTERNAL/VAPID).

### P0-1: RESEND_API_KEY

- **URL:** https://resend.com/api-keys
- **Flow:** "Create API Key" → neuen Wert kopieren → alten Key loeschen (in der Liste: Delete-Button)
- **Vercel-Update:** `RESEND_API_KEY` (`--sensitive`)
- **Test nach Update:** Login-Flow triggert Magic-Link (manuell — Skript-Smoke-Test testet Resend nicht direkt)

### P0-2: TURN-Paar (NEXT_PUBLIC_TURN_CREDENTIAL + NEXT_PUBLIC_TURN_USERNAME)

- **URL:** https://dashboard.metered.ca/
- **Flow:** Metered Application → Credentials regenerieren. Paar-Werte — beide mit einer Rotation aktualisieren.
- **Vercel-Update:** `NEXT_PUBLIC_TURN_CREDENTIAL` + `NEXT_PUBLIC_TURN_USERNAME` (beide **plain**, kein `--sensitive`)
- **Redeploy-Pflicht:** Diese Werte sind im Client-Bundle gebaked. Redeploy am Ende (nach allen Rotationen) sorgt fuer Client-Side-Update.

### P1-1: SUPABASE_SERVICE_ROLE_KEY — BLOCKER, separates Ticket

**Warum Blocker:** Supabase hat UI umgebaut. "Roll service role key" existiert nicht mehr in `/settings/api-keys/legacy`. Zwei moegliche Wege, beide mit Hinweis:

**Option A — JWT-Secret rotieren**
- URL: `https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka/settings/jwt`
- Effekt: ALLE JWTs invalidiert → alle User-Sessions fliegen raus + anon_key + service_role_key neu
- Bei 0 echten Nutzern: unkritisch, schnellster Weg
- Vercel-Update: `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (letzterer plain)

**Option B — Migrate zu neuen `sb_secret_*`-Keys**
- URL: `https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka/settings/api-keys`
- Code-Aenderung im Repo noetig: `NEXT_PUBLIC_SUPABASE_ANON_KEY` wird `sb_publishable_*`, `SUPABASE_SERVICE_ROLE_KEY` wird `sb_secret_*`
- lib/supabase-Code pruefen ob JWT-Format assumptions drin sind
- Keys-Grep: `grep -rE "service_role|eyJ" nachbar-io/lib/supabase --include='*.ts'`
- **Empfehlung:** Option A zur Rotation jetzt, Option B als separates Tech-Debt-Ticket

### P1-2: ANTHROPIC_API_KEY

- **URL:** https://platform.claude.com/settings/keys (redirect von console.anthropic.com)
- **Befund aus voriger Session:** **5 bestehende Keys** ohne sichtbare Namen-Zuordnung. Sort by "Zuletzt verwendet" um aktiven Prod-Key zu identifizieren.
- **Flow:** 
  1. "Schluessel erstellen" → Name vergeben z.B. `nachbar-io-prod-2026-04-21` → neuen Wert kopieren
  2. Alte Keys (oder zumindest den bisher aktiven) revoken
- **Vercel-Update:** `ANTHROPIC_API_KEY` (`--sensitive`)
- **Vorsicht:** nachbar-arzt + Nahkreis nutzen evtl. andere Anthropic-Keys — nur rotieren was zu nachbar-io gehoert!

### P1-3: OPENAI_API_KEY

- **URL:** https://platform.openai.com/api-keys
- **Flow:** "Create new secret key" → name z.B. `nachbar-io-prod-2026-04-21` → kopieren → alten Key revoken
- **Vercel-Update:** `OPENAI_API_KEY` (`--sensitive`)

### P1-4: GOOGLE_AI_API_KEY

- **URL:** https://aistudio.google.com/app/apikey
- **Flow:** "Create API Key" → project waehlen → kopieren → alten Key loeschen
- **Vercel-Update:** `GOOGLE_AI_API_KEY` (`--sensitive`)

### P1-5: TAVILY_API_KEY

- **URL:** https://app.tavily.com/home
- **Flow:** API-Key-Section → Regenerate/Create New → kopieren
- **Vercel-Update:** `TAVILY_API_KEY` (`--sensitive`)

### P1-6: TWILIO_AUTH_TOKEN

- **URL:** https://console.twilio.com/
- **Flow:** Account Info → Auth Token → "Roll" (2 Tokens slots: primary/secondary, man rollt einen, tauscht im Code, dann rollt den anderen) — oder direkt Primary rollen wenn kurze Downtime ok
- **Vercel-Update:** `TWILIO_AUTH_TOKEN` (`--sensitive`)
- **Memory-Hinweis:** Twilio SID `AC<account-sid-redacted>` — richtige Identifikation sicherstellen
- **Hinweis zu TWILIO_ACCOUNT_SID:** bleibt gleich, nur Auth-Token rotieren

### P1-7: Upstash KV — KV_REST_API_TOKEN + REDIS_URL

- **URL:** https://console.upstash.com/
- **Flow:** Redis Database → "Reset Password" ODER Database neu anlegen (teurer, aber saubere slate)
- **Vercel-Update:** `KV_REST_API_TOKEN` + `REDIS_URL` (beide `--sensitive`) + ggf. `KV_URL` (`--sensitive`)
- **Vorsicht:** Mehrere zusammenhaengende Vars — alle in einem Rutsch updaten
- **Ausserdem:** `KV_REST_API_READ_ONLY_TOKEN` — wenn der auch genutzt wird, gleichzeitig rotieren

### P1-8: STRIPE_SECRET_KEY (Test-Mode)

- **URL:** https://dashboard.stripe.com/test/apikeys
- **Flow:** "Reveal test key" → alten Key rollen (neuen erzeugen + alten sofort invalidieren)
- **Vercel-Update:** `STRIPE_SECRET_KEY` (`--sensitive`)

### P1-9: STRIPE_WEBHOOK_SECRET

- **URL:** https://dashboard.stripe.com/test/webhooks
- **Flow:** Endpoint auswaehlen (der an nachbar-io.vercel.app/api/stripe/webhook gebunden ist) → "Click to reveal" / Reset Secret
- **Vercel-Update:** `STRIPE_WEBHOOK_SECRET` (`--sensitive`)
- **Test nach Update:** Stripe Dashboard → Webhook → "Send test event" → /api/stripe/webhook muss 200 liefern

### P2 (Auto-Generate, kein Dashboard)

Wenn alle P0+P1 durch sind:

```bash
cd nachbar-io
bash scripts/rotate-secrets.sh --execute
# Bei allen P0/P1-Prompts: "skip"
# Bei CRON_SECRET: "y"
# Bei INTERNAL_API_SECRET: "y"
# Bei VAPID-Paar: "y"
```

Das Skript generiert selbst via `openssl rand -hex 32` bzw. `npx web-push generate-vapid-keys`, pusht direkt nach Vercel. Werte bleiben intern.

---

## Nach allen Rotationen

1. **Prod-Redeploy** (damit TURN-Paar + VAPID-Public im Client-Bundle aktualisiert):
   ```bash
   cd nachbar-io
   npx vercel --prod
   # Kostet ~1 Build-Minute — laut CLAUDE.md normalerweise vermeiden, hier einmalig OK
   ```

2. **Smoke-Test:**
   ```bash
   bash scripts/smoke-test-prod.sh
   # muss 5/5 gruen liefern
   ```

3. **Manuelle Verifikation (Rotation-spezifisch):**
   - Magic-Link-Login → Email → Klick → Portal (testet Resend + Supabase)
   - Stripe-Webhook-Test-Event aus Stripe-Dashboard → muss 200 liefern
   - Vercel-Cron manuell triggern → testet CRON_SECRET

4. **ChatGPT-OAuth-Grant entscheiden:** Founder entscheidet ob `ChatGPT`-App in Vercel revoken (falls nicht mehr benoetigt). URL: https://vercel.com/account/tokens

5. **Checkliste abhaken** in `docs/plans/2026-04-20-secret-rotation-checklist.md`.

6. **Commit** (Memory-Eintrag + evtl. Updates an `.env.cloud.local` falls Founder will — aber `vercel env pull .env.cloud.local --yes --environment=production` reicht).

---

## Supabase — separates Follow-up-Ticket (nicht in dieser Session)

Wenn Supabase-Rotation heute ueber Option A (JWT) gemacht wurde: OK. Langfristig aber Migration zu neuen `sb_secret_*`-Keys planen — eigenes Vorhaben, Tech-Debt-Ticket.

Code-Scan bei Migration:
```bash
grep -rE "SUPABASE_SERVICE_ROLE_KEY|service_role" nachbar-io/lib --include='*.ts' -l
grep -rE "createClient.*service_role" nachbar-io --include='*.ts' -l
```

---

## Wenn etwas schief geht

- **Smoke-Test rot nach Rotation:** alten Wert (noch bekannt im Tool-Output-History) zurueck in Vercel setzen + Debug
- **App bricht sofort:** `vercel logs nachbar-io.vercel.app` — zeigt welcher Key failed
- **Konflikt mit anderem Projekt** (nachbar-arzt/nahkreis nutzt denselben Provider-Key): Key muss in ALLEN betroffenen Vercel-Projekten parallel aktualisiert werden — nicht nur nachbar-io. Pro Projekt: `cd <projekt>; vercel env add ...`.
- **Rollback:** Vercel-Envs haben Historie — via Dashboard einsehen und alte Werte wiederherstellen wenn noetig (im Grenzfall: alter Wert ist noch im Tool-Output der neuen Session bis sie beendet ist)

---

## Zeit-Schaetzung

- Setup + Tab-Kontext: 2 Min
- Pro Provider: 3-5 Min (Dashboard-Login + Rotate + Copy + Vercel-Add x 3 Envs)
- Total 10 Provider (Supabase separat): 30-50 Min
- Auto-Gen + Redeploy + Smoke: 5 Min
- **Gesamt: 35-55 Min**

Bei Fehler pro Provider zusaetzlich 5-10 Min.

---

## Uebergabe Git-Stand

- `feature/hausverwaltung` HEAD: siehe `MEMORY.md` (letzter relevanter Commit-SHA)
- Kein Push erfolgt
- Rotation-Skript + Smoke-Test + Launcher-Skript vorhanden in `scripts/`
- Diese Uebergabe-Datei kann nach abgeschlossener Rotation gepruned werden (oder als Audit-Spur behalten)
