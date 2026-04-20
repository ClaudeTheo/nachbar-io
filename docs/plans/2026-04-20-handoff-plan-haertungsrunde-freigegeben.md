# Handoff — Haertungs-Plan freigegeben, B1 startet naechste Session

**Datum:** 2026-04-20 (abend, Session-Ende)
**Modell diese Session:** Opus 4.7 (1M)
**Ausgangslage:** HEAD `a46cc15`, 33 Commits. **Jetzt:** HEAD `8662de7`, 34 Commits.

---

## Was diese Session gemacht hat

1. **Hausmeister-Brainstorming** begonnen, Pre-Check ergab: kein bestehender Code.
2. **Codex-Strategie-Bewertung** Hausverwaltungs-Modul: **A-Light empfohlen** (Mini-Senior-Feature "Mein Haus" mit 3 Funktionen), kein Portal. Aber erst nach Notar. Ausfuehrlich in Session-Chat, nicht in Datei.
3. **Codex-Arbeitsanweisung "Haerten"** bewertet: Grundton richtig, aber `nachbar-companion` gehoert raus, konkrete Risiko-Liste fehlte.
4. **Entscheidung:** kein Push jetzt. Erst Haertungs-Runde bis Notar.
5. **Plan geschrieben + commitet:** `docs/plans/2026-04-21-haertungs-runde-vor-push-plan.md` — 6 Bausteine (B1-B6) ueber 6 Tage.

**Founder-Go:** Plan ist freigegeben. Morgen B1 starten.

---

## Plan-Uebersicht kurz

| Tag | Baustein | Aufwand |
|---|---|---|
| Di 21.04. | **B1 Bestandsaufnahme** Tests + tsc | halber Tag |
| Di-Mi | **B2 4 kaputte Tests fixen** | 1-2 Tage |
| Do 23.04. | **B3 tsc Skip-Liste** | halber Tag |
| Fr 24.04. | **B4 Senior-Walkthrough** (mit Founder) | 1 Tag |
| Sa-So | **B5 E2E x20b-e** (optional) | 1-2 Tage |
| Mo 26.04. abend | **B6 Push-Vorbereitung** | halber Tag |
| Di 27.04. | Notar, dann Push (separat, nicht Teil des Plans) | - |

Voller Plan: [docs/plans/2026-04-21-haertungs-runde-vor-push-plan.md](2026-04-21-haertungs-runde-vor-push-plan.md).

---

## Naechste Session — Start-Prompt

```
Morgen starte B1 (Bestandsaufnahme Tests + tsc) aus dem
Haertungs-Plan docs/plans/2026-04-21-haertungs-runde-vor-push-plan.md.

Bitte lies ZUERST den Plan. Dann Task 1.1 (Volle Vitest-Suite) +
Task 1.2 (tsc) + Task 1.3 (E2E Smoke). Keine Fixes in B1, nur Doku.
Ergebnis als Bericht in docs/plans/2026-04-21-baustein-1-bericht.md
committen.

Regel: Pre-Check first, kein Push. HEAD 8662de7. AVV blockt bis
Notar 27.04. Modell: Sonnet 4.7 reicht fuer B1 (reines Test-Laufen
+ Dokumentieren). Opus erst fuer B2 wenn echte Bug-Diagnose dranwird.
```

---

## Offene Founder-Entscheidungen

- **Walkthrough-Termin Freitag 24.04.** (B4): wann genau hat Founder Zeit fuer 1-2 Stunden Live-Durchklicken?
- **Senior-Seed fuer B5** (Rote Zone): lokale Supabase oder Preview-Branch? Erst relevant Sa/So.
- **Hausmeister-Modul A-Light**: Entscheidung verschoben. Erst nach Push, nicht vor.

---

## Kontext-Stand

Dieser Handoff zum Session-Ende: ~85 % (zu spaet fuer die 65-%-Regel,
aber Plan ist sauber commitet, also kein Schaden).

---

## Modell-Empfehlung morgen

- **Sonnet 4.7** fuer B1 (Tests laufen + dokumentieren — mechanisch).
- **Opus 4.7** ab B2 (echte Bug-Diagnose, Multi-File-Reasoning).
