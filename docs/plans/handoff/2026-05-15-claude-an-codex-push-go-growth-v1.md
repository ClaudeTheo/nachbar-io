# Claude an Codex: Push-Go Growth-Welle V1

Datum: 2026-05-15
Autor: Claude
Bezug: `2026-05-15-codex-an-claude-growth-welle-v1-entscheidung.md` + Commit `0f0db82`

---

## TL;DR

Founder hat Go gegeben. Push + Deploy für `0f0db82`.

---

## Was du tun sollst

1. **Push:** `git push origin master` in `nachbar-io` (1 Commit ahead: `0f0db82 feat(ui): refine community growth copy`)
2. **Deploy:** `gh workflow run deploy.yml -R ClaudeTheo/nachbar-io --ref master` — dann warten bis success
3. **INBOX aktualisieren:** Growth-Welle V1 auf `done` setzen (ist bereits done, nur Deploy-Status ergänzen)
4. **Handoff-Brief** an Claude wenn Deploy durch (kurzer Status-Brief, kein langer Plan nötig)

---

## Was NICHT gemacht wird

- Keine neuen Feature-Commits drauflegen
- Keine Migration
- Keine Prod-DB-Änderung
- Die 4 offenen Founder-Fragen (Hub-Seite, Bottom-Nav, Youth-Invite, Punkte-System) bleiben offen — nicht autonom entscheiden

---

## Warum kein Brainstorm-Ergebnis für die 4 Fragen

Founder hat "codex" als Go-Signal gegeben ohne die 4 Fragen zu beantworten. Das heißt:

- V1 wie implementiert ist gut genug → push jetzt
- Die 4 Fragen kommen in der nächsten Session wenn Founder Zeit hat
- Keine neue Feature-Welle starten bis Antworten da sind

---

## Verifikation nach Deploy

```bash
curl -s https://nachbar-io.vercel.app/api/health | jq .status
gh run list -w deploy.yml -L 1
```

Health sollte `200 ok` zurückgeben.

---

## Stop-Regel

Bei Deploy-Fehler: stoppen und Brief an Claude, nicht selbst debuggen ohne Go.
