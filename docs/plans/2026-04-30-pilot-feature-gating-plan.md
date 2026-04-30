# Pilot-Feature-Gating — Plan fuer Phase-1-Aktivierung

**Stand:** 2026-04-30
**Autor:** Claude (Spec) — Codex (Umsetzung folgt)
**Branch-Status:** master `28889cd` (lokal, nicht gepusht)
**Spec-Adressat:** Codex (TDD strict, Block-Wise, kein Push, kein Deploy)

---

## 1. Kontext und Auslöser

### 1.1 Founder-Strategie

Theobase GmbH ist seit 2026-04-27 beurkundet, aber noch nicht ins
Handelsregister eingetragen. In dieser Vor-GmbH-Phase haftet der
Geschaeftsfuehrer **persoenlich** fuer Verbindlichkeiten und DSGVO-Verstoesse
(§ 11 Abs. 2 GmbHG, sowie zwingendes DSGVO-Recht — durch AGB nicht
abdingbar).

Die HR-Eintragung wird voraussichtlich **1-2 Monate** dauern (Bank-Konto
bei Qonto in Vorbereitung, dann 25k Stammkapital, dann Bankbestaetigung
an Notar Stadler, dann HR-Anmeldung beim AG Freiburg).

In dieser Zwischenzeit will der Founder den Pilot trotzdem starten, aber
mit **maximaler Datensparsamkeit und minimalem Haftungsrisiko**:

> "Sobald die echten Tester kommen im Quartier, im Admin-Dashboard die
> rechtlich bedenklichen Dinge sperren und sauber starten und nach und
> nach die Funktionen freischalten, die bedenklich sind, nachdem wir
> alles haben was wir brauchen."

### 1.2 Drei Phasen

| Phase | Wer ist drin | Funktionsumfang | Risiko |
|---|---|---|---|
| **Phase 0 (heute)** | Founder + ~10 KI-/Pilot-Onboarding-Test-User | alles aktiv, 0 echte Daten Dritter | nahezu 0 |
| **Phase 1** (echte Tester) | 5-10 Pilot-Familien Bad Saeckingen | reduziert: rechtl. bedenkliche Funktionen GESPERRT | gering — Datensparsamkeit + AGB-Haertung |
| **Phase 2** (nach HR + AVV) | dieselben + erweiterter Kreis | schrittweise pro Funktion freigeschaltet, sobald rechtl. Voraussetzung steht | normal |

Fuer den Uebergang Phase 0 → Phase 1 braucht es einen **Test-User-Cleanup**
(Skript existiert: `scripts/ai-test-users-cleanup-dry-run.ts`,
Selektor: `settings.is_test_user='true'`). Cleanup-Execute = Founder-Hand.

---

## 2. Pre-Check Endstand (Adapter, kein Neubau)

### 2.1 Bestehende Infrastruktur (NICHT neu bauen)

```
DB-Tabelle:    public.feature_flags
               (key, enabled, required_roles, required_plans,
                enabled_quarters, admin_override, description, updated_at)

Client-API:    lib/feature-flags.ts
               - getFeatureFlags() mit 60s Cache
               - checkFeatureAccess(flagKey, userContext)
               - useFeatureFlag(flagKey, userContext)  // React Hook
               - invalidateFlagCache()

Server-API:    lib/feature-flags-server.ts
               - isFeatureEnabledServer(supabase, flagKey)

Middleware:    lib/feature-flags-middleware-cache.ts (Edge-tauglich)

Admin-UI:      app/(app)/admin/components/FeatureFlagManager.tsx
               - Switch-Toggles, 7 Gruppen, ~50 Flag-Beschreibungen,
                 Cache-Invalidierung beim Toggle, Loading-States

Wrapper:       components/FeatureGate.tsx
               <FeatureGate feature="X" user={ctx}>{children}</FeatureGate>

Tests:         __tests__/lib/feature-flags.test.ts
               __tests__/lib/feature-flags-audit.test.ts
                 (Audit-Test: verhindert tote Flag-Definitionen)
               __tests__/lib/municipal/feature-flag.test.ts
               lib/leistungen/__tests__/feature-flag.test.ts
               lib/__tests__/feature-flags-middleware-cache.test.ts

Migrations:    157, 158, 159 (externe API Flags)
               160 (Pilot-Readiness-Shutoff von 10 Legacy-Flags)
               169 (leistungen_info)
               170 (Health-Flags MEDICATIONS / DOCTORS)
               171 (Care-Access + AI-Provider Flags)
```

### 2.2 Tatsaechlich gegated im Code

- ✅ Youth-Modul (alle 7 API-Routen via `YOUTH_MODULE`)
- ✅ External Warnings (NINA / DWD / UBA / DELFI in cron + list-warnings)
- ✅ Quartier-Info-Hub-Legacy
- ✅ LGL-BW Map-Layer
- ✅ Leistungen-Info
- ✅ Kommunal-Modul (KOMMUNAL_MODULE)
- ✅ Referral-Rewards (REFERRAL_REWARDS)
- ✅ KI-Onboarding via `canUsePersonalAi` (3-fach Guard:
  `users.settings.ai_help_enabled` + `AI_PROVIDER_OFF` + `care_consents.ai_onboarding`)
- ✅ Companion / Voice / Care-Classify — Stufe-1 gegen `ai_help_enabled`

### 2.3 DB-Defaults (Stand 2026-04-30 laut Migrations 160/170/171)

- KI-Provider: `AI_PROVIDER_OFF=true`, `AI_PROVIDER_CLAUDE=false`,
  `AI_PROVIDER_MISTRAL=false` → KI gesperrt
- Care: `MEDICATIONS_ENABLED=false`, `DOCTORS_ENABLED=false`
- Care-Access: alle 4 Flags auf `false`
- Legacy: 10 Flags via 160-Shutoff auf `false` (BOARD, MARKETPLACE,
  HANDWERKER, KOMMUNAL_MODULE, QUARTER_PROGRESS, GDT, VIDEO_CONSULTATION,
  MODERATION, ORG_DASHBOARD, QUARTER_STATS)
- → DB ist heute **schon weitgehend Phase-1-konform**

---

## 3. Drei kritische Befunde, die der Plan adressiert

### 3.1 PILOT_MODE-Inkonsistenz Client vs. Server (Architektur-Bug)

**Fakt:**

```ts
// lib/feature-flags.ts (Client)
if (!flag) return false;
if (!flag.enabled) return false;        // <-- enabled-Check VOR Bypass
const pilotMode = process.env.NEXT_PUBLIC_PILOT_MODE === "true";
if (pilotMode) return true;             // bypass nur Rolle/Plan/Quartier
```

```ts
// lib/feature-flags-server.ts
if (process.env.NEXT_PUBLIC_PILOT_MODE === "true") return true;  // <-- vor Lookup
const { data } = await supabase
  .from("feature_flags")
  .select("enabled")
  .eq("key", flagKey).single();
return data?.enabled === true;
```

**Konsequenz:** Mit aktuellem `NEXT_PUBLIC_PILOT_MODE=true` (gesetzt
2026-04-29 in Vercel-Production) sind **alle serverseitigen
Feature-Checks faktisch ausgehebelt** — egal was im Admin-UI auf `false`
steht. Der Founder kann togglen wie er will, Server sagt immer "enabled".

Sicherheits-Workaround: Fuer die KI-Schicht greift `canUsePersonalAi`
ueber `AI_PROVIDER_OFF` — Bypass macht es zu `providerOff=true` →
`canUsePersonalAi` returnt `false`. KI bleibt gesperrt. Das ist Glueck,
keine Architektur.

### 3.2 Fehlender Audit-Trail (DSGVO-Nachweispflicht)

`__tests__/lib/feature-flags-audit.test.ts` ist ein Audit-**Test**
(verhindert tote Flag-Definitionen), kein Audit-**Log**. Keine
`feature_flags_audit_log`-Tabelle existiert. `FeatureFlagManager.handleToggle`
schreibt nur `feature_flags.updated_at`, keine "wer/wann/wert-vorher".

In Phase 1 mit echten Familien ist das DSGVO-relevant: Toggle-Aktionen
am Admin-Dashboard sind Verarbeitungs-Vorgaenge im Sinne Art. 30 DSGVO.

### 3.3 Luecken bei rechtlich-kritischen Routen (kein Flag)

- **Stripe / Billing:** `/api/billing/*`, `/api/checkout/*`,
  `/api/stripe/webhook` — kein `BILLING_ENABLED`-Flag in Liste.
- **Twilio:** `/api/twilio/*` — laeuft direkt ueber ENV, kein DB-Flag.
- **Care-Schreib-Endpoints:** Heartbeat ist via `canUsePersonalAi`
  abgedeckt, aber direkte Care-Schreib-Routen (Check-in-Nachrichten-CRUD,
  Medikamenten-CRUD) muessen verifiziert werden.
- **Push-Benachrichtigungen** mit personenbezogenem Inhalt — Flag
  `PUSH_NOTIFICATIONS` existiert, aber Verdrahtung im Code unklar.

---

## 4. Architektur-Entscheidungen (Claude trifft, Codex baut)

### 4.1 PILOT_MODE-Server-Bypass — Entscheidung: ENTFERNEN

**Optionen:**

(a) Server-Bypass entfernen → `isFeatureEnabledServer` macht immer einen
DB-Lookup, `enabled=false` blockiert immer.
(b) Bypass invertieren ("PILOT_MODE = strict mode").
(c) Neues `PILOT_PHASE`-Konzept (closed/beta/live) als zusaetzliche Schicht.

**Entscheidung:** **(a) entfernen.**

**Begruendung:**

- Konsistenz mit Client-API (dort macht `enabled=false` immer FALSE,
  PILOT_MODE bypassed nur Rolle/Plan/Quartier).
- Datensparsamkeit-by-Default: was `false` ist, soll `false` bleiben.
- Das `enabled_quarters`-Feld kann den "nur Bad Saeckingen"-Anwendungsfall
  abdecken, dafuer ist es da.
- (b) waere semantisch verwirrend (PILOT_MODE bedeutet sonst "im Pilot,
  alles offen" — Inversion ist Anti-Intuition).
- (c) waere Neubau einer Saeule, die wir nicht brauchen, wenn (a)
  funktioniert.

**Code-Aenderung minimal in `lib/feature-flags-server.ts`:**

```ts
export async function isFeatureEnabledServer(
  supabase: SupabaseClient,
  flagKey: string,
): Promise<boolean> {
  // PILOT_MODE-Bypass entfernt 2026-04-30 (Phase-1-Vorbereitung)
  // Begruendung: Inkonsistenz mit Client-API + ueberholt durch
  // expliziten Phase-1-Workflow.
  try {
    const { data } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", flagKey)
      .single();
    return data?.enabled === true;
  } catch {
    return false;
  }
}
```

**Migration der Client-API (parallel):** Den PILOT_MODE-Bypass dort
ebenfalls **entfernen** — dann ist die Linie sauber konsistent. Statt
PILOT_MODE-Bypass: das `enabled_quarters`-Feld auf das Bad-Saeckingen-Quartier
setzen, wenn ein Feature exklusiv im Pilot-Quartier laufen soll.

**Risiko:** Es gibt Tests, die PILOT_MODE-Bypass-Verhalten verifizieren
(`__tests__/lib/feature-flags.test.ts`). Diese muessen angepasst werden
(jetzt: "in PILOT_MODE wird Rolle/Plan/Quartier-Check umgangen, aber
disabled flags bleiben FALSE" → neu: "PILOT_MODE hat keinen Effekt mehr
auf Flag-Logik").

**Was passiert mit `NEXT_PUBLIC_PILOT_MODE`?**

Bleibt im Code, aber nur fuer das was es eigentlich ist: ein
**UI-Indikator** (Pilot-Banner, Closed-Pilot-Visuals,
Pilot-Onboarding-Flow). Nicht mehr fuer Feature-Flag-Logik.

### 4.2 Audit-Log — Entscheidung: NEUE TABELLE + TRIGGER

**Schema:**

```sql
create table public.feature_flags_audit_log (
  id          bigserial primary key,
  flag_key    text not null,
  action      text not null check (action in ('insert','update','delete')),
  enabled_before  boolean,
  enabled_after   boolean,
  changed_by      uuid references auth.users(id),
  reason          text,
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index feature_flags_audit_log_flag_key_idx
  on public.feature_flags_audit_log (flag_key);
create index feature_flags_audit_log_created_at_idx
  on public.feature_flags_audit_log (created_at desc);

-- RLS: nur Admin liest, keiner schreibt direkt (nur via Trigger)
alter table public.feature_flags_audit_log enable row level security;
create policy "Admin reads feature flag audit log"
  on public.feature_flags_audit_log for select
  using (auth.jwt() ->> 'role' = 'admin' or
         exists (select 1 from public.users
                 where id = auth.uid() and is_admin = true));
```

**Trigger:**

```sql
create or replace function public.log_feature_flag_change()
returns trigger language plpgsql security definer as $$
begin
  insert into public.feature_flags_audit_log
    (flag_key, action, enabled_before, enabled_after, changed_by, metadata)
  values
    (coalesce(new.key, old.key),
     tg_op::text,
     case when tg_op = 'INSERT' then null else old.enabled end,
     case when tg_op = 'DELETE' then null else new.enabled end,
     auth.uid(),
     jsonb_build_object(
       'required_roles_before', old.required_roles,
       'required_roles_after', new.required_roles,
       'required_plans_before', old.required_plans,
       'required_plans_after', new.required_plans,
       'enabled_quarters_before', old.enabled_quarters,
       'enabled_quarters_after', new.enabled_quarters
     ));
  return coalesce(new, old);
end;
$$;

create trigger feature_flags_audit_log_trigger
  after insert or update or delete on public.feature_flags
  for each row execute function public.log_feature_flag_change();
```

**Optional: Reason-Feld im Admin-UI.** `FeatureFlagManager.tsx` bekommt
einen optionalen `<Textarea>` "Grund fuer Aenderung", der vor dem Toggle
gefragt wird. Der Reason wird via UPDATE-Statement zusammen mit `enabled`
mitgegeben (`update feature_flags set enabled=$1, last_change_reason=$2`),
und der Trigger liest `last_change_reason` und schreibt ihn ins Audit-Log.
Dafuer braucht es eine neue Spalte `feature_flags.last_change_reason text`.

### 4.3 Phase-1-Whitelist (welche Flags duerfen `true` sein)

**Phase 1 — Default ON erlaubt:**

| Flag | Begruendung |
|---|---|
| `PILOT_MODE` | UI-Indikator (Pilot-Banner) |
| `NINA_WARNINGS_ENABLED`, `DWD_WEATHER_WARNINGS_ENABLED`, `UBA_AIR_QUALITY_ENABLED` | Oeffentliche Daten, kein Personenbezug, AVV nicht relevant |
| `LGL_BW_BUILDING_OUTLINES_ENABLED`, `OSM_POI_LAYER_ENABLED`, `DELFI_OEPNV_ENABLED`, `BKG_GEOCODER_FALLBACK_ENABLED` | Karten-/POI-Daten, oeffentlich |
| `AI_PROVIDER_OFF` | KI gesperrt — soll TRUE bleiben bis AVV |
| `CARE_ACCESS_FAMILY` | Familie/Freunde QR-Scan, wenn Senior es will (Default-Logik in Migration 171) — vorsichtig: laeuft auf personenbezogenen Daten |
| `CARE_ACCESS_EMERGENCY` | Notfall-QR — sehr eingeschraenkter Datenkreis |

**Phase 1 — STRIKT OFF (rechtlich blockiert bis HR/AVV):**

| Flag | Sperrgrund | Voraussetzung fuer Phase 2 |
|---|---|---|
| `AI_PROVIDER_CLAUDE` | Anthropic-AVV fehlt | HR + AVV mit Anthropic |
| `AI_PROVIDER_MISTRAL` | Mistral-AVV fehlt | HR + AVV mit Mistral |
| `MEDICATIONS_ENABLED` | sensitive Daten + MDR-Grenze | HR + DSFA-Review |
| `DOCTORS_ENABLED` | Verzeichnis ist OK, Anbindung an Pflege/Arzt nicht | HR |
| `APPOINTMENTS_ENABLED`, `VIDEO_CONSULTATION` | Termin-Daten + Video = personenbezogen | HR + Vertrag mit Sprechstunde.online |
| `HEARTBEAT_ENABLED` | Lebenszeichen-Daten echter Personen | HR + Care-AVV-Pruefung |
| `GDT_ENABLED` | Arzt-Schnittstelle | HR + Vertrag mit Arzt |
| `CARE_ACCESS_INDIVIDUAL_CAREGIVER`, `CARE_ACCESS_CARE_COMPANY` | externe Pflegekraefte = AVV mit Pflegedienst | HR + Vertrag mit Pflegediensten |
| `MARKETPLACE`, `EVENTS`, `BOARD_ENABLED`, `LOST_FOUND` | Multi-User-Inhalte echter Familien | HR — kann frueh in Phase 2 |
| `KOMMUNAL_MODULE` | Maengelmelder + Behoerden-Zugriff | Vertrag mit Stadt Bad Saeckingen |
| `MODERATION_ENABLED`, `ORG_DASHBOARD`, `QUARTER_STATS` | Org-Funktionen | nicht heute relevant |
| `PUSH_NOTIFICATIONS` | personenbezogene Push-Inhalte | Pruefung pro Inhalt |
| `NEWS_AI` | KI-Nachrichten-Zusammenfassung | AVV-abhaengig |
| `VIDEO_CALL_PLUS`, `VIDEO_CALL_MEDICAL` | TURN-Server uebermittelt Daten | Vertrag-Review Metered |
| **NEU `BILLING_ENABLED`** | kein Geldfluss in Vor-GmbH-Phase | HR |
| **NEU `TWILIO_ENABLED`** | SMS / Phone an Dritte | HR + AVV mit Twilio |
| **NEU `CHECKIN_MESSAGES_ENABLED`** | sensitiv-verschluesselt aber personenbezogen | HR + Care-AVV-Pruefung |

### 4.4 Pre-Set-Buttons im Admin-UI

Drei Buttons im FeatureFlagManager:

- "Phase 0 (Closed Pilot)" — alles auf TRUE, wie heute
- "Phase 1 (echte Tester)" — Phase-1-Whitelist setzt nur die erlaubten
  Flags auf TRUE, alle anderen auf FALSE
- "Phase 2 (nach HR + AVV)" — vorerst ausgegraut, aktiviert sich
  durch eine separate Funktions-Liste pro Voraussetzung

Implementiert als ein Server-Action / API-Endpoint
`POST /api/admin/feature-flags/preset`, der eine vordefinierte Flag-Liste
in einer Transaktion setzt + Audit-Log mit `reason="phase-preset:<phase>"`.

---

## 5. Block-Aufteilung fuer Codex (TDD strict)

### Block C1 — Server-Bypass entfernen + Tests anpassen

**Files:**
- `lib/feature-flags-server.ts` (Bypass weg)
- `lib/feature-flags.ts` (Bypass weg)
- `__tests__/lib/feature-flags.test.ts` (Tests anpassen)
- moeglicherweise andere Tests die PILOT_MODE-Verhalten erwarten

**Pflicht-Reihenfolge:**

1. Pre-Check: `Grep -n "NEXT_PUBLIC_PILOT_MODE" lib/ __tests__/`
   — komplette Liste der Stellen, an denen der Wert gelesen wird.
2. RED-Test schreiben: "PILOT_MODE-Bypass hat keinen Effekt mehr auf
   `enabled=false`-Flags" — laeuft heute durch (Bypass) und soll
   spaeter falsch werden.
3. GREEN-Implementation: Bypass-Zeilen entfernen.
4. Bestehende Tests anpassen — diejenigen, die explizit PILOT_MODE-Bypass
   verifizieren. Suchstring: `process.env.NEXT_PUBLIC_PILOT_MODE`,
   `pilotMode`.
5. `npx vitest run lib/feature-flags*.test.ts __tests__/lib/feature-flags*.test.ts`
   → exit 0
6. Commit-Message:
   `refactor(feature-flags): remove PILOT_MODE bypass for consistency`

**Verifikation:**
- Vitest gruen
- `npx eslint --max-warnings 200` exit 0
- `npx tsc --noEmit` exit 0

### Block C2 — Audit-Log Tabelle + Trigger + Service-Wrapper

**Files:**
- `supabase/migrations/176_feature_flags_audit_log.sql` (+ `.down.sql`)
- `lib/feature-flags-audit.ts` (neuer Service-Wrapper, optional)
- `app/(app)/admin/components/FeatureFlagManager.tsx` (Reason-Feld)
- `__tests__/lib/feature-flags-audit-log.test.ts` (neuer Test)

**Pflicht-Reihenfolge:**

1. Pre-Check Grep auf `feature_flags_audit_log`, `audit_log`, `audit_trail`
   — falls schon was existiert, Adapter, kein Neubau.
2. Migration File-first: `176_feature_flags_audit_log.sql` mit Schema +
   Trigger aus Abschnitt 4.2.
3. RED-Test: "Toggle eines Flags erzeugt einen Audit-Log-Eintrag mit
   `enabled_before`/`enabled_after`/`changed_by`/`reason`".
4. GREEN-Implementation: Migration anwenden gegen lokal/Branch (kein
   Prod ohne Founder-Go), `.down.sql` parallel anlegen.
5. Optional: `lib/feature-flags-audit.ts` mit `setFeatureFlagWithAudit()`
   wrappt UPDATE + setzt `last_change_reason` davor.
6. UI: `FeatureFlagManager.tsx` `<Textarea>`-Feld "Grund (optional)"
   beim Toggle.
7. Verifikation: Vitest + eslint + tsc gruen.
8. Commit:
   `feat(feature-flags): add audit log for toggle actions`

**Migration-Spezial-Hinweis:**

Pre-Check vor Migration: `Grep "feature_flags_audit_log\|log_feature_flag_change"`.
Falls nichts da, neue Migration. Falls etwas da, Adapter.
**Migration NICHT auf Prod anwenden** — nur lokales File + lokaler
Commit, Prod-Apply ist Founder-Go (Rote Zone).

### Block C3 — Neue Flags fuer Luecken (BILLING / TWILIO / CHECKIN_MESSAGES)

**Files:**
- `supabase/migrations/177_pilot_phase_flags.sql` (+ `.down.sql`)
- `lib/feature-flags-server.ts` Aufrufstellen in:
  - `app/api/billing/*` (jede Route)
  - `app/api/checkout/*` (jede Route)
  - `app/api/stripe/webhook/route.ts`
  - `app/api/twilio/*` (jede Route)
  - `app/api/care/heartbeat/*`, `app/api/care/checkin/*` falls existent
- `app/(app)/admin/components/FeatureFlagManager.tsx`
  Beschreibungen fuer neue Flags
- Tests fuer jede gegateete Route

**Pflicht-Reihenfolge:**

1. Pre-Check: `Glob app/api/billing/**, app/api/checkout/**,
   app/api/twilio/**, app/api/care/**` — alle Routen-Dateien listen.
2. Pro Route pruefen: existiert schon ein Flag-Check? Falls ja, kein
   Doppel-Gate.
3. Migration File-first: drei neue Flag-Inserts mit
   `enabled=false` als Default.
4. RED-Test pro Route: "Route returnt 503 oder 404 wenn Flag false".
5. GREEN-Implementation: `isFeatureEnabledServer`-Check am Anfang jeder
   Route-Handler, return 404 oder 503 bei false.
6. UI-Update: `FLAG_DESCRIPTIONS` ergaenzen, neue Gruppe "Billing & Externe Provider"
   im `FLAG_GROUPS`-Pattern.
7. Verifikation: Vitest gruen, eslint, tsc.
8. Commit:
   `feat(feature-flags): gate billing, twilio, checkin-messages routes`

**Wichtig:** Diese Migration verschiebt sich gegebenenfalls Mig-Nummer
abhaengig davon, ob C2 zuerst gelandet ist.

### Block C4 — Phase-Preset-API + Admin-UI-Buttons

**Files:**
- `app/api/admin/feature-flags/preset/route.ts` (neu)
- `lib/feature-flags-presets.ts` (neu — Konstanten fuer Phase-0 / Phase-1)
- `app/(app)/admin/components/FeatureFlagManager.tsx` (drei Buttons oben)
- `__tests__/api/admin/feature-flags-preset.test.ts` (neu)

**Pflicht-Reihenfolge:**

1. Pre-Check: `Grep "feature-flags/preset\|FlagPreset\|phase_preset"` —
   falls Variante existiert, Adapter.
2. `lib/feature-flags-presets.ts`:
   ```ts
   export const PHASE_0_PRESET: Record<string, boolean> = { ... };
   export const PHASE_1_PRESET: Record<string, boolean> = { ... };
   ```
   mit den Listen aus Abschnitt 4.3.
3. RED-Test: "POST /api/admin/feature-flags/preset mit phase=phase_1
   setzt Flags gemaess PHASE_1_PRESET, schreibt Audit-Log mit
   `reason='phase-preset:phase_1'`".
4. GREEN-Implementation: Server-Action mit Admin-Check, Transaktion,
   einzelne UPDATE-Statements per Flag.
5. UI: drei Buttons oben im FeatureFlagManager mit Bestaetigungs-Dialog.
6. Verifikation Vitest + eslint + tsc gruen.
7. Commit:
   `feat(admin): add phase preset buttons for feature flags`

### Block C5 — DB-Default-Korrektur fuer aktuell vorhandene Flags

**Files:**
- `supabase/migrations/178_pilot_phase_1_defaults.sql` (+ `.down.sql`)

**Pflicht-Reihenfolge:**

1. Vor der Migration: `select key, enabled from feature_flags order by key`
   gegen Prod (READ-ONLY ueber MCP) — aktuellen Stand dokumentieren.
2. Migration File-first: UPDATE-Statements fuer alle Flags, die laut
   Abschnitt 4.3 in Phase 1 auf `false` muessten.
3. Idempotent: `update ... where enabled is distinct from false` (nur
   wirkliche Aenderung).
4. **NICHT auf Prod anwenden** — Migration-File + lokaler Commit.
   Prod-Apply geht erst, wenn Founder den Schritt zu Phase 1 ausloest
   (rote Zone).
5. Commit:
   `chore(migrations): add phase-1 default migration (apply later)`

### Block C6 — Phase-1-Pre-Flight-Checkliste in Memory + INBOX

**Files:**
- `nachbar-io/docs/plans/handoff/INBOX.md` (Lint-Eintraege done, neue
  Eintraege fuer C1-C5 als koordinierter Strang)
- `nachbar-io/docs/plans/2026-04-30-pilot-feature-gating-plan.md`
  (diese Datei) wird zur Spec-Referenz
- Memory-Topic-File `topics/pilot-feature-gating.md` (neu, aus Vault
  raus moeglichst nichts duplizieren — Pointer-Logik)

**Verantwortung:** Claude

---

## 6. Migrations-Plan (Reihenfolge)

| Mig | Inhalt | Apply auf Prod? |
|---|---|---|
| **176** Audit-Log-Tabelle + Trigger | Schema + Trigger | nach Founder-Go |
| **177** Neue Phase-1-Flags (BILLING, TWILIO, CHECKIN_MESSAGES) | Inserts mit `enabled=false` | sofort moeglich, default-deny |
| **178** Phase-1-Default-Korrektur (UPDATEs) | UPDATE-Statements fuer Migrations-konformen Stand | erst beim Schritt zu Phase 1 |

Konfliktrisiko: Mig-Nummerierung **geklaert 2026-04-30**. `feature/hausverwaltung`
hat 175-178 + 180, ist aber lokal-only, nicht auf Prod. Master beansprucht
den 176-178-Korridor; Hausverwaltung rotiert beim Merge auf 181-185 wie im
Memory dokumentiert. Pre-Check trotzdem Pflicht: `Glob supabase/migrations/17*.sql`
direkt vor jeder Migration-Anlage, falls in der Zwischenzeit etwas dazwischengekommen
ist.

---

## 7. Test-Strategie

- **TDD strict** pro Block (RED-Test zuerst)
- Bestehende Tests muessen weiter gruen bleiben — vor allem
  `__tests__/lib/feature-flags.test.ts` und der Audit-Test
  (`__tests__/lib/feature-flags-audit.test.ts`)
- Neue Tests pro Block:
  - C1: PILOT_MODE-Bypass-Verhalten (jetzt: kein Effekt mehr)
  - C2: Audit-Log-Trigger schreibt korrekt bei UPDATE/INSERT/DELETE
  - C3: pro neue gegateete Route ein 503/404-Test
  - C4: Phase-Preset setzt korrekte Flag-Werte und schreibt Audit-Log
  - C5: keine neuen Tests, nur Migration

- E2E (Playwright) optional: Admin-UI Toggle + Audit-Log-Anzeige.
  Nicht Pflicht in dieser Welle.

---

## 8. Verifikations-Kriterien (was ist "fertig")

Nach allen Bloecken C1-C6:

- ✅ `npx eslint --max-warnings 200` exit 0
- ✅ `npx vitest run` exit 0
- ✅ `npx tsc --noEmit` exit 0
- ✅ `npx vitest run __tests__/lib/feature-flags*` alle gruen
- ✅ Alle existierenden gegateten Routen reagieren weiter wie zuvor
  (kein Regressions-Verhalten)
- ✅ Neue Routen (Billing/Twilio/Checkin) returnen 404/503 bei
  `enabled=false`
- ✅ Admin-UI zeigt drei Phase-Preset-Buttons
- ✅ Audit-Log-Tabelle bekommt einen Eintrag pro Toggle
- ✅ Migration 176/177 idempotent reapplyable
- ✅ INBOX und Plan-Doku auf done
- ✅ KEIN Push, KEIN Deploy

---

## 9. Risiken

| Risiko | Mitigation |
|---|---|
| Tests, die PILOT_MODE-Bypass annehmen, brechen | systematischer Grep + Test-Anpassung in C1 |
| Performance: ohne Bypass jede Route ein DB-Lookup | bestehender 60s-Cache greift; `lib/feature-flags-middleware-cache.ts` ggf. ergaenzen |
| Migration 178 wird versehentlich auf Prod angewendet, bevor Pilot-Familien da sind | Migration-File hat klaren Header `-- DO NOT APPLY TO PROD UNTIL PHASE 1 SWITCH` + Schema-migrations-INSERT bewusst weglassen |
| Audit-Log-Trigger schreibt zu viel (jeder Toggle 1 Eintrag) | Index auf `created_at desc`, Tabelle ist intern, keine Anzeige-Performance kritisch |
| Mig-Nummern-Konflikt mit `feature/hausverwaltung` | Pre-Check `Glob supabase/migrations/17*` vor Nummern-Wahl |
| Pilot-Familien sehen "Funktion in Vorbereitung"-Hinweise an zu vielen Stellen → schlechter erster Eindruck | Phase-1-Whitelist bewusst grosszuegig genug, dass Senior-Onboarding + Familienkreis-Basics + Quartier-Infos + statische Hilfe-Inhalte funktionieren |
| Server-Cache hat alte Werte nach Toggle | `invalidateFlagCache` wird bereits beim Toggle aufgerufen — Verifikation in C2 |

---

## 10. Implementations-Reihenfolge

```
1. Pre-Check (Codex): nochmal Glob + Grep pro Block, Pre-Check-TodoWrite-Eintrag
2. C1: Server-Bypass entfernen → kleinster sauberster Fix
3. C2: Audit-Log → Voraussetzung fuer C4 + DSGVO-Pflicht
4. C3: Neue Flags fuer Luecken (BILLING/TWILIO/CHECKIN_MESSAGES)
5. C4: Phase-Preset-API + Admin-Buttons
6. C5: DB-Default-Korrektur-Migration (NICHT applyen, nur File)
7. Final: tsc + lint + vitest gruen
8. Commit pro Block, kein Push
9. Claude: Code-Review, Memory-Update, INBOX-done, Vault-Pointer
```

---

## 11. Rote Zonen — was NICHT in diesem Plan steckt

- KEIN `git push origin master`
- KEIN Vercel-Deploy
- KEINE Migration auf Prod-DB ohne expliziten Founder-Go
- KEINE Aenderung an Stripe-Live-Konfiguration
- KEINE neuen Dependencies (`package.json` bleibt unangetastet)
- KEINE Aenderungen in `tests/e2e/**` (eslint-globalIgnored, separater
  Strang)
- KEIN AVV-Vertragsabschluss (rechtlich erst nach HR)

---

## 12. Open Questions (vor Codex-Start klaeren)

1. **Mig-Nummerierung-Konflikt:** ✅ **RESOLVED 2026-04-30**.
   - master (lokal `28889cd`) hat Migrations 170-175, Prod-`schema_migrations` ist auf 175 (`fix_users_full_name_drift`).
   - `feature/hausverwaltung` (lokal-only, nicht gepusht) hat 175-178 + 180 — gleicher Nummer 175, aber anderem Inhalt (`housing_foundation`).
   - Hausverwaltung-Branch ist **nicht auf Prod** und hat keinen Push-Druck (Memory: "Part B nach Welle-C-Push + GmbH/AVV").
   - **Master beansprucht 176/177/178 fuer diesen Plan** wie geschrieben. `feature/hausverwaltung` rotiert beim Merge auf 181-185, das war ohnehin im Memory dokumentiert ("Beim Merge muss Housing umnummeriert werden").
   - Verifikations-Pre-Check vor jedem Codex-Block trotzdem Pflicht: `Glob supabase/migrations/17*.sql` auf master direkt vor Migration-Anlage.
2. **Pre-Set-Button-Positionierung:** ✅ **RESOLVED 2026-04-30**.
   - Modal mit doppeltem Bestaetigen. Header-Text: "Diese Aktion aendert
     ~20 Flags gleichzeitig und schreibt sich ins Audit-Log. Tippen Sie
     zur Bestaetigung das Wort `PHASE_1` (bzw. `PHASE_0` / `PHASE_2`)."
   - Pre-Set-Buttons selbst werden im FeatureFlagManager oben angezeigt,
     aber jeder Klick oeffnet erst den Modal — kein direkter Submit.
   - Begruendung: Phasen-Schalter sind irreversibel-wirkend, wenn echte
     Pilot-Familien drinhaengen. Doppelt-bestaetigen = 5 Sekunden mehr,
     Schaden bei Fehlklick waere gross.

3. **Reason-Feld im Toggle:** ✅ **RESOLVED 2026-04-30**.
   - Bei Einzel-Toggle eines Flags: **optional** (`<Textarea>` "Grund (optional)"
     oberhalb des Switches, leerer Default).
   - Bei Phase-Preset: **automatisch** vom System gesetzt
     (`reason="phase-preset:phase_1"` etc., keine Founder-Eingabe noetig).
   - Begruendung: Niedrige Reibung im Alltag (schneller Einzel-Toggle),
     vollstaendige Doku bei wichtigen Entscheidungen.

4. **Cache-Invalidierung nach Phase-Preset:** ✅ **RESOLVED 2026-04-30**.
   - Einmal global nach Abschluss der Transaktion (nicht waehrend der
     UPDATE-Statements).
   - Begruendung: `invalidateFlagCache()` leert den kompletten 60s-Cache
     — pro-Flag-Invalidierung gibt es nicht. Bei Mehrfach-Aufruf waehrend
     der Transaktion wuerde der Cache einen halb-konsistenten Zustand
     sehen. Nach Commit: ein einzelner Aufruf, ab dann lesen alle Operationen
     frisch.

---

## 13. Verbindung zu anderen Plaenen + Memory

- **`memory/project_session_handover.md`** — Push-Blocker bleibt HR/AVV
- **`memory/project_avv_nach_gmbh.md`** — durable Regel: AVV erst nach GmbH
- **`memory/project_ai_testnutzer_regel.md`** — Test-User-Cleanup-Pflicht
- **`memory/topics/pilot-onboarding.md`** — laufender Pilot-Onboarding-Strang
- **`memory/topics/codex-collaboration.md`** — Rollenmodell Opus formuliert / Codex baut
- **Vault `firmen-gedaechtnis/01_Firma/GmbH-und-Recht.md`** — Compliance-Linie
  zu Vor-GmbH-Phase
- **Vault `firmen-gedaechtnis/01_Firma/GmbH-Provider-Vertraege-AVV-Uebersicht.md`** — AVV-Status pro Provider

---

## 14. Naechste Schritte

1. **Founder-Review dieses Plans** (5-15 Min Lesezeit)
2. **Open Questions klaeren** (Abschnitt 12)
3. **Codex-Auftrag** als kompakter Prompt aus Abschnitt 5 ableiten,
   wenn aktuelle Welle 2 (Block F-J) durch ist
4. **Codex setzt um** in 5 Bloecken (C1-C5)
5. **Claude reviewt + verifiziert** + Memory-Update
6. **Founder-Hand fuer Phase-1-Schalter** kommt erst, wenn echte
   Pilot-Familien da sind (5-10 in Bad Saeckingen)

---

*Plan-Ende. Foundation: Pre-Check 2026-04-30 nach `28889cd` ohne
Pruefung der jeweils aktuellsten DB-Werte (kein Prod-Read in Pre-Check
gemacht — bewusst, um nicht in Prod-DB zu lesen ohne Founder-Go).*
