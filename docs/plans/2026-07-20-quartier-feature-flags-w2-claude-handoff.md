# Welle 2: Quartiersfähige Feature-Flags — Handoff an Claude

**Stand:** 2026-07-20
**Branch:** `codex/quartier-feature-flags-w2`
**Basis:** `origin/master` @ `31f1be2`
**Scope:** reiner Code; keine Migration, kein ENV-/Secret-Eingriff, kein Deploy

## Ergebnis

Die Auflage P1-1 aus dem Claude-Gate ist umgesetzt. Serverseitige Feature-Gates
werten `enabled_quarters` jetzt pro authentifiziertem Nutzer aus. Ein leerer
Quartier-Scope bleibt kompatibel global aktiv. Ein nicht-leerer Scope wird nur
freigegeben, wenn das Quartier aus der eigenen verifizierten
`household_members`-Mitgliedschaft enthalten ist. Ein Client-`quarterId` ist
keine Berechtigungsquelle.

## Pflicht-Pre-Check gegen den Code

| Fund | Bestätigung / Entscheidung |
|---|---|
| `lib/feature-flags-server.ts` las nur `enabled` | Bestätigt; bestehender Serverpfad erweitert, kein Parallelservice. |
| `lib/feature-flags-middleware-cache.ts` cachete nur die globale Boolean-Entscheidung | Bestätigt; Cache enthält jetzt eine versionierte Flag-Konfiguration, die Nutzerentscheidung erfolgt pro Request. |
| `lib/feature-flags.ts` konnte `enabled_quarters` bereits clientseitig auswerten | Bestätigt; Semantik „leer = global“ beibehalten. |
| Kein `FeatureGate`-Call-Site übergab `quarterId` | Bestätigt; manipulierbarer Prop entfernt und vorhandener `QuarterProvider`/`useQuarter()`-Kontext verwendet. |
| `getUserQuarterId()` existiert in `lib/quarters/helpers.ts` | Wiederverwendet; keine zweite Quartier-Auflösung gebaut. Die Abfrage filtert jetzt ausdrücklich `verified_at IS NOT NULL`. |
| Call-Sites von `FeatureGate` | `app/(app)/jugend/layout.tsx` und `app/(app)/handwerker/page.tsx`; beide liegen unter dem vorhandenen `app/(app)/layout.tsx` mit `QuarterProvider`. |
| Offene PRs | Vor Start nur Dependabot-PRs #101 und #107–#110; ausschließlich `package*.json`, kein Dateikonflikt. |

## Verhaltensmatrix

| Flag / Nutzer | Ergebnis |
|---|---|
| `enabled = false` | immer gesperrt |
| `enabled = true`, `enabled_quarters = []` | global freigegeben; kein Auth-Lookup erforderlich |
| Quartier A enthalten, verifizierte Mitgliedschaft in A | freigegeben |
| Quartier A enthalten, Mitgliedschaft in B | gesperrt |
| Quartier A enthalten, keine verifizierte Mitgliedschaft | fail-closed gesperrt |
| manipuliertes Client-`quarterId = A`, Mitgliedschaft in B | Clientwert wird nicht angenommen; gesperrt |
| `admin_override = true` | nur nach `auth.getUser()` und `users.is_admin = true` freigegeben |
| `NEXT_PUBLIC_PILOT_MODE = true` | kein Bypass; Verhalten unverändert |
| malformtes `enabled_quarters` | fail-closed; Cache fällt auf DB zurück, malforme DB-Zeile bleibt gesperrt |

## Technischer Diff

- `lib/feature-flags-server.ts`
  - lädt `enabled`, `enabled_quarters` und `admin_override`;
  - normalisiert die DB-/Cache-Form fail-closed;
  - bestimmt Nutzer, Adminstatus und Quartier ausschließlich serverseitig;
  - gibt globale Flags ohne unnötigen Auth-Lookup frei.
- `lib/feature-flags-middleware-cache.ts`
  - wechselt auf `ff:v2:<key>`, damit alte Boolean-Werte nicht fehlinterpretiert werden;
  - cachet 60 Sekunden nur die Flag-Konfiguration, niemals eine nutzerspezifische Freigabe;
  - wertet die Berechtigung bei jedem Request mit dem Serverresolver aus.
- `lib/quarters/helpers.ts`
  - berücksichtigt nur verifizierte Mitgliedschaften.
- `components/FeatureGate.tsx`
  - entfernt den manipulierbaren `quarterId`-Prop und verwendet den vorhandenen
    geladenen Quartier-Kontext ausschließlich für die UI-Ausblendung.
- Tests decken Serverresolver, Middleware-Cache, Client-Kontext, verifizierte
  Mitgliedschaft sowie bestehende Leistungen-/Municipal-/Health-/Pilot-Consumer ab.

## TDD-Evidenz

1. Baseline vor neuen Tests: 4 Dateien, 41/41 Tests GREEN.
2. Erster RED-Lauf nach Spezifikation: 4 Dateien rot, 14 erwartete Fehlschläge,
   19 bestehende Tests grün.
3. Zusätzlicher Security-RED: malformes `enabled_quarters` im Cache wurde
   fälschlich global freigegeben (`expected false, received true`).
4. Zusätzlicher Server-RED: dieselbe malforme DB-Form wurde fälschlich global
   freigegeben (`expected false, received true`).
5. GREEN nach Implementierung: gezielter Scope 11 Dateien, 144/144 Tests.
6. Vollsuite: 765 Dateien, 5.334 bestanden, 1 übersprungen, 0 fehlgeschlagen.

## Security-Mini-Audit

Geprüfte Zugriffskette:

- Authentizität: `supabase.auth.getUser()` validiert die Sitzung serverseitig;
  kein Request-Parameter fließt in die Quartierentscheidung.
- Quartier: `auth.uid()` führt über die eigene verifizierte
  `household_members`-Zeile zum Haushalt/Quartier. Migration 203 begrenzt den
  Lesepfad auf eigene Zeile bzw. eigenen verifizierten Haushalt.
- Admin: `admin_override` prüft `public.users.is_admin` für die validierte User-ID.
  Migrationen 198 und 201 schützen die Privilegfelder vor Selbsteskalation.
- Flag-Schreibrechte: Migration 086 erlaubt INSERT/UPDATE/DELETE nur Admins.
- Audit: Migration 176 protokolliert Flag-Änderungen über
  `feature_flags_audit_log_trigger`; diese Welle fügt nur Leselogik hinzu.
- Neue Endpunkte, Tokens, Schreibpfade oder externe Datenquellen: keine.

Mini-Audit Pass W2-FF (2026-07-20):
- RLS/Trigger geprüft: `feature_flags`, `feature_flags_audit_log`, `users`, `household_members`
- Findings: 0 CRITICAL/HIGH; Hardening: `getUserQuarterId()` filtert `verified_at IS NOT NULL`
- Audit-Trail: ja (bestehender `feature_flags_audit_log`-Trigger; Welle read-only) | Rate-Limit: n/a (kein neuer Endpoint/Token)

## Verifikation

| Gate | Ergebnis |
|---|---|
| Relevante Vitest-Tests | GREEN — 11 Dateien, 144/144 |
| Vollständige Vitest-Suite | GREEN — 765 Dateien, 5.334 bestanden, 1 übersprungen |
| `npx tsc --noEmit` | GREEN |
| ESLint, berührter Scope | GREEN |
| `npm run build` | GREEN — Next.js Production-Build, 246 Seiten |
| `git diff --check` | GREEN |
| `npm run test:e2e:pilot` | Infrastruktur-blockiert vor Pilot-Kriterium 1: isolierter Worktree enthält absichtlich keine `.env.local`; Auth-Setup kann daher `.auth/senior_s.json` nicht erzeugen. Setup/Auth-Wrapper 10/10 liefen, 0 Pilot-Kriterien bestanden, 11 nach Serientest-Abbruch nicht ausgeführt. Kein ENV-/Secret-Workaround und kein Cloud-Ausweichen. |

## Offene Risiken und Review-Fokus

- Für quartiersgebundene Flags sind service-role-/Cron-Aufrufe ohne
  authentifizierte Nutzersitzung bewusst fail-closed. Globale Flags bleiben
  kompatibel nutzbar. Claude soll die bekannten Server-Call-Sites auf beabsichtigte
  Scoped-Nutzung gegenprüfen.
- Redis übernimmt Flag-Konfigurationsänderungen nach höchstens 60 Sekunden;
  die nutzerspezifische Quartierentscheidung wird nicht gecacht.
- `FeatureGate` ist weiterhin nur UX. Die tatsächliche Zugriffskontrolle muss
  in Serverlayout/API plus RLS liegen.
- Der lokale Pilot-Smoke braucht einen separat bereitgestellten lokalen
  E2E-ENV/Auth-State. Das ist ausdrücklich kein Anlass, Prod-/Cloud-Zugang oder
  Secrets in diesen Worktree zu übernehmen.

## Rote Restschritte

- Draft-PR durch Claude sicherheits- und architekturseitig prüfen.
- CI vollständig grün sowie GitHub `CLEAN/MERGEABLE` bestätigen.
- Kein Merge, Deploy, ENV-/Secret-Eingriff oder Prod-DB-/Migrationsschritt ohne
  separates Founder-Go.
