# Handover: Welle S1 — E2E-Senior-Journey auf die kanonische Shell umstellen

> **Status:** OFFEN (Teil E der Welle S1). Driver: Claude (Plan/Architektur). Worker: Codex / Live-Server-Session (Umsetzung + Verifikation).
> **Warum nicht in dieser Session erledigt:** Diese Specs lassen sich nur gegen einen Live-Server mit Senior-Auth sinnvoll verifizieren (kein lokaler Stack + Seed in dieser Session). Ein blind umgeschriebenes E2E gibt falsche grün/rot-Signale → bewusst als verifizierungspflichtiger Handoff ausgelagert. E2E blockiert den Deploy NICHT (Gate = Lint+Vitest), läuft aber bei Push auf master (`e2e-tests.yml`) — daher **vor dem nächsten Push** erledigen.

## Was sich in Welle S1 geändert hat (Commits `f852def`, `72270e6`, `0043f47`, `d5439d5`)

Der Legacy-Pfad `app/senior/*` ist **stillgelegt** und redirectet jetzt in die kanonische `(senior)`-Shell:

| Alt (redirectet jetzt) | Ziel |
|---|---|
| `/senior`, `/senior/home` | `/kreis-start` |
| `/senior/checkin` | `/checkin` |
| `/senior/help` | `/kreis-start` |
| `/senior/news` | `/hier-bei-mir` |
| `/senior/medications` | `/medications` (war schon Redirect) |

Die alte `SeniorHomeActions`-UI (4 Buttons „Hilfe anfragen / Nachrichten / Alles in Ordnung / Nachbarn kontaktieren" + „Zum normalen Modus") existiert **nur noch im Dev-Preview** (`app/senior/preview`), nicht mehr auf einer echten Route.

## Kanonische Senior-Journey (Selektoren aus dem Code)

**Post-Login-Ziel für `ui_mode=senior`:** `/kreis-start` (nicht mehr `/senior/home`) — bereits in `agent-factory.ts` umgestellt (Teil E, erledigt).

**`/kreis-start`** (`app/(senior)/kreis-start/page.tsx`) — 4 Kacheln, `data-testid="kreis-start-tile"`:

| Label | href |
|---|---|
| „Mein Kreis" | `/mein-kreis` |
| „Hier bei mir" | `/hier-bei-mir` (jetzt Senior-Route, große Info-Hub-Variante) |
| „Schreiben" | `/schreiben` |
| „Notfall 112" | `/sos` |

Sekundär: `data-testid="kreis-start-termine-link"` (`/mein-kreis/termine`), `data-testid="kreis-start-profil-link"` (`/profil`).

**Wichtige strukturelle Unterschiede zur alten `/senior/home`:**
- **Kein „Check-in" auf `/kreis-start`** (Befund A3): Der Check-in liegt unter `/checkin`, ist aber NICHT als kreis-start-Kachel verlinkt. Tests, die „Check-in von der Startseite" prüfen, müssen `/checkin` direkt ansteuern.
- **Kein „Zum normalen Modus"-Button** mehr in der Senior-Shell (war ein `SeniorHomeActions`-Feature). Tests dafür (z.B. S5.6) entfallen oder werden umgedacht.
- **Keine „Hilfe anfragen / Nachrichten"-Buttons.** Nachbarschaftshilfe läuft über `/sos`; Infos/News über `/hier-bei-mir`.

**`/sos/status`** (Welle-S1-Änderungen):
- Kein Auto-Redirect mehr (B3:2) — stattdessen Button „Zurück zur Startseite" (Link → `/kreis-start`).
- Neuer Entwarnungs-Button „Mir geht es wieder gut" (A3:4), solange der Alarm offen ist → `PATCH /api/care/sos/[id] {status:"cancelled"}`.

## Zu ändernde Dateien

### Erledigt (Teil E, diese Session)
- `tests/e2e/helpers/agent-factory.ts` — Login-Ziel `/senior/home` → `/kreis-start`, `waitForURL("**/senior/**")` → `"**/kreis-start**"`. ✅

### Page-Object: `tests/e2e/pages/senior.page.ts`
Komplett auf die kanonische Shell umschreiben. `SeniorHomePage` bildet heute die alte `SeniorHomeActions`-UI ab (`helpButton`/`newsButton`/`checkinButton`/`contactButton`/`switchModeButton`, `goto()` → `/senior/home`, `clickHelp/clickCheckin/clickNews` mit `waitForURL("**/senior/...")`). Neu:
- `goto()` → `/kreis-start`; `assertLoaded()` → URL `/kreis-start` + `data-testid="kreis-start-tile"` sichtbar.
- Kachel-Helfer über die 4 Labels/`kreis-start-tile` (Mein Kreis / Hier bei mir / Schreiben / Notfall 112) statt der alten Buttons.
- `SeniorCheckinPage.goto()` → `/checkin` (nicht `/senior/checkin`). Die Selektoren der `/checkin`-Seite gegenprüfen (3 Buttons „Mir geht es gut / Nicht so gut / Brauche Hilfe").
- `SeniorHelpPage` (→ `/senior/help`) entfernen oder auf `/sos` umstellen.

### Specs
- `tests/e2e/scenarios/s5-senior-terminal.spec.ts` — **größter Umbau.** S5.1 (4 alte Buttons), S5.2 (Navigation home→news→checkin→help), S5.6 („Zum normalen Modus") basieren auf der alten UI. Neu gegen die 4 kreis-start-Kacheln + `/checkin` direkt + `/hier-bei-mir`. S5.6 entfällt (kein Modus-Wechsel-Button mehr) — ggf. durch einen `/sos/status`-Test ersetzen (Entwarnungs-Button A3:4).
- `tests/e2e/scenarios/s5-senior-care-auth-spot-check.spec.ts` — `/senior`, `/senior/home`-Erwartungen auf `/kreis-start` (Redirect-Ziel) umstellen; Test-Titel anpassen.
- `tests/e2e/scenarios/s13-five-user-interaction.spec.ts` — nutzt `SeniorHomePage`; nach Page-Object-Umbau prüfen.
- `tests/e2e/multi-agent/phase-a-solo.spec.ts` (`/senior/home`, `/senior/checkin`), `phase-b-cross-role.spec.ts` (`/senior/home`, `/senior/checkin`), `phase-c-edge-cases.spec.ts` (`/senior/home` als `target`) — gotos auf `/kreis-start` bzw. `/checkin`; alle nachfolgenden URL-/UI-Assertions auf die kanonische Shell.
- `tests/e2e/cross-portal/x04-kiosk-sos-112.spec.ts` — „Kiosk-Ansicht `/senior/home`" → `/kreis-start`; SOS-Flow gegen `/sos` + `/sos/status` (inkl. der neuen Buttons) prüfen.
- `tests/e2e/pilot-smoke.spec.ts:114` (`pilot-criterion-06-hier-bei-mir-widget`, `page.goto("/hier-bei-mir")`) — `/hier-bei-mir` ist jetzt eine **Senior-Route** (auth-gated, anderes Layout). Entweder mit Senior-Auth + Senior-Selektoren testen, oder das Pilot-Kriterium auf `/quartier-info` (Standard-Welt) umhängen. **Entscheiden, was das Kriterium prüfen soll.**

## Verifikation (Pflicht, Worker)
1. `npx playwright test tests/e2e/scenarios/s5-senior-terminal.spec.ts` (+ die übrigen) gegen einen Live-Server mit Senior-Auth (lokaler Stack mit Seed ODER `dev:cloud` + Demo-Suite `demo-senior@test.nachbar.local`).
2. `e2e-tests.yml` (Smoke S7 + Multi-Agent) grün, bevor gepusht wird.
3. Gegencheck: `grep -rn "/senior/home\|/senior/checkin\|/senior/help\|/senior/news" tests/` ergibt 0 Treffer (außer bewusste Redirect-Ziel-Tests).
