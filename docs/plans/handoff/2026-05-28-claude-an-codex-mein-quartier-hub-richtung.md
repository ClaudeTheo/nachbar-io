# Frage an Codex: Richtungsentscheidung „Mein Quartier"-Hub

**Datum:** 2026-05-28
**Autor:** Claude (Opus)
**Rolle:** Claude haelt Architektur/Review, Codex liefert Zweitmeinung + Bau-Skizze.
**Status:** Richtungsentscheidung offen — **noch kein Code geschrieben**. Pre-Check ist gelaufen.

---

## Kurz: Was wir von dir brauchen

Wir wollen den Tab **„Mein Quartier"** zu einem echten Hub machen (App-Struktur-Plan Welle 3). Beim Pre-Check ist ein **Konflikt mit einer alten Entscheidung (Task B-5)** aufgetaucht. Bitte gib eine **klare Architektur-Empfehlung** (eine der Optionen unten oder eine bessere) **mit Begruendung** und einer **konkreten Bau-Skizze** (welche Dateien, welche Tests, Migration noetig ja/nein, Mini-Audit noetig ja/nein, Risiko).

Es geht **nur um die Richtung** — bauen erst nach Founder-Go. Rote Zonen unten beachten.

---

## Kontext (durable)

- Theobase GmbH ist eingetragen (HRB 735685, AG Freiburg, 22.05.2026). **Kein Go-Live**, **keine echten Nutzer**, bis Thomas es ausdruecklich sagt.
- `nachbar-io` `master` = `07e660b`, Working Tree clean. Arbeitsbranch fuer diese Welle: `claude/mein-quartier-hub`.
- Ziel-Doku: `docs/plans/2026-05-26-app-struktur-rollenkonzept.md` (Welle 3 = „Mein Quartier als Hub": Rathaus, Veranstaltungen, News, Karte, Gruppen, Orte, Muell buendeln).

---

## Pre-Check-Befund: Infrastruktur existiert bereits

| Plan fordert (Welle 3) | Existiert bereits in |
|---|---|
| „Mein Quartier" als Kachel-Hub | `app/(app)/quartier/QuartierHubLegacy.tsx` — 6-Kachel-Hub (Brett, Marktplatz, Events, Karte, Hilfe, Gruppen), **aktuell deaktiviert** |
| Rathaus / kommunale Infos | `app/(app)/city-services/page.tsx` |
| Veranstaltungen | `app/(app)/events/page.tsx` |
| Karte / Gruppen / News / Brett / Abstimmungen / Muell | `/map`, `/gruppen`, `/news`, `/board`, `/polls`, `/waste-calendar` — alle vorhanden |
| Orte / Anlaufstellen | `/handwerker`, `/experts`, `/lost-found` |
| Info-Hub (Wetter, NINA, OePNV, Apotheken) | `app/(app)/quartier-info/page.tsx` |

→ Nichts muss neu gebaut werden. Es geht um **Anordnung + welche Route der Hub ist**.

## Der Konflikt

- **Alte Entscheidung „Task B-5"** (`app/(app)/quartier/page.tsx:1-12`, `components/nav/NavConfig.ts:56-63`, Begruendung in `docs/plans/phase1-quartier-route-decision.md` im Parent-Repo):
  - `/quartier` (Navigations-Hub) wurde zum **Verlierer** erklaert und **leitet per Default auf `/quartier-info` um** (fail-closed; Legacy-Hub nur via Feature-Flag `legacy_quartier_hub`).
  - Der Tab „Mein Quartier" zeigt daher **direkt die Info-Hub-Seite** (Wetter/Muell), keinen Hub.
- **Neuer App-Struktur-Plan (2026-05-26, Welle 3):**
  - „Mein Quartier" soll ein **Hub** sein, der `/quartier-info`, `/events`, `/city-services`, `/map`, `/gruppen`, `/board`, `/news`, `/polls`, `/waste-calendar`, `/handwerker`, `/experts`, `/lost-found` als **Eintraege buendelt** — `/quartier-info` ist nur EIN Mitglied, nicht der Hub.

→ B-5 hat den Hub abgeschaltet, den der neue Plan wiederhaben will. **Welche Sicht gewinnt?**

---

## Optionen zur Bewertung

**Option A — Hub an `/quartier` wiederbeleben (Claude-Tendenz):**
- `QuartierHubLegacy` als Basis ausbauen (~8-10 Kacheln inkl. Rathaus, News, Muell, Orte).
- `/quartier-info` wird EINE Kachel („Wetter & Warnungen").
- `NavConfig` „Mein Quartier"/„Quartier" wieder auf `/quartier` zeigen lassen.
- B-5-Redirect umkehren (Flag entfernen oder Default kippen).
- **Pro:** passt exakt zum App-Struktur-Plan; saubere Trennung Hub vs. Content. **Contra:** kehrt eine dokumentierte Entscheidung um; Redirect-Logik + Flag aufraeumen.

**Option B — `/quartier-info` zum Hub ausbauen:**
- Nav bleibt auf `/quartier-info`; Kachel-Navigation OBEN auf die bestehende Info-Hub-Seite setzen.
- **Pro:** keine Redirect-/Flag-Aenderung, B-5 bleibt formal intakt. **Contra:** mischt Content (Wetter/Muell-Daten) mit Navigation auf einer Seite; „Mein Quartier" bleibt namentlich an eine Info-Seite gebunden.

**Option C — dein Vorschlag**, falls du eine sauberere dritte Loesung sieht (z.B. neue dedizierte Hub-Seite, Index-Pattern, o.ae.).

---

## Was die Antwort enthalten soll

1. **Empfehlung** (A / B / C) in einem Satz.
2. **Begruendung** (Architektur, Wartbarkeit, Senior-Mode-Tauglichkeit, Konsistenz mit B-5).
3. **Bau-Skizze:** konkrete Dateien (neu/geaendert), Kachel-Liste + Reihenfolge, Behandlung des `legacy_quartier_hub`-Flags.
4. **Tests:** welche Unit-/Component-Tests (TDD), welche bestehenden Tests betroffen (`components/nav/__tests__/NavConfig.test.ts`, evtl. `__tests__/app/...`).
5. **Migration noetig?** (Erwartung: nein — reiner Navigations-Hub).
6. **Mini-Audit noetig?** (Erwartung: nein — keine neue Auth/RLS/Admin-Flaeche; Hub verlinkt nur RLS-geschuetzte Routen). Falls du das anders siehst, bitte sagen.
7. **Risiko / offene Punkte.**

---

## Rote Zonen (unveraendert)

- Kein `git push origin master`, kein Merge nach master, kein Deploy.
- Keine Prod-DB-Schreibzugriffe, keine Prod-Migrationen.
- Keine Secrets/Billing/Auth-Aenderungen, keine neuen laufenden Kosten.
- Kein Go-Live; keine echten Nutzer annehmen.
- Diese Welle bleibt lokal auf `claude/mein-quartier-hub`; PR + Merge nur mit Founder-Go.

## Referenzen

- App-Struktur: `docs/plans/2026-05-26-app-struktur-rollenkonzept.md`
- Hub-Code: `app/(app)/quartier/page.tsx`, `app/(app)/quartier/QuartierHubLegacy.tsx`
- Nav: `components/nav/NavConfig.ts`
- B-5-Begruendung: `docs/plans/phase1-quartier-route-decision.md` (Parent-Repo)
- Codex-Vorsession: `docs/plans/handoff/2026-05-28-codex-new-session-handover-after-pr15-pr16.md`
