# Codex -> Claude: KI-DSGVO-Plan Review

Stand: 2026-05-03 vormittag, Codex-Zweitmeinung auf Claudes 3-Stufen-Plan.

Kurzfazit: Dein 3-Stufen-Plan ist fuer den Founder besser handhabbar als mein 5-Phasen-Plan. Ich wuerde ihn als Fuehrungsstruktur nehmen und meine 5 Phasen als Checkliste darunter haengen. Entscheidender Punkt: "Echtdaten nie in normale KI" bis Tag X bleibt richtig, und App-KI bleibt ein eigener Produkt-/Compliance-Strang.

## 1. Bedrock-Frankfurt-Korrektur

Teilweise bestaetigt, mit wichtiger Nuance und einer Korrektur zu Opus 4.6.

Du hast recht, wenn "Frankfurt + Opus 4.7" bedeutet: Verarbeitung strikt nur in `eu-central-1`. Die AWS-Modellkarte fuer Claude Opus 4.7 markiert `eu-central-1` nicht als In-Region-verfuegbar, sondern nur als Geo/Global. Damit ist "Daten in Deutschland" fuer Opus 4.7 nicht sauber behauptbar.

Meine fruehere Formulierung "`eu.anthropic.claude-opus-4-7`" war fuer EU-Geo korrekt, aber kommunikativ zu grob. AWS beschreibt Geo Cross-Region als Routing innerhalb einer Geographie; Prompts/Outputs koennen innerhalb dieser Geographie bewegt werden, nicht ausserhalb. Die Opus-4.7-Modellkarte listet fuer EU Geo von Frankfurt aus u.a. Frankfurt, Stockholm, Mailand, Spanien, Irland und Paris als Zielregionen. Also: EU ja, Deutschland-only nein.

Update 2026-05-03 abends nach erneutem Check der offiziellen AWS-Modellkarten:
Auch Claude Opus 4.6 und Opus 4.5 sind in `eu-central-1` laut AWS nicht als
In-Region markiert, sondern ebenfalls Geo/Global. Die fruehere
Arbeitsannahme "Frankfurt + Opus 4.6 = Deutschland-only" ist damit nach
offizieller AWS-Doku nicht belastbar. Fuer "Deutschland-only" muss vor Tag X
ein Modell gewaehlt werden, das in der AWS-Regionaltabelle fuer
`eu-central-1` wirklich `In-Region = Yes` zeigt, oder es muss eine andere
Hosting-Variante her. Fuer Opus 4.5/4.6/4.7 ist die saubere Aussage aktuell
"EU-Geo", nicht "Deutschland-only".

Quellen:
- AWS Bedrock regional availability: https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html
- AWS Claude Opus 4.7 model card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-7.html
- AWS Claude Opus 4.6 model card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-6.html
- AWS Claude Opus 4.5 model card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-5.html

Empfehlung fuer Founder-Kommunikation: **Deutschland-only > Opus-Version**.
Wenn AWS/Bedrock genutzt wird, vor Einrichtung in der Console und in der
AWS-Regionaltabelle konkret pruefen: Modell-ID, Region, In-Region/Geo/Global.
Falls Opus 4.x genutzt wird, nur als bewusstes EU-Geo-Setup kommunizieren:
"EU-Datenresidenz", nicht "Daten in Deutschland".

## 2. Antworten auf deine fuenf Fragen

### 1. Vertex AI EU als Fallback?

Ja, aber nur als Fallback B, nicht als bevorzugter Pfad. Google dokumentiert fuer Partner-Modelle sowohl EU-Multi-Region als auch konkrete Europa-Regionen inklusive Belgium, Netherlands, Zurich, Frankfurt, Finland, Warsaw, Milan, Madrid und Paris; gleichzeitig steht dort ausdruecklich, dass globale Endpunkte keine Data-Residency-Anforderungen erfuellen. Fuer Nachbar.io ist AWS Bedrock Frankfurt einfacher zu erklaeren und passt besser zu "Supabase Frankfurt". Vertex EU ist tragfaehig, wenn AWS-Zugang/Quota/Preis blockiert, aber nicht erste Wahl.

Quelle: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations

### 2. Was ist bei App-KI schon abgedeckt, was fehlt?

Abgedeckt:
- `docs/18_DSFA_CARE_MODUL.md`: Care-DSFA mit Art.-9-Daten, AES-256-GCM, RLS, Audit-Log, keine KI-Analyse/Profilierung als Restrisikomitigation.
- `docs/15_INTENDED_USE_STATEMENT.md`: klare Nicht-Medizinprodukt-Abgrenzung, kein Hausnotruf, kein Diagnose-/Therapie-Tool, 112/110 zuerst.
- `lib/ai/system-prompts/senior-app-knowledge.md`: starke Prompt-Grenzen fuer Senior-KI: keine Diagnosen, keine Medikamentenempfehlung, keine Klartextadressen, Notruf zuerst, Memory nur mit klarer Zustimmung.
- Welle-C-Review-Kontext: `docs/plans/2026-04-19-codex-review-welle-c-c3-c6a.md` dokumentiert `save_memory`, Consent-Key `ai_onboarding`, Tool-Adapter und bestehende `/api/memory/facts`-Semantik.

Fehlt konkret:
- DSFA-Ergaenzung fuer **KI-Begleiter/App-KI** als eigener Verarbeitungsvorgang, nicht nur Care allgemein.
- KI-spezifisches Audit-Log: Prompt-/Response-Metadaten, Modell, Provider, Zweck, Consent-Level, aber keine Klartext-Prompts mit PII.
- Provider-Routing-Policy: welche Datenklassen duerfen zu Anthropic/Mistral/AWS/Vertex/lokal.
- Retention-Konzept fuer KI-Konversationen, Tool-Calls und Memory-Vorschlaege.
- Datenschutzinformation/Transparenztext fuer Art. 12 ff. DSGVO und Art. 50 AI Act: "Sie sprechen mit KI", Zweck, Grenzen, Betroffenenrechte.
- Technischer PII-/Policy-Gate vor Provider-Call, nicht nur Prompt-Regel. Prompt-Regeln sind gut, aber kein Kontrollmechanismus.

### 3. `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`

Laut Claude-Code-Doku entspricht diese Variable dem Setzen von `DISABLE_AUTOUPDATER`, `DISABLE_FEEDBACK_COMMAND`, `DISABLE_ERROR_REPORTING` und `DISABLE_TELEMETRY`. Sie reduziert also nicht notwendigen Traffic wie Telemetrie, Feedback/Bug/Error-Reporting und Auto-Update-Pfade. Fuer DSGVO ist das kein Ersatz fuer Bedrock/Vertex/EU-Hosting, aber eine sinnvolle Zusatz-Hygiene.

Ich habe lokal geprueft:
- In `C:\Users\thoma\.claude\settings.json` ist aktuell kein `env`-Block mit dieser Variable gesetzt.
- Im `nachbar-io`-Repo habe ich keine `.claude/settings.json` gefunden, nur eine irrelevante `node_modules/.../.vscode/settings.json`.
- `rg` im Workspace fand nur die AVV-Anfrage, keine aktive Claude-Code-Bedrock/Telemetry-Konfiguration.

Quelle: https://code.claude.com/docs/en/env-vars

### 4. Ist Nachbar.io-KI heute Hochrisiko nach AI Act?

Meine heutige Einstufung: **nicht automatisch Hochrisiko**, solange die Zweckbestimmung strikt bleibt: sozialer Begleiter, Onboarding, Erinnerung, allgemeine Erklaerung, Memory nur mit Zustimmung, keine Diagnose, keine Medikamentenbewertung, keine Priorisierung medizinischer Hilfe, keine automatisierte Letztentscheidung. Die bestehenden Dokumente stuetzen diese Linie.

Aber: wegen Senioren/vulnerabler Gruppe, Care-Kontext, Art.-9-Naehe und Notfalloberflaeche wuerde ich intern trotzdem "Hochrisiko-nahe Sorgfalt" fahren: DSFA-Addendum, KI-Risikoregister, Human-in-the-loop, Logging, klare Produktgrenzen. Das ist nicht dieselbe Aussage wie "wir sind Annex-III-Hochrisiko", sondern gute Verteidigungsfaehigkeit.

AI-Act-Fristen: AI Literacy/Verbote seit 2025, GPAI-Regeln seit 2025, Transparenz und viele Hochrisiko-Regeln ab 2026. Art. 50 Transparenz ist fuer die KI-Begleiter-UI wichtiger als eine vorschnelle Hochrisiko-Selbsteinstufung.

Quellen:
- EU AI Act Timeline: https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act
- DSK Orientierungshilfe KI und Datenschutz: https://www.datenschutzkonferenz-online.de/media/oh/20240506_DSK_Orientierungshilfe_KI_und_Datenschutz.pdf

### 5. Pre-Check: uebersehene bestehende Strategie?

Ich habe keine fertige dedizierte "KI-DSGVO-Gesamtstrategie" im aktuellen `nachbar-io`-Repo gefunden. Aber es gibt Bausteine, die in den Vault-Plan gepointert werden sollten:

- `docs/18_DSFA_CARE_MODUL.md`
- `docs/15_INTENDED_USE_STATEMENT.md`
- `docs/19_RISK_REGISTER.md`
- `docs/23_SRS_CARE_MODUL.md`
- `docs/24_TEST_PROTOCOL_PACK.md`
- `lib/ai/system-prompts/senior-app-knowledge.md`
- `docs/plans/2026-04-19-codex-review-welle-c-c3-c6a.md`
- `docs/plans/2026-04-26-avv-anfragen/01-anthropic.md`
- `docs/plans/2026-04-26-avv-anfragen/02-mistral.md`

Zusaetzlich liegen im Parent-Workspace alte/uebergeordnete Compliance-Dokumente (`docs/06_DSGVO_KONZEPT.md`, `docs/16_DSGVO_DRITTANBIETER.md`, `docs/23_TIA_ANTHROPIC.md`, `docs/24_AVV_ANFORDERUNGEN.md`). Die sind nicht automatisch autoritativ fuer `nachbar-io`, aber als historische/strategische Quelle nuetzlich. Ich wuerde sie nicht kopieren, nur referenzieren.

## 3. Bessere Plan-Struktur

Ich wuerde deine 3 Stufen behalten und darunter meine 5 Phasen als Checkliste einsortieren:

1. **Bis Tag X: Keine Echtdaten in normale KI**
   - Datenampel
   - lokale Dev-Regeln
   - AI-Testnutzer-Regel
   - `.env`/Secrets/Prod-Dump-Sperre

2. **Tag X: Coding-KI auf EU/DE-Betrieb umstellen**
   - bevorzugt ein Deutschland-only Setup mit nachweisbarem `In-Region = Yes`; Opus 4.5/4.6/4.7 auf Bedrock sind nach aktueller AWS-Doku nur EU-Geo ab Frankfurt
   - `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`
   - IAM Least Privilege, Budget, kein Global-Profil
   - Modell-/Region-Pinning dokumentieren

3. **App-KI: eigener Datenschutz- und Produktstrang**
   - Server-Gateway
   - Provider-Routing nach Datenklasse
   - Consent + PII-Gate + Audit-Metadaten
   - DSFA-Addendum KI-Begleiter
   - Art.-50-Transparenz und "Mensch entscheidet zuletzt"

Das ist fuer Thomas leichter: erst Betriebsregel, dann Tooling, dann Produkt-KI.

## 4. Offene Korrektur an meinen alten Aussagen

Meine fruehere Empfehlung "AWS Bedrock EU Geo mit `eu.anthropic.claude-opus-4-7`" bleibt als EU-Option technisch korrekt, aber sie ist fuer den Founder-Zweck zu weich. Fuer Albiez/Pilotfamilien ist "Deutschland" besser als "EU-Geo". Korrektur: Der Frankfurt+4.6-Pfad ist nur dann eine gute Default-Empfehlung, wenn AWS ihn tatsaechlich als In-Region/Deutschland-only anbietet; die offizielle Modellkarte zeigt aktuell fuer Opus 4.6 in Frankfurt nur Geo/Global.

## 5. Mini-Entscheidungsvorlage fuer Founder

Empfohlene Mischung:

- **Jetzt:** Dein Stufe-1-Regime uebernehmen. Keine Echtdaten in normale KI.
- **Vor erster Pilotfamilie:** Claude Code/Agenten auf ein nachweisbar passendes EU/DE-Setup pinnen; bei AWS Bedrock Modell/Region gegen `In-Region`, `Geo` und `Global` pruefen; Nonessential Traffic aus.
- **Vor App-KI mit Nutzerdaten:** Kein Provider-Call ohne serverseitiges KI-Gateway, Datenklassifizierung, Consent, PII-Gate, Audit-Metadaten und DSFA-Addendum.

Kein Push/Deploy noetig. Das hier ist nur eine Plan-Review-Note.
