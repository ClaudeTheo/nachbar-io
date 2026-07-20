# Stadt-App-Positionierung: QuartierApp — eine Marke, viele Städte

Stand: 2026-07-20 · Status: Founder-entschieden (Richtung), Umsetzung in Wellen
Founder-Entscheid: Care-Modul in den Hintergrund. Headline wird Stadt-Social +
Nachbarschaftshilfe. **Die App heißt immer „QuartierApp"** — die Stadt ist
Kontext, nicht Marke: „QuartierApp · Bad Säckingen", später „QuartierApp ·
Rheinfelden", „· Lörrach", „· Waldshut" usw., je nachdem wo der Nutzer ist.
Förderfähigkeit durch Stadt/Kommune ist explizites Ziel.

## 1. Warum

Die bisherige Außenwirkung „Senior-Care-Plattform" macht Vermarktung schwer
(Medizin-Framing, Haftungs-Assoziation, enge Zielgruppe). Als soziale Stadt-App
mit Quartieren ist das Produkt leichter erklärbar, breiter nutzbar und für
Kommunen förder- und beteiligungsfähig. Care bleibt als **optionales Modul**
erhalten — es wird nicht entfernt, nur nicht mehr zur Headline gemacht.

## 2. Ist-Stand (Code-Recon 2026-07-20, belegt)

Gute Nachrichten — vieles ist schon da:

| Baustein | Stand | Beleg |
|---|---|---|
| User-facing Name | Ist bereits **„QuartierApp"**, nicht „nachbar.io" | `app/layout.tsx:29-77` |
| Landing-Page | **Kein** Senior-/Care-Wording | `app/page.tsx` (Grep leer) |
| Multi-Quartier | Fundament + Quartiere Rheinfelden/Köln als Daten | Mig 051/052, 125 |
| Stadtweites Query-Muster | Existiert: Quartiere per `quarters.city` gruppieren, `.in(quarter_id, ids)` | `app/(app)/city-services/page.tsx:97-116` |
| Rathaus-Portal | Real gebaut: eigenes Next.js-Projekt, 15 Bereiche, 23 Testdateien | `nachbar-civic/app/(portal)/*` |
| Feature-Flags pro Quartier | Tabelle + `enabled_quarters`-Spalte vorhanden | Mig 086, `lib/feature-flags.ts:142-146` |
| Care in der Nav | Moderat: kein eigener Pflege-Tab im 4-Tab-Default (Start/Quartier/Mein Tag/Ich) | `components/BottomNav.tsx:117-125`, `NavConfig.ts:48-76` |

Was fehlt bzw. kaputt/hart verdrahtet ist:

| Lücke | Detail | Beleg |
|---|---|---|
| Hilfegesuch-Scope | `help_requests.quarter_id NOT NULL`, kein Sichtbarkeits-Feld; Listen-Pages fetchen sogar ungefiltert (Scoping hängt an RLS) | Mig 115:66-79, `app/(app)/hilfe/page.tsx:16`, `app/(app)/help/page.tsx:29` |
| Flag-Auswertung tot | `enabled_quarters` wird client-seitig nie geprüft (kein Call-Site übergibt `quarterId`), server-seitig prüft `isFeatureEnabledServer` nur `enabled` | `components/FeatureGate.tsx:19-20`, `lib/feature-flags-server.ts:15-31` |
| Branding hart verdrahtet | „Bad Säckingen" hardcodiert in Manifest + Landing; Farben global; kein Tenant-/Theme-System | `public/manifest.json:2-4`, `app/page.tsx:85-86`, `app/globals.css:26-31` |
| Board-API hart auf Pilot | Public-API löst Quartier fest über Pilot-Slugs auf | `app/api/board/route.ts:10` |
| `/care` ungeschützt | Kein Flag-/Plan-Guard auf der Care-Route selbst (nur Kacheln innen gegated) | `app/(app)/care/layout.tsx:11-17` |
| B2B-Wording | „Lebenszeichen-Übersicht", Zielgruppe „Pflegedienste" prominent | `app/b2b/page.tsx:26,58-60,123` |
| QuarterSwitcher | Existiert, wird nirgends gerendert (toter Code) | `components/QuarterSwitcher.tsx` |

## 3. Ziel-Positionierung

- **Eine Marke, ein Build:** Die App heißt überall „QuartierApp". Die Stadt
  erscheint als Kontext („QuartierApp · Bad Säckingen") — genau das Muster, das
  die Landing heute schon hardcodiert zeigt (`app/page.tsx:85-86`); es wird
  dynamisch aus dem Quartier-/Stadt-Kontext gespeist. Kein separater App pro
  Stadt, keine Fork-Builds, ein App-Store-Eintrag.
- **Struktur:** Stadt = Gruppierungsebene, darunter Quartiere (Purkersdorfer
  Straße, Sanarystraße, Oberer Rebberg, …). Inhalte haben einen Scope:
  Quartier ODER ganze Stadt (zuerst bei Hilfegesuchen, später Board/Events).
- **Module pro Stadt zuschaltbar:** Basis = Board, Events, Hilfegesuche, Karte,
  Warnungen, Müllkalender, Rathaus-Anbindung. Optional = Care/Senior, Jugend,
  Handwerker, Medical. Care ist damit Differenzierer im Vertrieb („können wir,
  wenn Sie wollen"), nicht Haftungs-Headline.
- **Kommune als Partner:** Rathaus-Portal (nachbar-civic) ist der Hebel — die
  Stadt ist Mitnutzer (Bekanntmachungen, Mängelmelder, Krisen-Push), nicht nur
  Geldgeber.
- **DSGVO unverändert streng:** EU-Frankfurt, RLS, keine Adressdaten im
  Client-State. Die MDR-Readiness-Doku bleibt intern gültig für das Care-Modul,
  verschwindet nur aus der Außendarstellung.

## 4. Architektur-Entscheidungen

**A1 — Stadt-Ebene ohne neue Tabelle (Stufe 1).** `quarters.city` ist bereits
der Gruppierungsschlüssel und wird in `city-services` genauso benutzt. Kein
`cities`-Neubau jetzt (Pre-Check: wäre Duplikat der bestehenden Semantik).
Erst wenn Städte eigene Konfiguration brauchen, die nicht in ein
Quartier-Settings-JSONB passt (eigene Admins, eigenes Branding, Verträge),
kommt eine echte `cities`-Tabelle — als eigene, kleine Migration-Welle.

**A2 — Sichtbarkeits-Scope für Hilfegesuche.** Neue Spalte
`help_requests.visibility TEXT CHECK (visibility IN ('quarter','city'))
DEFAULT 'quarter'` + RLS-Erweiterung (Lesen city-weiter Gesuche für alle
Nutzer, deren Quartier dieselbe `city` hat). UI: Umschalter im
`NewRequestForm` („Nur mein Quartier / Ganz Bad Säckingen") — Senior-Mode
beachten (große Targets, Default = Quartier, kein Pflichtfeld mehr).
Betroffene Dateien: `modules/hilfe/services/hilfe-requests.service.ts`,
`app/api/hilfe/requests/route.ts`, `modules/hilfe/components/NewRequestForm.tsx`,
`app/(app)/hilfe/page.tsx`, `app/(app)/help/page.tsx`.
⚠️ RLS-Policy-Änderung ⇒ **Security-Mini-Audit ist Pflicht** (Regel
`security-mini-audit.md`), inkl. Prüfung der heute ungefilterten Listen-Fetches.

**A3 — Feature-Flag-Gating reparieren (Voraussetzung für „Module pro Stadt").**
`enabled_quarters` serverseitig in `isFeatureEnabledServer` auswerten und
`quarterId` an die `FeatureGate`-Call-Sites durchreichen. Danach Care-Einstieg
(`app/(app)/care/layout.tsx`) und Care-Verweise in `my-day`/Dashboard hinter ein
Flag `CARE_MODULE` legen (Default: an für Pilot-Quartiere ⇒ null
Verhaltensänderung im Pilot, aber ab sofort pro Stadt abschaltbar).

**A4 — Stadt-Kontext zur Laufzeit (kein White-Label nötig).** Marke, Logo,
Farben und App-Store-Auftritt bleiben EIN globales QuartierApp-Branding —
damit entfällt das Build-per-Stadt-Thema komplett. Dynamisch wird nur der
**Stadt-Kontext**: Stadtname in Landing-Eyebrow, Titel/Metadata-Zusatz,
Manifest-Beschreibung und ggf. Stadt-spezifische Inhalte (Rathaus-Links,
Müllkalender sind schon quartier-/stadtgebunden). Quelle: `quarters.city` bzw.
City-Config; Auslieferung über `generateMetadata()` + dynamisches
`app/manifest.ts` (heute statisch mit hardcodiertem „Bad Säckingen",
`public/manifest.json:2-4`). Machbar, da `app/layout.tsx` bereits
`force-dynamic` ist.

**A5 — Texte/Außenwirkung.** Landing: „Bad Säckingen"-Hardcodes durch
City-Kontext ersetzen. B2B-Seite umbauen: Zielgruppe „Kommunen &
Stadtverwaltungen" zuerst, Care/Lebenszeichen als optionales Modul in einer
Sektion weiter unten. Board-Public-API (`app/api/board/route.ts`) von
Pilot-Slugs auf Quartier-Parameter umstellen.

## 5. Umsetzungs-Wellen (jede einzeln, TDD, kein Push ohne Founder-Go)

| Welle | Inhalt | Risiko | Gates |
|---|---|---|---|
| W1 | Hilfegesuch-Scope (A2): Migration + RLS + Service + UI-Toggle | Mittel (RLS) | Pre-Check ✔ (dieses Doc), **Mini-Audit Pflicht**, TDD |
| W2 | Flag-Reparatur + Care-Gating (A3) | Mittel (Auth-Surface: Flag-Checks) | Mini-Audit (Feature-Gate = Zugriffspfad), Verhalten im Pilot unverändert (Tests) |
| W3 | Stadt-Kontext dynamisch (A4): generateMetadata, manifest.ts, Landing-Eyebrow aus DB | Niedrig | Tests: Pilot rendert identisch („QuartierApp · Bad Säckingen") |
| W4 | Texte (A5): Landing city-dynamisch, B2B-Umbau, Board-API entharten | Niedrig | Wording-Review Founder (Siezen, kein Gendern, kein Hype) |
| W5 | Förder-Dossier für Stadtgespräch Bad Säckingen (kein Code) | — | Founder-Review vor jedem Versand |

Reihenfolge-Logik: W1 liefert den vom Founder gewünschten sichtbaren Nutzen
zuerst („Hilfegesuch für ganz Säckingen"). W2 ist die technische Voraussetzung
für das Vertriebsversprechen „Module pro Stadt". W3/W4 machen die zweite Stadt
möglich. Board/Events auf City-Scope erweitern erst NACH W1-Erfahrung
(gleiche Mechanik, bewusst nicht alles auf einmal).

## 6. Förderfähigkeit (Startpunkte, keine Rechts-/Förderberatung)

- Städtebauförderung **„Sozialer Zusammenhalt"** (Bund/Land, läuft über die Kommune)
- **Quartiersimpulse / Strategie „Quartier 2030"** (Ministerium für Soziales BW)
- **DSEE** — Förderprogramme für Engagement/Nachbarschaftshilfe-Digitalisierung
- Direktbeauftragung/Zuschuss durch **Stadt Bad Säckingen / Landkreis Waldshut**
- Argumentationskette fürs Rathaus: Stadt bekommt eigenes Portal (existiert
  real: nachbar-civic), Krisen-/NINA-Warnungen (live), Mängelmelder,
  Bekanntmachungen — die Stadt kauft kein „Senioren-Produkt", sondern digitale
  Bürgerkommunikation mit Quartiersvernetzung.
- Nächster konkreter Schritt (W5): 2-seitiges Dossier + Demo-Zugang für das
  Rathaus, Termin über bestehende Kontakte.

## 7. Wettbewerb (ehrlich)

DorfFunk/Digitale Dörfer (Fraunhofer IESE), nebenan.de, Crossiety (CH)
besetzen dasselbe Feld. Differenzierung: (1) lokale Verankerung + persönliche
Betreuung Hochrhein, (2) echtes Rathaus-Portal statt nur Pinnwand, (3)
optionale Care-/Hilfe-Tiefe inkl. § 45a-Nachbarschaftshilfe-Abrechnung
(Mig 115 — hat keiner der Wettbewerber), (4) EU/DSGVO-sauberer Stack.
Diese vier Punkte gehören in jedes Stadtgespräch; „noch eine Dorf-App"
verliert gegen DorfFunk (für Kommunen quasi kostenlos).

## 8. Offene Punkte / Risiken

- Marke bleibt „QuartierApp" — der Stadtname wird nur beschreibend genutzt
  („QuartierApp · Bad Säckingen"), das ist unkritisch. Stadtwappen/offizielles
  Stadtlogo dagegen nur mit schriftlichem Einverständnis der Stadt (Teil des
  Fördergesprächs).
- `quarters.city` ist Freitext — vor W1 einmal Datenhygiene prüfen
  (Schreibweisen „Bad Saeckingen" vs. „Bad Säckingen" würden Stadt-Gruppen
  spalten; Beleg für Risiko: Mig 051:47 schreibt „Bad Saeckingen").
- Ungefilterte Hilfe-Listen-Fetches (heute nur RLS-geschützt) werden in W1
  mit auditiert — nicht vorab „nebenbei fixen" (chirurgische Änderungen).
- Vier-Versionen-Modell (Free/Plus/Pro) bleibt unberührt; nur die
  Modul-Sichtbarkeit wird pro Stadt steuerbar.
