# Handoff: Outside-App Aufwandsentschaedigung umsetzen

Datum: 2026-05-14
Autor: Codex
Ziel-Session: Neue Codex-Session fuer autonome Umsetzung des Plans bis zum lokalen Push-Ready-Stand

## Kurzstatus

Thomas will in der naechsten Session den Plan fuer freiwillige Aufwandsentschaedigung in der Hilfe-/Nachbarschaftshilfe-Funktion starten. Die Umsetzung soll dort autonom durchgezogen werden, bis der Code lokal fertig, getestet, committed und push-ready ist.

Wichtig: In dieser Session wurde **nur geplant und uebergeben**. Es wurden keine Feature-Dateien geaendert, keine Migration angewendet, kein Prod-Write, kein Deploy und kein Push gemacht.

## Aktueller Git-Stand

Arbeitsbaum beim Schreiben dieser Uebergabe:

```text
## master...origin/master [ahead 5]
```

Letzte Commits:

```text
a435f39 docs: plan outside-app help compensation
4f2d8c0 feat(youth): add missions surface
fc7fa5f chore(storybook): add youth ui review setup
1d01d95 test(admin): add stable otp login flow
bba8399 feat(admin): allow youth app preview access
1006102 test(terminal): accept night greeting in header guard
69a95a0 docs(handoff): note openai option for youth app
f80900f docs(handoff): add youth ui exchange session handover
```

Nach dieser Handoff-Datei wird voraussichtlich ein weiterer lokaler Docs-Commit entstehen. Vor Umsetzung in neuer Session bitte erneut ausfuehren:

```bash
git status --short --branch
git log --oneline -8
```

## Primaere Plan-Datei

Umsetzungsplan:

```text
docs/superpowers/plans/2026-05-14-help-compensation-outside-app.md
```

Wichtig: Am 2026-05-14 wurde ein Founder-/Compliance-Review-Amendment in diese Plan-Datei eingetragen. Dieses Amendment ist bindend und ersetzt widersprechende Details in den urspruenglichen Tasks.

Neue Leitlinie:

- Sichtbares UI primaer "Freiwillige Anerkennung", nicht "Aufwandsentschaedigung".
- Schema/Code bevorzugt `recognition_type`, `suggested_recognition_cents`, `recognition_handling`.
- Migration-Constraint muss `suggested_recognition_cents IS NOT NULL` bei `recognition_type = 'suggested_amount'` enthalten.
- U13: keine Aufgabenannahme.
- U18: nur mit Elternfreigabe, nur kostenlose, niedrig-riskante Aufgaben.
- Youth-Boards muessen echte `recognition_type`-/Risk-Daten pruefen und duerfen nicht pauschal `free` annehmen.
- Kein Job-Marktplatz: keine Stundenloehne, keine Gebote, kein Ranking/Sortieren nach Betrag, keine Payment-Links, keine IBAN.

Dieser Plan ist bewusst sehr konkret und task-basiert. Er enthaelt:

- Product Copy: "Was ist Nachbarschaftshilfe?"
- Product Copy: Pflicht-Hinweis, dass die App keine Zahlungen annimmt oder auszahlt.
- Jugend-Erklaerung: leichte altersgerechte Aufgaben, Elternfreigabe, keine Auszahlung/Verrechnung von Punkten.
- Datenmodell-Vorschlag fuer `compensation_type`, `suggested_amount_cents`, `compensation_handling`.
- Domain-Service `modules/hilfe/services/compensation.ts`.
- Risiko-Matrix `modules/hilfe/services/help-task-risk.ts`.
- UI-Komponente `CompensationSelector`.
- API-/Service-Validierung.
- Migration als **file-first only**.
- Unit-/Playwright-Testplan.
- Final Verification.

Hinweis: `docs/superpowers/` ist in `.gitignore`, die Plan-Datei wurde deshalb mit `git add -f` versioniert. Das ist absichtlich.

## Founder-Intent fuer neue Session

Thomas' letzte Anweisung:

> "Mach eine uebergabe in eine neue session dort starten wir den Plan den wirst du autonom bis zum Push selbststaendig umsetzen"

Interpretation fuer neue Session:

- Wenn Thomas in der neuen Session sagt "los", "mach weiter" oder vergleichbar, ist die Umsetzung der Plan-Tasks lokal freigegeben.
- Dazu gehoert auch das Erstellen der lokalen Migration-Datei aus Task 3.
- **Nicht** automatisch freigegeben ist ein Prod-Migration-Apply.
- **Nicht** automatisch freigegeben sind Prod-DB-Writes, Vercel-Env/Secrets/Billing/Provider-Live-Aktionen oder Deploy.
- `git push origin master` bleibt nach Projektregeln rote Zone. Wenn Thomas in der neuen Session explizit `PUSH-GO` oder eindeutig "pushen" sagt, darf gepusht werden. Ohne das: lokal committen und push-ready melden.

## Rote Zone

Nie ohne klares Founder-Go:

- Prod-Supabase Migration anwenden.
- Prod-DB schreiben.
- Vercel Env/Secrets/Billing aendern.
- Provider live schalten.
- Deploy ausloesen.
- Neue Kosten verursachen.
- Git push, falls in der aktuellen Session kein klares Push-Go steht.

Diese Feature-Umsetzung soll **kein Zahlungssystem** bauen:

- kein Wallet
- kein Guthaben
- keine Coins mit Geldwert
- keine Einzahlungen
- keine Auszahlungen
- keine Verrechnung
- keine Zahlungsabwicklung
- keine Zahlungsstatus-Verfolgung
- keine Felder wie `paid_at`, `payment_status`, `payout_status`, `wallet_balance`, `credit_balance`, `transaction_id`, `escrow`, `payout_amount`

Die App vermittelt nur Kontakt und dokumentiert die Hilfeanfrage. Eine moegliche Anerkennung/Aufwandsentschaedigung passiert direkt zwischen den Beteiligten ausserhalb der App.

## Fachliche Leitlinie

Fuer alle Nutzer:

- Abschnitt "Aufwandsentschaedigung" in Hilfeanfrage.
- Optionen:
  1. Kostenlos / ehrenamtlich
  2. Kleines Dankeschoen
  3. Vorschlag: ___ Euro
  4. Nach Absprache
- Pflicht-Hinweis:

```text
Die Quartier-App nimmt keine Zahlungen entgegen und zahlt keine Betraege aus. Eine moegliche Anerkennung oder Aufwandsentschaedigung vereinbaren Sie direkt mit der helfenden Person ausserhalb der App.
```

Fuer Jugendliche:

- Unter 13: keine bezahlten oder entschaedigten Aufgaben.
- 13 bis 17: nur leichte, altersgerechte Aufgaben.
- Elternfreigabe beruecksichtigen.
- Gefaehrliche Aufgaben fuer Minderjaehrige blockieren oder ausblenden.
- Punkte bleiben Anerkennung ohne Geldwert, nicht auszahlbar, nicht verrechenbar.

Risiko-Logik:

- LOW: Einkauf mitbringen, Muelltonne rausstellen, Laub fegen, Handy erklaeren, Paket annehmen.
- MEDIUM: einfache Gartenhilfe, Rasen maehen mit leichtem Geraet, Hund ausfuehren, kleinere Tragehilfe.
- BLOCKED_FOR_MINORS: Baeume schneiden, Leiterarbeiten, Motorsaege/Motorsense, Elektroarbeiten, Pflege, Medikamente, Geldgeschaefte, schwere koerperliche Arbeiten.

## Bestehende Code-Struktur

Aktueller Hauptflow:

- `app/(app)/help/new/page.tsx`
  - Mehrstufiger Hilfe-Erstellungsflow.
  - POST auf `/api/hilfe/requests`.
- `app/(app)/help/page.tsx`
  - Hilfe-Boerse mit Tabs und `HelpCard`.
- `app/(app)/help/[id]/page.tsx`
  - Detailseite plus Nachrichten.
- `app/api/hilfe/requests/route.ts`
  - GET/POST API.
- `modules/hilfe/services/hilfe-requests.service.ts`
  - `createRequest`, `listRequests`, Matching.
- `modules/hilfe/services/types.ts`
  - Hilfe-Domain-Typen.
- `lib/supabase/types.ts`
  - manuelle UI-nahe DB-Typen.
- `lib/supabase/database.types.ts`
  - Supabase-Typen.

Legacy/Senior-nahe Form:

- `modules/hilfe/components/NewRequestForm.tsx`
- `app/(app)/hilfe/neu/page.tsx`
- `app/(app)/hilfe/page.tsx`

Jugend:

- `modules/youth/services/youth-routes.service.ts`
  - `createYouthTask`, `acceptYouthTask`, Profile/Consent.
- `modules/youth/services/profile.ts`
  - `calculateAgeGroup`, `getAccessLevel`.
- `modules/youth/services/moderation.ts`
  - blockiert bereits Geld-Anfragen in Jugend-Chats.
- `supabase/migrations/094_youth_profiles_and_consents.sql`
  - `youth_profiles`, `youth_guardian_consents`.
- `supabase/migrations/095_youth_tasks_and_gamification.sql`
  - `youth_tasks`, `points_reward`, `risk_level`.

## Empfohlener Ablauf in neuer Session

1. Kontext lesen:

```text
AGENTS.md
CLAUDE.md
docs/plans/handoff/2026-05-14-codex-new-session-help-compensation-outside-app.md
docs/superpowers/plans/2026-05-14-help-compensation-outside-app.md
```

2. Status pruefen:

```bash
git status --short --branch
git log --oneline -8
```

3. Skill nutzen:

- Fuer Umsetzung: `superpowers:executing-plans`
- Alternativ bei Aufteilung: `superpowers:subagent-driven-development`

4. Plan in Reihenfolge ausfuehren:

- Task 1: Compensation Domain Service + Tests.
- Task 2: Help Task Risk Matrix + Tests.
- Task 3: Migration-Datei + Typen. Nur file-first, nicht anwenden.
- Task 4: API Validation und Persistence.
- Task 5: Shared UI Selector.
- Task 6: UI in `/help` und legacy `/hilfe`.
- Task 7: Youth Guardrails.
- Task 8: Playwright/Review-Artefakte.
- Task 9: Final Verification.

5. Nach jeder sinnvollen Task lokal committen. Nicht pushen ohne aktuelles Push-Go.

## Wichtige technische Hinweise

- In PowerShell Pfade mit Klammern wie `app/(app)/help/new/page.tsx` immer quoten.
- Bei `git add` fuer Klammerpfade z.B.:

```powershell
git add -- 'app/(app)/help/new/page.tsx' 'app/(app)/help/page.tsx' 'app/(app)/help/[id]/page.tsx'
```

- Plan enthaelt absichtlich die verbotenen Feldnamen in Tests/deny-list. Bei `rg`-Audit sind Treffer dort ok, aber nicht in DB-Schema/Insert-Logik ausserhalb der deny-list.
- Keine Begriffe wie "Lohn", "Job", "Auszahlung", "Wallet", "Guthaben", "Saldo", "Credits" in neuer UI fuer diese Funktion verwenden.
- "Punkte" im Jugendbereich duerfen weiter UI-Text sein, aber immer ohne Geldwert und ohne Einloesung.
- Bestehende Pflegekassen-/Abrechnungs-/Stripe-Module nicht fuer dieses Feature wiederverwenden.

## Verifikationserwartung

Vor Abschluss der neuen Session mindestens:

```bash
npm run test -- __tests__/modules/hilfe/compensation.test.ts __tests__/modules/hilfe/help-task-risk.test.ts __tests__/api/hilfe/requests.test.ts __tests__/components/hilfe/NewRequestForm.test.tsx __tests__/components/hilfe/CompensationSelector.test.tsx
npx tsc --noEmit
```

Wenn zeitlich machbar:

```bash
npm run lint
npm run test:e2e -- tests/e2e/scenarios/s2-help-request.spec.ts
```

Browser-Review lokal:

```text
http://localhost:3005/help/new
http://localhost:3005/help
http://localhost:3005/jugend-ui-preview
```

## Abschlusszustand der neuen Session

Gewuenscht:

- Feature lokal implementiert.
- Tests sinnvoll bestanden oder klare Rest-Risiken dokumentiert.
- Lokale Commits erstellt.
- Arbeitsbaum sauber.
- Push-ready.
- Push nur mit aktueller, expliziter Founder-Freigabe.
