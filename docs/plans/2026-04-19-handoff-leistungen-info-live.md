# Session-Handoff — Leistungen-Info ist LIVE

**Datum:** 2026-04-19 (Session 69 Abschluss, spaete Nacht)
**Von:** Claude Opus 4.7 (Execution + Deploy + Flag + Verifikation durch)
**An:** Naechste Session (morgen)

---

## TL;DR

Plus-Feature **Leistungen-Info** ist komplett live. Thomas hat
`/was-steht-uns-zu` im Browser verifiziert. Flag `leistungen_info` = TRUE
auf Prod. 2 Vercel-Deploys (`dpl_BskiEnarsxz4yo1QNnA9yqJZfuUq`,
`dpl_7mam3kgGewjAjCWgmYFrcoctaJSG`) aliased auf `nachbar-io.vercel.app`.
Letzter Commit: `74d4d60` (CH-EL exakte Betraege fuer BL/BS/SH).
74 Tests gruen, 42/42 Content-URLs 200/301/302.

Nichts blockiert. Feature sichtbar fuer Plus- und Pro-User.

---

## Was seit dem vorherigen Handoff dazu kam

Vorher: `docs/plans/2026-04-18-handoff-leistungen-info-deployed.md` endete
bei „Flag manuell aktivieren". Seitdem:

| Schritt | Commit / Ressource |
|---|---|
| URL-Reachability: 15 defekte Links repariert (5 DE-BMG + 10 CH-Sozialaemter inkl. SO DNS-tot) | `cad504c` |
| Handoff-Doc updated | `f8bdeef` |
| CH-EL exakte Betraege BL (5/10 k CHF), BS (9.6 k Hilfe+Pflege, 1 k KK-Vorschuss, KBV), SH (SHR 831.301) | `74d4d60` |
| Vercel-Deploy 1 (mit URL-Fix) | `dpl_BskiEnarsxz4yo1QNnA9yqJZfuUq` |
| Vercel-Deploy 2 (mit CH-EL-Exact) | `dpl_7mam3kgGewjAjCWgmYFrcoctaJSG` |
| Flag `leistungen_info` auf Prod | SQL `update feature_flags set enabled=true` |
| Browser-Test Thomas | „ich habs" (Session 2026-04-18 ~22:30 UTC) |

---

## Aktueller Prod-Status

- Flag: `enabled=true` (Supabase-Tabelle `public.feature_flags`)
- Migration: `20260418201612 / 169_feature_flag_leistungen_info` in `schema_migrations`
- Alias: `nachbar-io.vercel.app` → `dpl_7mam3kgGewjAjCWgmYFrcoctaJSG`
- Thomas (`thomasth@gmx.de`, User-ID `dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd`):
  `plan=pro`, `status=active`, Quartier Bad Saeckingen (DE / Baden-Wuerttemberg)
  → sieht die Seite via `hasPlusAccess` (Pro inkludiert Plus)

---

## Offene optionale Schritte

Keine Blocker. Nur Nice-to-Haves:

1. **Paywall-Flow testen** — Thomas temporaer auf `plan='free'` setzen,
   `/mein-kreis` oder `/care/meine-senioren` aufrufen → Teaser sollte zu
   `/care/subscription?from=leistungen` fuehren. Rollback: `plan='pro'` zurueck.

2. **CH-Content testen** — Thomas temporaer in ein CH-Quartier haengen
   (oder neuen Test-User mit CH-Quartier anlegen) → 5 CH-Karten inkl.
   Kantons-Dropdown (AG/BL/BS/SH/TG/ZH) + EL-KuBK mit Kantonsvarianten.

3. **Senior-Mode-Teaser testen** — `users.ui_mode = 'senior'` setzen, dann
   `/kreis-start` aufrufen → 4 Kacheln, Klick auf „Mein Kreis" → Teaser
   sichtbar nach Senior-Karten.

4. **Analytics fuer Conversion** — `from=leistungen` Param in der
   `/care/subscription`-Route instrumentieren (vermutlich schon moeglich
   via `useSearchParams`, siehe `app/(app)/care/subscription/page.tsx:15`).

5. **Phase 2 aus Design-Dok** (`2026-04-18-leistungen-info-design.md`
   Sektion 11): Selbst-Check-Wizard, persoenliches Pflege-Profil, 26 CH-Kantone
   komplett, DB-editierbarer Content, Live-APIs der Krankenkassen.

---

## Rollback bei Bug

1. Flag OFF:
   ```sql
   update public.feature_flags set enabled = false where key = 'leistungen_info';
   ```
   → Seite + Teaser sofort unsichtbar, kein User-Impact. 1 Sekunde.
2. Code-Revert: `git revert dbf105d..74d4d60` (19 Commits).
3. Migration-Rueckbau: `supabase/migrations/169_*.down.sql` +
   `delete from supabase_migrations.schema_migrations where version = '20260418201612'`.

---

## Start-Instruktion fuer morgen

Wenn du weitermachen willst mit Leistungen-Info:

```
„Lies docs/plans/2026-04-19-handoff-leistungen-info-live.md.
Dann [Option X] testen/implementieren."
```

Wenn komplett anderes Thema: `project_nachbar_io.md` im Memory-Index →
naechste Priorität waehlen. Der Chat-MVP + TTS-Smoke-Test aus dem
alten Thread sind weiterhin offen (siehe
`2026-04-18-handoff-tts-layer1-cache.md`).

---

## Wichtige Dateien (fuers schnelle Wiederfinden)

- Route: `app/(app)/was-steht-uns-zu/page.tsx`
- Server-Helper: `lib/leistungen/server-data.ts`
- Content: `lib/leistungen/content-de.ts`, `content-ch-bund.ts`, `content-ch-el.ts`
- UI: `components/leistungen/{LeistungsKarte,KantonsSchalter,Haftungsausschluss,PlusTeaserKarte,LeistungenClient}.tsx`
- Mein-Kreis-Einbau: `app/(app)/care/meine-senioren/page.tsx:15` +
  `lib/leistungen/use-teaser-state.ts`
- Tests: `lib/leistungen/__tests__/*` (13 Dateien, 74 Tests) +
  `components/leistungen/__tests__/*` (4 Dateien)
- Migration: `supabase/migrations/169_feature_flag_leistungen_info{,.down}.sql`
- Routes-Konstanten: `lib/leistungen/routes.ts`
- Freshness-Assertion: `lib/leistungen/__tests__/freshness.test.ts`
  (Test failt bei `lastReviewed > 210 Tage` → naechstes Review-Deadline
  etwa 2026-11-15).

---

## Stats

- Gesamt-Commits Session 69 Abend: **20** (`dbf105d..74d4d60`)
- Tests: **74 gruen**, 0 Fehler
- Tool-Calls (Claude): viele
- Zeitbudget real: ~5 h (Plan schaetzte ~4 Arbeitstage)
- Preexistente TS-Fehler: 8 (unveraendert, nicht unsere Files)
- Prod-Mutationen: 1 Migration + 1 Flag-Toggle — beide reversibel
