# Claude-Gate Welle 0 — Review des Kreis-/Stadt-App-Plans

> ## ✅ UPDATE: Gesamtplan v2 — GATE PASS (2026-07-20, nachmittags)
>
> Codex hat alle Findings dieses Reviews in den „QuartierApp-Gesamtplan v2"
> eingearbeitet. **Gate-Entscheid: PASS — keine offenen P0/P1 im Plan.** Die
> P0-Lecks sind als eigene Welle 1 (Mig 203) eingeplant, Flag-Reparatur ist
> Welle 2 vor Discovery, Kontakt-Migrationsregeln sind deterministisch
> (`left(message, 280)`, Kollisionsregeln), Moderation lokal ohne KI-Provider.
> Founder hat die Datenschutzlinie verschärft: `vacation_modes` owner-only +
> `notify_neighbors` Default `false` (strenger als der Vorschlag unten in P0-1 —
> die W6-Kreisprojektion ersetzt später die Quartiersanzeige).
>
> **Rest-Auflagen für die Umsetzung (R, keine Merge-Blocker):**
> - **R1 (Welle 1):** Verbraucher-Sweep über ALLE Leser von `vacation_modes`
>   und `household_members` (nicht nur HouseInfoPanel — z. B. Ausschlusslogik in
>   `quarter-residents.service.ts:100`, Care-/Family-Flows). Die RLS-Verschärfung
>   leert deren Ergebnisse stillschweigend; jede betroffene Stelle braucht einen
>   getesteten Empty-State (kein Crash, kein Dauer-Skeleton).
> - **R2 (Welle 1):** HouseInfoPanel wird erst in Welle 3 umgebaut — in Welle 1
>   muss es mit leeren Query-Ergebnissen fehlerfrei rendern (Test explizit auch
>   auf „kein Fehlerzustand", nicht nur „keine Fremddaten").
> - **R3 (Welle 5):** `adult_attested_at` als Selbstauskunft ist akzeptiert.
>   Auflagen: Feld nur serverseitig beschreibbar (RLS/Trigger), der
>   `youth_profiles`-Ausschluss läuft in derselben atomaren Serverfunktion wie
>   das Opt-in, Bestätigungstext juristisch eindeutig („Ich bestätige, dass ich
>   mindestens 18 Jahre alt bin").
> - **R4 (Produktnotiz, bewusst):** Durch den P0-Fix verschwindet die
>   „Im Urlaub"-Anzeige auf der Karte komplett bis zur W6-Kreisprojektion —
>   Founder-gewollt (Datenschutz vor Feature).
> - **R5 (Welle 2, bestätigt):** Leere `enabled_quarters`-Liste = global
>   entspricht der bestehenden Client-Semantik (`lib/feature-flags.ts:142-146`)
>   — kompatibel, kein Migrationsbedarf an bestehenden Flags.
>
> Paralleler Kommunal-Strang (Owner Claude, Dossier) läuft an — kein Versand
> ohne Founder-Go. Welle-0-Voraussetzungen: siehe Abschnitt 4 unten (Env +
> Push stehen noch aus).

Stand: 2026-07-20 · Reviewer: Claude (Driver) · Basis: Code-Verifikation (3 parallele
Prüfagenten, Datei:Zeile-belegt), nicht Plan-Text.

**Gesamturteil: Plan ANGENOMMEN mit Auflagen.** Architektur, Datenschutz-Design
(Raster ≥3, opake Discovery-IDs, Opt-in), Wiederverwendung und Wellen-Schnitt sind
richtig. Zwei P0-Funde (bestehende Lecks, nicht vom Plan verursacht), drei P1,
mehrere P2. P0 sind VOR oder ganz am Anfang der Umsetzung zu schließen.

## 1. Verifikations-Ergebnis der Plan-Behauptungen

| # | Behauptung | Ergebnis |
|---|---|---|
| B1 | Zwei Kontakt-Tabellen | ✅ `neighbor_connections` (Mig 008) + `contact_links` (Mig 161). Divergenz: Status `declined` vs `rejected/blocked`; `message` (500) vs `note` (CHECK 280) |
| B2 | Doppel-Insert | ✅ `lib/services/quarter-residents.service.ts:251-261` + `:279-286` |
| B3 | Verbraucher | ✅ `contact_links` ist kanonisch (Chat, Accept, Notifications). **`neighbor_connections` hat KEINEN Accept-Pfad im Code** → reine Legacy, Welle 2 ist kleiner als geplant |
| B4 | Chat nur bei accepted | ✅ RLS `are_contacts()` (Mig 161:405-442) + `conversations.service.ts:101-117` |
| B5 | HouseInfoPanel lädt Fremd-Daten | ✅ `components/HouseInfoPanel.tsx:67-132` — Namen, Avatare, Urlaube fremder Haushalte; **ignoriert `notify_neighbors`-Opt-out** |
| B6 | users/households zu offen | Teilweise: `users`/`households` sind seit Mig 20260529 quartiers-isoliert (ok). **`household_members.hm_read` (Mig 001:322) ist quartiersübergreifend offen** |
| B7 | Urlaubsdaten | ✅ verschärft: `vacation_modes.vacation_read` (Mig 009:24) = `is_verified_member()` ohne Quartier- und ohne `notify_neighbors`-Scope |
| B8 | care_subscriptions | ✅ existiert (Mig 030), aber `UNIQUE(user_id)` — Kreis-Bezug fehlt wie im Plan angenommen |
| B9 | Family-Setup nutzbar | ✅ Token/QR/Kurzcode + echte UI-Flows (Mig 197, `app/(auth)/setup/[token]`, `modules/family-setup/`) |
| B10 | Altersprüfung möglich | ⚠️ Geburtsdatum nur in `users.settings.pilot_identity.date_of_birth` (JSONB, nicht constraint-gesichert); strukturiert nur `youth_profiles.birth_year` (sticky, Mig 198) |
| B11 | Stripe-Checkout | ✅ vollständig gebaut inkl. Webhooks, hinter `BILLING_ENABLED` (`app/api/billing/{checkout,webhook}/route.ts`) → **Welle 5 ist kleiner als geplant** |
| B12 | TRUSTED_NEIGHBOR_DISCOVERY | Existiert noch nicht (erwartet, ist Neubau) |

## 2. Findings

### P0 — vor Umsetzungsbeginn schließen (Merge-Sperre für alles andere ist NICHT nötig, aber Fix zuerst)

- **P0-1 `vacation_modes` quartiersübergreifend lesbar.** Policy `vacation_read`
  (`009_vacation_mode.sql:24`) = `is_verified_member()` — jeder verifizierte Nutzer
  jedes Quartiers liest Abwesenheitszeiträume + Freitext-Notizen ALLER Nutzer.
  Abwesenheitsdaten sind einbruchsrelevant. Zusätzlich wird das Opt-out-Feld
  `notify_neighbors` weder in RLS noch im Client (`HouseInfoPanel.tsx:127-132`)
  respektiert. **Fix:** Policy ersetzen: eigene Zeile ODER (gleiches Quartier UND
  `notify_neighbors = true`). Client-Query zusätzlich filtern.
- **P0-2 `household_members` quartiersübergreifend lesbar.** Policy `hm_read`
  (`001_initial_schema.sql:322`) = `user_id = auth.uid() OR is_verified_member()`;
  `is_verified_member()` (001:296) prüft kein Quartier. Jeder verifizierte Nutzer
  liest alle user↔household-Zuordnungen aller Quartiere. **Fix:** Quartier-Scope
  analog `users_quarter_select` (Mig 20260529:93-98).

Empfehlung: beide als EINE kleine Migration (203) + Rollback in `supabase/rollbacks/`
+ RED-Tests (cross-quarter Leser bekommt 0 Zeilen) + Security-Mini-Audit-Block.
RLS-Änderung = rote Zone → Prod-Apply nur mit Founder-Go. Pilot-Risiko real klein
(nur Testnutzer), aber vor Welle-7-Testpersonen zwingend zu.

### P1 — im Plan nachschärfen, vor der jeweiligen Welle

- **P1-1 Feature-Flag-Quartier-Auswertung ist tot.** `enabled_quarters` wird
  client-seitig nie übergeben (`components/FeatureGate.tsx:19-20`, kein Call-Site
  mit `quarterId`) und server-seitig gar nicht geprüft
  (`lib/feature-flags-server.ts:15-31`). Der Plan legt Discovery hinter ein
  Quartier-Flag — ohne Reparatur gilt jedes Flag global. **Auflage:** Flag-Reparatur
  (= W2 aus `2026-07-20-stadt-app-positionierung.md`) wird Voraussetzung von Welle 3.
- **P1-2 Altersprüfung nicht durchsetzbar spezifiziert.** „Nur Erwachsene in
  Discovery" braucht eine belastbare Quelle. JSONB-Settings sind manipulierbar
  (Mig 201 strippt zwar geschützte Keys bei INSERT — prüfen, ob
  `pilot_identity` dazugehört, sonst UPDATE-Weg offen). **Auflage:** Discovery-Opt-in
  serverseitig gegen strukturiertes, sticky Feld prüfen (Vorbild
  `youth_profiles.birth_year`-Trigger Mig 198) ODER `is_adult`-Flag beim Opt-in
  serverseitig aus Geburtsdatum ableiten und sticky machen; zusätzlich
  `youth_profiles`-Existenz = harter Ausschluss.
- **P1-3 Status-/Feld-Mapping der Kontakt-Migration.** `declined → rejected` ist
  im Plan; zusätzlich nötig: `message` (500 Zeichen, Mig 112-Felder
  `target_household_id`) → `note` (DB-CHECK 280) — Kürzungsregel definieren, sonst
  bricht der Migrations-Insert. UNIQUE(requester,target) vs PK(requester,addressee)
  Duplikat-Kollision beim Merge behandeln (Doppel-Insert hat beide Tabellen
  teilbefüllt, 23505 wurde toleriert → Datenbestände sind NICHT deckungsgleich).

### P2 — sinnvoll, darf in spätere Welle

- P2-1 `HouseInfoPanel` auf aggregierte/einwilligungsbasierte Anzeige umbauen
  (Welle 1 im Plan deckt das; hier nur festgehalten, dass der heutige Zustand auch
  innerhalb des Quartiers großzügig ist: Namen+Urlaub ohne Beziehungs-Kontext).
- P2-2 Kurztext-Moderation konkretisieren: serverseitige Regex-/Blocklist-Prüfung
  (E-Mail, Telefonnummern, URLs) — KEIN KI-Provider (AVV/Kosten).
- P2-3 `care_subscriptions`-Kreis-Bezug additiv (neue Spalte/Zuordnungstabelle),
  Server bleibt einzige Berechtigungsquelle — wie im Plan, nur explizit: bestehende
  `UNIQUE(user_id)` nicht brechen.
- P2-4 Welle 5 verkleinern: Checkout/Webhooks existieren — Restarbeit ist
  Kreis-Bezug + Trial/Downgrade-Tests + `BILLING_ENABLED`-Aktivierung (Founder-Go).
- P2-5 Welle 2 verkleinern: `neighbor_connections` hat keinen Accept-Pfad —
  nur Anfrage-Erzeugung/Spam-Zählung (`quarter-residents.service.ts:100,170,252`)
  umziehen, Doppel-Insert entfernen.

## 3. Strategie-Auflage (Founder-Entscheid, nicht Codex)

Der Plan verschiebt die Kommunal-Säule hinter den B2C-Beweis. Konflikt mit dem
Founder-Ziel „förderfähig durch Stadt" (Entscheidungslog 2026-07-20). Empfehlung
Claude: **Codex-Reihenfolge annehmen + Förder-Dossier/Rathaus-Erstgespräch (W5 des
Stadt-Plans) parallel starten** — Papier ist billig, Kommunal-Zyklen sind lang,
kein zweiter Launch. Bestätigung durch Founder steht aus.

## 4. Welle-0-Voraussetzungen (Stand heute)

1. Vercel-Env `NEXT_PUBLIC_SITE_URL=https://quartierapp.de` — Founder-Hand
   (CLI für Agenten gesperrt), Dashboard-Seite war geöffnet.
2. `git push origin master` — schiebt `da4def0` (AGB → quartierapp.de). Danach ist
   origin/master der saubere Startpunkt für den neuen `codex/`-Branch.
3. Voice-Branch `codex/realtime-2-1-mini` bleibt strikt getrennt (wie im Plan).
4. P0-Migration 203 als erster PR (oder Teil von Welle 1, dann Welle 1 vorziehen).

## 5. Gate-Entscheid

- Architektur/Produktgrenzen/Datenschutz-Design: **PASS**
- Reihenfolge: **PASS mit Auflage P1-1** (Flag-Reparatur vor Welle 3)
- Offene Founder-Entscheide: Strategie-Bestätigung (Abschnitt 3), Go für
  P0-Fix-Migration auf Prod, die zwei Handgriffe aus Abschnitt 4.
