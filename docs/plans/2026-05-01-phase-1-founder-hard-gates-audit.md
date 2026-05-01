# Phase-1 Founder-Hard-Gates-Audit (read-only)

Stand: 2026-05-01 vormittag
Autor: Claude (Opus 4.7) als Parallel-Aufgabe waehrend Codex Lead in nachbar-io
Scope: Read-only Founder-/Text-/Compliance-Preflight fuer Phase 1 Pilot-Familien Bad Saeckingen
Bezugsdokument: `docs/plans/2026-04-30-phase-1-pre-flight.md` (Codex Welle H, Commit `483423c`)

> Diese Datei entscheidet NICHTS. Sie sortiert die Hard-Gates aus der Pre-Flight-Checkliste,
> verlinkt die Quellen und macht Luecken sichtbar. Keine Codeaenderung. Keine Empfehlung,
> echte Familien zu onboarden.

---

## 1. Kurzstatus

- nachbar-io master HEAD `b8309e6` (41 Commits vor `origin/master = 155a0bb`, NICHT gepusht).
- Vor Claude-Dokuarbeit war der Working Tree clean. Diese Audit-Datei plus
  `docs/plans/handoff/INBOX.md` sind die einzigen neuen Dateien/Aenderungen.
  Lint 0/0, tsc clean, Vitest gruen (city-services-Fixture-Datum heute morgen
  von Codex auf 2030 gehoben, Commit `b8309e6`).
- Closed-Pilot weiter LIVE auf `nachbar-io.vercel.app` mit Stand `155a0bb`.
- Mig 176/177/178 als lokale Files, NICHT auf Prod.
- HR-Eintragung: NICHT abgeschlossen. Volksbank-Antrag am 2026-04-29 abgelehnt; Qonto-Antrag in Vorbereitung; DATEV-Kompatibilitaet vorab mit Albiez klaeren (Mail-Entwurf liegt im Vault `firmen-gedaechtnis/01_Firma/Albiez-Anschlussfrage-DATEV-Qonto.md`).
- AVV-Provider-Status: alle relevanten Anbieter offen (Anthropic, Mistral, Supabase, Vercel, Resend, Twilio, Stripe, OpenAI). Quelle: Vault `firmen-gedaechtnis/01_Firma/GmbH-Provider-Vertraege-AVV-Uebersicht.md`.
- Pilot-Familien-Anschreiben + Rueckseite + Kontakt-Liste-Vorlage druck-fertig im Vault `08_Marketing/`.

Gesamtbild: Phase 1 ist **technisch nahe** und **organisatorisch noch entfernt**. Keiner der Hard-Gates aus der Pre-Flight-Checkliste ist heute final erledigt; mehrere Gates sind ohne HR-Eintragung gar nicht erreichbar (AVV mit GmbH, Stammkapital-Nachweis).

---

## 2. Tabelle: Pre-Flight-Hard-Gates klassifiziert

Klassifikation:
- `OPEN-FOUNDER` — wartet ausschliesslich auf Founder-Aktion ausserhalb des Codes.
- `LOCAL-DONE` — Code-/Doku-seitig in nachbar-io erkennbar erledigt; muss vor Tag X nochmals frisch verifiziert werden.
- `LOCAL-PARTIAL` — teilweise erledigt, mit definierter Luecke.
- `UNKLAR` — Quelle nicht eindeutig auffindbar; vor Tag X klaeren.

| # | Gate | Quelle (Pre-Flight Abschnitt) | Status | Naechste Founder-Aktion |
|---|------|------------------------------|--------|--------------------------|
| 1 | HR-Eintragung Theobase GmbH AG Freiburg | §1 Hard-Gates | OPEN-FOUNDER | Qonto-Konto eroeffnen → 25k einzahlen → Bankbestaetigung an Notar Stadler → HR-Anmeldung. Vorab Albiez DATEV-Qonto klaeren (Mail-Entwurf liegt). |
| 2 | Stammkapital 25.000 EUR Bankbestaetigung | §1 Hard-Gates | OPEN-FOUNDER | Direkt abhaengig von Gate 1. Erst Konto, dann Einzahlung, dann Bestaetigung. |
| 3 | Datenschutzerklaerung nennt GmbH (nicht nur i.G.) | §1 Hard-Gates | LOCAL-PARTIAL | `app/datenschutz/page.tsx` nennt aktuell nur "Thomas Theobald" als Verantwortlicher (private Adresse, GMX-Mail), keine GmbH-Erwaehnung im §1 Verantwortlicher-Block. `app/impressum/page.tsx` hat einen expliziten Hinweis-Block "Theobase GmbH in Gruendung"; verantwortlich bleibt aber Thomas Theobald privat. Zusaetzlicher Drift: der Impressum-Hinweis sagt noch, die Beurkundung sei fuer den 27.04.2026 geplant, obwohl sie laut Memory bereits am 27.04.2026 erfolgt ist. **Vor Tag X:** Datenschutz und Impressum auf den tatsaechlichen Rechtsstand bringen; spaetestens nach HR-Nummer auf eingetragene GmbH umstellen — Founder-Hand-Doku fuer Codex/Claude-Auftrag. |
| 4 | Beta-AGB / Pilot-Hinweis: kostenlos, Widerruf, Funktionsgrenzen | §1 Hard-Gates | LOCAL-PARTIAL | `app/agb/page.tsx` existiert. Es enthaelt `§10 Pilotbetrieb`, kostenlose Pilot-/Free-Hinweise und Funktionsgrenzen; `app/impressum/page.tsx` nennt ebenfalls kostenlosen, geschlossenen Pilotbetrieb. Offen bleibt, ob die AGB-Texte auf die aktuelle Rechtsform/GmbH i.G. angepasst und ob der Pilot-Hinweis im Registrierungsflow explizit bestaetigt werden soll. Pilot-Bedingungen liegen zusaetzlich auf der Rueckseite des Pilot-Familien-Anschreibens im Vault `firmen-gedaechtnis/08_Marketing/Pilot-Familien-Anschreiben-Bad-Saeckingen.md`. |
| 5 | KI-AVV (Anthropic ODER Mistral) | §1 Hard-Gates | OPEN-FOUNDER | Vault `GmbH-Provider-Vertraege-AVV-Uebersicht.md` zeigt: beide offen. AVV erst nach HR sinnvoll (Vertragspartner = GmbH). Alternative ohne AVV: KI hart aus halten via `AI_PROVIDER_OFF=true` — ist im Phase-1-Preset bereits so vorgesehen (siehe `lib/feature-flags-presets.ts`). |
| 6 | Twilio-AVV (nur falls SMS/Telefonie aktiv) | §1 Hard-Gates | LOCAL-DONE (im Preset) | Phase-1-Preset hat `TWILIO_ENABLED=false` (siehe Mig-178-File-Inhalt + `lib/feature-flags-presets.ts`). Solange Phase-2c nicht aktiviert wird, ist Twilio-AVV nicht akut notwendig. **Founder-Aktion:** Bestaetigen, dass kein SMS/Telefonie-Feature in Phase 1 live ist. |
| 7 | Test-User-Cleanup Dry-Run-Skript | §2 Test-User-Cleanup | LOCAL-DONE | `lib/admin/ai-test-users-cleanup-dry-run.ts` existiert. Vor Tag X einmal lokal laufen lassen, Counts dokumentieren. |
| 8 | Test-User-Cleanup Execute-Pfad | §2 Test-User-Cleanup | UNKLAR | Kein Execute-Skript im Repo auffindbar (`Glob: lib/admin/ai-test-users-cleanup*` liefert nur Dry-Run). Codex-Backlog Welle D ist noch offen. **Vor Tag X:** Execute-Pfad bauen lassen (TDD, Hart-Stop bei Admin-Treffer, Audit-Log-Pseudonymisierung). |
| 9 | Mig 176 `feature_flags_audit_log` auf Prod | §3 Migrations-Apply | OPEN-FOUNDER | File liegt (`supabase/migrations/176_feature_flags_audit_log.sql`), NICHT auf Prod. Apply ist Rote Zone. Audit-Reader toleriert Fehlen (Empty-State, Commit `672b58a`), aber ohne Mig entsteht kein Audit-Trail. |
| 10 | Mig 177 `pilot_phase_flags` auf Prod | §3 Migrations-Apply | OPEN-FOUNDER | File liegt, NICHT auf Prod. Apply ist Rote Zone. |
| 11 | Mig 178 `pilot_phase_1_defaults` auf Prod | §3 Migrations-Apply | OPEN-FOUNDER (apply-later) | File liegt, **bewusst NICHT vorab applizieren**. Erst am Tag X nach Phase-1-Schalter. |
| 12 | Vercel Production `NEXT_PUBLIC_PILOT_MODE=true` | §4 Vercel/Env | LOCAL-DONE | Memory-Stand: gesetzt in Production. Frische Verifikation via `vercel env ls production | grep NEXT_PUBLIC_PILOT_MODE` ist Founder-Hand. |
| 13 | Vercel Preview `NEXT_PUBLIC_PILOT_MODE=true` | §4 Vercel/Env | OPEN-FOUNDER | Memory-Stand: offen seit CLI-Quirk 2026-04-29. Aenderung ist Rote Zone. |
| 14 | Workflow-Cron deaktiviert, nur `workflow_dispatch` | §4 Vercel/Env | LOCAL-DONE | `.github/workflows/deploy.yml` Schedule entfernt 2026-04-30 (Commit `28889cd`). |
| 15 | master-Push (Phase-1-Schalter Schritt 5) | §5 Phase-1-Schalter | OPEN-FOUNDER | Wartet auf HR + AVV. Lokal `b8309e6`, 41 ahead. |
| 16 | Vercel-Deploy nach Push (Phase-1-Schalter Schritt 6) | §5 Phase-1-Schalter | LOCAL-AUTHORIZED | Vercel-Deploy ist seit 2026-04-30 KI-Hand (Memory `feedback_vercel_deploy_ki_hand.md`). Erst nach Push sinnvoll. |
| 17 | Pilot-Familien-Liste finalisieren | §5 Phase-1-Schalter Schritt 1 | OPEN-FOUNDER | Vorlage liegt im Vault `firmen-gedaechtnis/08_Marketing/Pilot-Familien-Kontakt-Liste.md`. Klingeln gehen + Rueckmeldungen einsammeln. |
| 18 | Anschreiben gedruckt mit finaler Telefon + Adresse | §5 Phase-1-Schalter Schritt 1 | OPEN-FOUNDER | Anschreiben-Vorlage druck-fertig im Vault `08_Marketing/Pilot-Familien-Anschreiben-Bad-Saeckingen.md`, Founder-Hand-TODO am Ende der Datei: "Telefonnummer einsetzen, Adresse einsetzen, HR-Status aktualisieren falls eingetragen". |

---

## 3. Offene Risiken vor echten Pilot-Familien

Sortiert nach Eintritts-Wahrscheinlichkeit x Schaden, Hoechste zuerst.

1. **Datenschutz/Impressum-Drift zwischen Live-Seite und realer Rechtsform.** Aktuell zeigt `app/datenschutz/page.tsx` Thomas Theobald privat als Verantwortlicher; `app/impressum/page.tsx` nennt zusaetzlich "Theobase GmbH in Gruendung" als Hinweis. Sobald HR-Nummer vorliegt, muessen beide Texte synchron auf die GmbH umgestellt werden — sonst hat eine Pilot-Familie einen Vertrag-Empfaenger, der formal nicht existiert. **Mitigation:** vor Tag X Codex-Auftrag fuer Text-Update, gegengelesen durch Claude/Founder.

2. **AGB existieren, aber Pilot-/Rechtsform-Drift ist noch offen.** `app/agb/page.tsx` ist im Browser erreichbar und enthaelt Pilotbetrieb, kostenlose Nutzung und Funktionsgrenzen. Gleichzeitig nennt der Geltungsbereich noch Thomas Theobald privat als Betreiber und die AGB stehen auf Maerz 2026. Wenn echte Pilot-Familien sich online registrieren, sollte klar sein, ob diese AGB plus Print-Anschreiben reichen oder ob ein expliziter Beta-Hinweis im Registrierungsflow erforderlich ist. **Mitigation:** Founder-Entscheidung zu separatem Beta-Hinweis; danach ggf. Codex-Auftrag fuer kleine UI-/Text-Welle.

3. **Test-User-Cleanup-Execute fehlt komplett im Code.** Dry-Run gibt nur Counts. Ohne Execute-Pfad muss vor Tag X manuell SQL gegen Prod laufen — fehleranfaellig. **Mitigation:** Codex-Welle D vor Phase-1-Schalter durchziehen.

4. **HR-Eintragung haengt an Konto-Eroeffnung, Konto haengt an DATEV-Klaerung.** Sequentielle Kette mit drei Tagen Albiez-Antwort + Qonto-Bearbeitungszeit + HR-Bearbeitungszeit. Risiko: Pilot-Akquise laeuft vor HR-Eintragung leer, weil der Print-Anschreiben "in Gruendung" sagt — manche Familien koennten das skeptisch lesen. **Mitigation:** Founder-Entscheidung, ob Anschreiben jetzt mit "in Gruendung" raus oder ob auf HR gewartet wird.

5. **Mig 176 nicht auf Prod = kein Audit-Trail bei Toggle-Aktionen am Tag X.** Audit-Reader zeigt Empty-State statt Crash, aber jede Phase-Preset-Aktion am Tag X laeuft ohne Audit-Eintrag, der spaeter belegen koennte, wer wann was geschaltet hat. **Mitigation:** Mig 176 + 177 vor Tag X als bewusste Founder-Hand-Aktion auf Prod applizieren (Rote Zone), VOR dem Phase-1-Schalter.

6. **AI_PROVIDER_OFF im Preset deckt nur die Default-Schaltung ab — keine technische Hard-Sperre.** Wenn jemand spaeter einen einzelnen KI-Flag manuell anschaltet ohne AVV, ist die Compliance gebrochen. **Mitigation:** Founder-Disziplin + Audit-Reader (sobald Mig 176 live).

7. **Pilot-Familien-Anschreiben nennt 4 Kanaele "Web/Tablet/Smartphone/Mini-Computer im Wohnzimmer mit grossen Tasten".** Der Mini-Computer ist die Senior-App-Stufe-1 (Tauri Windows-Wrapper, Stand laut Memory: lokal entwickelt, NICHT auf AWOW deployed). Wenn eine Pilot-Familie das anfragt, ist die Auslieferung organisatorisch nicht vorbereitet. **Mitigation:** Founder-Entscheidung, ob Senior-App-Mini-PC in Phase 1 enthalten ist oder herausgenommen wird, und Anschreiben-Wording entsprechend justieren.

---

## 4. Was Codex technisch weiter pruefen sollte

Reihenfolge nach Codex-Backlog `memory/project_folge_wellen_codex_backlog.md` und Hard-Gate-Prioritaet:

1. **Welle D — Test-User-Cleanup-Execute-Pfad.** Hoechste Prioritaet, weil Hard-Gate #8 sonst am Tag X handgeklickt werden muss. Code + Tests bauen, kein Run gegen Prod. Pflicht-Env `AI_TEST_CLEANUP_MODE=execute` plus manuelle Bestaetigung-Eingabe.
2. **Welle C — Audit-Log-Smoke gegen Cloud-Modus.** 30 min, beweist Robustness-Fix `672b58a` an Prod ohne Mig 176. Read-only.
3. **Welle B — 3 it.skip-Tests reaktivieren.** Reduziert Tech-Debt vor Push.
4. **Vitest-Setup nachbar-pflege.** Eigener Folge-Block, nicht Phase-1-blockierend.
5. **NEU: AGB/Beta-Hinweis fuer Pilot-Onboarding schaerfen.** Wenn Founder entscheidet, dass die bestehende `/agb`-Seite nicht reicht, kann Codex einen expliziten Beta-Hinweis im Registrierungsflow oder eine kurze `/pilot-agb`-Seite aus dem Vault-Anschreiben ableiten. Codex-Welle, NICHT vor Founder-Go.
6. **NEU: Datenschutz/Impressum-Update auf eingetragene GmbH.** Erst sobald HR-Nummer vorliegt. Codex-Auftrag mit konkreten Diff-Punkten (Verantwortlicher, HRB, Geschaeftsfuehrer, USt-IdNr.).

---

## 5. Was ausdruecklich Rote Zone bleibt

Quellen: `feedback_vercel_deploy_ki_hand.md`, Pre-Flight §9, `AGENTS.md`.

| Aktion | Wer | Wann |
|---|---|---|
| `git push origin master` | Founder | Erst nach HR + AVV |
| `git push --force` / `--force-with-lease` (z.B. feature/hausverwaltung) | Founder | Vor naechstem Hausverwaltungs-Strang |
| Mig 176 + 177 auf Prod applizieren | Founder | Vor Tag X als bewusste Aktion |
| Mig 178 auf Prod applizieren | Founder | AM Tag X, nicht vorher |
| Vercel-Env `NEXT_PUBLIC_PILOT_MODE` aendern | Founder | Nur Preview-Branch braucht noch Setzen |
| Andere Vercel-Env-Aenderungen | Founder | Immer |
| Stripe-Live-Aktivierung / Webhook-Secret | Founder | Phase 2a, nicht Phase 1 |
| Twilio-Live-Aktivierung | Founder | Phase 2c, nicht Phase 1 |
| KI-Provider live ohne AVV | nicht erlaubt | nie |
| Prod-DB-DELETE (z.B. AI-Test-User-Cleanup-Execute) | Founder | Vor Tag X als bewusste Batch-Aktion |
| PITR-Restore | Founder | Nur im Schadensfall |
| Verarbeitung echter personenbezogener Daten durch KI | Founder + AVV | Phase 2b nach AVV |

---

## 6. Vom Audit nicht entschieden

Diese Datei sortiert nur. Die folgenden Entscheidungen liegen beim Founder:

- Wann HR-Eintragung beantragen — abhaengig von Konto + DATEV-Klaerung.
- Ob Anschreiben mit "in Gruendung" raus oder erst nach HR.
- Ob Beta-AGB als Live-Seite gebaut wird oder Print-Beleg reicht.
- Ob Senior-App-Mini-PC in Phase 1 enthalten ist.
- Reihenfolge der Codex-Backlog-Wellen B/C/D.
- Wann Mig 176 + 177 auf Prod appliziert werden.

---

## 7. Quellen

- `docs/plans/2026-04-30-phase-1-pre-flight.md` (Pre-Flight-Checkliste, Codex Welle H)
- `docs/plans/handoff/INBOX.md` (Codex-Wellen-Historie C1-G5, H, I)
- `lib/feature-flags-presets.ts` (Phase-1-Preset, Phase-2a-2e)
- `lib/admin/ai-test-users-cleanup-dry-run.ts` (existiert)
- `app/datenschutz/page.tsx`, `app/impressum/page.tsx`, `app/agb/page.tsx` (Live-Texte)
- `supabase/migrations/176_*`, `177_*`, `178_*` (lokal vorhanden)
- Vault `firmen-gedaechtnis/01_Firma/GmbH-Provider-Vertraege-AVV-Uebersicht.md`
- Vault `firmen-gedaechtnis/01_Firma/Albiez-Anschlussfrage-DATEV-Qonto.md`
- Vault `firmen-gedaechtnis/08_Marketing/Pilot-Familien-Anschreiben-Bad-Saeckingen.md`
- Vault `firmen-gedaechtnis/08_Marketing/Pilot-Familien-Kontakt-Liste.md`
- Auto-Memory `feedback_vercel_deploy_ki_hand.md`, `feedback_keine_pause_vorschlagen.md`
