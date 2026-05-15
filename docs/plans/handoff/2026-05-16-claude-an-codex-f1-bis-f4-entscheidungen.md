# Claude an Codex: Alle 4 Founder-Fragen entschieden + F-1 Umsetzungs-Auftrag

Datum: 2026-05-16 (Pass 71+)
Autor: Claude
Bezug: `docs/plans/2026-05-15-growth-welle-entscheidungen.md` (alle 4 Fragen jetzt entschieden)

---

## TL;DR

Founder hat alle 4 Fragen beantwortet. Drei davon sind "Status Quo / nichts tun". Eine erfordert eine kleine UI-Copy-Welle: **F-1 — Bottom-Nav `Gesundheit` → `Mein Tag` umbenennen**.

---

## Entscheidungen im Ueberblick

| # | Frage | Entscheidung | Code-Aktion noetig? |
|---|---|---|---|
| F-1 | Bottom-Nav `Gesundheit` umbenennen? | **`Mein Tag`** | ✅ Ja (UI-Copy-Welle) |
| F-2 | `Gemeinschaft` eigene Hub-Seite? | A — bleibt Kategorie | ❌ Nein |
| F-3 | Jugend selbst einladen? | A — Status Quo, Eltern-Freigabe bleibt | ❌ Nein |
| F-4 | Punkte-System langfristig? | B — Backend bleibt, UI leise (V1-Stand) | ❌ Nein (V1 ist Endstand fuer Pilot 0) |

Details + Founder-Reasoning in `docs/plans/2026-05-15-growth-welle-entscheidungen.md`.

---

## F-1 Umsetzungs-Auftrag

### Was sich aendert

Bottom-Nav-Label `Gesundheit` → **`Mein Tag`**.

### Begruendung (Founder)

- **Haftungs-arm:** Beschreibt einen Zeitraum, kein medizinisches Versprechen. QuartierApp ist explizit kein Medizinprodukt (RPP-001).
- **Senior-tauglich:** Wort kennt jeder, kein Lernen noetig.
- **Erweiterungsfaehig:** Wenn spaeter Notfallknopf, Pflegekalender, oder Termine dazukommen, passt es immer noch.

### Pre-Check (vor Implementation pflicht — `.claude/rules/pre-check.md`)

Bitte erst `rg`-Sweep auf alle Stellen mit "Gesundheit" als sichtbares UI-Label:

```bash
rg -n "Gesundheit" app components modules lib --type-add 'all:*.{ts,tsx}' --type all
rg -n "'gesundheit'|\"gesundheit\"" app components modules lib
```

Erwartete Treffer (zum Abgleich):
- `lib/navigation.ts` oder `lib/user-modes.ts` Bottom-Nav-Definitions (4 Modi)
- `components/navigation/*` Bottom-Nav-Komponente
- Test-IDs: `data-testid="nav-gesundheit"` — **interne IDs stabil lassen** (gleiche Regel wie V1 mit `nachbarschaft`)
- Eventuell Voice-Prompts in `lib/voice/*`
- Eventuell `lib/care/*` Care-Onboarding (Vorsicht: Care-Modul-Label NICHT aendern, das ist intern korrekt)

Falls unerwartete Stellen auftauchen (Pilot-Brief, KI-Begleiter-Prompts, Mig-Texte): STOP + Founder melden.

### Scope-Grenze

- **Erlaubt:** Display-Label in Bottom-Nav, eventuell Heading auf der Ziel-Seite.
- **Nicht erlaubt:** Aenderung an Care-Modul-internen Bezeichnungen (`care_consents`, `care_*` Tabellen, `field-encryption`), Datenbank, API, Routes-Pfaden, Test-IDs.
- **Nicht erlaubt:** Broad-Replace ueber alle Vorkommen ohne Pre-Check. Senior-/Active-/Comfort-/Youth-Mode haben evtl. unterschiedliche Labels — pro Mode entscheiden.

### Mini-Audit-3-Zeiler (Pflicht im Plan-Block)

```text
Mini-Audit Pass 71+ (2026-05-16):
- Trigger nicht erfuellt: nur UI-Copy, keine Migration, keine API-Logik, keine RLS, keine Token-/Auth-Aenderung.
- Findings: 0 (Label-Welle, keine Surface-Aenderung).
- Audit-Trail: n/a | Rate-Limit: n/a
```

### TDD

- Bestehende Bottom-Nav-Tests anpassen (`getByText("Gesundheit")` → `getByText("Mein Tag")`)
- Keine neuen Tabs/Routes, also keine neuen Tests noetig.

### Sichtprobe

- Lokal `npm run dev` → Bottom-Nav in 4 Modi durchklicken (Active, Senior, Comfort, Youth)
- Sicherstellen dass Senior-Mode den neuen Label gross + lesbar zeigt (mind. 80px Touch-Target, 4.5:1 Kontrast)
- `/menu-structure-preview` Desktop + Senior mobile bestaetigen dass keine Console-Fehler

### Gates (Variante A)

- Push autonom OK
- Deploy autonom OK
- Falls Mini-Audit-Findings: STOP + Founder-Brief
- Falls unerwartete Stellen im Pre-Check: STOP + Founder-Brief

---

## Status F-2, F-3, F-4 (kein Code-Touch)

### F-2 = A (bleibt Kategorie)

`Gemeinschaft` bleibt eine Kategorie unter `DiscoverGrid`. Keine neue Route, kein neuer Bottom-Nav-Knopf. **Reason:** Pilot 0 mit ~5 Familien zu duenn fuer eigene Hub-Seite. Nach Pilot-Aktivitaet evaluieren.

### F-3 = A (Status Quo)

Eltern-Freigabe vor Kind-zu-Kind-Einladung bleibt Pflicht. Mig 197 bleibt LIVE wie deployed. **Reason:** DSGVO Art. 8 Konformitaet (14-15 brauchen Eltern-Einwilligung), Haftungs-arm, Reality-Check Pilot 0 macht Frage akademisch.

### F-4 = B (Punkte-Backend bleibt, UI leise)

V1-Stand ist Endstand fuer Pilot 0. Punkte-/Reward-Tabellen im Backend bleiben (keine Mig-Demolierung). UI bleibt wie V1 ohne sichtbare Punkte-Anzeige. **Reason:** Nach Pilot-Feedback neu entscheiden ob A (ganz raus) oder C (wieder einblenden).

---

## Was du tun sollst

1. Pre-Check mit `rg`-Sweep auf `Gesundheit` durchfuehren
2. Treffer-Inventar zurueck an Claude/Founder falls unerwartete Stellen
3. Implementation Welle F-1 (Label-Change + Tests)
4. Lokale Sichtprobe 4 Modi
5. `npx tsc --noEmit` + `npm run lint` + `npm run test` (Bottom-Nav-Tests)
6. Commit + Push (Variante A autonom)
7. Deploy via `gh workflow run deploy.yml` (Variante A autonom)
8. Health-Check + INBOX-Update + kurzer Status-Brief an Claude

---

## Stop-Regeln

- Pre-Check liefert Treffer in **Pilot-Brief-Druckvorlage** (`docs/plans/2026-05-15-pilot-brief-druckvorlage.md`): STOP — Brief hat Founder-Freigabe-Stand, nicht autonom anfassen
- Pre-Check liefert Treffer in **KI-Begleiter-Prompts** (`lib/voice/*` oder `modules/memory/*`): STOP — Voice-Prompts sind Founder-Hand
- Pre-Check liefert Treffer in **Migrations** (`supabase/migrations/`): STOP — Mig-Texte nicht retroaktiv aendern
- Mini-Audit findet Trigger den ich uebersehen habe: STOP + Brief

Bei klarer Welle (nur Bottom-Nav + 1-2 Heading-Texte): durchziehen wie V1.
