# 2026-04-28 abend — Handover für die nächste Session

> Technischer Handoff Claude→Claude. Strategie/GmbH liegt im Vault
> `firmen-gedaechtnis/`.
>
> Vorgänger: `docs/plans/2026-04-27-evening-handover.md`.

## TL;DR

- **FAQ-Sheet Phase-2 Touchpoint LIVE im Code**, inkl. Codex-Review-Repair
  und Plan/Handover-Docs.
- **34 lokale Commits ahead origin/master**, kein Push, kein Vercel-Deploy.
  Prod weiterhin auf `10a72f0`.
- **Master HEAD:** `0e763d0 docs(plans): add FAQ-Sheet implementation plan
  + Codex review handover`.
- **Tests:** alle berührten Files grün — 41/41 Subset-Pass, `tsc --noEmit`
  clean, `eslint` clean.
- **Codex-Review** lieferte 4 Findings (2× P2 a11y, 2× P3 a11y/Wording),
  alle gefixt im einzigen Repair-Commit `13e0cc3`.

## Aktueller Stand

### Heutige Commit-Range (`f5d00f5..0e763d0`, 6 Commits)

```
0e763d0  docs(plans): add FAQ-Sheet implementation plan + Codex review handover
13e0cc3  fix(ki-help): apply Codex review findings (a11y + wording)
a3e05df  feat(register): wire KiHelpFaqSheet into AiConsent step
1a628b2  feat(ki-help): add KiHelpFaqSheet wrapper with controlled-mode Sheet
175155d  refactor(ki-help): move KiHelpPulseDot to components/ki-help + add asButton mode
f5d00f5  feat(ki-help): add KI_HELP_FAQ static content (7 items)
```

(plus die 28 Commits von vor heute — alle bewusst nicht gepusht.)

### Heute erledigt

| Block | Stand | Wo verifizierbar |
|---|---|---|
| FAQ-Sheet Implementation 6 Tasks (faq-content + KiHelpPulseDot Move/asButton + KiHelpFaqSheet + RegisterStepAiConsent-Anbindung + Verifikation + Memory) | ✅ done — 4 Code-Commits, 21 neue Tests, 34/34 Subset-Pass. Plan: `docs/plans/2026-04-28-ki-help-faq-sheet-plan.md`. |
| Codex-Review-Schleife (Handover schreiben → Founder reicht an Codex weiter → 4 Findings → Repair) | ✅ done — Handover: `docs/plans/2026-04-28-codex-review-faq-sheet-handover.md`. Repair-Commit: `13e0cc3`. |
| Codex-Findings-Repair: P2-1 Dialog accessible name (SheetTitle/SheetDescription), P2-2 PulseDot-Hitbox 44×44 px, P3-3 Accordion aria-controls/role=region, P3-4 Wording „schalten wir die Stufe frei" entschärft | ✅ done — 7 neue Tests, jetzt 41/41 Subset-Pass. |
| Plan + Handover-Doc-Commit | ✅ done — `0e763d0`. |
| Memory-Updates `MEMORY.md` Stand-Header + `topics/ki-begleiter-stufen.md` | ✅ done — Touchpoint-2 von „geparkt" auf „DONE 2026-04-28", HEAD-Pointer aktuell. |

### Offen — geordnet nach Priorität

#### P1 — Phase-2 Touchpoint 1: Pre-Scripted Tour (grün)

Brainstorming + Design + Plan + Implementation noch offen. Touchpoint 2
(FAQ-Sheet) ist DONE; Touchpoint 1 (Pre-Scripted Tour über Onboarding-Steps)
würde bei jedem Step-Wechsel einen vordefinierten Satz vorlesen lassen.
Rein client-seitig, kein LLM. Reihenfolge laut `topics/ki-begleiter-stufen.md`:

1. Pre-Scripted Tour ← als nächstes
2. AiHelpSettingsToggle-Erweiterung auf 4 Stufen (Settings-UI)
3. Funktional-Differenzierung Backend (Provider-Preset pro Stufe)
4. (Nach AVV) Live-Q&A, Persönlich-Stufe aktivierbar

Aufwand grob: ~2–3 h (Brainstorming + Design + Plan + Implementation +
ggf. Codex-Review-Schleife).

#### P2 — Test-User-Cleanup vor Echt-Pilot (rot)

Zwei Test-User in Prod-DB mit `must_delete_before_pilot=true`:

- `6f3e06ce-3df2-44b0-86a6-567e87bb0e2c` (Claude, vormittags)
- `53aaea93-2476-4978-8a2b-e0cf496506a0` (Codex, nachmittags)

Vor Echt-Pilot löschen. Aktuell sind sie Beweis dass Registrierung
funktioniert.

#### P3 — Vercel-Env Trailing-`\n` Repair (rot)

27 Production-Env-Vars haben echtes Trailing-Newline (Paste-Fehler beim
Anlegen). Diagnose seit 2026-04-27 abgeschlossen, Memory-Note vorhanden.
Latenter Bug: `lib/services/registration.service.ts:504`
`process.env.PILOT_AUTO_VERIFY === "true"` liefert false sobald Closed-
Pilot-Mode ausgeht. **Reparatur am besten zusammen mit P4** (Push der
ahead-Commits) — beide rote Zone, beide Vercel-Side. Details: Auto-Memory
`feedback_vercel_env_trailing_newline.md`.

#### P4 — Push der 34 Ahead-Commits (rot)

Wartet auf:
1. **GmbH HR-Eintragung** AG Freiburg (Beurkundung 2026-04-27 ✅, UVZ
   1044/2026, läuft via Notar Stadler nach Volksbank-Einzahlungsnachweis)
2. **AVV** mit Anthropic + Mistral (erst nach HR möglich, weil GmbH
   Vertragspartner sein muss).

Bis dahin bewusst kein Push. Dann eigener Push-Block:
- Branch-Status sauber prüfen
- `git log origin/master..master --oneline` zeigen (heute zuletzt 36
  Commits — incl. 2 docs/plans-Files aus 2026-04-25/27 die schon committed
  waren plus die 34 ahead jetzt)
- Plus P3-Repair vor Push einschließen
- Vercel-Build-Erwartung: hauptsächlich UI + Onboarding-Polish + 1
  API-Hardening-Patch + Doc-Plans, keine SQL-Migrationen.

#### P5 — codex-plugin-cc weiter nutzen (grün)

Plugin ist installiert und produktiv für `/codex:review`. Heute wieder
3 echte Findings gefunden + 1 Wording-Hinweis (alle gefixt). Sinnvoll:
vor jedem geplanten Push einen Pass. `/codex:rescue` bleibt blockiert,
solange Issue #236 nicht gefixt ist.

Optional: erneuter `/codex:review` über das jetzige HEAD inkl. Repair-
Commit, um zu sehen ob die Repair-Änderungen selbst neue Findings
produzieren. Aufwand: ~5 min plus Repair falls neue Findings.

## Wichtige IDs / Pfade

| Was | Wert |
|---|---|
| Repo | `C:\Users\thoma\Claud Code\Handy APP\nachbar-io` |
| Branch | `master`, ahead 34 commits gegen origin (Prod auf `10a72f0`) |
| Letzter Commit | `0e763d0` |
| Lokaler Dev-Server | `npm run dev` Port 3000 (Cloud-Modus default, lokaler Stack hat Mig-019-Drift-Blocker) |
| Test-Haushalt | `1ee933a2-ca0c-4679-a9e8-2078ad1b55c9` (Purkersdorfer Str. / TEST-ONBOARDING-20260427) |
| Invite-Code | `3WEAVPXU` |
| Aktiver Supabase Secret Key | `nachbar_io_vercel_prod_20260427_codex_v2` |
| Supabase Project | `uylszchlyhbpbmslcnka` (eu-central-1) |
| Vercel Project | `thomasth1977s-projects/nachbar-io` |
| FAQ-Sheet Plan | `docs/plans/2026-04-28-ki-help-faq-sheet-plan.md` |
| Codex-Review-Handover | `docs/plans/2026-04-28-codex-review-faq-sheet-handover.md` |
| FAQ-Sheet Design | `docs/plans/2026-04-27-ki-help-faq-sheet-design.md` |

## Was die neue Session NICHT tun soll

- **Kein Push** auf master ohne explizites Founder-Go (34 Commits ahead,
  Prod hängt bewusst auf `10a72f0`).
- **Kein Vercel-Redeploy.** **Kein `vercel env rm/add`.**
- **Keine Prod-DB-Schreibungen** (auch nicht `schema_migrations`-Updates
  oder neue Migrationen) ohne separate Founder-Freigabe.
- **Kein Löschen** der Test-User `6f3e06ce-…` und `53aaea93-…` ohne Go.
- **`supabase/config.toml`** und Codex-Log-Files (`.codex-*.log`) NICHT
  anfassen — pre-existing dirt im working tree.
- **Untracked docs/plans-Altdateien** (11 Files aus 2026-04-21..04-27, vor
  dem 2026-04-28 datiert, aber nicht committed) NICHT eigenmächtig ein-
  oder ausräumen — pre-existing dirt, separate Session falls relevant.
- **`/codex:rescue`** auf Windows nicht versuchen (Issue #236 nicht
  gefixt).

## Was die neue Session direkt machen darf

- **Diesen Handover lesen.**
- **Auto-Memory `MEMORY.md`** prüfen.
- **`git log origin/master..master --oneline`** für eine Übersicht der
  34 ahead-Commits.
- **`/codex:review`** auf `f5d00f5..0e763d0` falls Founder das wünscht —
  würde prüfen ob die Repair-Änderungen neue Findings produzieren.
- **Phase-2 Touchpoint 1 (Pre-Scripted Tour)** starten via
  `superpowers:brainstorming`. Reihenfolge: Brainstorming → Design →
  `superpowers:writing-plans` → TDD-Implementation.

## Erste Frage an die nächste Session

> Welcher Block heute zuerst — Pre-Scripted Tour (P1, grün, ~2–3 h
> mit Brainstorming) oder erneuter `/codex:review` über die heutigen
> 6 Commits inkl. Repair-Commit (P5, grün, ~5–10 min)?
>
> Oder anderes Thema (P2/P3/P4 sind alle blockiert oder warten auf
> Founder-Go).

## Δ-Stempel-Bilanz heute

T0 ≈ 07:30 lokal (FAQ-Sheet Implementation Start). Wallclock zwischen
T0 und Repair-Commit-Done ≈ 2:15 h für 6 Tasks + Codex-Review-Schleife
+ Repair. Effizientes Linear-Execution, Subagents nicht nötig (Tasks
zu klein/klar).

Lehre wiederholt vom 2026-04-27 abend: `/codex:review` lohnt sich
weiterhin. 4 Findings heute, alle wären durch unsere Tests + tsc +
eslint allein NICHT entdeckt worden:
- Dialog ohne accessible name = Screen-Reader-Loch
- 24×24-Hitbox = WCAG-Verletzung im Senior-Mode
- aria-expanded ohne aria-controls = Accordion ohne Programmatic-
  Navigation
- „schalten wir frei" = Auto-Unlock-Suggestion ohne Re-Consent

## Memory-Arbeitsteilung (Kontext)

- Diese Datei = technischer Handoff (Repo `docs/plans/`).
- Auto-Memory `MEMORY.md` = Stand-Header `0e763d0`, Topics, offene Punkte.
- Auto-Memory `topics/ki-begleiter-stufen.md` = Phase-2-Roadmap, Touchpoint-2 DONE.
- Vault `firmen-gedaechtnis/` = GmbH/Strategie/Pilot-Status.
