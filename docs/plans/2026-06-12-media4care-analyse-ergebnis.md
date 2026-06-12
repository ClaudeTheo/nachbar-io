# Media4Care-Analyse — Ergebnis für Nachbar.io

> **Erstellt:** 2026-06-12 (Fable 5), Auftrag: `Rapport-an-Claude-2026-06-11-Media4Care-Analyse-Planauftrag.md`
> + `Uebergabe-an-Fable5-Session-2026-06-12-Media4Care-Analyse.md` (KI-Inbox).
> **Founder-Frage:** „Die haben Funktionen, die auch gut passen bei uns, gerade diese Spiele.
> Schaue, ob wir das rechtlich machen dürfen und ob wir was lernen können."
> **Methode:** Codex-Vorrecherche per WebSearch/WebFetch gegengeprüft (Stand 2026-06-12, nur
> öffentliche Quellen) + Pre-Check im eigenen Code (`.claude/rules/pre-check.md`).
>
> ⚠️ **Wichtig:** Alle rechtlichen Aussagen in diesem Dokument sind **Einschätzungen, kein
> Anwaltsersatz**. Sie folgen der Founder-Regel „anwaltsfreie Variante zuerst": Wo wir ohne
> Anwalt sicher fahren können, steht der Weg hier. Wo ein Anwalt nötig wäre, ist es markiert.
> Keine Code-Änderungen, keine Prod-Aktionen, keine neuen Kosten in diesem Auftrag.

---

## 0. Pre-Check: Was bei uns schon existiert (Pflicht-Schritt, zuerst erledigt)

Bevor irgendein Spiele-Feature vorgeschlagen wird — das liegt bereits im Code:

| Was | Wo | Zustand |
|---|---|---|
| **Memory-Spiel** (4×4, 8 Emoji-Paare) | `app/(kiosk)/kiosk/games/memory/page.tsx` | fertig gebaut, Kiosk geparkt — wiederverwendbar. ⚠️ Markenproblem beim Namen, siehe 3.5 |
| **Tagesquiz** (10 Fragen hardcodiert, 5/Tag tagesrotierend) | `app/(kiosk)/kiosk/games/quiz/page.tsx` | fertig gebaut, Kiosk geparkt — Mechanik direkt übernehmbar |
| **Gamification** (Punkte, Level, Badges) | `modules/gamification/` (`awardPoints`, `BADGE_DEFINITIONS`) | produktiv nutzbar |
| **Prävention** (echte Quartier-Kurse mit Kursleitern, MoodCheck, Atemübung, PMR, PSS-10) | `modules/praevention/` | existiert — Kurse sind LIVE-Veranstaltungen, keine Video-Bibliothek |
| **UI-Modi** active / comfort („Aktiv 55+") / simple (Senior) | `users.ui_mode`, u. a. `app/(app)/my-day/page.tsx:69` | produktiv |
| **Senior-Shell** | `app/(senior)/kreis-start` (+ Wellenplan S1 konsolidiert die Doppel-Welt) | im Umbau (Welle S1) |
| **Familienfotos/Medien im Kreis** | chat-media, Familienalbum-Pfade (Wellenplan S3 nutzt sie) | existiert |

**Konsequenz:** Keine der Spiele-Ideen unten ist ein Neubau auf grüner Wiese. Alles sind
Adapter/Erweiterungen bestehender Infrastruktur. Kein Duplikat-Risiko erkannt.

---

## 1. Was ist Media4Care wirklich? (Wettbewerbs-/Positionsanalyse)

### 1.1 Firma und Zahlen (verifiziert 2026-06-12)

- **Media4Care GmbH**, Friedelstr. 40, 12047 Berlin, HRB 149472 B (AG Charlottenburg),
  gegründet 2013 (ursprünglich „Media Dementia UG"). Geschäftsführer: Carsten Clanget und
  Moritz Fichtner — **beide Gründer sind seit 2020/2022 raus**.
- Eigene Angaben: „+4.000 Pflegeheime", „+8.000 Kunden", „+25 Mitarbeitende"; neuester
  Claim (Pressemitteilung 04/2026): **„250.000+ Nutzer"** (Eigenangabe, nicht unabhängig prüfbar).
- VC-finanziert (Ananda Impact Ventures seit 2015, IBB Ventures seit 2017, Dr. Becker-Kliniken).
  Keine neue Runde 2024–2026 auffindbar.
- **Finanzlage (IBB-Konzernabschlüsse, geprüfte Primärquelle):** Eigenkapital **−997 Tsd. EUR**
  (GJ 2024, vorher −926), Jahresergebnis **−71 Tsd. EUR** (vorher −382). Übersetzt: Das
  Unternehmen ist bilanziell überschuldet, hat den Verlust aber drastisch reduziert und nähert
  sich dem Break-even. Kein Insolvenzverfahren, keine Übernahme-/Pivot-Meldungen.
- **Kein DiGA-/DiPA-Eintrag.** Wichtiger noch: Stand Juni 2026 gibt es **überhaupt noch keine
  öffentlich gelistete DiPA** — das BfArM zeigt nur das Antragsportal. Seit 01.01.2026 läuft
  ein Erprobungsverfahren (BEEP-Gesetz) mit Erstattung laut Recherche ~40 EUR/Monat DiPA
  + ~30 EUR Unterstützungsleistungen. Der ganze DiPA-Markt ist also noch leer.

### 1.2 Produktportfolio (gegen die Website verifiziert)

| Produkt | Kern | Für uns relevant? |
|---|---|---|
| **Betreuung Pro** (B2B-Tablet/App) | „20.000 Quizfragen, 600 Bildergalerien, 300 Filme"; Kategorien: Jahreszeiten, Angebote nach Zeit (10–20 Min), Bewegung (Sitzgymnastik, Sturzprophylaxe), **„Leichter Bereich"** (Demenz), Wochenplan, Biografiearbeit, Sterbebegleitung, Eigene Dateien | Vorbild für Content-UX, nicht fürs Geschäftsmodell |
| **Senioren-/Angehörigen-App** (B2C, **kostenlos**) | Videotelefonie, Nachrichten, Familienalbum, **„über 700 Spiele und Übungen"** (Texträtsel, Bild-Aufdeck-Raten, Rechnen, Geräuschrätsel), Tagesprogramm, Check-in, sicheres Surfen | **Direkteste Überlappung mit unserem Familienkreis** |
| **Familienportal** (App) | Geschlossene Familienkommunikation: Fotos, Nachrichten, Video, Check-in | Überlappung Familienkreis |
| **Aktivitätstisch** (Prowise, 55–98", ab 160 EUR/Monat bzw. ab 7.044 EUR) + **TV-Box** | Hardware-Bundles für Heime | Bewusst nicht unser Weg |
| **Akademie** (§43b/53b SGB XI Pflichtfortbildungen, online) | B2B-Upsell-Kanal | Bewusst nicht unser Weg |
| **DIPS** („Digitales Impuls- und Präventionssystem") | Methodik-Framework; Website nennt es wörtlich **„Die DIPS-Therapie"** | Negativ-Vorbild beim Wording (siehe 4.2) |
| **ZuhauseBetreuen.de** | Ratgeber-Portal/Forum, SEO-/Lead-Funnel | Interessantes GTM-Muster, für uns zu früh |
| **KI** (seit Q3/2025) | Betreuungs-**Dokumentation**: Maßnahmen-Beschreibung, Übersetzung, Schnittstellen zu MEDIFOX DAN / Connext Vivendi / Senso | Zeigt: deren KI zielt auf Pflege-Doku, nicht auf Senioren-Begleitung |

### 1.3 Einordnung: Wettbewerber, Vorbild, Partner oder irrelevant?

**Ehrliche Antwort: Media4Care ist in unserem Phase-1-Kern (Familienkreis) ein echter
funktionaler Wettbewerber — mit einem kostenlosen Produkt.** Deren Senioren-App + Familienportal
können heute: Videoanruf, Nachrichten, Fotoalbum, Check-in, dazu 700 Spiele. Das ist
funktional sehr nah an „Familienkreis + Beschäftigung". Das sollte man nicht kleinreden.

Gleichzeitig gilt:

- **Wettbewerber:** nur im Familien-/Beschäftigungs-Segment (B2C-App). Dort konkurrieren wir
  nicht über Feature-Anzahl, sondern über das, was Media4Care **nicht** hat: echte, verifizierte
  Nachbarschaft, lokale Hilfe, Quartier-Infos, Notfall-Logik (112 zuerst), Kommune.
- **Vorbild:** Content-UX („sofort nutzbar ohne Vorbereitung", Tagesprogramm, „Leichter
  Bereich", Angehörige liefern Inhalte), B2B-Vertriebsmechanik (Fortbildungen als Türöffner).
- **Partnerkandidat:** theoretisch denkbar (Content-Lizenz), aber unrealistisch und nicht
  empfohlen — Überlappung im Familien-Segment, und wir wollen keine Content-Abhängigkeit
  + keine neuen Kosten.
- **Irrelevant:** Pflegeheim-Vertrieb, Hardware, Akademie — anderes Spielfeld.

**Strategische Beruhigung:** Media4Care ist B2B-zentriert (Pflegeheime), das B2C-Produkt ist
ein kostenloser Funnel. Niemand dort baut Quartiers-Infrastruktur, Verifikation per Invite,
kommunale Anbindung oder Notfall-Ketten. Unsere Differenzierung trägt — wenn der
Familienkreis-Kern rund wird (genau das machen Wellen S1/S2).

### 1.4 Claims, die wir uns NICHT erlauben (auch wenn Media4Care sie nutzt)

| Media4Care sagt (belegt) | Warum wir das nicht sagen |
|---|---|
| „Die DIPS-**Therapie** setzt hier an." | „Therapie" = Medizinprodukt-Wording, steht auf unserer Bann-Liste (RPP-001: bewusst KEIN Medizinprodukt) |
| „**Sturzprophylaxe**", „Förderung kognitiver Ressourcen", „stimulieren kognitiver Areale" | Gesundheitsbezogene Wirkversprechen → Zweckbestimmung Richtung Medizinprodukt |
| „fördert Gedächtnis, Konzentration und Reaktionsfähigkeit" (deren Gehirnjogging-App) | Wirkversprechen; bei uns: Spiele sind Unterhaltung/Beschäftigung, Punkt |
| „MD-konforme Seniorenbetreuung", „bis zu 100% Förderung gem. §5 SGB XI" | Pflege-/Abrechnungs-Claims ohne eigenes Prüffundament |
| „250.000+ Nutzer" / „+8.000 Kunden" (widersprüchliche Zählweisen) | Wir bleiben bei ehrlichen Zahlen (0 echte Nutzer → Pilot-Sprache) |
| „Eine App, entwickelt, um Ihnen Ruhe & Sicherheit zu geben" | Sicherheitsversprechen vermeiden wir (kein „erkennt Notfälle", kein Hausnotruf-Anklang) |

---

## 2. Produktplan für Nachbar.io

### 2.1 Learnings — was wir übernehmen und was bewusst nicht

**Übernehmen (als Muster, nicht als Kopie):**

1. **„Sofort nutzbar ohne Vorbereitung"** — Media4Cares stärkstes UX-Prinzip. Für uns:
   Ein Tap von `kreis-start` oder „Mein Tag" direkt ins Tagesrätsel, ohne Anmeldung-im-Spiel,
   ohne Einstellungen. Unser Kiosk-Quiz arbeitet schon so (tagesrotierende Auswahl).
2. **Tagesprogramm-Prinzip** („Bewegung des Tages, Entspannung des Tages") — passt exakt
   auf „Mein Tag": ein kleiner **Tagesimpuls** (Rätsel ODER Foto-Moment ODER Quartier-Tipp),
   einer pro Tag, ruhig und ohne Streak-Druck.
3. **„Leichter Bereich"-Gedanke** — eine reduzierte Variante je Spiel (größere Karten,
   weniger Paare, keine Zeitmessung). Bei uns ist das kein eigener Bereich, sondern folgt
   automatisch aus `ui_mode = simple` — sauberer als bei Media4Care.
4. **Angehörige liefern Inhalte** („Eigene Dateien" / Fotos aufs Familien-Tablet) — unser
   größter emotionaler Hebel: **Familienfotos als Spielmaterial** (siehe Idee 2 in Kap. 3).
   Media4Care hat generischen Content; wir haben die eigene Familie.
5. **Vorschlagsmodus statt Katalog** — Senioren keine 12-Kacheln-Auswahl zumuten
   (deckt sich mit App-Analyse-Befund C1:2), sondern 1 Vorschlag + „etwas anderes".

**Bewusst NICHT übernehmen:**

- **Content-Bibliothek als Kerngeschäft** (20.000 Quizfragen kuratieren = eigenes Geschäftsmodell
  mit Redaktionsteam — das können und wollen wir nicht; wir brauchen 50–100 gute eigene Inhalte,
  keine 20.000).
- **Pflegeheim-Vertrieb, Hardware-Bundles, Akademie** — anderes Geschäft, bindet Kapital.
- **Bewegungs-/Gymnastik-Videos** (Sturzprophylaxe etc.) — Haftungs-/Wording-Risiko und
  Produktionskosten. Unsere Antwort ist besser: `modules/praevention` vermittelt **echte
  Kurse im Quartier mit echten Menschen** — das ist die Quartier-Differenzierung in Aktion.
- **Offline-First** — für den Web-Pilot unnötig; kommt ggf. mit der Tauri/Capacitor-Senior-App.
- **KI-Pflegedokumentation** — B2B-Pflege-Feature, für uns Phase „Pro Medical/Pflege" (geparkt).

### 2.2 MVP-Schritte (nächste 2–4 Arbeitsblöcke, ohne S1/S2 zu blockieren)

Reihenfolge-Regel: **S1 (Eine Senior-Welt) und S2 (Familienkreis-Senior-Hälfte) bleiben vorn.**
Spiele sind Bindungs-Features — sie wirken erst, wenn der Kern (Nachricht, Anruf, Kreis) rund ist.

| Schritt | Was | Aufwand | Wann |
|---|---|---|---|
| 0 | Wording-Guardrails um Spiele-Begriffe erweitern (Kap. 4.3) — reine Doku | S | sofort möglich |
| 1 | Welle S1 + S2 wie geplant | M / M–L | läuft als Nächstes |
| 2 | **Spiele-Welle SP1:** Tagesrätsel auf „Mein Tag" + kreis-start (Idee 1) + Umbenennung des Kiosk-„Memory" (3.5) | S | nach S2, ggf. parallel zu S3 |
| 3 | **SP2:** „Paare finden" mit Familienfotos (Idee 2) — baut auf S3-Medienpfaden auf | M | nach S3 |
| 4 | Eigene Quiz-Inhalte schreiben (50 Fragen, davon ~15 lokal Bad Säckingen) — Founder/Claude-Texte, kein Code | S | parallel jederzeit |

---

## 3. Spiele/Aktivierung für Nachbar.io (Founder-Fokus-Kapitel)

### 3.1 Rechtsrahmen in einfacher Sprache (Einschätzung, kein Anwaltsersatz)

**Die Grundregel ist beruhigend: Funktionen nachbauen ist erlaubt.** Ideen, Spielprinzipien
und Funktionskonzepte sind in Deutschland nicht schutzfähig (Grundsatz der Nachahmungsfreiheit).
Ein Memory-Prinzip, ein Tagesquiz, ein Bild-Aufdeck-Spiel darf jeder bauen. Die Grenzen:

1. **Urheberrecht (UrhG):** Geschützt sind die konkreten **Inhalte** — Media4Cares Quizfragen,
   Texte, Grafiken, Filme, Bildergalerien. Nichts davon kopieren, abtippen oder „umformulieren".
   Eigene Inhalte schreiben oder lizenzfreie Quellen nutzen (3.4).
2. **Datenbankschutz (§ 87a UrhG):** Deren Sammlung von 20.000 Fragen ist als Datenbank
   geschützt, auch wenn einzelne Fakten frei sind. Also: keine systematische Übernahme,
   auch nicht „nur 200 Fragen rauskopieren".
3. **Markenrecht:** Namen sind tabu: „Media4Care", „Betreuung Pro", „DIPS". Zwei
   Stolperfallen aus deren Spieleliste: **„Memory"** ist eine eingetragene Marke von
   Ravensburger (die dafür bekannt sind, sie konsequent durchzusetzen — betrifft UNSER
   Kiosk-Spiel, siehe 3.5) und **„Dalli Klick"** stammt aus der ZDF-Show „Dalli Dalli"
   (Media4Care nutzt den Namen — deren Risiko, nicht unser Vorbild). Die **Spielmechaniken**
   dahinter (Paare finden, Bild aufdecken) sind frei.
4. **UWG § 4 Nr. 3 (unlauterer Wettbewerb):** Nachbau wird erst unlauter, wenn wir eine
   Herkunftstäuschung erzeugen (Design/Look so kopieren, dass man uns für Media4Care hält)
   oder deren Ruf ausbeuten. Mit eigenem Design-System (Anthrazit/Grün, eigene Namen,
   eigene Inhalte) sind wir davon weit weg.
5. **Medizinprodukt/MDR + DiPA:** Hier entscheidet nicht der Code, sondern die
   **Zweckbestimmung — also unser Marketing-Text**. Ein Rätselspiel als „Unterhaltung,
   Beschäftigung, gemeinsamer Spaß" = kein Medizinprodukt. Dasselbe Spiel beworben als
   „Gedächtnistraining gegen Demenz" oder „Prävention kognitiven Abbaus" = Risiko, dass es
   als Medizinprodukt/DiPA eingestuft wird. Deshalb: Wording-Bann-Liste (4.3) strikt einhalten.
6. **DSGVO:** Spielverhalten von Senioren sind Verhaltensdaten. Würden wir daraus einen
   „kognitiven Verlauf" ableiten oder Angehörigen zeigen („Oma hat heute schlechter
   gespielt"), wären wir nahe an Gesundheitsdaten (Art. 9) — und genau in der Lücke, die
   Media4Cares eigene Datenschutzerklärung offen lässt (Wohlbefinden/Medikamente ohne
   Art.-9-Argumentation). **Unsere Regel: Spielergebnisse werden nicht personenbezogen
   gespeichert und nie ausgewertet.** Punkte gibt es fürs Mitmachen, nicht für Leistung.

### 3.2 Die fünf Ideen mit Rechts-Ampel

| # | Idee | Fläche | Aufwand | Rechts-Ampel | DSGVO | Wording-Check |
|---|---|---|---|---|---|---|
| 1 | **Tagesrätsel** (5 Fragen/Tag, eigene Fragen, lokale Bad-Säckingen-Fragen) | „Mein Tag" + kreis-start-Kachel | **S** (Kiosk-Quiz-Code da) | 🟢 grün | keine Speicherung der Antworten | „Tagesrätsel — kleine Denkpause", NICHT „Gedächtnistraining" |
| 2 | **„Paare finden" mit Familienfotos** (Memory-Mechanik, Fotos aus dem eigenen Familienkreis) | Senior-Shell, nach S3 | **M** | 🟢 grün, mit 2 Auflagen: nicht „Memory" nennen; Fotos bleiben kreis-intern (Supabase EU) | Fotos sind ohnehin Kreis-Daten; keine neuen Provider | „Familienbilder-Spiel" o. ä.; kein Leistungs-Feedback („super Gedächtnis!") |
| 3 | **Bild-Aufdecken-Raten** („Was ist das?" — Foto wird Stück für Stück sichtbar; Quartier-/Familienfotos) | Senior-Shell / Familienkreis gemeinsam | **S–M** | 🟢 grün, Auflage: Name „Dalli Klick" nie verwenden | wie Idee 2 | neutraler Eigenname |
| 4 | **Sprichwörter vervollständigen** („Wer rastet, der …") | Tagesimpuls-Variante in „Mein Tag" | **S** | 🟢 grün (Sprichwörter = Volksgut, gemeinfrei) | keine | unkritisch |
| 5 | **Bewegungs-Impuls des Tages** (Gymnastik-/Übungsvideos) | — | M–L | 🟡 **gelb → Empfehlung: anders lösen.** Videos müssten lizenziert/produziert werden (Kosten!), „Sturzprophylaxe"-Wording ist Bann-Listen-Gebiet, Haftungsfragen bei Verletzungen | Bewegungsdaten vermeiden | stattdessen: Tagesimpuls verweist auf **echte Prävention-Kurse im Quartier** (`modules/praevention` existiert!) — 🟢 grün und differenzierend |

**Warum diese fünf:** 1–4 sind im geschlossenen Pilot sofort sinnvoll (gemeinsame Momente
Familie↔Senior, kein Content-Einkauf, S/M-Aufwand, alles auf bestehender Infrastruktur).
Idee 5 zeigt den Unterschied im Geschäftsmodell: Media4Care verkauft Videos — wir vermitteln
Begegnung. Das ist die Quartier-Antwort, kein Feature-Verzicht.

**Gamification-Anbindung (optional, 🟢):** `awardPoints` fürs **Mitmachen** (z. B. „Tagesrätsel
ausprobiert"), niemals für richtige Antworten oder Geschwindigkeit. Kein Leaderboard für
Senioren-Spiele (sozialer Druck + Leistungsdaten).

### 3.3 Was ROT ist (lassen)

| 🔴 Nicht machen | Warum |
|---|---|
| Quizfragen/Texte/Bilder/Filme von Media4Care (oder SingLiesel-Büchern etc.) übernehmen | Urheberrecht + Datenbankschutz § 87a UrhG |
| Spiele „Memory", „Dalli Klick", „DIPS", „Gehirnjogging à la …" nennen | Markenrecht (Ravensburger/ZDF/Media4Care) |
| Spiele als „Therapie", „Demenz-Prävention", „Gedächtnistraining", „hält geistig fit" bewerben | Zweckbestimmung kippt Richtung Medizinprodukt/DiPA — RPP-001 sagt bewusst NEIN |
| Spielergebnisse pro Person speichern, „kognitiven Verlauf" zeigen, Angehörigen-Report über Spielleistung | Art.-9-Nähe (Gesundheitsdaten durch Ableitung), Datenminimierung, Vertrauensbruch |
| Media4Care-UI nachbauen („damit es vertraut wirkt") | UWG § 4 Nr. 3 Herkunftstäuschung — und unnötig, wir haben ein eigenes Design-System |
| Schlager-/Liedtexte des 20. Jh. oder fremde Musikaufnahmen einbauen | Urheberrecht/GEMA — nur gemeinfreie Texte (Volkslieder, Urheber 70+ Jahre tot) und auch dann keine fremden Aufnahmen |

### 3.4 Quellen für lizenzfreie bzw. selbst erstellbare Inhalte (kostenlos)

1. **Selbst schreiben (beste Option):** Quizfragen sind schnell erstellt — Fakten selbst sind
   nicht schutzfähig, nur fremde Formulierungen/Sammlungen. 50 eigene Fragen reichen für
   Wochen Tagesrätsel. Lokalbezug („Welcher Fluss fließt durch Bad Säckingen?") hat
   Media4Care nicht und kann es nicht haben — unser Vorteil. KI-Unterstützung beim
   Entwerfen ist ok (Founder prüft jede Frage auf Richtigkeit).
2. **Familien-/Quartier-Fotos der Nutzer:** für Ideen 2+3 — bleiben im Kreis, Supabase EU,
   keine Lizenzfrage (Nutzer laden eigene Bilder, Einwilligung über bestehende Kreis-Logik).
3. **Gemeinfreies Volksgut:** deutsche Sprichwörter, Redewendungen, Volksliedtexte,
   Grimms Märchen, klassische Gedichte (Urheber > 70 Jahre tot). Nur Texte — keine fremden
   Tonaufnahmen oder modernen Bearbeitungen.
4. **Wikimedia Commons / Wikipedia:** Bilder unter CC-Lizenz (Lizenzhinweis pflicht!) für
   Bild-Rate-Spiele; historische Fotos oft Public Domain.
5. **Openclipart / Pixabay-Lizenz-Inhalte:** für Spiel-Icons/Kartenmotive (Lizenz je Bild
   prüfen; unsere Emoji-Lösung im Kiosk-Memory ist sogar noch einfacher und frei).
6. **Eigene Audioaufnahmen** (z. B. Geräuschrätsel mit selbst aufgenommenen Alltagsgeräuschen)
   — kein Lizenzthema, S-Aufwand.

### 3.5 Konkreter Fund im eigenen Code: „Memory" umbenennen

`app/(kiosk)/kiosk/games/memory/page.tsx` + Menü-Label nennen das Spiel **„Memory"**.
„Memory" ist eine eingetragene Marke von Ravensburger, die aktiv durchgesetzt wird
(Einschätzung; bekannt aus etlichen Abmahnfällen gegen App-/Web-Spiele). Solange der Kiosk
geparkt/nicht beworben ist, ist das Risiko klein — aber bevor irgendeine Spiele-Fläche in den
Pilot geht: umbenennen in z. B. **„Paare finden"** oder **„Bilderpaare"**. Kostenlos, 10 Minuten
Arbeit, Risiko weg. (Gleiches Prinzip wie oben: Mechanik frei, Name geschützt.)

---

## 4. Compliance-Plan

### 4.1 DSGVO / Art. 9 — Lehren aus Media4Cares eigener Lücke

Media4Cares Datenschutzerklärung nennt für Senior-/Familien-App ausdrücklich „Angaben zum
Wohlbefinden, zu Unterstützungsbedarfen, zur Flüssigkeitsaufnahme, zur Einnahme von
Medikamenten" — **ohne erkennbare Art.-9-Argumentation** (keine ausdrückliche Einwilligung
nach Art. 9 Abs. 2 lit. a benannt) und mit vielen US-Tools (Mixpanel, Segment, Facebook-Pixel,
MailChimp …) auf SCC-Basis. Das ist deren Risiko — und unsere Chance, es sichtbar besser zu machen:

| Punkt | Nachbar.io-Stand | To-do |
|---|---|---|
| Gesundheitsnahe Daten (Check-in, Medikamente) | AES-256-GCM-Feldverschlüsselung, Consent-Gates, EU Frankfurt | Datenschutzerklärung muss reale Flüsse decken (App-Analyse-Befund D2:1 — bereits bekannt, in KI-Welle fixen) |
| **Spieldaten (neu)** | — | Produktregel festschreiben: **keine personenbezogene Speicherung von Spielergebnissen, keine Verlaufs-/Leistungsauswertung, kein Angehörigen-Einblick in Spielverhalten.** Dann bleiben Spiele DSGVO-trivial (keine DSFA-Erweiterung nötig) |
| Tracking | kein US-Tracking im Produkt | so lassen — ist ein GTM-Argument (4.4 / Kap. 5) |
| Punkte/Badges für Spiele | `modules/gamification` speichert Punkte-Log | Nur Teilnahme-Events („Tagesrätsel geöffnet"), keine Ergebnis-Events („3/5 richtig") |

### 4.2 Medizinprodukt / DiPA

- **Position halten (RPP-001):** Nachbar.io ist **kein Medizinprodukt** und stellt keinen
  medizinischen Zweck bereit. Spiele/Aktivierung ändern daran nichts, **solange** Zweck =
  Unterhaltung/Beschäftigung/soziale Teilhabe bleibt (Wording!). Keine Aussage „Nachbar.io
  ist DiPA/Medizinprodukt" ohne Founder-/Fachreview (Stop-Punkt aus dem Auftrag).
- **DiPA bewusst NICHT beantragen:** Der DiPA-Markt ist Stand Juni 2026 leer (keine einzige
  Listung), das Verfahren verlangt Medizinprodukt-nahe Nachweise + Datenschutz-Zertifizierung,
  und die Erstattung (~40 EUR/Monat) lohnt den Pfadwechsel nicht. **Beobachten statt
  beantragen** — wenn erste DiPA gelistet werden, neu bewerten (dann mit Fachberatung).
- **Media4Care als Negativ-Beispiel:** „DIPS Die Therapie" zeigt, wie man es nicht macht —
  ein Nicht-Medizinprodukt mit „Therapie" zu bewerben, ist genau die Sorte Angriffsfläche
  (wettbewerbsrechtlich + regulatorisch), die wir vermeiden.

### 4.3 Wording-Erweiterung (Vorschlag für `docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md`)

Neuer Abschnitt „Spiele & Aktivierung" (Doku-Änderung, S-Aufwand, Founder-Go für den Edit):

**Erlaubt:** „Tagesrätsel", „Denkpause", „Spiel & Spaß", „gemeinsam spielen", „Beschäftigung",
„Zeitvertreib", „kleine Aufgabe des Tages", „aktiv bleiben im Quartier" (sozial gemeint),
„Freude am Knobeln".

**Nicht verwenden:** „Gedächtnistraining", „Gehirnjogging", „kognitives Training", „geistig
fit halten", „Demenz-Prävention/-Vorbeugung", „Therapie", „therapeutisch", „Sturzprophylaxe",
„fördert Gedächtnis/Konzentration/Reaktion", „wissenschaftlich belegt", „verhindert/verlangsamt
Abbau", „misst geistige Fitness", „erkennt Veränderungen".

(Begründung je Begriff: Wirkversprechen → Zweckbestimmung → Medizinprodukt-Risiko; Mess-/
Erkennungs-Claims → zusätzlich Art.-9-/Überwachungs-Risiko.)

### 4.4 Trust-/DSFA-Punkte

1. **Spiele-Datenregel** (4.1) als eine Zeile in die Datenschutzerklärung, wenn Spiele live
   gehen: „Spielergebnisse werden nicht gespeichert und nicht ausgewertet." — stärkster
   Ein-Satz-Trust-Gewinn, den ein Spiel haben kann.
2. **DSFA:** keine Erweiterung nötig, solange die Regel gilt (keine neuen Datenkategorien,
   keine neuen Empfänger, keine Profilbildung). Wird sie je gekippt → DSFA-Pflichtprüfung vorher.
3. **Trust-Seite/Pilot-Brief:** „EU-Hosting, keine US-Tracker, Spiele ohne Auswertung" als
   expliziter Kontrast — ohne Media4Care zu nennen (kein vergleichender Werbe-Anspruch nötig;
   namentliche Konkurrenz-Kritik wäre UWG-Terrain, das wir nicht brauchen).

---

## 5. Go-to-Market

### 5.1 Ein-Satz-Differenzierung

> **„Media4Care beschäftigt Senioren im Pflegeheim mit einer Inhalte-Bibliothek — Nachbar.io
> verbindet Senioren zu Hause mit ihrer Familie und ihrer echten, geprüften Nachbarschaft."**

Kürzer (für den Pilot-Flyer, ohne Wettbewerber-Nennung):
> „Keine Beschäftigungs-App. Ihr Quartier, Ihre Familie, Ihre Nachbarn — an einem sicheren Ort."

### 5.2 Positionierung & Pilotargumente (Bad Säckingen)

- **Für Familien:** Bei uns kommt beides zusammen: Familienkreis (Nachricht, Anruf, Foto,
  Check-in) UND das Drumherum, das eine Familie nicht leisten kann — Nachbarn, lokale Hilfe,
  Quartier-Infos, Notfall-Logik mit 112 zuerst. Spiele sind bei uns **gemeinsame Momente**
  (Familienfotos-Spiel), kein Solo-Zeitvertreib gegen eine Content-Wand.
- **Für die Kommune:** Media4Care adressiert Einrichtungen; wir adressieren das Quartier —
  Teilhabe der Menschen, die (noch) nicht im Heim sind. Verifizierte Nachbarschaft + Civic-
  Anbindung gibt es dort nicht.
- **Für Pflege-Multiplikatoren (Carmen Schlachter & Co.):** Wir ersetzen keine Betreuungs-
  software und konkurrieren nicht mit deren Doku-Systemen — wir halten Senioren im Alltag
  verbunden, bevor Pflege überhaupt beginnt. (Anschlussfähig, nicht bedrohlich.)
- **Datenschutz als Verkaufsargument:** EU-Hosting, keine US-Tracker, Spiele ohne Auswertung,
  Verschlüsselung sensibler Felder — gerade gegenüber kirchlichen/kommunalen Trägern stark.
- **Preis-Realität im Blick:** Media4Cares B2C-App ist kostenlos. Unser Free-Tarif muss den
  Familienkreis-Einstieg tragen; Plus (8,90 EUR) verkauft sich über Caregiver-Funktionen
  (Check-in-Kette, Status), nicht über Spiele. **Spiele gehören in Free** — sie sind
  Bindungs-, kein Bezahl-Feature.

---

## 6. Founder-Entscheidungen (max. 5, mit Empfehlung und Risiko)

| # | Entscheidung | Empfehlung | Risiko der Empfehlung |
|---|---|---|---|
| **1** | **Spiele-Welle SP1 einplanen?** (Tagesrätsel auf „Mein Tag"/kreis-start mit eigenen Fragen, danach „Paare finden" mit Familienfotos) | **Ja — aber erst nach S1/S2.** Aufwand S+M, baut komplett auf vorhandenem Code auf, stärkt den täglichen Öffnungs-Anlass im Pilot | Gering: 1–2 Arbeitsblöcke Verzögerung anderer Themen. Größeres Risiko wäre VOR S1/S2 — darum die Reihenfolge |
| **2** | **Kiosk-Spiel „Memory" umbenennen** (z. B. „Paare finden") sobald eine Spiele-Fläche sichtbar wird | **Ja, fest einplanen** (10-Minuten-Fix in SP1) | Keins. Nicht-Handeln riskiert Marken-Abmahnung (Ravensburger), sobald öffentlich |
| **3** | **Produktregel „Spiele ohne Auswertung" festschreiben** (keine Ergebnis-Speicherung, kein Verlauf, kein Angehörigen-Einblick, Punkte nur fürs Mitmachen) | **Ja.** Hält Spiele DSGVO-trivial und ist ein Trust-Argument | Wir verzichten auf „Engagement-Analytics" und ein mögliches späteres „Fortschritts-Feature". Bewusster Verzicht — jederzeit nur mit DSFA + Founder-Review kippbar |
| **4** | **Wording-Guardrails um Spiele-Abschnitt erweitern** (4.3) | **Ja** (Doku-Edit, S) | Keins |
| **5** | **DiPA/Medizinprodukt-Kurs bestätigen:** kein DiPA-Antrag, Position RPP-001 halten, DiPA-Verzeichnis 1×/Quartal beobachten; DPMA-Kurzcheck („Media4Care", „Memory") gelegentlich manuell durch Founder (kostenlos, ohne Anwalt) | **Ja — beobachten statt beantragen** | Verzicht auf mögliche ~40 EUR/Monat Kassen-Erstattung pro Nutzer. Dafür kein Medizinprodukt-Pfad (Kosten, Zertifizierung, Haftung) — bei 0 Nutzern klar richtig |

---

## Anhang: Quellen und Verifikationsstand

**Direkt verifiziert (WebFetch, 2026-06-12):** media4care.de (Start, Über uns, Impressum,
Datenschutz, Professionelle Betreuung, Betreuungsassistent, Aktivitätstisch, TV-Box,
Pflichtfortbildungen, Senioren-/Angehörigen-App, c-dips), zuhausebetreuen.de, Apple App Store
(Familienportal id1511751700, Betreuung Pro id1668334162, „Senioren Spiele Gehirnjogging"
id6759910325, Entwicklerseite id1292763611), IBB-UV-Konzernabschlüsse 2024 + 2025 (PDF,
Anteilsbesitzliste), BfArM-DiPA-/DiGA-Seiten, ibbventures.de, goingpublic.de (2015),
Media4Care-Pressemitteilungen (KI-Doku 07/2025, ProCare 02/2026, ALTENPFLEGE 04/2026),
Handelsregister-Auskunftsdienste (online-handelsregister.de, North Data).

**Nicht voll verifizierbar:** Google-Play-Detaildaten (Rendering abgeschnitten),
DPMA-Markenlage (Register nicht maschinell abfragbar → Founder-Hand, kostenlos),
Media4Care-Preise außer Aktivitätstisch (nicht öffentlich), interne Nutzerzahlen (Eigenangaben).

**Delta zur Codex-Vorrecherche:** (a) Verlust 2024 stark reduziert (−71 statt −382 Tsd. EUR),
EK weiter negativ (−997 Tsd.); (b) beide Gründer seit 2020/2022 ausgeschieden; (c) Senioren-App
wirbt mit „über 700 Spielen" — mehr Spiele-Substanz als im Rapport sichtbar; (d) neue separate
App „Senioren Spiele Gehirnjogging" (Schach, Solitaire, Sudoku); (e) „Social Venture Fund" =
Ananda-Fondsfamilie, kein vierter Investor; (f) MEDIFOX DAN/Connext/Senso sind Doku-
**Schnittstellen** (mit MEDIFOX DAN zusätzlich gemeinsamer Messeauftritt 04/2026).
