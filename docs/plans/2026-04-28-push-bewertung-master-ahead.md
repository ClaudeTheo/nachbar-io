# Push-Bewertung `master` ahead `origin/master`

Datum: 2026-04-28  
Bewerteter Scope: `origin/master..97593a2`  
Bewerteter HEAD: `97593a2 docs(handoff): add shared agent inbox`  
Ahead-Scope: 53 Commits gegen `origin/master`  
Modus: Read-only Bewertung aus Git-Diff und vorhandener Projekt-Dokumentation; kein Push, kein Deploy, keine Prod-DB-Aktion.

## Kurzurteil

**Push jetzt nicht automatisch freigeben.** Der Stand `97593a2` wirkt fachlich sinnvoll und technisch weitgehend kontrolliert, ist aber fuer einen Push nach `origin/master` nur **bedingt pushfaehig**: erst nach Founder-Go und nach Abschluss der unten genannten Gates.

Hauptgrund: Ein Push auf `origin/master` kann je nach Repository-/Vercel-Konfiguration indirekt ein Deployment ausloesen. Zusaetzlich enthaelt der Scope eine Supabase-Migration (`175_fix_users_full_name_drift.sql`) und mehrere Aenderungen an Registrierung, KI-Consent, AI-Routen und Pilot-Testnutzer-Handling. Das ist kein kleiner Doku-Push.

## Wichtige Scope-Hinweise

- Lokaler Workspace steht aktuell nicht mehr exakt auf `97593a2`, sondern auf einem spaeteren Stand mit 62 Commits ahead. Diese Bewertung bezieht sich ausdruecklich nur auf die vom Auftrag genannte Grenze `origin/master..97593a2`.
- Nach `97593a2` liegende Block-3-Commits sind nicht Teil dieses Berichts.
- Im Workspace liegen untracked Logs, Output-Dateien und Hilfsskripte. Sie sind nicht Teil des bewerteten Commit-Scope, sollten vor einem echten Push-/PR-Schritt aber separat ignoriert oder bewusst eingeordnet werden.

## Inhalt des 53-Commit-Scope

Der Scope umfasst grob:

- KI-Onboarding-Gates und AI-Routen-Gating ueber User-Settings.
- Pilotrollen-Onboarding inklusive Testnutzer-Markierung und Admin-Filter.
- KI-Consent-Polish mit 4-Stufen-Modell im Registrierungsflow.
- FAQ-Sheet und statische KI-Hilfe-Hinweise im Onboarding.
- Lokale Preview-Routen fuer Registrierungsschritte und Dev-Service-Worker-Hardening.
- Supabase-Migration `175_fix_users_full_name_drift.sql` plus Down-Migration.
- Parken des Kiosk-Web-Route-Groups und Entfernen des alten `raspberry-pi/` Ordners.
- Repo-Arbeitsregeln: `AGENTS.md`, `CLAUDE.md`, `docs/plans/handoff/INBOX.md`.

Diff-Groesse: ca. 90 Dateien, ca. 9.798 Zeilen hinzugefuegt und 588 entfernt.

## Positive Bewertung

Die AI-Gates sind aus Compliance-Sicht eine Verbesserung: mehrere KI-Endpunkte pruefen nun vor Provider- oder Memory-Nutzung, ob persoenliche KI-Hilfe fuer den User aktiviert ist. Das reduziert das Risiko unbeabsichtigter KI-Nutzung.

Der Registrierungsflow ist besser dokumentiert und expliziter: AI-Consent, Assistance-Level, Pilotrolle und Testnutzer-Marker werden strukturierter behandelt. Insbesondere die serverseitige Whitelist fuer `aiAssistanceLevel` ist wichtig, weil sie UI-Manipulationen abfaengt.

Die lokalen Preview-Routen sind mit `NODE_ENV !== "production"` abgesichert, und der lokale Service Worker wird in Development aktiv entschaerft. Das adressiert ein reales Smoke-Test-Problem ohne erkennbaren Produktionsnutzen zu vermischen.

Die Testnutzer-Cleanup-Logik ist als Dry-Run angelegt. Nach Sichtung des Scope ist keine destruktive Cleanup-Aktion im Commit erkennbar.

Die Agent-/Handoff-Dokumentation verbessert die Multi-Agent-Steuerung und verringert Kollisionsrisiken im Repo.

## Risiken und Gates vor Push

### 1. Auto-Deploy-Risiko bei Push auf `origin/master`

**Status: Rot, solange ungeklaert.**

Wenn `origin/master` an Vercel, CI oder andere Deployment-Automation gekoppelt ist, waere ein Push faktisch ein Deploy-Ausloeser. Das widerspricht der aktuellen Regel "kein Push, kein Deploy" ohne ausdrueckliches Founder-Go.

Gate:

- Vor Push klaeren, ob `origin/master` automatisch Production/Preview deployt.
- Falls ja: Push nur nach explizitem Founder-Go fuer Deploy-Folgen oder nach temporaerer Deaktivierung/Absicherung der Automation.

### 2. Supabase-Migration 175

**Status: Rot/Gelb, je nach bereits bestaetigtem DB-Stand.**

Der Scope enthaelt `supabase/migrations/175_fix_users_full_name_drift.sql`. Sie fuegt `public.users.full_name` hinzu, repariert Drift aus `display_name` und ersetzt eine Role-Check-Constraint. Das ist fachlich plausibel, aber DB-relevant.

Gate:

- Bestaetigen, dass Migration 175 in der Zielumgebung bereits bewusst angewendet wurde oder dass ein Push sie nicht automatisch gegen Prod ausfuehrt.
- Falls CI/CD Migrationen automatisch ausfuehrt: Push blockieren bis Founder-Go fuer DB-Aktion vorliegt.
- Down-Migration beachten: Sie droppt `full_name`; fuer Rollback nur mit Vorsicht nutzen, weil App-Code inzwischen von der Spalte ausgehen kann.

### 3. KI-Route-Statuscodes

**Status: Gelb.**

Die AI-Gates geben bei deaktivierter KI teilweise `503` zurueck. Das ist als "KI-Hilfe nicht verfuegbar" nutzbar, kann aber Monitoring, Retries oder UX anders triggern als `403`/`409`.

Gate:

- Akzeptieren, dass deaktivierte KI als temporaer nicht verfuegbar modelliert wird.
- Falls Produktlogik "User hat KI deaktiviert" separat behandeln soll, spaeter Statuscode/Fehlercode vereinheitlichen.

### 4. Lokale Preview-Routen

**Status: Gelb, aber kontrolliert.**

Preview-Routen sind produktiv per `NODE_ENV === "production"` blockiert. Das ist gut, sollte aber vor Push mit Build-/Route-Check validiert werden.

Gate:

- Vor Push mindestens `npm test` und `npx tsc --noEmit` auf dem final zu pushenden Commit ausfuehren.
- Optional: production build pruefen, wenn `origin/master` deployrelevant ist.

### 5. Raspberry-Pi-Entfernung und Kiosk-Parken

**Status: Gelb.**

Der alte `raspberry-pi/` Ordner wird geloescht und Kiosk-Web wird sichtbar geparkt. Das passt zur dokumentierten Pi-5-Retirement-Entscheidung, ist aber organisatorisch relevant.

Gate:

- Founder bestaetigt, dass keine aktive Kiosk-/Pi-Auslieferung mehr aus diesem Ordner abhaengt.

### 6. Secret-/Env-Sicht

**Status: Gruen mit Restvorsicht.**

Im bewerteten Diff wurden keine `.env`-Dateien oder Package-Dependency-Aenderungen sichtbar. Der Scope enthaelt aber Runbooks/Skripte mit Bezug auf Secret-Rotation und Supabase Admin Nutzung.

Gate:

- Keine Secrets in Commit-Inhalten aufnehmen.
- Cleanup-/Rotation-Skripte nicht in Codex-Sessions gegen echte Secrets ausfuehren.

## Empfohlene Push-Checkliste

Vor einem spaeteren Push von `97593a2` oder einem neueren Stand:

1. Founder-Go fuer Push-Ziel und moegliche Deploy-Folge einholen.
2. Sicherstellen, dass `origin/master` nicht ungewollt Production deployt.
3. Migration-175-Status klaeren: bereits angewendet, bewusst geplant oder sicher nicht automatisch ausgefuehrt.
4. Arbeitsbaum bereinigen/einordnen: untracked Logs, Output-Dateien und lokale Hilfsskripte nicht versehentlich aufnehmen.
5. Auf dem exakt zu pushenden Commit ausfuehren:
   - `npm test`
   - `npx tsc --noEmit`
   - falls deployrelevant: production build
6. Finalen Diff gegen `origin/master` noch einmal auf `.env`, Secrets, unerwuenschte Output-Dateien und DB-/Deploy-Automation pruefen.

## Empfehlung

**Kein direkter Push jetzt.**  
Der Stand `97593a2` ist als abgeschlossener Arbeits-/Handoff-Stand plausibel, aber wegen potenziellem Auto-Deploy und enthaltener DB-Migration nicht "blind pushbar".

Empfohlene Freigabeformel:

> Push erst nach Founder-Go, bestaetigtem Nicht-Deploy oder akzeptierter Deploy-Folge, geklaertem Migration-175-Status und frischer Testausfuehrung auf dem finalen Ziel-Commit.

## Nachtrag 2026-04-28: Erweiterung auf `a85b76e`

Aktualisierter lokaler HEAD: `a85b76e docs(handoff): mark block 3 done`  
Aktualisierter Ahead-Stand: 62 Commits gegen `origin/master`  
Zusatz-Scope gegen urspruengliche Bewertung: `97593a2..a85b76e`, 9 Commits.

Die urspruengliche Bewertung deckte 53 Commits bis `97593a2` ab. Die Block-3-Implementierung liegt danach und umfasst:

- `e97b3f0 docs(handoff): mark block 3 in progress`
- `5c44f59 docs(plan): add ai assistance settings implementation plan`
- `0130372 feat(ki-help): add shared ai assistance levels`
- `296bbf9 feat(ki-help): add ai assistance level picker`
- `0bc44eb refactor(register): use shared ai assistance level picker`
- `242e8e6 feat(settings): choose ai assistance level in memory settings`
- `cbacc35 feat(ai): persist assistance level in user settings`
- `69f8b87 feat(api): accept ai assistance level settings`
- `a85b76e docs(handoff): mark block 3 done`

### Block-3-Bewertung

**Status: Gruen/Gelb, nicht push-blockierend.**

Block 3 konsolidiert das KI-Stufen-Modell in shared Code, ersetzt die Register-spezifische Auswahl durch einen wiederverwendbaren Picker, ergaenzt die KI-Hilfe-Settings in `modules/ai/components/AiHelpSettingsToggle.tsx`, persistiert `ai_assistance_level` in `lib/ai/user-settings.ts` und erweitert `app/api/settings/ai/route.ts` serverseitig um Annahme/Validierung der Stufe.

Positiv:

- Gemeinsames Level-Modell reduziert Drift zwischen Register-Flow und Settings.
- API und Persistenz sind durch Tests abgedeckt.
- Kein neues Schema/Migrationsrisiko erkennbar, da die Einstellung im bestehenden Settings-Kontext landet.
- Register-Flow und Settings nutzen denselben Picker, also weniger UI-Logik-Duplizierung.

Restvorsicht:

- UX-/Produktfrage bleibt, ob User die Stufe jederzeit ohne zusaetzlichen Consent-Kontext wechseln duerfen. Fuer den aktuellen Closed-Pilot-Scope ist das akzeptabel, sollte aber spaeter in Datenschutz-/Consent-Copy nachgezogen werden.

### Verifikation auf aktuellem HEAD

Laut aktueller Claude-Verifikation auf `master` HEAD `a85b76e`:

- `npx tsc --noEmit`: exit 0
- `npx vitest run`: exit 0

Damit ist das urspruengliche Gate 4 ("Tests + Type-Check auf finalem Commit") fuer `a85b76e` erfuellt.

### Aktualisierung Gate 2: Migration 175

Claude meldet: Migration 175 ist bereits auf Prod applied. Damit entfaellt das urspruengliche DB-Gate fuer diese Migration als Push-Blocker, solange der Push selbst keine weitere automatische DB-Schreibung oder Migration ausloest.

Restgate bleibt:

- Sicherstellen, dass CI/CD beim Push keine unerwarteten weiteren Supabase-Migrationen ausfuehrt.

### Neuer kritischer Befund: `NEXT_PUBLIC_PILOT_MODE`-Env-Drift

**Status: Rot vor Push/Deploy.**

Claude meldet aus der Vercel-Sicht: Production hat `PILOT_MODE`, aber nicht `NEXT_PUBLIC_PILOT_MODE`. Lokale Code-Suche bestaetigt zahlreiche Stellen, die `process.env.NEXT_PUBLIC_PILOT_MODE` lesen, unter anderem:

- `app/(app)/invitations/page.tsx`
- `app/(app)/praevention/buchen/page.tsx`
- `app/(app)/praevention/buchen-fuer-andere/page.tsx`
- `lib/invitations.ts`
- `lib/feature-flags.ts`
- `lib/feature-flags-server.ts`
- `lib/feature-flags-middleware-cache.ts`
- `lib/billing/payment-config.ts`
- `lib/leistungen/use-teaser-state.ts`
- `modules/voice/components/companion/TTSButton.tsx`
- `modules/praevention/services/reminders.service.ts`
- `modules/praevention/services/payment.service.ts`

Konsequenz: Client-/Bundle-nahe Pilot-Branches sehen ohne `NEXT_PUBLIC_PILOT_MODE=true` den Pilotmodus als aus. Besonders kritisch sind Praevention-Buchungen und Payment-Konfiguration: Dort koennte der erwartete Pilot-Bypass fehlen und stattdessen der Non-Pilot-/Stripe-Pfad greifen.

Server-Code, der `process.env.PILOT_MODE` direkt liest, kann weiterhin korrekt sein. Das erklaert, warum serverseitige Closed-Pilot-Smokes trotz Drift gruen sein koennen.

Gate vor Push/Deploy:

- In Vercel Production `NEXT_PUBLIC_PILOT_MODE=true` setzen, gleicher Wert wie `PILOT_MODE`.
- Falls Preview-Deploys fuer Tests genutzt werden: auch in Vercel Preview setzen.
- Danach neu bauen/deployen, weil `NEXT_PUBLIC_*`-Werte in Client-Bundles zur Build-Zeit eingebettet werden.

Alternativ sauberer, aber groesser:

- Frontend-Feature-Flags ueber eine serverseitige Feature-Flags-API ausliefern statt Env direkt in Client-/Bundle-Code zu lesen.

### Aktualisiertes Push-Urteil

**Weiterhin kein direkter Push jetzt, bis das neue Env-Gate erledigt ist.**

Mig 175 und Tests sind nach aktuellem Stand entlastet. Block 3 wirkt nicht push-blockierend. Der neue harte Blocker ist `NEXT_PUBLIC_PILOT_MODE`: Vor jedem Push, der einen Build oder Deploy ausloesen kann, muss die Vercel-Env synchronisiert werden.

Aktualisierte Freigabeformel:

> Push erst nach Founder-Go, geklaertem Auto-Deploy-Verhalten, gesetztem `NEXT_PUBLIC_PILOT_MODE=true` in Vercel Production, frischer Build-/Deploy-Bewertung und weiterhin gruener Testlage auf dem finalen Commit.

## Nachtrag 2026-04-28: Gate-Konsolidierung nach Claude-Audit

Claude hat die Push-Gates nachgeprueft und mehrere offene Punkte konkretisiert. Dieser Abschnitt konsolidiert den Bericht als Entscheidungsgrundlage fuer den aktuellen Stand `a85b76e`.

### Geklaerte Gates

| Gate | Neuer Status | Begruendung |
| --- | --- | --- |
| Auto-Deploy bei Push | Gruen/aufgeklaert | Laut Claude/Auto-Memory loest ein Push keinen direkten Vercel-Deploy aus. Deploy laeuft ueber 3h-Cron mit SHA-Check bzw. manuell. |
| Migration 175 | Gruen | Laut Claude bereits auf Prod applied: `schema_migrations` enthaelt `175_fix_users_full_name_drift`, Spalte vorhanden, Backfill 1181/1181. |
| Tests + Type-Check | Gruen | `npx tsc --noEmit` exit 0 und `npx vitest run` exit 0 auf `a85b76e`. |
| Block 3 | Gruen/Gelb | Bewertet im vorherigen Nachtrag. DB-frei, da `ai_assistance_level` in bestehendem `users.settings`/Settings-Kontext lebt; keine neue Migration. |
| Secret-Sicht | Gruen | Keine `.env`-Dateien im bewerteten Commit-Scope; keine Secret-Werte im Diff festgestellt. |

### Weiter offene oder akzeptierte Gates

| Gate | Status | Entscheidung |
| --- | --- | --- |
| `NEXT_PUBLIC_PILOT_MODE` fehlt in Vercel | Rot | Einziger harter technischer Push-/Deploy-Blocker. Vor Build/Deploy in Vercel Production `NEXT_PUBLIC_PILOT_MODE=true` setzen, synchron zu `PILOT_MODE`. |
| KI-Route-Statuscodes `503` bei deaktivierter KI | Gelb/akzeptiert | Fachlich beobachtbar, aber nicht push-blockierend fuer Closed Pilot. Spaeter ggf. Statuscode/Fehlercode produktseitig schaerfen. |
| Pi/Kiosk-Removal | Gelb | Braucht Founder-Bestaetigung, dass keine aktive Kiosk-/Pi-Auslieferung mehr vom entfernten Ordner abhaengt. |
| AVV/HR/organisatorisches Master-Push-Gate | Gelb/extern | Falls MEMORY/Founder-Regel weiterhin Master-Push erst nach AVV/HR vorsieht, bleibt das ein organisatorisches Go/No-Go ausserhalb der Codequalitaet. |

### Aktualisierte Bilanz

Die urspruenglich offenen technischen Gates sind groesstenteils entlastet:

- Auto-Deploy ist laut Claude nicht direkt an Push gekoppelt.
- Migration 175 ist bereits produktiv angewendet.
- Tests und Type-Check sind auf `a85b76e` gruen.
- Block 3 ist bewertet und nicht als Push-Blocker einzustufen.

Der reale technische Blocker vor einem Build/Deploy ist damit:

> `NEXT_PUBLIC_PILOT_MODE=true` fehlt in Vercel Production.

Solange kein Build/Deploy laeuft, ist der Env-Drift latent. Sobald ein Deploy mit aktuellem Code gebaut wird, werden `NEXT_PUBLIC_*`-Variablen in den Client-Bundle eingebettet; fehlt der Wert dann, laufen Pilot-Frontend-Pfade im Non-Pilot-Modus.

### Entscheidungsempfehlung nach Audit

Fuer einen reinen Push ohne direkten Deploy ist das technische Risiko deutlich niedriger als im Erstbericht, weil Push laut Claude keinen Auto-Deploy triggert. Trotzdem bleibt die Empfehlung konservativ:

1. Vor jedem Deploy: `NEXT_PUBLIC_PILOT_MODE=true` in Vercel Production setzen.
2. Founder bestaetigt Pi/Kiosk-Removal oder verschiebt dieses Gate bewusst.
3. Organisatorische AVV/HR-/Founder-Go-Regel fuer Master-Push beachten.
4. Danach ist `a85b76e` aus Code-/Test-Sicht pushfaehig.

Kurzurteil nach Audit:

> Code- und Testlage: pushfaehig. Deploy-Lage: erst nach `NEXT_PUBLIC_PILOT_MODE`-Fix. Founder-/AVV-Gates bleiben organisatorisch entscheidend.

## Abschlussnotiz 2026-04-28 Nacht

Dieser Bericht wurde zusammen mit `docs/plans/2026-04-28-night-handover.md` lokal gespeichert und committed:

```text
docs(handoff): add push assessment night handover
```

Damit steht `master` lokal auf dem Doku-Abschlusscommit, 63 Commits vor `origin/master`. Die technische Code-/Testbewertung bezieht sich weiterhin auf den App-Code-Stand `a85b76e`; der Abschlusscommit ist ein reiner Doku-Commit.
