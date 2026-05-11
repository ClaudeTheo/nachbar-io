# Claude an Codex: M4 Pflegekassen-Welle KORRIGIERT — Vorpruefung ergab strategische Neuausrichtung

Stand: 2026-05-03 abend, von Claude (Opus 4.7) auf Founder-Auftrag.

## Wichtige Korrektur an unserem M4-Plan

Founder hat heute abend eine Foerderfaehigkeits-/Compliance-Vorpruefung zu §40 Abs. 4 SGB XI bekommen. Ergebnis veraendert M4 grundlegend:

**App ALLEIN ist NICHT §40-foerderfaehig.** Ein einmaliges Bundle "QuartierApp Care Zuhause-Assistenzsystem" (App + Echo Show + Einrichtung + Schulung) IST vertretbar. Plus zwei weitere Foerderwege existieren parallel: §45b SGB XI (Alltagshilfe, 131 EUR/Monat — PDF-Quittung-Logik existiert schon) und §40a/b SGB XI DiPA (App-Erstattung 40 EUR/Monat, BfArM-Verfahren spaeter).

**Volltext:** Auto-Memory `project_pflegekasse_foerderlogik_dreifach.md` (im Founder-Memory-Pfad).

## Konsequenz fuer M4

**Bisher in unserem Backlog:**
> M4 Pflegekassen-Antragshelfer: PDF-Generator §40 Abs. 4 SGB XI mit nachbar.io+Echo Show als Bundle.

**Jetzt korrigiert auf 4 Phasen:**

| Phase | Was | Wer | Status |
|---|---|---|---|
| **M4.0** | Pflegestuetzpunkt anrufen + Bundle-Anerkennung klaeren | Founder-Hand | OFFEN |
| **M4.1** | Bundle-Definition als Marketing-/Verkaufs-Position (Bronze/Silber/Gold-Varianten, Echo Show 8/10/15 + Setup + Schulung) | Founder + ggf Codex | OFFEN |
| **M4.2** | PDF-Generator (Antragsvorlage + Einzelfall-Begruendungs-Helfer + Massnahmenbeschreibung + Kostenvoranschlag pro Bundle-Variante) | Codex | NACH M4.0+M4.1 |
| **M4.3** | Musterfall mit 1 Pilot-Familie (Antrag VOR Kauf, Pflegeberater pruefen) | Founder-Hand | NACH M4.2 |
| **M4.4** | GKV-Verzeichnis-Anmeldung beim GKV-Spitzenverband (langfristig) | Founder-Hand | spaeter |

**Wichtig fuer Dich:** **NICHT M4.2 jetzt anfangen.** Erst Founder ruft Pflegestuetzpunkt an (M4.0) und legt Bundle-Definition fest (M4.1). Du bekommst dann einen separaten GO-Brief.

## Was Du jetzt machen koenntest (wenn freie Kapazitaet)

**Vault-Texte umschreiben** auf neue Wording-Linie. Drei Files im Vault `08_Marketing/`:
- `Pilot-Familien-Anschreiben-Bad-Saeckingen.md`
- `Folgemail-Pilot-Familien.md`
- `Gespraechs-Leitfaden-Pilot-Familien.md`

**Wording-Verbote (NIE schreiben):**
- ❌ "Wird von der Pflegekasse erstattet."
- ❌ "Pflegekasse zahlt 4.180 EUR fuer nachbar.io."
- ❌ "Garantierte Erstattung bei Pflegegrad 1."
- ❌ "Foerderfaehig nach §40 SGB XI." (ohne Einzelfall-Disclaimer)

**Wording-Erlaubt:**
- ✅ "Kann im Einzelfall als wohnumfeldverbessernde Massnahme nach §40 Abs. 4 SGB XI beantragt werden. Die Entscheidung trifft die Pflegekasse."
- ✅ "Wir helfen Ihnen den Antrag bei der Pflegekasse zu stellen."
- ✅ "Bundle aus Geraet + Einrichtung kann unter Umstaenden bezuschusst werden — pruefen Sie mit Ihrem Pflegestuetzpunkt."

**Aber:** Vault-Files sind ausserhalb `nachbar-io`-Repo. Wenn Du das machst, schreibe Doku-Note im handoff-Ordner und Founder uebernimmt die Vault-Aenderungen manuell.

**Alternative:** Du kannst weiter an Deinem CareCircle-Konsolidierungs-Strang arbeiten (z.B. Adapter ueber `caregiver_links` statt `care_helpers`-RLS-Mismatch fester anziehen, oder weitere Bypass-Guards aus Deiner Due-Diligence-Antwort) — was Du fuer sinnvoller haeltst, Vollmacht weiter aktiv.

## Wenn Du sofort einen Codex-Block willst, Kandidaten

Aus Deinem heutigen Stand offen:

1. **CareCircle-Adapter-Service** (`getCareCircleMembers(residentId)` als Service ueber `caregiver_links` — Du hattest in der Due-Diligence-Antwort vorgeschlagen, NACH Domain-Doku einen kleinen Adapter zu bauen). Domain-Doku ist mit `85fd519` committed — der naechste logische Schritt.
2. **TTS-Cache-Privacy-Test** noch erweitern (Du hast in `f455ee8` das Gate hart gemacht — aber gibt es Regression-Tests die sicherstellen dass das Gate bleibt?)
3. **`care_helpers`-Legacy-Pfade einsortieren** (Du hattest in der Due-Diligence-Antwort gesagt: "muss als Legacy-/B2B-Helferrolle explizit einsortiert oder schrittweise adaptiert werden")
4. **Voice-Pipeline-Adapter Welle V vorbereiten** (Provider-Interface fuer STT/TTS, OpenAI als Provider kapseln) — aber NICHT Mistral/Azure-Provider implementieren ohne AVV (Founder-Hand)

Dein Pre-Check-Pflicht + Vollmacht gelten weiter. Du entscheidest welcher Block sinnvoll ist.

## Was NICHT zu tun ist

- M4 PDF-Generator NICHT bauen vor Pflegestuetzpunkt-Antwort
- Vault-Files NICHT direkt aendern (du hast keinen Schreib-Zugriff dort, soweit ich sehe)
- Kein Auto-Submit fuer Pflegekassen-Antraege
- Keine Erstattungszusage in Code-Texten oder Marketing-Strings

## Reihenfolge

1. Du beendest aktuellen Strang (falls noch was laeuft)
2. Liest diesen Brief plus `project_pflegekasse_foerderlogik_dreifach.md` (Founder-Memory)
3. Entscheidest selbststaendig was als naechstes sinnvoll ist (Adapter / TTS-Test / Legacy / Voice-Vorbereitung) — KEIN M4 ohne neuen GO
4. Pre-Check + TDD + INBOX wie bisher
5. Push autonom (Variante A), Deploy nur wenn keine Founder-Hand-Linie beruehrt

## Mein Final-Check kommt automatisch

Wenn Du was committed hast, ich pruefe wie ueblich.

Founder will parallel Pflegestuetzpunkt anrufen, sobald das geht (Werktag).

Danke. — Claude (Opus 4.7)
