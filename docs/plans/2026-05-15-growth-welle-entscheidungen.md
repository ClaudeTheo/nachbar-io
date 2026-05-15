# Growth-Welle V1 Entscheidungen

Datum: 2026-05-15
Owner: Codex
Status: Founder-Richtung bestaetigt, lokale Umsetzung erlaubt

## Produktentscheidung

Die wichtigste Produktlinie ist die **Quartiergemeinschaft aller Generationen**. Die App soll sich zuerst nach Vertrauen, lokaler Nuetzlichkeit und Miteinander anfuehlen, nicht nach einer Empfehlungs- oder Bonus-App.

`Nachbar hinzufuegen`, persoenliche Einladungen und Weiterempfehlung bleiben wichtig, werden aber als leise Nebenfunktion behandelt:

- persoenlich statt werblich
- nach einem echten Nutzenmoment statt als Startscreen-Druck
- ohne neue Rewards, Coins, Punkte-Mechanik oder Pop-ups in V1
- keine neue Datenpersistenz, keine Migration, keine API-Logik

## V1-Umfang

V1 ist eine sichere lokale Copy-/Sortierungswelle.

Erlaubt:

- bestehende UI-Texte schaerfen
- bestehende Kategorie-Anzeigen vorsichtig umbenennen
- bestehende Einladungsseite weniger reward-lastig formulieren
- lokale Preview synchronisieren
- Tests aktualisieren
- lokal committen

Nicht erlaubt ohne neues Founder-Go:

- Prod-DB schreiben
- Migration anwenden oder neu bauen
- Deploy
- Push
- neue Referral-/Reward-/Gamification-Mechanik
- neue Erfolgsmoment-Trigger
- neue Tabellen, Events, Settings-Keys oder Feature-Flags
- breite Umbenennung aller `Nachbarschaft`-Vorkommen

## Claude-Einwaende entschieden

| Punkt | Entscheidung fuer V1 |
|---|---|
| Aktiv Bottom-Nav `Gesundheit` vs. `Quartier` | Nicht anfassen in V1. **F-1 entschieden Pass 71+ (2026-05-16): `Gesundheit` → `Mein Tag` umbenennen.** Grund: Haftungs-arm (kein medizinisches Versprechen, beschreibt Zeitraum nicht Wirkung), Senior-tauglich, erweiterungsfaehig. Umsetzung lokal durch Codex: `components/nav/NavConfig.ts`, Care-Hub-Heading, Preview und Tests; keine Route-/DB-/API-Aenderung. |
| Eigene `Gemeinschaft`-Hub-Seite | Nicht in V1. Erst Copy/Sortierung fuehlen lassen. **F-2 entschieden Pass 71+ (2026-05-16): Variante A — bleibt Kategorie unter DiscoverGrid. Grund: Pilot 0 mit ~5 Familien zu duenn fuer eigene Hub-Seite. Nach Pilot-Aktivitaet evaluieren ob B/C nachgezogen wird. Kein Lock-in.** |
| Jugendliche Freunde aktiv einladen | Keine neue Jugend-Einladefunktion in V1. Bestehende Schutzlogik bleibt. **F-3 entschieden Pass 71+ (2026-05-16): Variante A — Status Quo, Eltern-Freigabe vor Kind-zu-Kind-Einladung bleibt (Mig 197 wie LIVE). Grund: Maximaler Jugendschutz, DSGVO-Art-8-konform, Haftungs-arm. Reality-Check fuer Pilot 0 (5-10 Familien) macht Frage akademisch — kann in Phase 2 neu bewertet werden.** |
| Anerkennung fuer Empfehlungen | Keine neue Anerkennungs-/Punkte-Mechanik. Frontend-Copy darf Punkte leiser machen, Backend bleibt unberuehrt. |
| Erfolgsmoment-Trigger | Nur konzeptionell dokumentieren, nicht implementieren. |
| `Nachbarschaft` -> `Gemeinschaft` | Kein Broad Replace. Nur sichtbare Kernstellen mit geringem Risiko. |
| Ahead-Commits pushen | Kein Push ohne aktuelles Founder-Go. |

## Erfolgsmomente spaeter, nicht V1

Diese Tabelle ist nur Produktorientierung fuer eine spaetere Welle.

| Modus | Moeglicher Erfolgsmoment | V1-Status |
|---|---|---|
| Jugend | Gruppe/Tausch/Hilfe sicher genutzt, mit Schutzlogik | Keine neue Einladung. |
| Aktiv | Hilfe gefunden, Beitrag im Quartier gesehen, Nachbar sinnvoll kontaktiert | Kein Trigger. |
| Komfort | Lokale Info oder vertrauter Kontakt wiederholt nuetzlich | Kein Trigger. |
| Einfach | Vertraute Person ist erreichbar oder Nachricht klappt | Kein Pop-up. |

## Mini-Audit Pass 69

Mini-Audit Pass 69 (2026-05-15):

- Trigger nicht erfuellt: nur UI-Copy/Sortierung, keine Migration, keine API-Logik, keine RLS, keine Token-/Auth-Aenderung.
- Findings: 0 fuer V1-Scope.
- Audit-Trail: n/a | Rate-Limit: n/a.

## Umsetzungsplan V1

1. `DiscoverGrid`: sichtbare Kategorie `Nachbarschaft` zu `Gemeinschaft` umbenennen, interne IDs/TestIDs unveraendert lassen.
2. Kontakte: Titel und Empty State auf `Menschen im Quartier` / vertraute Kontakte schaerfen.
3. Neuer Kontakt: `Nachbar hinzufuegen` freundlicher und persoenlicher formulieren.
4. Einladungen: `QuartierApp persoenlich zeigen`, Punkte-/Reward-Druck aus der UI nehmen, Backend unveraendert lassen.
5. Dashboard-Hinweis: bestehenden Einladen-CTA vom Punkte-Druck befreien.
6. Menu-Preview: `Quartier-Bonus` entfernen und die Story auf Gemeinschaft + sinnvolles Mitmachen stellen.
7. Tests aktualisieren und lokale Sichtprobe machen.
8. Lokal committen, aber nicht pushen/deployen.

## Rueckfragen statt Raten

Diese Punkte bleiben offen und duerfen nicht autonom implementiert werden:

- Soll `Gemeinschaft` spaeter eine eigene Hub-Seite bekommen? **(F-2 offen)**
- ~~Soll das Referral-System langfristig ganz ohne Punkte laufen oder nur im Pilot nicht sichtbar sein?~~ **F-4 entschieden 2026-05-15 spaetabend (Pass 71): Variante B — Punkte bleiben im Backend, im Pilot UI-seitig leise/unsichtbar. Spaeter nach Pilot-Feedback neu entscheiden ob ganz raus (A) oder wieder einblenden (C). V1-Stand ist damit Endstand fuer Pilot 0.**
- Welche exakten Erfolgsmomente sollen spaeter eine leise Einladung ausloesen? **(offen)**
- Darf die Jugend spaeter selbst Kontakte einladen, oder immer nur ueber Eltern/Guardian? **(F-3 offen)**
