# Handoff: Browser-Audit + Google Lighthouse

**Stand 2026-04-20**, Branch `feature/hausverwaltung` HEAD `0a9cac7`, lokal, kein Push.

## Ziel der neuen Session

Jede relevante UI-Seite im Browser oeffnen, durchklicken und parallel ein
Google-Lighthouse-Audit fahren (Performance + Accessibility + Best Practices +
SEO). Ergebnisse als strukturierte Fund-Liste (Severity, Seite, Befund, Fix-
Vorschlag) liefern. Fixes noch NICHT durchfuehren — diese Session ist
Erhebung, Fix kommt in Folge-Session.

## Wer macht es — Claude empfohlen

Claude hat direkten Zugriff auf:

- `chrome-devtools-mcp` (inkl. `lighthouse_audit`-Tool, `take_snapshot`,
  `performance_start_trace`, `list_console_messages`)
- `debug-optimize-lcp` + `a11y-debugging` Skills
- `preview_*`-Tools fuer Dev-Server-Steuerung
- Deutsche Codebase-Kontext aus dieser Session direkt im Memory

Codex koennte als Second-Opinion eingezogen werden, falls ein Audit-Befund
strittig ist — aber fuer den eigentlichen Durchlauf ist Claude + Chrome
DevTools MCP der direkteste Pfad.

## Vorbereitung (Einstieg neuer Session)

```
1. mem_context — Session-Recall
2. Read memory/topics/housing.md
3. Read nachbar-io/docs/plans/2026-04-20-handoff-housing-part-h-and-deploy.md
4. Read diese Datei
5. cd nachbar-io && git status  (sauber auf feature/hausverwaltung HEAD 0a9cac7)
6. npm run dev  (Port 3000) — preview_start oder Dev-Server im Hintergrund
7. chrome-devtools MCP verbinden (new_page http://localhost:3000)
```

## Scope — Seiten die gecheckt werden muessen

### Part-H-Neuland (hoechste Aufmerksamkeit)

| Route | Zweck | Test-Input |
|-------|-------|------------|
| `/hausverwaltung/einladen` | Bewohner Triple-Choice | eingeloggter Bewohner mit Haushalt |
| `/einladung/[token]` | Public HV-Landing | beliebiger token (Mock-Info-Response via network) |
| `/einladung/[token]/accept` | Auto-Consume | eingeloggter Zustand |

### Senior-Mode (80px Touch-Targets, 4.5:1 Kontrast, max 4 Taps/Aktion)

| Route | Was pruefen |
|-------|-------------|
| `/(senior)/*` alle Seiten | Touch-Target >= 80px, Kontrast-Ratio, Schriftgroesse, Tap-Counts |

### Kern-Flows

| Route | Zweck |
|-------|-------|
| `/` | Startseite |
| `/login`, `/register`, `/verify` | Auth |
| `/onboarding-anleitung`, `/testanleitung` | Public Landings |
| `/b2b` | B2B-Landing |
| `/support`, `/datenschutz`, `/impressum`, `/agb`, `/barrierefreiheit` | Pflicht-Seiten DSGVO/TMG/BFSG |
| `/kiosk/*` | Pi-Kiosk-UI (falls noch erreichbar) |

### Sekundaer

Dashboard-Haupteinstiege (abh. von Rolle), Hilfe, Alerts, Postfach, Chat, Leistungen-Info, Quartier-Info.

## Audit-Checks pro Seite

**Lighthouse (chrome-devtools-mcp `lighthouse_audit`):**
- Performance Score (Ziel: > 85 auf Mobile, > 90 auf Desktop)
- Accessibility Score (Ziel: 100 — BFSG-Konformitaet; Senior-Mode kritisch)
- Best Practices (Ziel: > 90)
- SEO (fuer public-Seiten: > 90)

**Manuell (take_snapshot + evaluate_script + list_console_messages):**
- Console-Errors / -Warnings
- Network-4xx/5xx auf API-Calls
- Touch-Target-Groesse der wichtigsten Buttons (`element.getBoundingClientRect()`)
- Kontrast (`chrome-devtools-mcp` hat eigene a11y-Audit-Hooks)
- Keyboard-Navigation (Tab-Reihenfolge auf Landing- und Form-Seiten)
- Screen-Reader-Labels (`aria-label`, `htmlFor`, Landmarks)

**Senior-Mode-spezifisch:**
- `a11y-debugging`-Skill anwerfen, explizit mit Fokus auf Tap-Target-Size
  (WCAG 2.5.5 Level AAA = 44px, Nachbar.io-Standard = 80px)

## Erwartete Deliverables

Eine Markdown-Datei `docs/plans/2026-04-20-browser-audit-ergebnis.md` mit:

1. **Zusammenfassung:** Anzahl Seiten, Durchschnittsscores, kritische Befunde.
2. **Fund-Tabelle:** `Severity (crit/high/med/low) | Seite | Befund | Konkreter Fix`.
3. **Lighthouse-Roh-Scores** pro Seite in Tabellenform.
4. **Screenshot-Evidenz** nur wo noetig (mehr als 5-6 Shots pro Seite ist
   Overkill).
5. **Priorisierungs-Vorschlag:** Was vor Welle-C-Push fixen, was vor Part B,
   was geparkt.

## Known-Good State (zum Vergleich)

Vor dieser Session war Part H noch nicht gebaut. Vergleich-Referenz fuer
Regression-Check:

- `git log --oneline 5de2a58..0a9cac7` zeigt alle 53 lokalen Commits auf
  `feature/hausverwaltung`.
- Letzte Prod-Deploy-SHA: `5de2a58` (origin/master, Welle-B-Folgearbeit LIVE).
  Wenn ein Befund auch auf Prod reproduzierbar ist, separat markieren (ist
  dann Bestands-Bug, nicht durch Housing-Arbeiten verursacht).

## Was NICHT tun

- Keine Fixes in dieser Session (ausser trivial <1min typos).
- Kein git push.
- Keine Prod-DB-Writes.
- Kein Mig-181-Policy-Fix (kommt in Folge-Session direkt vor Part B).
- Keine E2E-/Integration-Test-Eskalation (Founder-Direktive: kein
  Test-Ausbau vor Welle-C-Push/Notar/AVV).

## Notfall-/Abbruchbedingung

Wenn Dev-Server nicht startet oder eine kritische Seite 500er wirft,
Session abbrechen und Founder mit klarer Fehlermeldung + reproduzierbarem
Repro-Schritt zurueckmelden. Nicht versuchen, tieferliegenden Bug in derselben
Session zu fixen.

## Aktuelle offene Prod-Baustellen (nur zum Kontext)

1. Welle-C-Push (master `c7c5250`, 52 Commits) — blockiert auf Walkthrough +
   Notar 27.04.2026.
2. GmbH Theobase GmbH (i.Gr.) Eintragung — Notar 27.04.2026.
3. AVV Anthropic + Mistral — erst nach GmbH.
4. Mig 175-180 Prod-Apply — rote Zone, Founder-Go, nach GmbH/AVV.

Audit-Ergebnis informiert ggf. ob vor Welle-C-Push noch Hardening noetig ist.
