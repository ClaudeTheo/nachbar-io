# Handoff — Session-Ende 2026-04-20 + Naechster Wunsch: Hausmeister-/Hausverwaltungs-Modul

**Datum:** 2026-04-20 (abend, Session-Schluss)
**Voriger Haupthandoff:** `docs/plans/2026-04-20-handoff-welle-c-c8-done.md`
**Modell diese Session:** Opus 4.7 (1M) — C8 Architektur + UX + E2E-Skelett

---

## Was in dieser Session fertig wurde

**Welle C C8 Caregiver-Scope komplett + Senior-UX-Upgrade + E2E-Skelett.**
8 Commits lokal (`baa57c3` .. `a46cc15`). HEAD: `a46cc15`. Kein Push
(AVV-blockiert bis Notar 2026-04-27).

Details in `docs/plans/2026-04-20-handoff-welle-c-c8-done.md`.

---

## Naechster Founder-Wunsch

> "Ich moechte ein Hausmeister oder Hausverwaltungstool wie das Arzt oder
> Rathaus oder Pflege Modul hinzufuegen."

### Strategische Einordnung (ehrlich)

Die Portale civic / pflege / admin / companion wurden **laut Strategie-
Review 2026-04-09 EINGEFROREN** (siehe
`memory/project_strategic_review_2026_04_09.md` und MEMORY.md-Eintrag).
Fokus liegt auf **Phase-1** — Familienkreis + Quartier-Infos, bis der
Pilot Umsatz bringt. Ein neues Portal waere ein **Richtungswechsel**
gegenueber dieser Strategie. Das ist nicht automatisch falsch, aber es
muss bewusst entschieden werden.

### Zwei Wege

**Weg A — Eigenes Portal `nachbar-hausmeister/`**
- Wie `nachbar-arzt`: eigene Next.js-App, eigene Subdomain
  (`nachbar-hausmeister.vercel.app`), eigener Port, eigene Landing
- Gemeinsame Supabase (eu-central-1), gemeinsame Auth
- Eigene Rolle `hausmeister` oder `property_manager` in RLS
- Vorteil: volle UI-Freiheit, saubere Trennung der Use Cases
- Nachteil: hoher Bau-Aufwand, neue Billing-Saeule, viel Doppel-Infrastruktur
  (Nav, Auth-Flows, Mails), zweites Deployment-Target, mehr Operations-Last

**Weg B — Feature in `nachbar-io`**
- Wie `app/(app)/hilfe/` oder `app/(app)/praevention/`: neue Route
  `app/(app)/hausverwaltung/` in der bestehenden App
- Nutzt bestehende Auth / Quartier-Kontext / BottomNav / Voice-Assistent
- Senior als Mieter kann Meldungen auf einfachem UI abgeben,
  Hausmeister-Dashboard koennte `app/(app)/hausmeister/` sein
- Vorteil: schnell gebaut, sofort im Pilot testbar, keine neue
  Infrastruktur, Familien sehen Hausmeister-Updates direkt neben
  Quartier-Infos
- Nachteil: Hausmeister ist i.d.R. ein Dienstleister und nicht Teil
  der Familie — Rollen-Modell komplizierter

### Empfehlung fuer die Brainstorming-Session

**Weg B mit klarer Rollen-Trennung** ist wahrscheinlich der richtige
Einstieg. Grund:
- Passt zur Phase-1-Strategie (Familienkreis + Quartier-Infos —
  Hausverwaltungs-Meldungen *sind* Quartier-Infos)
- Null neue Infrastruktur
- Wenn der Pilot zeigt, dass Hausmeister es aktiv nutzen, kann man
  spaeter ein eigenes Portal herausziehen (Portal-Split ist rueckwaerts
  leichter als Portal-Merge)

**Zu klaeren im Brainstorming (nicht jetzt):**
1. Wer ist der zahlende Kunde? Mieter, Hausverwaltung, Eigentuemer?
2. Welche Funktionen zuerst? Meldung, Termin, Dokument, Ankuendigung?
3. Abgrenzung zu `app/(app)/hilfe/` (Nachbar-Hilfe) — wo endet Nachbar-
   Hilfe, wo faengt Hausverwaltung an?
4. Billing: Free-Feature fuer Plus-Kunden oder eigene Pro-Stufe?

---

## Start-Prompt fuer die naechste Session (zum Kopieren)

```
Ich moechte ein Hausmeister- / Hausverwaltungs-Modul hinzufuegen,
aehnlich wie Arzt-, Rathaus- oder Pflege-Portal. Bevor wir bauen
will ich mit Dir brainstormen, weil die bestehenden Portale
civic/pflege/admin eingefroren sind (Strategie 2026-04-09, siehe
MEMORY.md).

Bitte lies zuerst diese drei Dateien in dieser Reihenfolge:
1. nachbar-io/docs/plans/2026-04-20-handoff-session-end-hausmeister-next.md
   (Schluss-Handoff vom 2026-04-20, enthaelt Weg A vs Weg B + Empfehlung)
2. nachbar-io/docs/plans/2026-04-20-handoff-welle-c-c8-done.md
   (Welle-C-Komplett-Stand, falls noch C8-Fragen kommen)
3. memory/project_strategic_review_2026_04_09.md
   (Strategie-Review: Phase-1-Fokus, eingefrorene Portale)

Dann bitte Brainstorming-Skill nutzen (superpowers:brainstorming) und
mit mir folgende Fragen klaeren:
- Zielgruppe: wer ist der Haupt-Nutzer (Mieter, Hausmeister,
  Hausverwaltung, Eigentuemer)?
- Scope: welche 3-5 Funktionen zuerst? (Meldung, Termin, Dokument,
  Ankuendigung, Schluesselverwaltung, ...)
- Portal vs Feature (Weg A vs Weg B im Handoff erklaert — bitte
  Vor-/Nachteile mit mir durchgehen)
- Abgrenzung zu nachbar-io Hilfe-Modul
- Billing: Plus-Feature oder eigene Pro-Stufe?
- Zeitrahmen: kleiner MVP in 1-2 Sessions, oder richtig ausbauen?

KEIN Code in der naechsten Session, erst nachdem wir uns ueber
Scope und Architektur einig sind. Dann schreibst Du einen Design-
Plan mit superpowers:writing-plans.

Arbeitsweise: kein Push, Pre-Check first, Best-Practice-Default.
Modell: Opus 4.7 fuer Brainstorming + Planung.

Kontext-Stand nachbar-io: HEAD a46cc15, 33 Commits seit 5de2a58, kein
Push. AVV blockiert Push bis Notar 2026-04-27. Welle C (C0-C8) ist
funktional komplett.
```

---

## Dinge die offen bleiben (C8-Welt, unabhaengig vom Hausmeister-Wunsch)

- **E2E x20b-e** (Senior-Test-Account, AVV-Block)
- **MEMORY.md-Update** auf HEAD `a46cc15`
- **Name-Aufloesung Provenance** ('Von Tochter Anna' statt 'Von Angehoerigen')
- **Push-Tag 2026-04-27** nach Notar + GmbH-Eintragung — alle 33 Commits

---

## Modell-Empfehlung naechste Session

- **Opus 4.7 (1M)** fuer die Brainstorming-/Planungs-Session. Strategische
  Entscheidungen + Architektur + Cross-System-Abgrenzung brauchen
  Opus-Tiefe.
- **Sonnet 4.7** erst wenn es in die mechanische Umsetzung geht (erste
  Migrations, Standard-CRUD-Routen, UI-Komponenten nach Plan).

---

## Kontext-Stand zum Session-Ende

~82 % (laut Founder-Regel `feedback_kontextlimit_regel.md` klar in der
Stopp-Zone). Weitere Aufgaben in diese Session sind nicht mehr sauber
abschliessbar.
