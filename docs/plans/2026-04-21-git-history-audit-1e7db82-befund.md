# Git-History-Audit 1e7db82 — "K1+K2 Security Fix" war unvollstaendig

**Datum:** 2026-04-21
**Scope:** Parent-Repo `master`, Commits `b352bd6` → `1e7db82`
**Methodik:** Nur Metadaten + Pattern-Counts, keine Secret-Werte gelesen oder ausgegeben.

---

## Kurzfassung

Der damalige "Security-Fix" 1e7db82 (2026-03-16, 21:57) hat laut Commit-Message **nur zwei** Keys rotiert:

- **K1:** Stripe Webhook Secret (altes Endpoint geloescht, neuer Endpoint + Secret)
- **K2:** Vercel OIDC Token (File `nachbar-arzt/.env.vercel` geloescht)

Alle anderen Secrets, die in dem vorhergehenden Commit `b352bd6` (2026-03-16, 12:56) via `docs/backup-2026-03-16/memory-backup/*.md` mit-committed wurden, blieben **unrotiert**. Die Files wurden geloescht — aber nur aus dem Working Tree, nicht aus der Git-History. Via `git show b352bd6:<file>` bleiben die Werte abrufbar.

Der 2026-04-20 durchgefuehrte Sub-String-Check belegt fuer mindestens den **Resend-API-Key**, dass er identisch zum heute aktiven Wert ist. Fuer alle anderen in `b352bd6` enthaltenen Keys ist dieses Risiko **sehr wahrscheinlich**: dieselbe Person, derselbe Tag, dieselbe unvollstaendige Response — es gibt keinen Grund anzunehmen, dass der Fix bei anderen Keys gruendlicher war.

## Betroffene Files in `b352bd6`

Pattern-Counts (Zeilen mit `API_KEY|SECRET|TOKEN|PASSWORD|SERVICE_ROLE|_SID|AUTH_TOKEN|WEBHOOK_SECRET|VAPID|STRIPE|RESEND|TWILIO|UPSTASH|REDIS|TURN_CRED`):

| # Zeilen mit Pattern | Datei |
|---:|---|
| 12 | `docs/backup-2026-03-16/memory-backup/project_arzt_portal.md` |
| 8  | `docs/backup-2026-03-16/memory-backup/reference_stripe.md` |
| 3  | `docs/backup-2026-03-16/memory-backup/project_strategie_2026.md` |
| 2  | `docs/backup-2026-03-16/memory-backup/project_pi_kiosk_terminal.md` |
| 2  | `docs/backup-2026-03-16/memory-backup/MEMORY.md` |
| 1  | `docs/backup-2026-03-16/memory-backup/project_test_improvement_plan.md` |

**Summe:** 28 potenzielle Secret-Zeilen in 6 Files. Der tatsaechliche Anteil echter Werte (vs. reiner Prosa-Erwaehnungen) wurde bewusst nicht naeher quantifiziert — dafuer muesste Diff-Inhalt gelesen werden.

## Konsequenz fuer die aktuelle P0-/P1-Rotation

**Scope-Erweiterung der P1-Liste:** Jede in P1 gelistete Variable muss auch unter der Annahme rotiert werden, dass sie in Git-History erreichbar ist. Das war fuer P1 ohnehin vorgesehen; der Audit bestaetigt nur die Dringlichkeit.

**Besonders zu pruefen bei P1-Durchlauf:**

- `RESEND_API_KEY` — bestaetigt exposed, rotieren zwingend (steht bereits als 1.5 in der Checkliste).
- `STRIPE_SECRET_KEY` (Test-Mode) — `reference_stripe.md` mit 8 Pattern-Treffern. Schon in 1.9 der Checkliste.
- `STRIPE_WEBHOOK_SECRET` — 1e7db82 hat das einmal rotiert; der neue (seit 2026-03-16 aktive) Wert kann durch die spaeteren Pushes erneut exposed sein. Sub-String-Check empfehlen bevor abgehakt wird.
- `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `TAVILY_API_KEY`, `TWILIO_AUTH_TOKEN`, `KV_REST_API_TOKEN` / `REDIS_URL` — falls in einem der betroffenen Memory-Files referenziert, automatisch mit-exposed. Durch P1-Rotation ohnehin abgedeckt.
- Alle Arzt-Portal-spezifischen Secrets aus `project_arzt_portal.md` (12 Treffer) — Hauptrisiko-File. Nach Rotation aller P1-Keys sollte der Blast-Radius neutralisiert sein.
- `TURN_USERNAME` + `TURN_CREDENTIAL` — separat exposed in `f0bbf33` (2026-04-06), P2.2 der Checkliste. Nicht in 1e7db82 adressiert.

## Git-History-Bereinigung (Optional, post-Rotation)

Nach erfolgter Rotation ist der Kompromiss-Wert der alten History fundamentaler:

- Die alten Keys sind durch Rotation unbrauchbar — aber Audit-Spuren in Git-History sind fuer Observer weiterhin lesbar, was das Risiko-Signal erhoeht ("dort wurden schonmal Secrets commited") und ein Reputations-Issue darstellen kann, wenn das Repo je oeffentlich wird.
- Werkzeug: `git filter-repo` (modern, empfohlen) oder BFG Repo Cleaner (legacy). Beides **destruktiv** — Hashes aendern sich, alle Clones muessen neu gezogen werden, alle Branches auf Remote muessen force-gepusht werden.
- **Entscheidungskriterium:** Nur noetig wenn das Repo public geht. Solange es privat bleibt und die exposed Keys rotiert sind, ist der Rest-Risiko klein.
- Founder-Go Pflicht (destruktive History-Rewrite).

## Schlussfolgerung fuer Claude

1. Die P1-Rotation abzuwarten und komplett durchzuziehen — der History-Befund aendert den Scope **nicht**, er bestaetigt ihn.
2. Nach abgeschlossener P1+P2: Sub-String-Stichprobe auf die heute aktiven Werte gegen `b352bd6:<file>` (von Codex / Founder, nicht von Claude — Claude sieht die Werte ohnehin nicht). Wenn kein Treffer: Rotation erfolgreich.
3. `git filter-repo`-Entscheidung separat, nach Rotation, mit Founder-Go.

## Methodik-Transparenz

Alle Aussagen in diesem Dokument basieren auf:

- `git log -1 --format=...` von `1e7db82`, `b352bd6`, `f0bbf33`
- `git show --stat --name-status 1e7db82`
- `git show b352bd6:<file> | grep -cE "<pattern>"` (nur Count, kein Inhalt)

**Kein einziger Secret-Wert wurde gelesen, angezeigt, oder auf Disk geschrieben.**
