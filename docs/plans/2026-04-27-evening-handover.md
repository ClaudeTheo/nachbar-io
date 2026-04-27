# 2026-04-27 abend — Handover für die nächste Session

> Technischer Handoff Claude↔Claude. Strategie/GmbH liegt im Vault
> `firmen-gedaechtnis/`.
>
> Vorgänger: `docs/plans/2026-04-27-onboarding-pilot-test-handover.md`
> (Abend-Stand vor diesem Block).

## TL;DR

- **8 P-Blöcke heute Abend abgeschlossen** (P3-Rest, P5-Diagnose,
  KI-Consent-Polish, Browser-Smoke, FAQ-Sheet-Design, codex-plugin-cc
  Setup, Codex-Review-Repair).
- **28 lokale Commits ahead origin/master**, kein Push, kein Vercel-
  Deploy. Prod weiterhin auf `10a72f0`.
- **Master HEAD:** `232ede7 fix(register): harden KI consent level
  validation and copy`.
- **Tests:** alle berührten Files grün (~57 Tests im Polish-Subset),
  `tsc --noEmit` clean, `eslint` clean.
- **codex-plugin-cc** auf Windows produktiv für `/codex:review` — bei
  erstem Test 3 echte Findings gefunden, alle gefixt im Commit `232ede7`.

## Aktueller Stand

### Master Commit-Range seit Session-Start (16 → 28 ahead)

```
46a5ce4  docs(plan): KI-Hilfe FAQ-Sheet (Phase 2 Touchpoint, Design)
232ede7  fix(register): harden KI consent level validation and copy
2318a8e  refactor(register): use QuartierApp brand in onboarding copy (Y scope)
3e05f34  feat(api): validate aiAssistanceLevel against whitelist
a9af0f7  feat(register): persist ai_assistance_level + audit log entry
07979dc  feat(register): polish AiConsent screen with 4-level cards + KiHelpPulseDot
4349146  test(register): RED tests for AiConsent polish + level mapping
5669b39  feat(register): add KiHelpPulseDot decorative pulse component
dc33f14  feat(register): add AiAssistanceLevel type + state field
3142f59  chore(gitignore): exclude .tmp-diag/ scratch dir
5b6a33b  docs(plan): add KI-Consent-Polish implementation plan (TDD, 9 tasks)
cf06df1  docs(plan): KI-Consent-Polish + Stufen-Modell + KI-Hilfe-Begleiter-Visual
```

(plus die 16 Commits von vor heute Abend, alle bewusst nicht gepusht.)

### Heute Abend erledigt

| Block | Stand | Wo verifizierbar |
|---|---|---|
| P3-Rest `schema_migrations` Suffix für Mig 173/174 | ✅ done (über Supabase MCP), `name='173_memory_consents'` und `'174_tighten_memory_consents_rls'` |
| P5-Diagnose Vercel-Env Trailing-`\n` | ✅ done — 27 Vars betroffen, latente Falle PILOT_AUTO_VERIFY in `lib/services/registration.service.ts` dokumentiert. Kein Repair (eigene Session, am besten mit P6 zusammen). Memory-Note `feedback_vercel_env_trailing_newline.md`. |
| KI-Consent-Polish 9 TDD-Tasks (4 Stufen-Cards + KiHelpPulseDot + Backend `ai_assistance_level` + API Whitelist + Brand-Rename) | ✅ done — 8 Code-Commits + 2 Plan/Design-Commits, 43/43 Tests grün. Design `docs/plans/2026-04-27-ai-consent-polish-design.md`, Plan `docs/plans/2026-04-27-ai-consent-polish-plan.md`. |
| Browser-Smoke Desktop + Mobile (über temp `app/(test)/preview-ai-consent/page.tsx` + temp `closed-pilot.ts`-Whitelist-Eintrag) | ✅ done, beide temp-Änderungen revertet. Pulse-Dot, Hero-Card, 4 wahlbare + 1 disabled-Card, Selection-State, Compliance-Footer alle visuell verifiziert. |
| FAQ-Sheet Phase-2-Design (Codex+Founder approved Wording, 7 Items, Bottom-Sheet via existing `components/ui/sheet.tsx`) | ✅ design committed als Stand-für-morgen. Implementation steht noch aus (eigene Session). |
| codex-plugin-cc auf Windows installiert | ✅ done. `/codex:setup` + `/codex:review` laufen. `/codex:rescue` ist auf Windows durch Issue #236 blockiert (stdio-Hang) — Workaround weiter via manuelles Handover-Markdown. |
| Codex-Review-Repair (Findings 1+2+3 aus erstem `/codex:review`) | ✅ done — semantischer Mismatch-Bug (DB-Drift), Compliance-Wording-Überversprechen, Type-Guard gegen Array-Stringification. Commit `232ede7`. |
| Memory-Updates | ✅ done — `topics/pilot-onboarding.md` (Punkt 2 abgehakt), `topics/ki-begleiter-stufen.md` neu, `MEMORY.md` Stand-Header + offene Punkte aktualisiert. |

### Offen — geordnet nach Priorität

#### P1 — Implementation FAQ-Sheet Phase-2-Touchpoint

Design-Doc liegt fertig in `docs/plans/2026-04-27-ki-help-faq-sheet-design.md`,
Pre-Check ist bereits dokumentiert (0 Treffer für `KiHelpFaq`/`KiHelpSheet`).

Reihenfolge bei Implementation:
1. Pre-Check (erneut, zur Sicherheit).
2. `lib/ki-help/faq-content.ts` + Test (7 Items, IDs unique, Snapshot-Test).
3. `components/ki-help/KiHelpPulseDot.tsx` (Move + `asButton`-Erweiterung) + Test.
4. `components/ki-help/KiHelpFaqSheet.tsx` + Test (RED-zuerst).
5. `RegisterStepAiConsent.tsx` Anbindung + Test-Erweiterung.
6. Lokale Verifikation: vitest, tsc, eslint, ggf. Browser-Smoke.

Geschätzter Aufwand: ~1–2 h. Keine rote Zone bis zum Push.

Ein Bite-Sized-Plan analog `2026-04-27-ai-consent-polish-plan.md` würde
als `docs/plans/2026-04-27-ki-help-faq-sheet-plan.md` ausgearbeitet
werden — über `superpowers:writing-plans`-Skill.

#### P2 — Test-User-Cleanup vor Echt-Pilot

Zwei Test-User in Prod-DB mit `must_delete_before_pilot=true`:

- `6f3e06ce-3df2-44b0-86a6-567e87bb0e2c` (Claude, vormittags)
- `53aaea93-2476-4978-8a2b-e0cf496506a0` (Codex, nachmittags)

Vor Echt-Pilot löschen. Heute nicht — sind Beweis dass Registrierung
funktioniert.

#### P3 — Vercel-Env Trailing-`\n` Repair (P5 von vorher)

27 Production-Env-Vars haben echtes Trailing-Newline (Paste-Fehler beim
Anlegen). Diagnose abgeschlossen, Memory-Note vorhanden. Latenter Bug:
`lib/services/registration.service.ts:504` `process.env.PILOT_AUTO_VERIFY === "true"`
liefert false sobald Closed-Pilot-Mode ausgeht. **Reparatur am besten
zusammen mit P4** (Push der ahead-Commits) — beide rote Zone, beide
Vercel-Side. Details: Auto-Memory `feedback_vercel_env_trailing_newline.md`.

#### P4 — Push der 28 Ahead-Commits (P6 von vorher)

Wartet auf:
1. **GmbH HR-Eintragung** AG Freiburg (Beurkundung 2026-04-27 ✅, UVZ
   1044/2026, läuft via Notar Stadler nach Volksbank-Einzahlungsnachweis)
2. **AVV** mit Anthropic + Mistral (erst nach HR möglich, weil GmbH
   Vertragspartner sein muss).

Bis dahin bewusst kein Push. Dann eigener Push-Block:
- Branch-Status sauber prüfen
- `git log origin/master..master --oneline` zeigen
- Plus P3-Repair vor Push einschließen
- Vercel-Build-Erwartung: ~28 Commits, hauptsächlich UI + Onboarding-
  Polish + ein API-Hardening-Patch + Doc-Plans, keine SQL-Migrationen.

#### P5 — codex-plugin-cc weiter nutzen

Plugin ist installiert und produktiv für `/codex:review`. Sinnvoll:
vor jedem geplanten Push einen `/codex:review` Pass laufen lassen,
besonders auf Routes/Services/RLS. `/codex:rescue` bleibt blockiert,
solange Issue #236 nicht gefixt ist; ggf. Issue beobachten.

## Wichtige IDs / Pfade

| Was | Wert |
|---|---|
| Repo | `C:\Users\thoma\Claud Code\Handy APP\nachbar-io` |
| Branch | `master`, ahead 28 commits gegen origin (Prod auf `10a72f0`) |
| Letzter Commit | `232ede7` |
| Lokaler Dev-Server (geplant) | `npm run dev` Port 3000 (bei Konflikt fallback 3001), `.env.development.local` ist Cloud-Modus |
| Test-Haushalt | `1ee933a2-ca0c-4679-a9e8-2078ad1b55c9` (Purkersdorfer Str. / TEST-ONBOARDING-20260427) |
| Invite-Code (DB-Form) | `3WEAVPXU` (Eingabe `3WEA-VPXU` wird normalisiert) |
| Aktiver Supabase Secret Key | `nachbar_io_vercel_prod_20260427_codex_v2` |
| Supabase Project | `uylszchlyhbpbmslcnka` (eu-central-1) |
| Vercel Project | `thomasth1977s-projects/nachbar-io` |
| FAQ-Sheet Design-Doc | `docs/plans/2026-04-27-ki-help-faq-sheet-design.md` |
| AiConsent-Polish Plan | `docs/plans/2026-04-27-ai-consent-polish-plan.md` |
| AiConsent-Polish Design | `docs/plans/2026-04-27-ai-consent-polish-design.md` |

## Was die neue Session NICHT tun soll

- **Kein Push** auf master ohne explizites Founder-Go (28 Commits ahead,
  Prod hängt bewusst auf `10a72f0`).
- **Kein Vercel-Redeploy.** **Kein `vercel env rm/add`.**
- **Keine Prod-DB-Schreibungen** (auch nicht `schema_migrations`-Updates
  oder neue Migrationen) ohne separate Founder-Freigabe.
- **Kein Löschen** der Test-User `6f3e06ce-…` und `53aaea93-…` ohne Go.
- **`supabase/config.toml`** und Codex-Log-Files (`.codex-*.log`) NICHT
  anfassen — pre-existing dirt im working tree.
- **`/codex:rescue`** auf Windows nicht versuchen (Issue #236 nicht
  gefixt). Wenn Codex-Delegation nötig: weiter via Handover-Markdown.

## Was die neue Session direkt machen darf

- **Diesen Handover lesen.**
- **Auto-Memory `MEMORY.md`** prüfen (besonders aktive Workstreams +
  offene Punkte).
- **`git log origin/master..master --oneline`** für eine Übersicht der
  28 ahead-Commits.
- **`/codex:review`** auf den heutigen Commit-Range laufen lassen, falls
  Founder das wünscht — hat heute Abend bereits 3 Findings produziert.
- **FAQ-Sheet Implementation** starten via
  `superpowers:writing-plans`-Skill auf Basis des fertigen Design-Docs
  (FAQ-Sheet ist non-rote-Zone bis zum Push).

## Erste Frage an die nächste Session

> Welcher Block heute zuerst — FAQ-Sheet Implementation (~1–2 h Code,
> grüne Zone) oder ein vorgelagerter `/codex:review` über die heutigen
> 8 Polish-Commits, um vor Plan-Erstellung weitere Findings einzufangen?
>
> Oder anderes Thema (P2/P3/P4 sind alle blockiert oder warten).

## Memory-Arbeitsteilung (Kontext)

- Diese Datei = technischer Handoff (Repo `docs/plans/`).
- Auto-Memory `MEMORY.md` = Stand-Header, Topics, offene Punkte.
- Auto-Memory `topics/pilot-onboarding.md` = aktiver Workstream.
- Auto-Memory `topics/ki-begleiter-stufen.md` = Phase-2-Roadmap.
- Vault `firmen-gedaechtnis/` = GmbH/Strategie/Pilot-Status (außerhalb
  Repo).

## Δ-Stempel-Bilanz heute Abend

T0 = P3-Rest-Start (~17:30 lokal). Wallclock ≈ 95 min für 8 Blöcke.
Effiziente Subagent-Driven-Implementation in Tasks 1, 2, 3+4, 5, 6, 7
des AiConsent-Polish-Plans. Plugin-Setup-Test 5 Min, Codex-Repair
Subagent ~3 Min.

Lehre: Plugin-Test hat sich sofort gelohnt — `/codex:review` fand
einen semantischen Bug (Mismatch DB-Drift), eine Compliance-Falle
(AVV-Vorabversprechen), und einen Type-Guard-Bypass. Alle drei wären
durch unsere Tests + tsc + eslint allein NICHT entdeckt worden.
