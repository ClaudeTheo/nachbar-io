# Claude → Codex Handoff: Legal-v2 — BFSG-Ausnahme + Marketing-Wording-Sweep

**Datum:** 2026-05-25
**Driver:** Claude (Opus 4.7) — Plan, Wording, Review
**Worker:** Codex (GPT-5.5) — Code-Edits, Grep, Tests, Build-Verifikation
**Founder-Go:** Thomas — Push auf master, Entscheidungen bei Mehrdeutigkeit
**Vorgaenger-Commit:** `b45a56b chore(legal): align legal package wording` — bleibt gepusht stehen
**Branch:** `master` direkt (Solo-Workflow laut [feedback_git_workflow](../../memory/feedback_git_workflow.md))

## Kontext (kurz)

Claude hat den Push-Commit `b45a56b` reviewed und zusaetzlich online recherchiert (BFSG, MDR, DSA, JMStV, GmbH i.G.). Drei Befunde sind handlungsrelevant:

1. **BFSG-Kleinstunternehmen-Ausnahme** (§ 3 Abs. 3 BFSG) greift fuer Theobase GmbH (i.Gr.) komplett. Die aktuelle `app/barrierefreiheit/page.tsx` suggeriert aber eine BFSG-Pflicht und verweist auf eine unzustaendige Marktueberwachungsbehoerde. UWG-Abmahnrisiko.
2. **MDR-Disclaim allein reicht nicht.** Marketing-Wording ausserhalb des Legal-Pakets (Landing, Senior-Layout, Register-Steps, Marketing-Prompt, Pitch-Deck) muss konsistent nicht-medizinisch sein. Bann-Liste steht in `docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md`.
3. **GmbH-Impressum** ist rechtssicher fuer Vor-GmbH-Phase, eine Mikro-Verbesserung sinnvoll.

## Aufgaben-Verteilung "jeder macht was er am besten kann"

| Rolle | Wer | Wann |
|---|---|---|
| Wording-Entscheidungen, Compliance-Sicht, Bann-Liste, Review nach jedem Schritt | Claude | jetzt + nach jeder Codex-Welle |
| Grep ueber Codebase, Multi-File-Edits, Tests, TSC/Lint/Build-Verifikation, Commit-Vorbereitung | Codex | sequentiell Welle 1A → 1B → 1C |
| Push auf master, Mehrdeutigkeits-Entscheidungen | Thomas | nach finalem Claude-Review |

## Welle 1A — BFSG-Kleinstunternehmen-Klarstellung (klar definiert, klein)

Datei: `app/barrierefreiheit/page.tsx`

### Aenderung 1 — Top-of-File-Kommentar

Alt (Zeile 11-12):
```ts
// Erklärung zur Barrierefreiheit gemäß BFSG (Barrierefreiheitsstärkungsgesetz)
// Pflicht seit 28. Juni 2025 — EU-Richtlinie 2019/882 (European Accessibility Act)
```

Neu:
```ts
// Erklärung zur Barrierefreiheit — freiwillige Selbstverpflichtung
// BFSG greift nicht: Kleinstunternehmen-Ausnahme nach § 3 Abs. 3 BFSG
// (< 10 Beschäftigte UND < 2 Mio EUR Jahresumsatz). Wir orientieren uns
// dennoch an WCAG 2.1 AA / EN 301 549 wegen Senior-Zielgruppe.
```

### Aenderung 2 — Neuer Hinweis-Block direkt VOR `Stand der Barrierefreiheit`

Suche die `<section>` mit `<h2>Stand der Barrierefreiheit</h2>` (ca. Zeile 71). Fuege direkt davor diese neue `<section>` ein:

```tsx
{/* Kleinstunternehmen-Ausnahme — Klarstellung gegen UWG-Risiko */}
<section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
  <h2 className="mb-2 text-lg font-semibold text-anthrazit">
    Hinweis zum Anwendungsbereich
  </h2>
  <p>
    Die Theobase GmbH (in Gruendung) ist Kleinstunternehmen im Sinne
    von <strong>§ 3 Abs. 3 BFSG</strong> (Solo-Founder, geschlossener
    Pilotbetrieb, weniger als zehn Beschaeftigte und unter zwei
    Millionen Euro Jahresumsatz). Die als Dienstleistung erbrachte
    QuartierApp ist damit vom Anwendungsbereich des
    Barrierefreiheitsstaerkungsgesetzes ausgenommen.
  </p>
  <p className="mt-2">
    Wir orientieren uns trotzdem <strong>freiwillig</strong> an den
    technischen Anforderungen des BFSG, insbesondere an den Web Content
    Accessibility Guidelines (WCAG) 2.1 Stufe AA und der europaeischen
    Norm EN 301 549. Grund ist unsere Zielgruppe: aeltere Menschen und
    Familien, fuer die Barrierefreiheit kein Komfort, sondern
    Voraussetzung ist. Diese Erklaerung ist eine freiwillige
    Selbstverpflichtung, keine Pflichterklaerung.
  </p>
</section>
```

### Aenderung 3 — Bestehender Block "Durchsetzungsverfahren" entschaerfen

Aktuell verweist der Block auf die Marktueberwachungsbehoerde Sachsen-Anhalt. Das ist irrefuehrend, weil das BFSG fuer uns nicht greift. Ersetze den **gesamten Inhalt** der `<section>` "Durchsetzungsverfahren" durch:

```tsx
<section>
  <h2 className="mb-2 text-lg font-semibold text-anthrazit">
    Wenn wir nicht reagieren
  </h2>
  <p>
    Sollten Sie mit unserer Antwort auf eine Rueckmeldung nicht
    zufrieden sein oder innerhalb von 14 Tagen keine Rueckmeldung
    erhalten, koennen Sie sich an den Verbraucherschutz oder an
    eine Schlichtungsstelle wenden. Eine zustaendige
    Marktueberwachungsbehoerde nach BFSG ist fuer QuartierApp
    aktuell nicht zustaendig, weil das BFSG aufgrund der
    Kleinstunternehmen-Ausnahme nicht anwendbar ist (siehe oben).
  </p>
  <p className="mt-2">
    Sobald die Theobase GmbH waechst und die Kleinstunternehmen-Schwelle
    ueberschreitet, aktualisieren wir diese Erklaerung um die
    zustaendige Marktueberwachungsbehoerde.
  </p>
</section>
```

### Aenderung 4 — Footer "Stand: Mai 2026" ergaenzen

Direkt vor dem Footer-`</div>` (ca. Zeile 292), analog zu AGB/Datenschutz/Richtlinien/Impressum:

```tsx
<p className="text-xs text-muted-foreground mt-6">Stand: Mai 2026</p>
```

### Test-Updates `__tests__/app/barrierefreiheit-page.test.tsx`

- **Bug-Fix:** Regex `/Barrierefreiheitsstaerkungsgesetz|BFSG/i` mit echten Umlauten ersetzen: `/Barrierefreiheitsstärkungsgesetz|BFSG/i` ODER native Umlaute `Barrierefreiheitsstärkungsgesetz`. Test passte bisher nur dank `|BFSG`. Echtumlaute laut [feedback_umlaute](../../memory/feedback_umlaute.md).
- **Neuer Positiv-Assert:** `expect(screen.getByText(/§ 3 Abs\. 3 BFSG/i)).toBeInTheDocument();`
- **Neuer Positiv-Assert:** `expect(screen.getByText(/Kleinstunternehmen/i)).toBeInTheDocument();`
- **Neuer Positiv-Assert:** `expect(screen.getByText(/freiwillig/i)).toBeInTheDocument();`
- **Neuer Negativ-Assert:** `expect(screen.queryByText(/Landesverwaltungsamt Sachsen-Anhalt/i)).not.toBeInTheDocument();`
- **Neuer Positiv-Assert:** `expect(screen.getByText(/Stand: Mai 2026/i)).toBeInTheDocument();`

## Welle 1B — Marketing-Wording-Sweep ausserhalb Legal-Paket

**Codex liefert nur die Trefferliste. NICHT selbstaendig editieren.** Claude entscheidet pro Treffer.

### Grep-Kommando

```bash
# Im nachbar-io/-Verzeichnis ausfuehren
rg -n --color never -i \
  -e "Hausnotruf|Notrufsystem|Notruf-System|Leitstelle|Alarmzentrale" \
  -e "ueberwacht.*Gesundheit|Patienten.berwachung|Gesundheits-?Monitoring" \
  -e "Diagnose|Therapie|Behandlung|medizinische Empfehlung" \
  -e "sichere Medikamenten|verhindert Vergessen|erkennt Notf" \
  -e "KI entscheidet|KI bewertet|KI erkennt Risiko" \
  -e "garantierte Hilfe|garantierte Reaktionszeit|automatische Rettung" \
  -e "24/7 Rettung|rund um die Uhr.*Hilfe" \
  --glob "!__tests__/**" \
  --glob "!app/agb/**" \
  --glob "!app/datenschutz/**" \
  --glob "!app/impressum/**" \
  --glob "!app/richtlinien/**" \
  --glob "!app/barrierefreiheit/**" \
  --glob "!docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md" \
  --glob "!docs/**" \
  --glob "!node_modules/**" \
  --glob "!.next/**" \
  --glob "!*.lock" \
  --glob "!*.log" \
  app/ components/ modules/ lib/ public/ 2>&1 | tee /tmp/wording-sweep.txt
```

### Zusaetzlich diese Workspace-Dateien einzeln greppen (liegen ausserhalb nachbar-io/)

- `C:/Users/thoma/Claud Code/Handy APP/Nachbar-io_Marketing_Prompt.md`
- `C:/Users/thoma/Claud Code/Handy APP/QuartierApp_Versionskonzept_2026.docx` — Codex kann das nicht direkt greppen, **ueberspringen** und an Claude eskalieren
- `C:/Users/thoma/Claud Code/Handy APP/Nachbar_io_Investor_Deck_2026.pptx` — gleiches, eskalieren

### Output-Format an Claude

Markdown-Tabelle in einer neuen Datei `docs/plans/handoff/2026-05-25-codex-an-claude-wording-sweep-treffer.md`:

```markdown
| # | Datei:Zeile | Kontext (eine Zeile) | Bann-Wort |
|---|---|---|---|
| 1 | app/landing/page.tsx:42 | "...automatische Hilfe rund um die Uhr..." | rund um die Uhr |
| 2 | components/Senior/CallButton.tsx:18 | aria-label="Notruf-System" | Notrufsystem |
| ... | ... | ... | ... |
```

Plus am Ende:
```markdown
## Codex-Ergebnis
- Gesamttreffer: <N>
- Hochrisiko (positiv-werbendes Wording): <N>
- Disclaim-Vorkommen (negiert, ok): <N>
- An Claude offen: <N>
```

**WICHTIG:** Codex unterscheidet bitte selbst zwischen positiv-werbend ("garantiert Hilfe") und negiert/Disclaim ("ist kein Hausnotruf"). Nur positiv-werbende Treffer sind kritisch. Disclaim-Vorkommen separat listen.

## Welle 1C — GmbH-Impressum Mikro-Verbesserung (klein)

Datei: `app/impressum/page.tsx`

Innerhalb der gelben Box (`rounded-lg border border-amber-200 bg-amber-50 p-4`), direkt nach der `ul`-Liste der drei Pilotbetriebs-Punkte (etwa Zeile 62), fuege einen neuen Absatz ein:

```tsx
<p className="mt-2">
  Vertretungsberechtigt nach Eintragung der Theobase GmbH:
  Thomas Theobald (zukuenftiger Geschaeftsfuehrer). Bis zur
  Eintragung im Handelsregister besteht persoenliche Handelnden-
  haftung gemaess § 11 Abs. 2 GmbHG.
</p>
```

### Test-Update `__tests__/app/legal-ai-copy.test.tsx`

Im Test `"shows the GmbH in Gruendung transition note in Impressum"` ergaenzen:
```ts
expect(screen.getByText(/Vertretungsberechtigt nach Eintragung/i)).toBeInTheDocument();
expect(screen.getByText(/Handelndenhaftung/i)).toBeInTheDocument();
```

## Verifikation (Codex, vor Commit)

Sequentiell, jeder Schritt muss gruen sein:

```bash
cd nachbar-io
npx tsc --noEmit
npm run lint
npm test -- --run \
  __tests__/app/barrierefreiheit-page.test.tsx \
  __tests__/app/legal-ai-copy.test.tsx \
  __tests__/app/datenschutz-page.test.tsx \
  __tests__/app/richtlinien-page.test.tsx
npm run build
git diff --check
```

Bei Failure: **Stop, an Claude eskalieren.** Nicht "Test ans neue UI ziehen" ohne Claude-Review (Lehre Pass 108: Test soll Wording schuetzen, nicht abnicken).

## Commit-Vorbereitung

Wenn alles gruen ist, **stage** und **erstelle commit lokal**, aber **NICHT pushen**:

```bash
git add app/barrierefreiheit/page.tsx app/impressum/page.tsx \
        __tests__/app/barrierefreiheit-page.test.tsx \
        __tests__/app/legal-ai-copy.test.tsx \
        docs/plans/handoff/2026-05-25-codex-an-claude-wording-sweep-treffer.md
git commit -m "$(cat <<'EOF'
chore(legal): bfsg kleinstunternehmen exception + gmbh handelnden note

- barrierefreiheit page: clarify bfsg micro-enterprise exception
  (§ 3 abs. 3 bfsg), reframe as voluntary commitment, remove
  misleading reference to marktueberwachung sachsen-anhalt
- impressum: add explicit handelndenhaftung note for vor-gmbh phase
- tests: positive asserts for kleinstunternehmen + handelndenhaftung,
  negative assert against landesverwaltungsamt, fix bfsg umlaut regex
- handoff: marketing wording sweep results for claude review

review by claude (opus 4.7 + websearch on bfsg/mdr/dsa/gmbh).
no migrations, no admin surface, no auth changes → no security mini-audit.

Co-Authored-By: Codex (GPT-5.5) <noreply@codex>
EOF
)"
```

Dann **Status melden** an Claude (Markdown-Quittung in `docs/plans/handoff/2026-05-25-codex-an-claude-quittung-legal-v2.md`):

- Commit-Hash
- Diff-Stats (Datei, +Zeilen/-Zeilen)
- Build/Lint/TSC/Vitest-Output (Tail je 20 Zeilen, gruen)
- Wording-Sweep-Trefferliste-Pfad
- Offene Punkte (z.B. eskalierte .docx/.pptx)

## Rote Zone — NICHT ohne Founder-Go

- `git push origin master` → **Founder-Go pflicht** ([CLAUDE.md](../../CLAUDE.md))
- Keine Migration, kein Vercel-Env-Touch, kein Secret-Anzeigen, kein Force-Push
- Keine Loeschung von docs/plans-Dateien (auch nicht von alten Handoffs)

## Akzeptanzkriterien (fuer Claude-Review nach Codex-Quittung)

- [ ] Welle 1A: 4 Aenderungen in `app/barrierefreiheit/page.tsx` umgesetzt, 5 Test-Asserts ergaenzt
- [ ] Welle 1B: Treffer-Markdown an Claude geliefert, **keine** selbststaendigen Edits an Marketing-Wording
- [ ] Welle 1C: Impressum-Absatz + 2 Test-Asserts ergaenzt
- [ ] TSC, Lint, Vitest (4 Test-Files), Build: alle gruen
- [ ] git diff --check sauber
- [ ] Commit lokal, **NICHT** gepusht
- [ ] Quittung-Markdown geschrieben

## Nach Codex-Quittung

Claude reviewed Diff + entscheidet pro Wording-Sweep-Treffer → 2. Codex-Welle "Marketing-Wording umschreiben" oder Direkt-Push, falls Sweep keine Hochrisiko-Treffer hat.

---

**Quellen Claude-Recherche** (fuer Codex zur Selbst-Verifikation, falls noetig):

- [Bundesfachstelle Barrierefreiheit FAQ — § 3 Abs. 3 BFSG](https://www.bundesfachstelle-barrierefreiheit.de/DE/Fachwissen/Produkte-und-Dienstleistungen/Barrierefreiheitsstaerkungsgesetz/FAQ/faq_node.html)
- [BFSG Volltext](https://bfsg-gesetz.de/)
- [BfArM Abgrenzung Medizinprodukt](https://www.bfarm.de/DE/Medizinprodukte/Aufgaben/Abgrenzung-und-Klassifizierung/_artikel.html)
- [IHK Suedlicher Oberrhein GmbH-Gruendung](https://www.ihk.de/freiburg/unternehmen-beraten/recht-steuern/rechtsformen/gruendung-gmbh-ug-6797948)
- [Menold Bezler 10 Fragen DSA](https://www.menoldbezler.de/blog/10-fragen-und-antworten-zum-digital-services-act-dsa)
- [die-medienanstalten.de JMStV](https://www.die-medienanstalten.de/service/rechtsgrundlagen/jugendmedienschutz-staatsvertrag/)
- Inhouse: [docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md](../../LEGAL_MARKETING_WORDING_GUARDRAILS.md)
