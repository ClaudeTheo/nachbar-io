# Session-Handoff — Leistungen-Info „Was steht uns zu?"

**Datum:** 2026-04-18 (Session 69, Abend)
**Von:** Claude Opus 4.7 (Brainstorming + Planning abgeschlossen)
**An:** Naechste Session (Claude, executing-plans-Skill)

---

## Kontext in 5 Zeilen

Neues Plus-Feature fuer QuartierApp: Info-Navigator mit 5 DE + 5 CH Pflege-Sozialleistungen. Laenderabhaengig aus `quarters.country`. CH-EL-Karte mit Kantons-Schalter fuer AG/BL/BS/SH/TG/ZH. Admin-Feature-Flag `leistungen_info` (default OFF). Keine Live-APIs — statischer TS-Content, halbjaehrliches Review. Inspiration: zwei PDFs aus Careum-Hochschule (Jana Renker Sozialversicherungen + Karin van Holten Caring Communities).

---

## Was ist erledigt

| Artefakt | Commit | Pfad |
|---|---|---|
| Design-Dokument (13 Kapitel, Architektur + Tabelle aller Entscheidungen) | `878b638` | `docs/plans/2026-04-18-leistungen-info-design.md` |
| Implementation-Plan (18 Tasks, TDD, 6 Bloecke, ~4 Arbeitstage) | `6c9a8c2` | `docs/plans/2026-04-18-leistungen-info-plan.md` |

Keine Code-Aenderungen ausserhalb der zwei Docs. `nachbar-io` HEAD vor Start: `dbf105d`. HEAD jetzt: `6c9a8c2`.

---

## Offene User-Entscheidungen

Alle 8 Brainstorming-Fragen sind durchgestochen und in Design Sektion 2 (Architektur-Entscheidungen) dokumentiert. Keine offenen Designfragen.

---

## Start-Instruktion fuer naechste Session

1. In der neuen Session einfach sagen: **„Fuehre Plan `docs/plans/2026-04-18-leistungen-info-plan.md` aus."**
2. Claude soll `superpowers:executing-plans`-Skill invoken.
3. Beginn mit **Pre-Flight-Check** aus dem Plan (clean git status, `tsc --noEmit`, bestehende Tests gruen).
4. Dann Tasks 1–17 sequentiell. Jede Task hat eigene TDD-Steps + eigenen Commit.

**⚠ Task 18 = Rote Zone:** Prod-Apply der Migration 169 erfordert explizites Founder-Go von Thomas. Davor stoppen und melden.

---

## Potenzielle Stolpersteine fuer naechste Session

1. **Migration-Nummer-Konflikt:** Plan nennt `169`. Vor Start mit `ls supabase/migrations/ | tail -3` pruefen, dass 168 die hoechste ist. Sollte sauber sein (keine parallelen Arbeitsstroeme).

2. **Content-Recherche (Tasks 6–8):** Tasks 6 (DE), 7 (CH-Bund), 8 (CH-EL) brauchen **verifizierte Quellen**, keine erfundenen Zahlen. Bei Unsicherheit: Thomas fragen oder Task mit `// TODO: Quelle fehlt` markieren und in Task 18 sammeln. Bevorzugt: offizielle Behoerden-Seiten (BMG, GKV, BSV, AHV-IV) + Gesetzestexte (gesetze-im-internet.de, fedlex.admin.ch).

3. **Pflegereform 2026 DE:** Beitraege zum 01.01.2026 wurden teilweise angepasst. Plan zeigt Stand-2025-Werte als Platzhalter. **Vor Commit von Task 6 aktuelle Werte verifizieren** (insb. Pflegegeld, Entlastungsbetrag, Verhinderungspflege). Wenn veraltet: korrigieren und `lastReviewed` auf Tagesdatum setzen.

4. **Paywall-URL:** Plan nutzt `/einstellungen/abo?from=leistungen`. Route existiert gemaess Memory-Index, aber ob der `from`-Parameter existiert, ist nicht verifiziert. Falls nicht: vorerst ohne Parameter, spaeter analytisch nachruesten.

5. **Subscription-Plan-Werte:** `hasPlusAccess` (Task 4) erwartet `plan === 'plus'` bzw. `'plus_trial'`. Tatsaechliche Werte in `care_subscriptions.plan` **vor Task 4 verifizieren** via Supabase MCP: `SELECT DISTINCT plan, status FROM care_subscriptions LIMIT 20`. Anpassen wenn abweichend.

6. **Mein-Kreis-Placement (Task 16):** Ziel-Datei ist `app/(app)/care/meine-senioren/page.tsx` (weil `/mein-kreis` dieses Page rendert, siehe `app/(app)/mein-kreis/page.tsx:6`). Den Teaser nicht ganz oben einsetzen — idealerweise nach bestehenden Vertrauenskreis-Bloecken, damit er nicht die Kern-UX verdraengt.

7. **TTS-Laenge:** `buildLeistungenTts` (Task 15) muss `assertMaxLength(400 Woerter)` respektieren (HARTE_LAENGE-Regel, siehe Memory-Index `topics/voice.md`). 10 Leistungen + Disclaimer koennen knapp werden — bei Ueberschreitung auf `shortDescription` allein reduzieren, ohne `longDescription`.

---

## Quick-Referenz fuer Claude der naechsten Session

- Plan-Datei: `docs/plans/2026-04-18-leistungen-info-plan.md` (18 Tasks)
- Design-Dok: `docs/plans/2026-04-18-leistungen-info-design.md` (Entscheidungs-Rationale)
- Quell-PDFs im Download-Ordner (Thomas kann auf Nachfrage teilen)
- Feature-Flag-Pattern: `lib/feature-flags-server.ts` (reuse)
- Paywall-Styling-Referenz: `modules/hilfe/components/PaywallBanner.tsx`
- Migrations-Regeln: `.claude/rules/db-migrations.md` (File-first!)
- Handover-Format-Regel: `feedback_codex_handover_markdown.md` (befolgt)

---

## User-Praeferenzen (aus Memory relevant fuer Execution)

- **Grosse Bloecke, nicht nach jedem Schritt fragen** ([feedback_grosse_bloecke_rote_zone.md](~/.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/feedback_grosse_bloecke_rote_zone.md))
- **90% Autonomie, nur Rote Zone fragen** ([feedback_founder_go_autonomie.md](~/.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/feedback_founder_go_autonomie.md))
- **Nach erfolgreicher Aenderung sofort committen** (CLAUDE.md Arbeitsregeln)
- **Commits englisch, Code-Kommentare deutsch, UI Siezen** (CLAUDE.md)
- **Echte Umlaute in UI-Texten** ([feedback_umlaute.md](~/.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/feedback_umlaute.md)) — aber in Source-Code/Plan-Files ae/oe/ue verwenden (Windows-PS1-Codepage-Issue)
- **Skills proaktiv, auch bei 1% Relevanz** ([feedback_superpowers_skill.md](~/.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/feedback_superpowers_skill.md))

---

## Session-Statistik (vor Handoff)

- 2 grosse PDFs gelesen (~55 Seiten gesamt)
- 1 Design-Dok geschrieben (264 Zeilen)
- 1 Implementation-Plan geschrieben (~1000 Zeilen, 18 Tasks)
- Grund fuer Handoff: Context-Budget — Execution von 18 Tasks waere hart am Limit. Sauberer Schnitt jetzt spart Qualitaetsverlust spaeter.
