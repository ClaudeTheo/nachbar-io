# Handoff: Codex an Claude/Opus - Family Setup Deploy Review

Datum: 2026-05-14
Autor: Codex
Zweck: Prompt fuer Claude/Opus, damit die naechste strategische Review-Runde den aktuellen Stand von Nachbar.io ohne erneute Rekonstruktion bewerten kann.

## Prompt fuer Claude/Opus

Bitte lies gruendlich:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\AGENTS.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\CLAUDE.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-14-codex-new-session-handover-family-setup-deployed.md`
- `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\02_Projekte\Nachbar-io.md`
- `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\04_Backlog\Naechste-Schritte.md`
- `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\06_KI-Zusammenarbeit\Handoff-Codex-an-Opus.md`

Aktueller Ist-Stand:

- Nachbar.io ist auf `master` deployed.
- Production: `https://nachbar-io.vercel.app`
- Deploy-Run: `https://github.com/ClaudeTheo/nachbar-io/actions/runs/25870954103`
- Commit: `3a8787089903c82415a876e162ef1833c3a44d3d`
- Prod-Migration 197 fuer Family Setup ist live.
- CI/Deploy/Prod-Smoke sind gruen.

Bitte pruefe als Strategie-/Compliance-Review, nicht als Code-Umsetzung:

1. Ist das Family-/QR-Code-Onboarding fuer den Pilot realistisch, sicher genug und einfach genug?
2. Ist das Modell "3 Codes pro Hausnummer plus Ersatzcodes" gut, oder ist eine bessere operative Logik fuer Bad Saeckingen sinnvoll?
3. Welche Minimalfunktionen braucht das externe Admin-Dashboard jetzt wirklich fuer Code-Erzeugung, Haushaltszuordnung, Nutzerverwaltung und Support?
4. Gibt es Compliance-/DSGVO-Risiken durch Kinder-, Senioren- und Angehoerigen-Verknuepfungen, die vor dem Briefversand geloest werden muessen?
5. Welche Formulierungen sollten in Brief, Onboarding und Eltern-/Angehoerigen-Hinweisen verbindlich sein?
6. Welche Dinge sollen fuer Pilot 0 bewusst NICHT gebaut werden?

Wichtige Grenzen:

- Kein Job-Marktplatz.
- Kein Zahlungsmodell.
- Kein Wallet/Guthaben/Coins/IBAN/Payment-Link/Auszahlung.
- U13 keine Aufgabenannahme.
- U18 nur kostenlose, niedrig-riskante Aufgaben mit Elternfreigabe.
- Adressdaten nicht im Client-State; Client arbeitet mit `household_id`.
- Keine Prod-DB- oder Vercel-Aktionen durch Claude.

Bitte liefere:

- Kurzes Verdict: "pilotfaehig", "pilotfaehig mit Bedingungen" oder "noch nicht pilotfaehig".
- Top-5 Risiken, priorisiert.
- Konkreter Vorschlag fuer Code-/Brief-Operationalisierung pro Hausnummer.
- Minimaler Admin-Dashboard-Scope fuer die naechste Codex-Session.
- Entscheidungsvorlage fuer Thomas: welche 3 Entscheidungen braucht er vor Briefdruck?

Nicht liefern:

- Keine langen allgemeinen Best-Practice-Abhandlungen.
- Keine juristische Endberatung.
- Keine neuen Zahlungs-, Wallet- oder Marktplatzideen.
- Keine Code-Aenderungen.
