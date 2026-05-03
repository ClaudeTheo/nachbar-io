# Handover: Foerderstrategie Care-Quartier

Stand: 2026-05-03 abend  
Repo: `nachbar-io` auf `master`, Start-HEAD fuer diesen Block: `d770668`  
Owner: Codex  
Art: Strategie-/Doku-Handover, keine Code-Aenderung

## Anlass

Thomas hat eine externe ChatGPT-Ausarbeitung zu Foerder- und Erstattungswegen
eingebracht. Kernthese dort: Nicht zuerst reine App-Erstattung, nicht zuerst
Hausnotruf, sondern ein Service-/Partnerpaket rund um Alltagsunterstuetzung,
Quartier und Hardware-Einrichtung.

Codex-Einschaetzung: Das passt gut zu nachbar.io, wenn es rechtlich vorsichtig
und produktstrategisch sauber formuliert wird. Die App sollte nicht als
erstattungsfaehige Einzel-App verkauft werden, sondern als digitale Infrastruktur
fuer ein anerkanntes oder partnergetragenes Unterstuetzungsangebot im Alltag.

## Ergebnis in einem Satz

Die beste Reihenfolge ist: zuerst `45b`/UStA ueber Partner oder spaetere eigene
Anerkennung, parallel Quartiersimpulse BW fuer einen kommunalen Pilot, `40 Abs. 4`
nur als Hardware-/Einrichtungs-Bundle im Einzelfall, DiPA erst spaeter nach
Pilotdaten, Datenschutzhaertung und Nutzenbeleg.

## Fit zum bestehenden Repo

- `modules/hilfe/*` enthaelt bereits umfangreiche `45b`-/Nachbarschaftshilfe-
  Infrastruktur, darunter Quittungs- und Monatsreport-PDFs. Das ist ein starker
  Anknuepfungspunkt fuer UStA-/Entlastungsbetrag-Logik.
- CareCircle/Care-Hardening wurde in den letzten Bloecken auf aktive
  `caregiver_links` ausgerichtet. Das stuetzt die strategische Erzaehlung:
  Angehoerige, Senioren und Helfer werden koordiniert, nicht nur "eine App"
  verkauft.
- Das M4-Pflegekassen-PDF bleibt ausdruecklich blockiert. Vor M4.2 muessen
  M4.0 Pflegestuetzpunkt-Feedback und M4.1 Bundle-Definition durch Thomas
  erledigt sein.
- In bestehenden Hilfe-UI-/Doku-Texten gibt es Hinweise auf direkte
  Pflegekassenzahlung. Diese Texte sollten spaeter in einem separaten
  Wording-Audit geprueft werden; dieser Block aendert sie bewusst nicht.

## Strategische Leitplanken

### Prioritaet 1: `45b`/UStA-Partnerweg

Formulierung: "nachbar.io Care ist die digitale Plattform fuer ein
partnergetragenes oder anerkanntes Unterstuetzungsangebot im Alltag."

Sinnvolle erste Partner:

- anerkannte Nachbarschaftshilfe
- DRK-/Caritas-/Diakonie-Kreisverband
- Seniorenbuero oder Quartiersprojekt
- ambulanter Pflegedienst mit passendem Angebot
- Kommune / Landkreis / Wohlfahrtstraeger

Wichtig: Nicht behaupten, dass die App selbst pauschal erstattet wird. Der
erstattungsfaehige Gegenstand ist das anerkannte Angebot bzw. die anerkannte
Leistung, in der die Software als Koordinations- und Dokumentationswerkzeug
dient.

### Prioritaet 2: Quartiersimpulse BW

Formulierung: "Digital unterstuetztes Senioren- und Nachbarschaftsquartier
Bad Saeckingen."

Nachbar.io waere Technologiepartner. Antragsteller sollte eine Kommune, ein
kommunaler Verbund oder Landkreis mit kommunalem Bezug sein. Inhaltlich passt:
20-40 Seniorenhaushalte, Angehoerigen-App, optional Echo/Tablet, lokale Helfer,
Check-ins, Besuchs-/Hilfekoordination, Buergerbeteiligung und Auswertung.

### Prioritaet 3: `40 Abs. 4` nur als Hardware-/Einrichtungs-Bundle

Erlaubte Richtung:

- Echo Show oder Tablet
- fester Platz / Halterung
- Einrichtung und WLAN-Anbindung
- Angehoerigenkreis / CareCircle-Konfiguration
- Schulung und Uebergabeprotokoll

Keine Zusage. Immer Einzelfall, Entscheidung der Pflegekasse, vorherige
Pruefung mit Pflegestuetzpunkt/Pflegekasse.

### Prioritaet 4: DiPA spaeter

DiPA passt konzeptionell, ist aber nicht MVP- oder Sofortvertriebsweg. Vorher
braucht es Datenschutzreife, Nutzenlogik, echte Pilotdaten, klare Intended-Use-
Grenzen und wahrscheinlich externe Beratung. Keine konkreten Erstattungsbetraege
in Produkt- oder Vertriebsdokumente aufnehmen, bevor die aktuelle Rechtslage
noch einmal offiziell geprueft wurde.

## Verbotene Kurzformulierungen

- "Die App wird von der Pflegekasse erstattet."
- "Pflegekasse zahlt nachbar.io."
- "Garantierte Foerderung bei Pflegegrad."
- "Foerderfaehig nach `40 SGB XI`" ohne Einzelfall- und Entscheidungs-Hinweis.
- "DiPA-zugelassen" oder "DiPA-Erstattung", solange kein BfArM-Eintrag besteht.

## Sichere Kurzformulierungen

- "Kann Teil eines anerkannten Unterstuetzungsangebots im Alltag sein."
- "Die Abrechnung kann je nach Partner- und Landesrechtslage ueber den
  Entlastungsbetrag erfolgen."
- "Ein Hardware- und Einrichtungspaket kann im Einzelfall als
  wohnumfeldverbessernde Massnahme beantragt werden. Die Pflegekasse entscheidet."
- "Nachbar.io kann Kommunen und Traeger als digitale Infrastruktur fuer einen
  Quartierspilot unterstuetzen."

## Offene Founder-Hand

- M4.0: Pflegestuetzpunkt / Pflegekasse zur `40 Abs. 4`-Bundle-Logik fragen.
- M4.1: Bundle-Definition festlegen: Geraet, Halterung, Einrichtung, Schulung,
  CareCircle-Konfiguration, laufende App-Gebuehr getrennt.
- Partnerliste fuer Bad Saeckingen priorisieren: Kommune, Seniorenbuero,
  DRK/Caritas/Diakonie, Nachbarschaftshilfe, Pflegedienst, Wohnungsbau.
- Entscheiden, ob das spaetere 2-Seiten-Foerderkonzept primaer im Repo bleibt
  oder als strategisches Dokument in den Vault gespiegelt wird. Keine
  Volltext-Doppelpflege.

## Naechster sinnvoller Codex-Block

Den Plan `docs/plans/2026-05-03-foerderstrategie-care-quartier-plan.md`
taskweise ausfuehren. Er beginnt mit Quellen-/Wording-Freeze und fuehrt dann zu
einem 2-seitigen Foerderkonzept, Partnerfragen, Quartiersimpulse-Pitch und
spaeterem Wording-Audit.

## Explizit nicht gemacht

- kein M4-Pflegekassen-PDF gebaut
- keine Produkttexte im Code geaendert
- keine Migration geschrieben oder angewendet
- keine Prod-/Deploy-/Vercel-/Provider-/Kostenaktion
- keine alten untracked Handoff-Dateien oder `.codex-welle-d-3001.pid`
  angefasst
