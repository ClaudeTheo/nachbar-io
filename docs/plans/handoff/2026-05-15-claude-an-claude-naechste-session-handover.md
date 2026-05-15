# Claude → Claude (naechste Session): Pass 69 Wake-up

Datum: 2026-05-15 nacht
Autor: Claude (Sonnet 4.6), Session "Security-Audit + Mig 198 + Einwand-Brief"
Adressat: Claude, naechste Session — du bekommst Codex' Antwort auf den Einwand-Brief.

---

## TL;DR — was zu tun ist

1. **`git pull origin master`** in `nachbar-io/` und Parent-Repo
2. **`docs/plans/handoff/INBOX.md`** lesen — Codex hat ggf. neue Eintraege
3. **Suchen:** `docs/plans/handoff/` nach `2026-05-15-codex-an-claude-*` oder `2026-05-16-codex-an-claude-*`. Wenn neuer Brief → das ist die Antwort auf meinen Einwand-Brief `03be2b9`.
4. **Pruefen ob Codex Plan v2 geliefert hat** — gegen 7 Einwaende aus `2026-05-15-claude-an-codex-brainstorm-erst-growth-plan.md` durchgehen.
5. **Wenn Plan v2 alle Einwaende abdeckt** → Implementation freigeben (~30-60 Min Welle).
6. **Wenn Codex Brainstorm-Mode angenommen hat** → mit Founder die 4 Founder-Fragen abklaeren, dann Plan v2.
7. **Wenn nichts da** → Folge-Audit (RLS-Spalten-Sweep `households`/`care_*`/`chat_*`) machen, ~30 Min, hebt LIVE-Score auf ~96%.

---

## Stand bei Pause

### Was heute Nachmittag/Abend passiert ist

- **Security-Audit Pass 63** auf 11-Tage-Drift (Pass 56-63) — 4 Findings: 1 CRITICAL (ADM-3 users_update_own ohne Spalten-Schutz, seit Mig 001 brach), 3 HIGH (YOUTH-1 access_level updatable, ADM-2 Legacy is_admin → super_admin, FS-1+FS-2 Family-Setup ohne Rate-Limit + Audit-Trail).
- **Mig 198** geschrieben, von Codex SECURITY-DEFINER-haertend angepasst, via Supabase MCP appliziert (`MIGRATION-PROD-GO-198`, Schema-Version `20260515151136`). Live-Verifikation: UPDATE als anon → Trigger revertet. Lokale Mig-Nummer 198 via `npx supabase migration repair --linked --status applied 198` synchronisiert.
- **admin-auth.ts** (nachbar-admin) gepatcht: FOUNDER_USER_IDS-Set hardcoded, Legacy is_admin=true ohne role → `quarter_admin` (nicht mehr super_admin). Founder bleibt super_admin via ID-Set. Sync-Pflicht mit `nachbar-io/lib/security/founder-bypass.ts`.
- **Family-Setup**: `lib/family-setup/audit.service.ts` Helper geschrieben (sha256 IP/UA, 11 Event-Types, Best-Effort-Insert), Route `app/api/family-setup/[token]/route.ts` ruft Audit nach Claim + auf Fehlerpfad. `lib/rate-limit.ts` neue Kategorie `family-setup 10/min` (Edge-konsistent NICHT, In-Memory — siehe RL-1).
- **Test-Fixes** wegen Pass-64-Drift: Sparkles/CheckCircle2/HeartHandshake-Mocks ergaenzt in `profile-page-bugfix.test.tsx`, getAllByText statt getByText. `device-token`-Erwartung aus `TerminalReminderArrayGuards.test.tsx` entfernt (Pass-65 `8a3c6a6` hat Token aus Query).
- **Deploy** `25927068726` (HEAD `48fe9aa`) **success**. Vorheriger Deploy `25925795557` (HEAD `6fcafed`) FAILURE wegen orthogonalen Test-Drifts.
- **Mini-Audit-Regel formalisiert**: `.claude/rules/security-mini-audit.md` (100 LOC, Parent-Repo). `CLAUDE.md` Kritische-Regel-Eintrag. Auto-Memory `feedback_security_mini_audit.md` + MEMORY.md-Index.
- **Backlog-Plan** geschrieben: `docs/plans/2026-05-15-security-backlog-nach-pass63-audit.md` mit 9 offenen Findings + Pilot-Trigger pro Item.
- **Codex-Welle eingelaufen**: `2026-05-15-codex-an-claude-quartiergemeinschaft-nutzung-growth-plan.md` (UI-/Copy-Welle, 6 Tasks, "leise Empfehlungen").
- **Mein Einwand-Brief**: `2026-05-15-claude-an-codex-brainstorm-erst-growth-plan.md` (Commit `03be2b9`, gepusht). 7 Einwaende, 4 Brainstorm-Fragen, Workflow-Vorschlag.

### Git-Stand bei Pause

| Repo | Branch | HEAD | Stand |
|---|---|---|---|
| nachbar-io | master | `03be2b9` | gepusht, ahead 0 |
| nachbar-io LIVE Production | — | `48fe9aa` | Deploy `25927068726` success |
| Parent (Handy APP) | master | `033237a9` (oder spaeter mit Doku-Commit) | gepusht, ahead 0 |

### Score-Stand

| | Wert |
|---|---|
| Code | ~96% |
| LIVE | **~94%** (Rate-Limit Edge-Inkonsistenz drueckt 2pp) |

---

## Die 7 Einwaende an Codex (zur Erinnerung)

E-1 4 Founder-Fragen unbeantwortet, beeinflussen Task-Scope
E-2 "Erfolgsmoment" undefiniert pro `ui_mode`
E-3 "Nachbarschaft → Gemeinschaft" Kollateral-Risiken (Voice, Care, Pilot-Brief, i18n)
E-4 Mini-Audit-3-Zeiler fehlt (CLAUDE.md-Regel von heute)
E-5 14 nachbar-io ahead-Commits (mittlerweile gepusht, aber Doku falls naechste ahead-Stand entsteht)
E-6 Task 1 + Task 4 betreffen beide Dashboard, sollten gemerged werden
E-7 Backend-Sprache (`neighbor_invitations`, Events) bricht ggf. mit neuer Copy

## Die 4 Brainstorm-Fragen (zur Erinnerung)

B-1 Erfolgsmoment pro `ui_mode` definieren
B-2 Was passiert beim Erfolgsmoment (Banner / Inline / Bottom-Sheet / stille Eintragung)?
B-3 Frequenz-Cap (wie oft pro Person)?
B-4 Wer formuliert finale Texte (Codex automatisch oder Thomas zuerst)?

## Die 4 Founder-Fragen (mit Claude-Empfehlungen)

| Frage | Claude-Empfehlung |
|---|---|
| Aktiv-Bottom-Nav `Gesundheit` raus? | **Bleibt** (kein Pivot in dieser Welle) |
| Gemeinschaft eigene Hub-Seite? | **Nur Umbenennung** (sichere Mini-Welle) |
| Jugendliche Freunde aktiv einladen? | **Nur ueber Eltern-Freigabe** (Family-Setup-Flow bereits LIVE) |
| Anerkennung mit Punkten/Geld? | **Nur weiche Anerkennung** (Wallet-/Coin-Verbot aus Pilot-Brief) |

Founder hat die 4 Fragen in dieser Session NICHT explizit beantwortet — er bevorzugt Brainstorm.

---

## Wenn die naechste Session direkt durchstarten will (ohne auf Codex zu warten)

### Optional A: RLS-Spalten-Sweep als Folge-Audit

Vorhin als nachster Schritt empfohlen, ~30 Min, hebt LIVE-Score auf ~96%:

```bash
# Pre-Check: Alle UPDATE-Policies auf User-anfassbaren Tabellen
cd nachbar-io
rg -A 4 "CREATE POLICY.*_update_own|CREATE POLICY.*_update.*FOR UPDATE USING" \
  supabase/migrations/*.sql
```

Erwartete Treffer ueber `001_initial_schema.sql:316` und `094_youth_profiles_and_consents.sql:37` hinaus pruefen. Tabellen mit kritischen Spalten (status, consent, balance, role-ish): `households`, `care_helpers`, `caregiver_links`, `chat_groups`, `users` (bereits geschuetzt durch Mig 198), `youth_profiles` (bereits geschuetzt).

Wenn weitere Tabellen ohne Spalten-Schutz: Mig 199 als Erweiterung schreiben.

### Optional B: FS-3 Passwort-Policy fixen (~30 Min)

Vor erstem Pilot-Familien-Konto noetig. Code:

```typescript
// lib/family-setup/password-policy.ts (neu)
export function validatePassword(password: string): { ok: boolean; reason?: string } {
  if (password.length < 10) return { ok: false, reason: "min 10 Zeichen" };
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, reason: "min 1 Klein-, Gross- und Zahl" };
  }
  return { ok: true };
}
```

Integration in `claimChildSetupInvitation` + `claimSeniorSetupInvitation` vor `authAdmin.createUser`. Plus Tests.

### Optional C: Pass-67-Marketing-Welle (Storyboard + Video)

Liegt schon im Repo. Founder hat noch nicht entschieden welche Pipeline (40s-v2 oder 60s-Storyboard). Wartet auf Founder.

---

## Rote Gates wie immer

- Kein Push neuer Wellen ohne Founder-Go (auch nicht UI-Copy).
- Kein Deploy ohne Founder-Go (insbesondere nachbar-admin: Deploy fuer ADM-2 ist Founder-Hand, separates Vercel-Projekt — noch nicht passiert).
- Keine Migration auf Prod ohne `MIGRATION-PROD-GO-<nr>`.
- Keine Vercel-Env-/Secrets-Aenderungen.
- Keine Provider-Live-Schaltungen (AVV wartet auf HR-Eintragung).

Bei Fragen: `memory/project_session_handover.md` Pass-69-Block lesen, dann `topics/security.md` Pass-68-Block. Alle Detail-Links zu Plan-Files sind dort.
