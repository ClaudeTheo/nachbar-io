# Session-Übergabe → nächste Session (Stand 2026-05-30)

**Kontext:** Drei Block-A-Pre-Pilot-Findings in einer Session erledigt, verifiziert und live deployed. Übergabe für eine frische Session (Kontext-Hygiene).

## Repos

- **nachbar-io** (eigenes Git-Repo): `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
- **nachbar-admin**: liegt im Parent-Repo `C:\Users\thoma\Claud Code\Handy APP` (GitHub `ClaudeTheo/nachbar-io-project`)
- **Vault** `firmen-gedaechtnis`: `C:\Users\thoma\Documents\New project\firmen-gedaechtnis` — **kein Git**, direkt gepflegt

## Erledigt diese Session (alles verifiziert)

| Finding | Inhalt | Stand |
|---|---|---|
| **H2** (Security-HIGH) | nachbar-admin: alle 48 Admin-API-Routen `super_admin`-only via neuem `requireSuperAdmin()`-Helper (Default-Deny); vitest-Infra neu + 7 Tests | `nachbar-io-project` **origin/master `4b5f0a31`** (PR #11) |
| **W4/M8** (DSGVO) | Art.-9-Klartext (Medikamentenname/SOS-Notiz/Task-Titel) aus `care_audit_log` raus: zentrale `sanitizeAuditMetadata()`-Denylist + 5 Call-Sites bereinigt | nachbar-io **origin/master**, **LIVE** |
| **B1/W6/W7** (DSGVO) | DSE (`app/datenschutz/page.tsx`) ehrlich: „wird vor Aufnahme der Verarbeitung abgeschlossen" statt „es gilt AVV"; Vault-Register/VVT/TOMs an realen Code (Sentry ergänzt, Voice = OpenAI statt IONOS/Azure, VVT-Drittland korrigiert) | nachbar-io **origin/master `a66c462`** + Vault, **LIVE** |

**Prod-Deploy:** Run `26694130529` grün (3m23s, Lint+Vitest-Gate), Live-Health `https://nachbar-io.vercel.app/api/health` → 200 `{"status":"ok"}`.

## Git-Stände (WICHTIG)

- **nachbar-io:** `master = origin/master = a66c462` — sauber, sync. ✅
- **Handy APP (Parent):** lokaler `master` **DIVERGIERT** — `[ahead 11, behind 2]` (11 ungepushte Memory-Dream-Commits, 2 = H2 fehlt lokal).
  - ⚠️ **Vor nachbar-admin-Arbeit (H2 Teil 2): `git pull` (H2/`requireSuperAdmin` reinholen) + Memory-Commits pushen** — sonst Arbeit auf altem `admin-auth.ts`.

## Nächste Aufgaben (priorisiert, Founder wählt)

1. **invite_code-REVOKE**-Folge-Welle (niedriges Restrisiko: Member sieht invite_codes im eigenen Quartier).
2. **H2 Teil 2:** nachbar-admin `residents/*` + `organizations/quarters` echtes Quarter-Scoping (`canAccessQuarter()` + `allowedQuarterIds`-Filter) → `quarter_admin` sieht eigenes Quartier. **Erst Handy-APP-master syncen!**
3. **Profi-Vertical-Lösch-FKs** (51 FKs, fristen-gesteuert, vor Profi-Pilot).
4. **Kleine W6-Reste im Vault:** eigener Sentry-Verarbeitungs-Block im VVT (`01_VVT-...md`) + Datenflussdiagramm (`05_...md`). TOMs + AVV-Register haben Sentry bereits.
5. **Founder-Hand:** §5 AVV-Versand (Register ist jetzt am realen Code, versandbereit); 5–10 Pilot-Familien Bad Säckingen (Haupt-Engpass).

## Pflicht-Regeln

- **Pre-Check** (Grep/Glob) vor Neubau — Code ist autoritativ, nicht Plan-/Audit-Texte. `.claude/rules/pre-check.md`.
- **Security-Mini-Audit** bei Auth-/RLS-/Admin-/sensible-Daten-Wellen. `.claude/rules/security-mini-audit.md`.
- **TDD** (RED zuerst). nachbar-io: vitest. nachbar-admin: vitest neu aufgesetzt (`npm test`).
- **Rote Zone** (Push / Merge / Prod-Apply / Deploy) **nur mit Founder-Go**.
- nachbar-io **Deploy = `workflow_dispatch`** („Deploy to Vercel Production"); Push triggert nur CI (CodeQL + E2E Multi-Agent).

## Pointer

- **Audit:** `~/.claude/projects/.../memory/project_pre_pilot_audit_2026_05_29.md` + `nachbar-io/docs/plans/2026-05-29-{security-tiefenaudit,dsgvo-pilot-readiness-audit}.md`
- **Doku diese Session:** `nachbar-io/docs/plans/2026-05-30-w4-m8-audit-log-art9-minimierung.md`, `…/2026-05-30-h2-nachbar-admin-superadmin-gate.md` (im Parent-Repo `docs/plans/`), `…/2026-05-30-w4-m8-…`, DSE-/AVV-Welle in dieser Datei
- **engram-Topics:** `security/h2-admin-superadmin-gate`, `security/w4-m8-audit-log-art9`, `dsgvo/b1-w6-w7-avv-dse-realcode`
- **Auto-Memory:** `project_session_handover.md` (Top-Block) wird beim Session-Start automatisch geladen
