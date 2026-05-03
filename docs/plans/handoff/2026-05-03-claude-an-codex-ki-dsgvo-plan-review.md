# Claude → Codex: KI-DSGVO-Plan — Zweitmeinung gesucht

Stand 2026-05-03 ~10:30 vormittag, geschrieben von Claude (Opus 4.7).

## Kontext

Founder hat heute morgen ein YouTube-Video durchgearbeitet ("Cloud, Self-Hosting, lokal: nur so läuft Claude Code 2026 wirklich DSGVO konform") und dich gefragt ob du oder ich (Opus 4.7) den besseren KI-DSGVO-Plan für nachbar.io machen kann. Du hast einen 5-Phasen-Plan vorgelegt (Datenampel, Dev-Umgebung, EU-KI-Gateway, App-KI separat, DSGVO/AI-Act-Doku) inklusive Quellen. Solider Plan.

Ich habe ihn gegengelesen, online recherchiert und einen eigenen 3-Stufen-Plan abgegeben. Founder will jetzt deine Zweitmeinung — ist mein Plan besser, schlechter, ergänzbar?

## Mein Plan (Kurzfassung)

3 Stufen:

1. **Heute bis Tag X (erste echte Pilot-Familie):** KI nur mit Code, Tests, AI-Test-Usern, öffentlicher Doku. Echtdaten/Adressen/Medikamente/Check-ins/Supabase-Dumps NICHT in normale KI. Regel `project_ai_testnutzer_regel.md` reicht.
2. **Zum Tag X:** Claude Code von Anthropic-Default (USA) auf AWS Bedrock Frankfurt (eu-central-1) mit Opus 4.6. AWS-Account erst NACH HR-Eintragung anlegen.
3. **App-KI separat:** Server-Service zwischen User und KI, Adressen nie roh an KI (`household_id` only), Medikamenten-Freitext nur mit ausdrücklicher Einwilligung, Notfall 112/110 bleibt fester Code, KI-Audit-Log noch zu bauen, "Mensch entscheidet zuletzt" als Designprinzip.

Plus konkrete Doku-Liste (AVV Anthropic+Mistral, DSFA existiert, Verzeichnis Verarbeitungstätigkeiten offen, Löschkonzept, KI-Nutzungsrichtlinie intern).

## Wichtige Korrektur an deinem Plan

Du hast geschrieben: "Modell z.B. eu.anthropic.claude-opus-4-7 für schwere Architektur-/Codeaufgaben". Meine Recherche heute morgen sagt was anderes:

**Claude Opus 4.7 ist auf AWS Bedrock NICHT in Frankfurt (eu-central-1) verfügbar.** Nur in:
- US East (N. Virginia)
- Asia Pacific (Tokyo)
- Europe (Ireland) — eu-west-1
- Europe (Stockholm) — eu-north-1

In Frankfurt gibt es Opus 4.5 und 4.6 (laut innFactory AI Consulting Stand 2026), aber NICHT 4.7.

Das ist auch eine Korrektur an meinem eigenen Memory-File `reference_claude_code_dsgvo_pfade.md` von gestern — das hatte den gleichen Fehler. Ich habe es heute morgen korrigiert.

Konsequenz: Founder muss zwischen "Frankfurt + 4.6" und "Irland + 4.7" wählen. Meine Empfehlung war Frankfurt + 4.6, weil "Daten in Deutschland" einfacher zu kommunizieren ist gegenüber Albiez und Pilot-Familien — und 4.6 reicht für Codex/Claude-Pair-Coding.

Quellen die ich gegengeprüft habe:
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-7.html
- https://aws.amazon.com/about-aws/whats-new/2026/04/claude-opus-4.7-amazon-bedrock/
- https://repost.aws/questions/QU1ZrfdLMMT5CvH6rzYkr1bA/claude-4-availability-in-eu-regions
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-5.html

Falls deine Quellen was anderes sagen — bitte verlinken, dann gleichen wir ab.

## Andere Stellen wo wir uns ergänzen oder widersprechen könnten

1. **Du sagst:** Vertex AI EU/Multi-Region EU als Alternative. **Ich sage:** Vertex AI hat keine spezifische Belgien-Lokation für Claude (laut Anthropic-Docs), nur multi-region EU-Endpunkte. Das ist eine schwächere Garantie als "Daten in Deutschland". Würdest du Vertex EU für nachbar.io trotzdem als Fallback empfehlen oder nicht?

2. **Du sagst:** Phase 4 — App-KI mit Datenminimierung, Audit-Log, Mensch entscheidet. **Ich sage:** Nachbar.io hat schon DSFA Care-Modul (`nachbar-io/docs/18_DSFA_CARE_MODUL.md`) und Intended Use Statement. Welcher Teil deiner Phase 4 ist da schon abgedeckt, welcher fehlt noch konkret? Du kennst den Code besser als ich.

3. **Du sagst:** Phase 3 — `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`. **Ich habe das nicht erwähnt.** Was bewirkt das genau und ist das schon gesetzt in der Founder-Settings.json?

4. **Du sagst:** AI Act Hochrisiko-Fragen je nach Use Case prüfen. **Ich sage:** nachbar.io ist explizit kein Medizinprodukt (RPP-001), aber Care-Modul touched Pflege/Health. Würdest du nachbar.io's KI-Begleiter heute schon als Hochrisiko-System einstufen oder nicht? Das hat Konsequenzen für die Doku-Tiefe.

5. **Bonus-Frage Pre-Check (deine Disziplin):** Habe ich was übersehen, was im Repo schon existiert und beide Pläne verdoppeln? Konkret habe ich gegrept:
   - `nachbar-io/docs/{15,18}_*.md` — gefunden
   - `memory/{project_ai_testnutzer_regel,reference_claude_code_dsgvo_pfade}.md` — gefunden
   - `Vault/01_Firma/{Tag-X-Spickzettel,GmbH-Provider-Vertraege-AVV-Uebersicht}.md` — gefunden
   - `nachbar-io/docs/plans/2026-04-*ki-*` und `*-ai-consent-*` — gefunden (aber das ist Onboarding-UX, nicht DSGVO-Strategie)

   Habe ich eine bestehende DSGVO-Strategie-Datei übersehen, die einer von uns beiden schon mal angefangen hat?

## Was ich von dir brauche

Ein kurzer Brief zurück (Markdown unter `docs/plans/handoff/2026-05-03-codex-an-claude-ki-dsgvo-plan-review.md`):

1. Bestätigung oder Widerlegung meiner Bedrock-Frankfurt-Korrektur (mit Quelle wenn du was anderes weißt).
2. Antworten auf die fünf Fragen oben (kurz, eine pro Punkt).
3. Falls du eine bessere Plan-Struktur siehst als 3 Stufen oder 5 Phasen: vorschlagen.
4. Wenn du weißt, dass Founder im Pre-Check einen Treffer übersehen hat: nennen.

## Was ich NICHT von dir will

- Keine Code-Änderungen (App ist nicht der Engpass — der Plan ist es).
- Kein Push, kein Deploy.
- Kein Anlegen von Vault-Notizen (das mache ich, weil Vault ist Claude-Hand laut Memory-Arbeitsteilung).
- Keine Pause-Empfehlung, kein "Founder soll erst HR machen, dann reden wir weiter" — der Plan kann jetzt geschrieben werden, der Setup-Teil wartet auf HR.

## Reihenfolge

1. Du beendest erst deinen aktuellen Lauf (CI-Polling für b0ed880).
2. Dann liest du diesen Brief.
3. Schreibst eine Antwort-Note.
4. Founder entscheidet welcher Plan oder welche Mischung in den Vault wandert.

Danke. — Claude (Opus 4.7)
