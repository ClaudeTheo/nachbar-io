# Session-Start-Handover: Secret-Rotation + Drift-Strategie

**Ausgangspunkt:** nachbar-io `feature/hausverwaltung` HEAD `854f68e`. Parent `master` HEAD `6bd3b5a`. Kein Push.

**Status heute geschafft:**
- Cleanup (3 Commits + Backup verschoben)
- Lokaler Supabase-Stack **strukturell** fertig (4 Commits: `d96532c`, `16f9656`, `854f68e` + Parent `6bd3b5a`), aber **Live-Stack bricht bei Mig 019** (Prod-Drift, Notfallregel gegriffen, abgebrochen)
- Secret-Hygiene-Review von Codex akzeptiert — `.env.local` + `.env.cloud.local` bereinigt, Rotation-Checkliste fertig

**Blocker fuer morgen:** Mig-019-Drift (Lokal-Stack) + Secret-Rotation in Anbieter-Dashboards (Founder-Aufgabe).

---

## Zuerst lesen (max 10 Min)

1. **Rotation-Checkliste:** [docs/plans/2026-04-20-secret-rotation-checklist.md](2026-04-20-secret-rotation-checklist.md) — P0 / P1 / P2 / P3 Struktur, Dashboard-Links.
2. **Dieser Handoff** (du bist schon hier).
3. Optional: [docs/plans/2026-04-20-handoff-dev-supabase-local-und-cleanup-done.md](2026-04-20-handoff-dev-supabase-local-und-cleanup-done.md) fuer Local-Stack-Details.

---

## Schritte fuer die naechste Session (Reihenfolge wichtig!)

### Block A — Founder-Rotation (erfolgt AUSSERHALB Claude-Session)

Founder fuehrt die Rotation in den Provider-Dashboards durch. Claude schaut dabei **nicht** zu und kriegt keine neuen Werte zu sehen.

**P0 (zuerst — History-exposed):**
- [ ] Resend API Key rotieren (resend.com)
- [ ] TURN Credentials + Username rotieren (metered.ca)

**P1 (Session-exposed, sofort):**
- [ ] Supabase Service-Role-Key (dashboard.supabase.com)
- [ ] Anthropic, OpenAI, Google AI, Tavily Keys
- [ ] Twilio Auth Token
- [ ] Upstash KV Token (plus REDIS_URL / KV_URL)
- [ ] Stripe Test-Mode Secret + Webhook Secret

Pro rotiertem Key: sofort Vercel-Env updaten (Production + Preview + Development) und in `.env.cloud.local` eintragen.

**P2 (mit kleinem Plan):**
- [ ] VAPID-Keypair neu (`npx web-push generate-vapid-keys`) — Push-Subscriptions brechen, bei 0 Usern OK
- [ ] CRON_SECRET, INTERNAL_API_SECRET neu (trivial)

**P3 (nicht jetzt):**
- CARE_ENCRYPTION_KEY, CIVIC_ENCRYPTION_KEY, RESIDENT_HASH_SECRET → Re-Encryption-Migration noetig, eigenes Vorhaben

### Block B — Claude-Unterstuetzung nach Rotation

Wenn P0+P1 (+ggf. P2.3+P2.4) durch sind, kann Claude helfen mit:

- [ ] `.env.cloud.local` Werte-Check (nur ob Felder befuellt, ohne Werte zu lesen)
- [ ] `tests/interaction/run-interaction-tests-v2.sh` umbauen von hardcoded auf dotenv-load (oder loeschen/verschieben nach `backups/`)
- [ ] Pre-existing `1e7db82`-"Rotation" analysieren: warum war der Resend-Key nicht vollstaendig rotiert? Gibt es andere halb-rotierte Keys? (grep in K1+K2-Commit-Diffs)
- [ ] Smoke-Test auf Vercel-Prod (einmal Login, einmal Care-Endpoint) zur Bestaetigung

### Block C — Drift-Strategie fuer lokalen Stack

Nach Secret-Hygiene weitergehen mit Lokal-Stack. Vier Optionen (aus vorigem Handoff):

1. **Baseline-Reorder** — Baseline auf `000_baseline_full_snapshot.sql` vorziehen. Testen ob Migrationen 001-172 idempotent sind.
2. **Migrations-Konsolidierung** — alle alten Migrationen durch einen `pg_dump`-basierten Snapshot ersetzen. History kaputt, aber Lokal-Setup sauber.
3. **Nur-Baseline-Setup** — nur Baseline apply-en via Config. Braucht Script.
4. **Supabase Preview Branch** — saubere Isolation, laufende Kosten (~0,01 EUR/h).

Empfehlung fuer Grund-Setup: erst Option 4 testen (nicht destruktiv, kostet wenig bei Off-Schaltung nach Test), dann entscheiden.

### Block D — Anschliessend regulaere Roadmap

Erst wenn A + B + C durch sind:
- B4 Founder-Walkthrough
- B6 Task 6.1 Final-Re-Verify
- Housing Part B (Maengel)
- Push-Tag (AVV-blockiert bis Notar 27.04.)

---

## Sicherheits-Guardrails fuer die naechste Session

1. **Niemals `cat .env*`, `head .env*`, `Read .env.local/.cloud.local` mit vollen Zeilen**. Erlaubt: `grep -E "^[A-Z_]+=" .env.local | sed 's/=.*/=…/'` (zeigt nur Variablen-Namen).
2. **Keine Secret-Werte im Chat ausschreiben.** Substring-Checks nur mit `git log -S` / `grep -l` (files_with_matches-Mode).
3. **Nach Rotation:** Founder traegt neue Werte selbst ein. Claude greift `.env.cloud.local` nur mit obigem Name-only-Pattern an.
4. **Pre-Check-Regel:** gilt weiter. Vor jedem neuen Code erst Grep/Glob.

---

## Git-Stand

```
nachbar-io feature/hausverwaltung
854f68e chore(env): harden secret hygiene — local env has no prod secrets
16f9656 docs(plans): handoff — Cleanup DONE + Local Stack scaffolded (Mig-019 blocker)
d96532c chore(dev): scaffold local Supabase stack (default) + dev:cloud escape hatch
e33e119 docs(plans): Welle-C + Browser-Audit + Hausverwaltung handoffs
612586b chore(gitignore): ignore codex logs, playwright CLI cache, local output
4a4d91b docs(legal): add Mistral AI (KI-Assistent) section to privacy policy
8ec9aeb fix(middleware): preserve next param on auth redirect  <- Vorstand vor Session
...

Parent master
6bd3b5a docs(claude-md): add dev/dev:cloud + supabase:* commands
```

Kein Push. Nichts gegen Prod-DB geschrieben. Rote Zone nicht beruehrt.

---

## Offene Fragen fuer den Einstieg

- Soll Claude beim Start der naechsten Session direkt mit Block A Unterstuetzung anfangen (Founder tippt Rotationen ab), oder erst Warten bis Founder meldet "Rotation done"?
- Option 4 (Preview Branch) braucht Founder-Go wegen laufenden Kosten — vor der naechsten Session schonmal entscheiden?
- Der pre-existing K1+K2-Security-Fix (`1e7db82`) hat offensichtlich nicht komplett funktioniert (Resend-Key identisch geblieben). Separater Audit-Task sinnvoll?
