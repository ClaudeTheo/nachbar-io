# Codex Handover — nach Care-Privacy-Wellen

Stand: 2026-05-03 abend
Branch: `master`
HEAD: `ed0fe31 fix(care): minimize sms fallback payloads`
Remote: `origin/master` ist synchron mit `HEAD`

## Kurzstand

Heute abend wurden nach dem CareCircle-/Provider-Compliance-Block zwei weitere
enge Care-Compliance-Wellen umgesetzt und autonom gepusht:

1. `75ef69c fix(care): soften sos emergency wording`
2. `ed0fe31 fix(care): minimize sms fallback payloads`

Kein Deploy. Keine Prod-DB-Aktion. Keine Migration angewendet. Keine
Vercel-Env-Aenderung. Keine Provider-Live-Schaltung. Keine neuen laufenden
Kosten.

## Wichtigste erledigte Punkte

### T-02 SOS-/Notfall-Wording

- Sichtbare Nutzer-/Doku-Texte vermeiden jetzt "Medizinischer Notfall" und
  "Notfall-SOS" in Store-/UI-nahen Kontexten.
- Interne IDs bleiben stabil:
  - `medical_emergency`
  - `medical_emergency_sos`
- Neues Guard-Testfile:
  `__tests__/content/sos-wording-guard.test.ts`
- Doku:
  `docs/plans/2026-05-03-t02-sos-wording-hardening.md`

### T-03a Care-Notification-SMS-Datensparsamkeit

- `modules/care/services/notifications.ts`
  - SMS/Voice an Twilio enthalten jetzt nur generischen Nachbar.io-Hinweis.
  - Care-Titel/Freitexte gehen nicht mehr an Twilio.
  - In-App und Push bleiben unveraendert.
- `lib/sos/notify-family.ts`
  - Familien-SMS enthaelt keinen Senior-Anzeigenamen mehr.
  - Unnoetiger `users.display_name`-Read wurde entfernt.
- Doku:
  `docs/plans/2026-05-03-t03a-care-notification-privacy.md`

## Verifikation der letzten Code-Welle

Fuer `ed0fe31` lokal gelaufen:

- RED gesehen:
  `npx vitest run modules/care/services/notifications.test.ts lib/care/notifications.test.ts __tests__/lib/sos/notify-family.test.ts`
  → 6 erwartete Failures.
- GREEN:
  gleiche drei Dateien → 36 Tests passed.
- Gezielt erweitert:
  `modules/care/services/notifications.test.ts`,
  `lib/care/notifications.test.ts`,
  `__tests__/lib/sos/notify-family.test.ts`,
  `modules/care/services/channels/sms.test.ts`,
  `modules/care/services/channels/voice.test.ts`,
  `__tests__/lib/invitations.test.ts`
  → 62 Tests passed.
- `npx eslint ... --no-warn-ignored` fuer beruehrte TS/Test-Dateien: gruen.
- `git diff --check`: keine Whitespace-Fehler, nur bekannte CRLF-Warnungen.
- `npx tsc --noEmit`: gruen.
- `npm run build:local`: gruen, bekannte lokale Noise:
  `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`.
- `npx vitest run --changed`: 21 Dateien / 187 Tests passed.
- `npm run lint`: gruen.

GitHub-CI konnte lokal nicht abgefragt werden, weil `gh` nicht authentifiziert
ist (`gh auth login`/`GH_TOKEN` fehlt). Push war erfolgreich.

## Lokaler Zustand

`git status --short --branch` nach Push:

```text
## master...origin/master
?? .codex-welle-d-3001.pid
?? docs/plans/handoff/2026-05-03-claude-an-codex-due-diligence-review.md
?? docs/plans/handoff/2026-05-03-claude-an-codex-founder-go-vollmacht-grosse-schritte.md
?? docs/plans/handoff/2026-05-03-codex-an-claude-due-diligence-review.md
```

Diese vier untracked Dateien wurden bewusst nicht angefasst. Nicht loeschen
oder stage'n, ausser Founder sagt es explizit.

## Aktuelle rote Linien

Weiterhin kein Founder-Go ohne explizite Freigabe fuer:

- Prod-DB-Schreiben, Prod-Migrationen, `apply_migration`.
- Vercel-Env/Secrets/Provider-Konfiguration.
- Provider-Live-Schaltungen ohne AVV/DPA.
- Neue laufende Kosten.
- Echtdaten-KI ohne AVV/DPA.

Migration `186_carecircle_rls_bridge.sql` ist nur file-first im Repo und
nicht auf Prod angewendet.

## Naechster sinnvoller Block

Empfehlung: **T-01b Emergency-Contacts Bypass-/Servicepfad-Guard**.

Warum:

- `emergency_contacts.phone` wird im regulaeren Servicepfad verschluesselt.
- Offen bleibt ein repo-lokaler Guard gegen Bypass-Pfade, die
  `care_profiles.emergency_contacts` direkt schreiben oder lesen koennten.
- Kein Prod-Read noetig.
- Keine Migration noetig.
- Passt zur CareCircle-/PII-Haertungswelle und bleibt thematisch eng.

Vorgeschlagener Scope:

1. Pre-Check:
   ```powershell
   rg -n "emergency_contacts|care_profiles|encryptEmergencyContacts|decryptEmergencyContacts|getCareProfile|updateCareProfile" app modules lib __tests__ supabase docs -g '!node_modules'
   rg -n "from\\(['\"]care_profiles['\"]\\)|\\.from\\(\"care_profiles\"\\)|\\.from\\('care_profiles'\\)" app modules lib __tests__ -g '!node_modules'
   ```
2. Test-first Guard:
   - Erlaubte Schreibpfade dokumentieren:
     `modules/care/services/profile.service.ts` und Consent-Revoke-Pfad.
   - App-/API-Direktzugriffe auf `care_profiles.emergency_contacts` als
     Regressionstest erfassen.
3. Nur wenn der Test echte Bypass-Stellen findet:
   - Entweder Adapter ueber bestehenden `profile.service.ts`.
   - Oder Stop-Brief, falls es eine Produktentscheidung braucht.
4. Verifikation:
   - gezielte Vitest-Guards,
   - ESLint der beruehrten Dateien,
   - `npx tsc --noEmit`,
   - `npm run build:local`,
   - `npx vitest run --changed`,
   - `npm run lint`.
5. Commit + Push autonom, kein Deploy.

Alternative, falls Thomas lieber Provider weiter haerten will:

**T-03b Direct-SMS-Pfade inventarisieren** (`modules/youth/...`,
`lib/invitations.ts`) als Doku-/Guard-Welle. Noch keine Textaenderung, weil
Guardian-Consent und Einladungen eigene rechtliche Produktlogik haben.

## Startprompt fuer naechste Session

```text
Lies AGENTS.md, memory/project_session_handover.md und in nachbar-io docs/plans/2026-05-03-codex-handover-after-care-privacy.md. Aktueller Stand: nachbar-io master ist auf origin/master bei ed0fe31. Bitte mache als nächsten großen, aber engen Block T-01b Emergency-Contacts Bypass-/Servicepfad-Guard: erst Pre-Check gegen emergency_contacts/care_profiles, dann TDD/Guard-Tests, dann minimale Adapter/Fixes falls nötig, dann Verifikation, Commit und Push. Keine Prod-Aktion, kein Deploy, keine Migration anwenden, keine Vercel-Env/Provider/Kosten/Echtdaten-KI.
```
