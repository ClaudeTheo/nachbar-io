# App-Analyse nachbar-io / QuartierApp — Ergebnis (Fable 5, Ultracode)

> **Auftrag:** `docs/plans/2026-06-06-fable5-ultracode-app-analyse-auftrag.md` — Read-only-Analyse der ganzen App in 4 Stoßrichtungen, Schwerpunkt KI & DSGVO.
> **Erstellt:** 2026-06-12. **Keine Code-Änderungen vorgenommen.** Diese Datei + die Detail-Befundliste sind der einzige Output (unkommittet, Founder entscheidet).
> **Methode:** 16 spezialisierte Finder-Agenten (A1–A4, B1–B3, C1–C3, D1–D6) + 1 Architektur-Agent, danach adversariale Skeptiker-Verifikation jedes Befunds im Code. **93 Befunde, 92 bestätigt, 1 widerlegt.** Alle Aussagen sind mit Datei:Zeile belegt — Volltext aller Befunde in `2026-06-12-fable5-app-analyse-befunde-detail.md`.
> **Ehrliche Einschränkungen:** Verifikation lief wegen Token-Limits im Batch-Modus (6 Skeptiker statt 92 Einzel-Agenten); die geplante Vollständigkeits-Nachrunde entfiel. Nicht geprüft: Mehrsprachigkeit, E-Mail-Inhalte im Detail. Der Architektur-Vorschlag wurde von mir statt von einem Gegenreview-Agenten geprüft.

---

## 1. Gesamtbild

**Die App ist deutlich besser gebaut, als 19 Module bei einem Solo-Founder vermuten lassen — aber sie ist auf der Senior-Seite an den Übergängen kaputt, nicht an den Screens.**

Was **gut** ist (und so bleiben soll):

- **112/110-zuerst ist vorbildlich umgesetzt** — EmergencyBanner mit Focus-Trap, blockiertem Escape, Zwei-Button-Bestätigung; persistente 112-Leiste in beiden Senior-Layouts. Verifiziert in mehreren Findern unabhängig.
- **Der lokale Nutzen ist real, nicht Demo:** Müllkalender = echter ICS-Sync vom AWB Waldshut mit Cron, Wetter live (Open-Meteo, ohne Key), Pollen DWD, Warnungen NINA/DWD/UBA, Apotheken/ÖPNV für Bad Säckingen geseedet. „Hier bei mir" ist für jeden frischen Nutzer **nie leer** — das ist der stärkste Pilot-Trumpf.
- **Backend-Disziplin:** Family-Setup-Token gehasht + Single-Use atomar + Audit, Consent-Checks pro API-Call (nicht nur beim Opt-in), Memory-Fakten AES-verschlüsselt mit Audit-Log ohne Klartext, Widerruf löscht sofort kaskadiert, Stellvertreter-Einwilligung korrekt blockiert (Caregiver bekommt 403).
- **Senior-Markup hält die eigenen Regeln weitgehend ein:** 80px+-Touch-Targets fast überall inline erzwungen (SOS 100px, Kacheln 160px), Tap-Tiefen im Limit, OTP-Eingabe statt Magic-Link, ehrliche Login-Fehlertexte.

Die **drei Kernmuster** hinter den 92 Befunden:

1. **Sackgassen statt Fehlertoleranz.** Einzelscreens sind seniorengerecht, aber Flows enden im Pilot-Zustand tot: Schreiben nur per Sprachdiktat → 503 bei KI-aus → kein Tipp-Fallback; Senior nach Konto-Aktivierung ausgeloggt auf der Marketing-Landing; Kurzcode ohne Eingabemaske; Geräte-Pairing ohne Angehörigen-Seite; kaputter „Verbundene Angehörige"-Link. **Wo verliert man die 75+-Zielgruppe? Genau hier.**
2. **Schalter- und Erfolgs-Illusionen.** Feature-Flags, die Seiten nicht wirklich abschalten (nur 2 Seiten nutzen FeatureGate); zwei halbe KI-Off-Switches mit invertierter Abdeckung und 9+ Direkt-Calls an Providern vorbei; Check-in, der still mit 503 scheitert; Legacy-Check-in, der in eine deprecated Tabelle schreibt und trotzdem „Ihre Vertrauensperson wird informiert" verspricht. **Falsche Beruhigung ist der gefährlichste Fehlertyp dieses Produkts.**
3. **Versprechen-vs.-Code-Drift.** Datenschutzerklärung beschreibt andere Datenflüsse als der Code (Audio an OpenAI fehlt komplett); Pricing/B2B nennt Features, die es nicht gibt; die Pseudonymisierungs-Schicht existiert nur als ungepushter lokaler Commit; ein Kontrast-Kommentar rechnet mit einem Token, das längst geändert wurde. **Der Code ist autoritativ — und er widerspricht an diesen Stellen der Doku.**

**Realismus-Einordnung:** Bei 0 echten Nutzern und KI hart aus (keine API-Keys für die kritischen Pfade in Prod nötig) ist **nichts davon ein akuter Incident**. Aber 62 der 92 Befunde sind pilotstart-relevant — und 57 sind Quick-Wins.

---

## 2. Top 5 sofort (vor dem ersten Pilot-Haushalt, alles S-Aufwand)

| # | Was | Befunde | Warum zuerst |
|---|---|---|---|
| **1** | **KI-Schutzschicht in den deploybaren Stand bringen:** lokalen Commit `9294485` (lib/ai/pseudonymize.ts + Verdrahtung an allen Provider-Callsites inkl. Kiosk-Consent-Gate) nach Pre-Push-Mini-Audit pushen/mergen. *(Founder-Go: Push = Rote Zone)* | D1:1, D2:2 | Die Doku sagt „Pseudonymisierung gebaut", der deploybare Code sendet alles im Klartext. Die Datenschutzerklärung nennt Pseudonymisierung sogar als Freischalt-Voraussetzung der KI. Der Fix ist fertig und getestet — er liegt nur auf dem falschen Branch. |
| **2** | **Schatten-KI-Routen schließen:** `/api/prevention/session` (KI ohne Off-Switch, ohne Consent, ohne Rate-Limit — bei den sensibelsten Inhalten der App) und `/api/kiosk/companion` (Default Google Gemini US mit Search-Grounding, kein Consent-Gate, nicht in der Datenschutzerklärung) gaten oder stilllegen. | D5:2, D1:2, D5:3, D6:2 | Das sind die einzigen Nutzer-Pfade, die Personenbezug ganz ohne Einwilligungsprüfung an Provider senden könnten — ausgerechnet Prävention (Art-9-nah) und das Senioren-Gerät. Je ~1 Stunde. |
| **3** | **Senior-Onboarding-Brüche fixen:** (a) `/welcome`-Tour darf den bei Registrierung gewählten `ui_mode` nicht still mit „active" überschreiben (OnboardingFlow lädt den bestehenden Modus bzw. handleSkip fasst ihn nicht an); (b) nach Family-Setup-Claim den Senior direkt einloggen (`signInWithPassword` mit vorliegenden Credentials) statt ihn ausgeloggt auf die Landing zu werfen. | A1:1, A2:2 | (a) zerstört den Kern-USP: Ein Senior, der „Einfach" wählt und die Tour überspringt, landet dauerhaft in der komplexen Standard-UI — das verfälscht jeden Pilot-Test ab Minute 1. (b) ist die größte Abbruchstelle des gesamten Einrichtungs-Flows; ein 5-Zeilen-Fix. |
| **4** | **Stumme Fehler & Kontrast auf den Senior-Kernscreens:** Check-in-Fehlerpfad mit großer Meldung + `role="alert"` (Muster existiert in DailyCheckinButton); SeniorButton-Primary auf Weiß-auf-Grün (heute Anthrazit auf Petrol ≈ 2,1:1); Weiß-auf-Gelb/Amber-Buttons auf Anthrazit-Text (Lösung existiert im alert-Variant). | B3:1, A3:1, B1:1, B1:2 | „Mir geht es gut" tippen und nichts sehen = falsche Sicherheit für die Familie. Und ausgerechnet Kern-Buttons des Geräts fallen durch jede Kontrast-Schwelle — bei grauem Star faktisch unsichtbar. Je 1 Zeile bis 1 Komponente. |
| **5** | **Ersten Klick auf den lokalen Nutzen lenken:** Dashboard-Primary-Action im Pilot auf `/hier-bei-mir` statt `/gruppen` (leer im Pilotquartier); Senior-Hub „Mein Quartier" von 12 auf 6–7 Kacheln mit garantiertem Inhalt reduzieren. | A4:1, C1:2 | Der empfohlene erste Klick führt heute auf eine tote Seite, während Müll/Wetter/Apotheken zwei Klicks tief versteckt sind. 2–3 Leer-Erlebnisse und eine 78-Jährige öffnet die App nicht mehr. |

---

## 3. Top 5 strategisch (größere Würfe, Reihenfolge = Empfehlung)

| # | Was | Befunde | Aufwand |
|---|---|---|---|
| **1** | **Ein KI-Gateway statt verstreuter Checks:** `runAiRequest()`-Wrapper in `lib/ai/`, der Consent (`canUsePersonalAi`), Off-Switch (Env **und** DB-Flag, **fail-closed** statt heute fail-open bei DB-Fehler), Rate-Limit, PII-Gate und ein Metadaten-Audit-Log (nie Klartext) bündelt; alle 9+ Direkt-SDK-Calls auf `getProvider()` umziehen; Grep-basierter Inventar-Test, der bei neuem `new Anthropic(`/`api.openai` außerhalb `lib/ai/` failt. | D5:1, D5:4, D6:1, D2:3, Arch §6 | M–L |
| **2** | **AVV-Konsolidierung auf 2 KI-Anbieter + EU-Pfad:** Mistral EU (Chat + Formulate + Classify + STT/Voxtral) + Microsoft Azure EU (TTS) — OpenAI und Google fliegen komplett raus, Anthropic nur nach A/B-Vergleich mit ZDR behalten. Parallel die Datenschutzerklärung an die **realen** Datenflüsse anpassen (heute fehlt „Audio an OpenAI" komplett; TTS liest private Inhalte, nicht nur „öffentliche Texte"). Statt 4+ KI-AVVs nur noch 2 — für eine Ein-Personen-GmbH der Unterschied zwischen machbar und nicht machbar. | D6:3, D2:1, Arch §2/§4 | M |
| **3** | **Eine Senior-Welt:** Legacy `app/senior/*` stilllegen (Redirect auf `(senior)`-Routen) — deren Check-in schreibt in eine seit Mig 032 deprecatete Tabelle und meldet immer Erfolg inkl. „Vertrauensperson wird informiert"; SeniorStatusScreen-Redirect auf `/kreis-start` statt `/senior/home`; „Hier bei mir" in die Senior-Shell holen (heute fällt der Senior beim Tap auf seine zentrale Kachel in die dichte Standard-UI mit text-xs). | A3:2, A4:4, B1:6 | M |
| **4** | **Die Senior-Hälfte des Familienkreises bauen** — das Phase-1-Versprechen ist heute einseitig: Die Familie sieht den Senior, der Senior sieht niemanden. Konkret: (a) „Mein Kreis"-Reverse-View (verbundene Angehörige als große Kacheln mit Nachricht/Anruf); (b) kaputten Dashboard-Link fixen + die zwei parallelen Chat-UIs auf `/chat` vereinheitlichen **und Push/Notification serverseitig in sendMessage** (heute erfährt niemand von neuen Nachrichten im neuen Pfad); (c) Tipp-Fallback im Schreiben-Flow („Lieber tippen"-Button — die Textarea existiert schon, ist nur unerreichbar); (d) Kurzcode-Eingabeweg + „Geräte verbinden"-Abschnitt auf der Angehörigen-Detailseite (Backend ist fertig, nur die Brücke fehlt). | C2:1–C2:4, A1:2, A3:3, A2:1, A2:3 | M–L |
| **5** | **Pilot ehrlich verschlanken:** Feature-Gating real machen (UGC-Seiten wrappen oder Route-Positivliste; Mig-178-Key-Mismatch korrigieren, sonst ist der Phase-1-Schalter ein No-op), tote Bezahl-/Buchungspfade verstecken, Pricing-/B2B-Claims auf den Ist-Stand trimmen (9→6 Kategorien, Pegel raus, Push-Zusatz raus, Moderation-Bullet raus), tote Marketing-Landing entschärfen („Lebenszeichen-Überwachung" → Bann-Listen-Verstoß, MPG-Verweis veraltet) oder löschen. | C1:1, C1:5, C3:1, B2:1, B2:2 | S–M |

**Feature-Ideen für den Pilot (aus C2, bewusst „besser statt mehr"):**

1. **„Erster gemeinsamer Moment":** Nach erfolgreichem Pairing wird der Angehörige direkt aufgefordert, ein Foto/eine Sprachnachricht zu senden, die groß auf dem Senior-Home erscheint. *(S — reine Wiederverwendung von chat-media; Daten bleiben in Supabase EU.)*
2. **Wochenrückblick aus dem Kreis** als Push an Angehörige (Check-ins erledigt, Nachrichten, nächster Termin) — bewusst **ohne** KI-Zusammenfassung, Wording bann-listen-konform (kein „Bericht", kein „Monitoring"). *(M — digest-cron.service.ts existiert.)*
3. **Foto-Teilen auf Senior-Home:** neuestes Familienfoto groß mit Ein-Tap-Sprachantwort. *(S–M — media-upload.service + AudioRecorder existieren.)*

---

## 4. Stoßrichtung A — Flow & Onboarding

**Antwort auf die Leitfrage:** Ein Senior braucht von „App geöffnet" bis zum eigenen Startbildschirm **~25–30 Interaktionen** (5 Registrierungs-Schritte, E-Mail-Wechsel, 6-stelliger Code, 7-Slide-Tour). Die erste sinnvolle Aktion ist danach teilweise **gar nicht erreichbar**: „Nachricht an Familie" endet in der Sprachdiktat-Sackgasse (503 bei KI-aus, kein Tipp-Fallback), der Check-in hat auf `/kreis-start` keine Kachel. Gut: OTP-Code-Eingabe, ehrliche Login-Fehlertexte, DSGVO-saubere KI-Einwilligung (Standard aus, „Später entscheiden", kein Dark Pattern), Backend des Family-Setups (Token gehasht, Single-Use, Audit). Die Reibung liegt in den **Übergängen**, nicht in den Screens.

| ID | Befund | Sev | Aufwand | QW |
|---|---|---|---|---|
| A1:1 | /welcome-Tour überschreibt gewählten ui_mode still mit „active" | high | S | ✓ |
| A1:2 | „Schreiben" = Sackgasse: nur Sprachdiktat, KI aus, kein Tipp-Fallback | high | M | — |
| A1:3 | Leerzustände werfen den Senior aus dem Einfach-Modus in die Standard-App | med | M | — |
| A1:4 | Check-in vom Senior-Start /kreis-start nicht erreichbar | med | S | ✓ |
| A1:5 | Registrierung für 75+ zu lang; Modus doppelt gefragt | med | M | — |
| A1:6 | Senior-UI bewirbt KI-Funktionen, die im Pilot aus sind | low | S | ✓ |
| A2:1 | Kurzcode ohne Eingabeweg, kein „Link teilen" — Fern-Einrichtung unmöglich | high | M | ✓ |
| A2:2 | Nach Konto-Aktivierung ausgeloggt auf der Landing-Page | high | S | ✓ |
| A2:3 | Geräte-Pairing: Angehörigen-Seite fehlt — Wiederherstellung unmöglich (Backend fertig!) | high | M | — |
| A2:4 | Senior-Einwilligung `pending_senior_confirm` kann nie erteilt werden | med | M | — |
| A2:5 | Claim-Formular nicht seniorengerecht; Senior ohne E-Mail ausgeschlossen | med | M | — |
| A2:6 | Einstieg in /profile vergraben; Beziehungstyp hart „Kind" | low | S | ✓ |
| A3:1 | Check-in scheitert in Pilot-Flag-Konfiguration still (503, keine Meldung) | high | S | ✓ |
| A3:2 | Zwei Senior-Welten; Legacy-Check-in → deprecated Tabelle, meldet immer Erfolg | high | M | — |
| A3:3 | Schreiben-Flow: irreführende „später versuchen"-Meldung, kein Tastatur-Fallback | high | M | ✓ |
| A3:4 | SOS: keine Entwarnung am Gerät (Cancel-API existiert); Abo-Upsell-Text im Notfall-Flow | med | M | — |
| A3:5 | Medikamente/Sprechstunde: stille Fehler; Zurück-Links in die Voll-App | med | S | ✓ |
| A3:6 | Kein Offline-/Fehler-Konzept in der Senior-Gruppe (keine error.tsx) | med | S | ✓ |
| A4:1 | Erster Klick führt in leere Gruppen statt zum immer-vollen „Hier bei mir" | high | S | ✓ |
| A4:2 | Müll-Anzeige ignoriert abgesagte Termine + Quartier-Scoping | med | S | ✓ |
| A4:3 | Zwei NINA-Pipelines: Vorlesen-Überblick kann Warn-Banner widersprechen | med | M | — |
| A4:4 | Senior verlässt bei „Hier bei mir" die komplette Senior-Shell | med | M | — |
| A4:5 | Kein-Quartier-Zustand: private GMX-Adresse + Verwaltungsjargon | low | S | ✓ |
| A4:6 | Wetter/Pollen hartkodiert Bad Säckingen (Rheinfelden/Köln existieren schon) | low | S | ✓ |

---

## 5. Stoßrichtung B — Design & Accessibility

**Antwort auf die Leitfrage:** Die Senior-Vorgaben sind **echt umgesetzt, nicht nur dokumentiert** — 80px+-Targets fast flächendeckend, 112-Leiste fix, EmergencyBanner vorbildlich (role=alertdialog, Focus-Trap). **Größte Lücke: Kontrast** — drei Kern-Buttons fallen durch jede Schwelle (weiß-auf-gelb ≈2,0:1, Anthrazit-auf-Petrol ≈2,1:1 nach Token-Änderung, die der Code-Kommentar verschlafen hat). Beim Design-System leben **zwei Welten parallel**: saubere Tokens in globals.css gegen 1132 Bracket-Hex-Klassen mit **anderen** Markenwerten (CLAUDE.md und globals.css widersprechen sich bei den Primärfarben!), 224 rohe `<button>` gegen 38 shadcn-Buttons. Die Live-Landing (Closed-Pilot) ist vorbildlich; die **tote** Marketing-Landing enthält Wording-Verstöße. A11y-Grundlagen überraschend solide (focus-visible, Skip-Link, reduced-motion, echte Labels) — aber ausgerechnet die Senior-Geräte-Screens sind schlechter mit Live-Regionen ausgestattet als das normale Dashboard.

| ID | Befund | Sev | Aufwand | QW |
|---|---|---|---|---|
| B1:1 | SeniorButton-Primary ≈2,1:1 — Token-Änderung hat Kontrast gebrochen | high | S | ✓ |
| B1:2 | Weiß auf Gelb/Amber ≈2,0–2,2:1 auf Check-in-/Medikamenten-Buttons | high | S | ✓ |
| B1:3 | Sekundär-Infos in text-gray-400 (2,5:1) und 14px im Senior-Pfad | med | S | ✓ |
| B1:4 | Schreiben-Flow: 6 Taps + WhatsApp-Wechsel — verletzt Max-4-Taps | med | M | — |
| B1:5 | 56px/44px-Targets im Schreiben-Flow vs. „80px Pflicht" in DESIGN.md | med | S | ✓ |
| B1:6 | Zwei parallele Senior-UIs mit widersprüchlichen Patterns | med | L | — |
| B2:1 | Tote Marketing-Landing mit Wording-Verstößen („Lebenszeichen-Überwachung", MPG) = Reaktivierungs-Landmine | high | S | ✓ |
| B2:2 | Öffentliche /b2b-Seite: `${plan.name}`-Bug im mailto, alte Firmierung, GMX-Adresse | med | S | ✓ |
| B2:3 | Zwei Farbsysteme: Tokens vs. 1132 Hex-Klassen mit abweichenden Werten | med | M | — |
| B2:4 | Komponenten-Wildwuchs: 224 rohe button vs. 38 shadcn, 10 Eigenbau-Modals | med | L | — |
| B2:5 | Dark-Mode ist Dead Code (kein ThemeProvider) — undokumentiert | low | S | ✓ |
| B3:1 | Senior-Check-in scheitert komplett stumm (kein error-State, kein role=alert) | high | S | ✓ |
| B3:2 | SOS-Status „Hilfe ist unterwegs!" für Screenreader unhörbar + Auto-Redirect ohne Ausweg | high | M | — |
| B3:3 | SOS-Kategorienwahl: Fehler ohne role=alert | med | S | ✓ |
| B3:4 | OTP: Fehler unhörbar, Felder stumm geleert, autoComplete fehlt | med | S | ✓ |
| B3:5 | Bedeutungstragende Emojis ohne aria-hidden | low | S | ✓ |
| B3:6 | Senior-Layout: fixe 20px-Schrift — Systemschriftgröße greift nicht voll | low | S | ✓ |

---

## 6. Stoßrichtung C — Funktionen & Produkt

**Antwort auf die Leitfrage:** Der Familienkreis-Kern ist **nur auf der Angehörigen-Seite rund** — die Check-in-Kette (3-Phasen-Cron, Push/SMS bann-listen-konform, 30-Tage-Historie) ist vorbildlich. Auf der Senior-Seite ist der Kreis fragmentiert: kaputter Kern-Link, leere „Mein Kreis"-Ansicht (rendert die Angehörigen-Perspektive), kein Senior-startbarer Familien-Videoanruf (WebRTC-Infrastruktur existiert komplett!), Termine ohne Gegenseite. **Von 19 Modulen braucht der Pilot ~8** — der Rest ist im besten Fall leer (UGC bei 0 Nutzern), im schlechtesten eine Gating-Illusion (Flags aus, Seiten trotzdem erreichbar). Pro Community ist **pilotreif für Bad Säckingen, Demo-reif fürs Verkaufsgespräch, aber nicht self-service-verkaufbar** an eine zweite Kommune (Hardcoding, zwei unverknüpfte Org-Systeme) — und mehrere Pricing-Claims stimmen nicht mit dem Code überein.

| ID | Befund | Sev | Aufwand | QW |
|---|---|---|---|---|
| C1:1 | Feature-Flag-System = Gating-Illusion; Mig-178-Key-Mismatch (stiller No-op) | high | M | — |
| C1:2 | Senior-Hub: 12 Kacheln, ~Hälfte leer oder abgeschaltet | high | S | ✓ |
| C1:3 | DiscoverGrid + 25 Flags = tote Infrastruktur mit aktiver Admin-UI | med | S | ✓ |
| C1:4 | Interne Design-Previews öffentlich auf Prod-Domain whitelisted | med | S | ✓ |
| C1:5 | Tote Bezahlpfade: Buchung ausfüllen → am Ende „in Vorbereitung" | med | S | ✓ |
| C1:6 | Modul-Sprawl: ~55 Routen offen für einen Pilot, der ~8 Module braucht | med | M | — |
| C2:1 | Kaputter Kern-Link: „Verbundene Angehörige" → „Konversation nicht gefunden" | high | S | ✓ |
| C2:2 | „Mein Kreis" für den Senior leer (rendert Angehörigen-Perspektive) | high | M | — |
| C2:3 | Zwei Chat-UIs; neuer Pfad benachrichtigt niemanden (kein Push in sendMessage) | high | M | ✓ |
| C2:4 | Video: Senior kann nicht anrufen; im Senior-Layout klingelt es nicht einmal | med | S | ✓ |
| C2:5 | Termine sind kein Familienkalender (Einbahnstraße vom Voice-Flow) | med | M | — |
| C2:6 | Familienkreis im Produkt vergraben: Nav/Dashboard lenken zum Quartier-Allerlei | med | M | — |
| C3:1 | Pricing-/B2B-Claims weichen mehrfach vom Produkt ab (9 vs. 6 Kategorien, Pegel, Push, Moderation) | high | S | ✓ |
| C3:2 | Zwei parallele Kommunen-Org-Systeme (organizations vs. civic_organizations, kein FK) | high | L | — |
| C3:3 | Bad-Säckingen-Hardcoding blockiert jedes zweite Quartier | high | M | — |
| C3:4 | Org-Dashboard: 3 tote KPI-Karten, rohe UUIDs als Quartiersnamen | med | S | ✓ |
| C3:5 | org_viewer existiert in DB/Export, aber nicht im UI | med | S | ✓ |
| C3:6 | B2B-Kontakt-Button kaputt + privater GMX-Empfänger | low | S | ✓ |

---

## 7. Stoßrichtung D — KI & DSGVO (Schwerpunkt)

### 7.1 Befund-Lage

**Pseudonymisierung lückenlos? Nein — im deploybaren Stand existiert sie gar nicht.** Die komplette Schicht (`lib/ai/pseudonymize.ts`, E-Mail/Adresse/Telefon/PLZ/UUID/Namens-Selbstvorstellung, verdrahtet an allen Callsites, 88 Zeilen Tests) liegt **ausschließlich im ungepushten lokalen Commit `9294485`**. Im ausgecheckten Code gehen Chat-Historie, Roh-Transkripte, Klarnamen und entschlüsselte Memory-Fakten 1:1 an `api.anthropic.com` bzw. OpenAI. Und selbst nach dem Merge bleiben bewusste Lücken (Namen mitten im Satz, Gesundheits-Freitext) — siehe Architektur unten.

**Off-Switch fail-closed? Nein.** Zwei halbe Schalter mit invertierter Abdeckung: `AI_PROVIDER=off` (Env) wirkt nur auf die eine Route, die `getProvider()` nutzt; das DB-Flag `AI_PROVIDER_OFF` wirkt nur auf die 5 `canUsePersonalAi`-Routen — und fällt bei DB-Fehler **fail-open**. **9+ Pfade rufen Anthropic/OpenAI/Gemini direkt** am Provider-Layer vorbei; `/api/prevention/session` und `/api/kiosk/companion` haben **gar keinen** Schalter und keinen Consent-Check. Die einzige echte Pilot-Garantie ist heute das Fehlen der API-Keys in der Env (wobei OpenAI-Billing laut Memory aktiv ist und News-Crons laufen).

**Consent-Architektur: technisch stark, UX schwächer.** Consent wird **pro Call** geprüft (vorbildlich), Widerruf löscht sofort, Stellvertreter-Einwilligung korrekt blockiert, 3 Memory-Stufen + 6 Care-Features einzeln schaltbar, KI default aus. Aber: drei getrennte Einwilligungs-Orte ohne Gesamtübersicht; **1 Tap auf der Senior-Seite widerruft UND löscht unwiderruflich ohne Rückfrage** (Tremor!); „widerrufen" bedeutet je nach Modul Behalten oder Löschen; Consent-Texte mit „Claude/Mistral", „Art. 9 DSGVO", „Eskalation" reißen die Oma-Messlatte; Datenschutz-Link fehlt genau an den Gedächtnis-Consent-Stellen.

**Datenminimierung/Blocklist:** Die Medical-Blocklist greift nur beim **Speichern** — durchgerutschte Fakten werden ungefiltert in KI-Prompts injiziert. Der **PATCH-Edit-Pfad umgeht die komplette Schutzkette** (keine Blocklist, keine Verschlüsselung, kein Audit — Klartext at-rest bei gesetztem Encrypted-Flag). Dazu Fehlblockaden („Opa" durch Präfix-Match von „op"). Positiv: Audio wird **nirgends gespeichert** (STT in-memory), Logging vorbildlich ohne Klartext, Tagesrate-Limits auf den Kern-Routen.

**Transparenz (Art. 50):** Chat-UIs kennzeichnen „KI-Assistent", der Companion-System-Prompt ist vorbildlich (112/110 zuerst, keine Diagnosen, Anti-Halluzinations-Regel, „QuartierApp ist KEIN Hausnotruf"), Prävention hat deterministische Suizid-Signalwort-Erkennung **vor** dem KI-Call. Lücken: KI-News-Zusammenfassungen ohne KI-Hinweis; „kann Fehler enthalten" nur einmalig im Consent-Schritt; **Datenschutzerklärung beschreibt andere Datenflüsse als der Code** (Audio an OpenAI fehlt komplett — eine darauf gestützte Einwilligung wäre unwirksam, Art. 13/14).

| ID | Befund | Sev | Aufwand | QW |
|---|---|---|---|---|
| D1:1 | Pseudonymisierung nur als ungepushter Commit — deploybarer Code sendet Klartext | high | S | ✓ |
| D1:2 | /api/kiosk/companion: kein Consent-Gate, Default Gemini + Search-Grounding, Memory-Klartext | high | S | ✓ |
| D1:3 | Memory-Block injiziert Klarnamen + entschlüsselte sensible Fakten | med | M | — |
| D1:4 | Profile-Fakten ohne Consent-Check injiziert — Widerruf wirkt nicht auf Stufe 1 | med | S | ✓ |
| D1:5 | companion/chat umgeht Provider-Abstraktion — Schutz nur am Onboarding-Pfad | med | M | — |
| D1:6 | web_search-Tool → Tavily/Brave (US): dritter, leicht übersehener Abfluss | low | S | ✓ |
| D2:1 | Datenschutzerklärung deckt reale Voice-Flüsse nicht (Audio an OpenAI fehlt) | high | S | ✓ |
| D2:2 | Keine Pseudonymisierung in formulate/classify — Klarnamen + Art-9-Freitext roh an Anthropic | high | M | — |
| D2:3 | AI_PROVIDER_OFF fällt bei Fehlern Richtung „KI an" (fail-open) | med | S | ✓ |
| D2:4 | TTS-Cache: Client steuert „public", Bucket öffentlich, kein TTL/Löschkonzept | med | M | — |
| D2:5 | transcribe/tts/formulate ohne KI-Tageslimit (classify hat es) | low | S | ✓ |
| D2:6 | TTSButton: totes Gate `PILOT_MODE \|\| true` | low | S | ✓ |
| D3:1 | PATCH-Edit-Route umgeht Blocklist + Verschlüsselung + Audit | high | S | ✓ |
| D3:2 | Blocklist adversarial löchrig; durchgerutschte Fakten gehen an Provider | med | M | — |
| D3:3 | Präfix-Regex blockiert „Opa", „Optiker", „morgens" | med | S | ✓ |
| D3:4 | Kein Audit bei Ausleitung sensibler Fakten an die KI | low | M | — |
| D3:5 | Positiv: Consent-Kaskade, Löschpfad, GDPR-Delete sauber | — | — | — |
| D4:1 | Senior-Toggle: 1 Tap = Widerruf + unwiderrufliche Löschung ohne Rückfrage | high | S | ✓ |
| D4:3 | Consent-Texte reißen Oma-Messlatte („Claude/Mistral", „Art. 9", „Eskalation") | med | S | ✓ |
| D4:4 | Datenschutzerklärung an Gedächtnis-Consent-Stellen nicht verlinkt | med | S | ✓ |
| D4:5 | Zwei Widerrufs-Logiken für dasselbe Wort (behalten vs. löschen) | med | M | — |
| D4:6 | Ersatz-Umlaute in den rechtlich wichtigsten UI-Texten | low | S | ✓ |
| D5:1 | Kein zentraler Off-Switch: 2 halbe Schalter, 9+ Direkt-Calls | high | M | — |
| D5:2 | /api/prevention/session: KI ohne Off-Switch/Consent/Rate-Limit bei sensibelsten Inhalten | high | S | ✓ |
| D5:3 | Kiosk sendet Senioren-Freitext default an Gemini (US) — außerhalb des Plans | high | M | — |
| D5:4 | AI_PROVIDER_OFF-Flag fail-open bei DB-Fehler/fehlender Zeile | med | S | ✓ |
| D5:5 | Art-50: KI-News ohne Hinweis; Disclaimer nur einmalig | med | S | ✓ |
| D5:6 | CSP erlaubt api.anthropic.com im Browser (Altlast) | low | S | ✓ |
| D6:1 | Provider-Abstraktion von fast allen Pfaden umgangen — Anthropic hart verdrahtet | high | M | — |
| D6:2 | Kiosk-Gemini nicht in Datenschutzerklärung; AI_ACT_SELF_CHECK faktisch falsch | high | S | ✓ |
| D6:3 | EU-Strategie nur Doku — Code kennt nur US-Endpoints | med | M | — |
| D6:4 | STT = bester On-Device-Kandidat (whisper.cpp im Tauri-Wrapper) | med | M | — |
| D6:5 | „Nativer" Speech-Fallback ist verdecktes Cloud-STT (Web Speech API → Google/Apple) — Code-Kommentar behauptet das Gegenteil | med | S | ✓ |

### 7.2 Architektur-Vorschlag: maximal DSGVO-konformer KI-Begleiter

> Vollständige Fassung mit allen Code-Referenzen im Architektur-Teil der Detail-Datei. Kernaussage: **Es fehlt keine neue Infrastruktur, sondern Konsequenz** — Gateway, Provider-Abstraktion, PII-Gate (auf master), Consent-Kaskade und GDPR-Registry existieren alle schon.

```
Senior (Web / Tauri-AWOW / Capacitor)
  │  Wake-Word: Picovoice — bereits lokal, kein Datenfluss
  │  Notfall 112/110: fester Code-Pfad, NIE KI (bleibt wie ist)
  ▼
EIN Server-Gateway = lib/ai/ (existiert, wird Pflichtpfad)
  ├─ 1. Gate:       canUsePersonalAi()        (existiert)
  ├─ 2. Rate-Limit: consumeAiDailyUserLimit() (existiert)
  ├─ 3. PII-Gate:   pseudonymizeAiChatInput() (existiert auf master 9294485 — mergen)
  ├─ 4. Provider:   getProvider()             (existiert)
  └─ 5. Audit:      Metadaten-Log (Modell/Zweck/Tokens, NIE Klartext) (neu)
  ▼
EU-Inferenz (Ziel): Mistral EU (Chat + STT/Voxtral) · Azure EU (TTS)
```

**Die wichtigsten Entscheidungen (mit ehrlicher Abwägung):**

1. **PII-Gate im Provider-Adapter, nicht pro Route** — so kann keine neue Route es vergessen. Stufe 2 (nach Pilot): NER-basiertes Scrubbing für Namen mitten im Satz, **serverseitig** (on-device als Pflichtschicht nicht empfohlen: der Web-Pfad bliebe ungeschützt, doppelte Wartung).
2. **AVV-Konsolidierung auf 2 KI-Anbieter:** Mistral (Chat + Formulate + Classify + **STT via Voxtral — gleicher AVV wie Chat!**) + Microsoft (TTS, Self-Service-DPA). OpenAI und Google fliegen raus. Anthropic nur nach A/B-Test mit Zero-Data-Retention behalten. Kein Training auf Nutzerdaten je Provider vertraglich fixieren (ZDR macht auch den Löschpfad beim Anbieter trivial — es gibt nichts zu löschen).
3. **On-Device ehrlich bewertet:** Wake-Word bleibt lokal (läuft schon). Lokales STT (whisper.cpp auf dem AWOW) ist technisch machbar, aber bei alemannischem Dialekt und leiser Stimme schlechter als Voxtral — **für Senioren-Akzeptanz ist Erkennungsqualität wichtiger als Datenresidenz-Maximalismus; EU-Cloud-STT gewinnt die Gesamtabwägung.** Lokale LLMs für den Begleiter-Dialog: 2026 nicht tragfähig (Qualität + Wartungslast Solo-Founder) — nicht verfolgen. Achtung Gegenbefund D6:5: Der heutige „native" Browser-Fallback ist **kein** lokales STT, sondern schickt Audio an Google/Apple.
4. **Löschpfade:** Konversationen sind stateless (gut!), Audio wird nie gespeichert, Memory-Fakten sind in Registry + Kaskade. Nachziehen: TTS-Cache (Whitelist + TTL), neues KI-Audit-Log von Anfang an in die GDPR-Registry.
5. **Stufenplan:** Stufe 0 (vor Pilot-KI-Start, parallel zum AVV-Versand, Aufwand M, 0 EUR): Commit mergen, Kiosk/Prävention gaten, TTS-Cache-Whitelist, Callsites auf getProvider(), AVV nur an Mistral + Microsoft. Stufe 1 (nach AVV, M–L, **~15–40 EUR/Monat** bei 5–10 Familien): Provider auf EU umstellen, STT/TTS-Adapter, runAiRequest-Wrapper, DSFA-Indikatoren aktualisieren. Stufe 2 (nach Pilot, L, ~90–150 EUR bei ~100 Senioren): NER-Scrubbing, optional IONOS AI Model Hub, On-Device-Extras.

**Damit lässt sich gegenüber Pilot-Familien ohne Übertreibung sagen:** optionale KI-Hilfe, Verarbeitung in der EU, keine Nutzung zum Training, jederzeit abschaltbar — Antworten können Fehler enthalten und ersetzen keine Fachberatung.

---

## 8. Skeptiker-Bilanz

- **92 von 93 Befunden bestätigt** (33 high / 44 medium / 15 low), 62 pilotstart-relevant, 57 Quick-Wins.
- **1 Befund widerlegt:** „Drei parallele KI-Schalter ohne Synchronisation" (ursprünglich D4:2) — der Skeptiker wies nach, dass `/api/settings/ai` beim Ausschalten den `ai_onboarding`-Consent korrekt mit widerruft (lib/ai/user-settings.ts:105-107). Nicht in den Bericht aufgenommen.
- Mehrere Befunde wurden vom Skeptiker **präzisiert** statt nur bestätigt (z.B. D1:2: der ungepushte Commit ergänzt das Kiosk-Consent-Gate bereits; A3:1: Check-in ist bewusst Phase 2d und von kreis-start nicht verlinkt — Fix nötig vor Freischaltung, nicht vor Pilotstart).

## 9. Umsetzungsstand (Fix-Welle 2026-06-12, Branch `claude/pilot-quickwins-2026-06-12`)

Auf Founder-„ok" wurden die Top-5-sofort-Punkte **2–5** lokal umgesetzt (Commits auf dem Fix-Branch, **kein Push**):

- ✅ **#2 Schatten-KI-Routen:** `/api/prevention/session` hat jetzt Consent-Gate (`canUsePersonalAi`) + KI-Tageslimit; die deterministische Krisen-Erkennung (rote Signalwörter → 112-Antwort ohne Provider-Call) bleibt bewusst ungated. `/api/kiosk/companion` hat jetzt dasselbe Consent-Gate; Gemini ist nicht mehr Default (nur noch explizit via `KIOSK_AI_PROVIDER`).
- ✅ **#3 Onboarding-Brüche:** welcome-Tour lädt den bestehenden `ui_mode` und überschreibt ihn nicht mehr; nach Family-Setup-Claim wird der Senior direkt eingeloggt (Fallback-Karte „Ihr Zugang ist bereit" bei Login-Fehler).
- ✅ **#4 Stumme Fehler + Kontrast:** Check-in-Fehlerbanner mit `role="alert"`; SeniorButton-Primary auf Weiß-auf-Grün; Gelb/Amber-Flächen auf dunklen Text; SeniorStatusScreen mit `role="status"`.
- ✅ **#5 Erster Klick:** Dashboard-Primary-Action → `/hier-bei-mir`; Quartier-Hub von 12 auf 7 Kacheln mit garantiertem Inhalt.
- ⏳ **#1 (Push Commit `9294485`):** NICHT angefasst — Rote Zone, braucht explizites Founder-Go + Pre-Push-Mini-Audit.

```text
Mini-Audit Fix-Welle (2026-06-12):
- RLS/Trigger geprueft: keine Tabellen/Policies geaendert; prevention_enrollments weiterhin user-scoped (RLS-Client + eq user_id); Kiosk liest Settings/Consents nur fuer den device-gebundenen Bewohner NACH Token-Verifikation
- Findings: 0 neue — beide Routen sind Richtung KI-Provider strikter (fail-closed bei fehlender Einwilligung); bekanntes Rest-Risiko D5:4 (AI_PROVIDER_OFF-Flag selbst fail-open bei DB-Fehler) unveraendert offen
- Audit-Trail: unveraendert (Eskalations-Logging in prevention_sessions bleibt) | Rate-Limit: NEU auf prevention/session via consumeAiDailyUserLimit (DB-basiert, edge-konsistent, wie companion/chat)
```

Verifikation: `npx tsc --noEmit` Exit 0; alle berührten Testdateien grün (43 Tests in 10 Files, inkl. 7 neuer Regressionstests); volle Suite lief nach Abschluss der Welle.

## 10. Nächste Schritte (Vorschlag, alles Founder-Entscheidung)

1. ~~Top-5-sofort-Liste als kleine Fix-Welle~~ → **erledigt bis auf #1**, siehe §9. Offen: Founder-Go für Push von `9294485` (+ Merge dieses Fix-Branches).
2. Vor dem KI-Go (§5 AVV): Stufe 0 des Architektur-Stufenplans als eigene Welle (KI-Gateway-Konsequenz).
3. Vor dem ersten Pilot-Haushalt: Top-5-strategisch #3 und #4 (eine Senior-Welt, Senior-Hälfte des Familienkreises) — das ist die eigentliche Produktarbeit, die der Pilot braucht.
