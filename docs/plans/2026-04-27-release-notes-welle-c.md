# Welle C (C0-C8) Release Notes — 27.04.2026

**Release-Tag (geplant):** `welle-c-2026-04-27`
**Push-Bereich:** `nachbar-io` HEAD `4e83d43` (46 Commits seit `5de2a58`)
**Parent-Repo HEAD:** `14c70f6` (testing.md ergaenzt)
**Status:** lokal final, Push blockiert bis Notar 27.04. + AVV-Signatur (Anthropic + Mistral)
**Modell-Vorbereitung:** Sonnet 4.7 (B6 Task 6.2, reines Dokumentieren)

---

## TL;DR

Welle C bringt das vollstaendige KI-Memory-System fuer Senioren in den Code:
KI-Onboarding mit Wissensdokument, Senior-Fakten via `save_memory`-Tool mit
4-stufigem MDR-Schutz, Consent-Flow nach Art. 7 DSGVO, DSGVO-Uebersicht
nach Art. 15 + 17, sowie eine Caregiver-Sicht, in der Angehoerige Fakten
fuer den Senior anlegen koennen — voll transparent, Senior loescht jederzeit.

Phase 1 + 2 der Welle (C0-C7) sind seit 2026-04-20 lokal komplett, C8
(Caregiver-Scope + Senior-UX-Upgrade + E2E-Skelett) kam am gleichen Tag
dazu. Die Haertungs-Runde 21.-24.04. hat alle Test-/tsc-Failures bereinigt.

---

## Enthaltene Features (Welle C, C0-C8)

| ID | Feature | Kurzbeschreibung |
|---|---|---|
| C0 | KI-Provider-Layer | `lib/ai/provider.ts` mit Anthropic + Mistral als Adapter, `cache_control.system` (Patch F7), Mock-Mode fuer Tests. AVV-blockiert per `AI_PROVIDER=off`. |
| C1 | Memory-Consents | Pre-Check verhinderte Duplikat: `user_memory_consents` (Mig 122) ist Single-Source-of-Truth, Mig 173 ergaenzt nur `ai_onboarding` in `care_consents`. |
| C2 | Wissensdokument | Senior-Fakten in `user_memory_facts` (AES-256-GCM via `lib/care/field-encryption.ts`). |
| C3 | `save_memory`-Tool | 4-stufiger Schutz: Blocklist (Medical-Terms) -> Consent-Check -> AES-Encryption -> Audit-Log. Adapter um `modules/memory/services/*`, kein Duplikat. |
| C4 | Onboarding-Route | `app/api/ai/onboarding/turn/route.ts` mit Server-Side-Tool-Use, Confirm-Mode-Durchgriff. |
| C5 | Onboarding-Wizard-UI | `modules/senior/onboarding/*` — Sprach- + Tippeingabe, Confirm-Dialog mit Stichwort + Wert, TTS-Autoplay. |
| C6 | STT-Mikrofon | `useSpeechInput`-Hook (Web Speech API), Push-to-Talk + Toggle-Mode. C6b: Race-Fix beim Stop. C6c: Cleanup bei Component-Unmount. |
| C7 | DSGVO-Uebersicht + Consent-Flow | `/profil/gedaechtnis/uebersicht` (Art. 15 Auskunft), Reset-All (Art. 17 Loeschung), `SeniorMemoryFactList` mit Loesch-Confirm. Consent-UI nach Art. 7(3). |
| C8 | Caregiver-Scope | `/caregiver/senior/[id]/gedaechtnis` — Angehoerige speichern Fakten fuer Senior. `save_memory` unterstuetzt `source='caregiver'` via `caregiver_links`. Senior sieht Caregiver-Eintraege mit "Von Angehoerigen"-Badge und kann jederzeit loeschen. |
| C8-extra | Senior-UX-Upgrade | `MemoryConfirmDialog` mit TTS-Autoplay beim Oeffnen, Stichwort + Wert sichtbar, Beruhigungs-Hinweis "jederzeit loeschbar", konsistente Kategorie-Labels, Haptic-Feedback, autoFocus auf "Ja, speichern". |
| C8-skel | E2E-Skelett | `tests/e2e/cross-portal/x20-caregiver-memory.spec.ts` — x20a lauffaehig (Feature-Guard), x20b-e als TODO dokumentiert. |

**Commits gesamt:** 46 lokale Commits seit `5de2a58` (33 Welle-C-Feature + 13
Haertungs-Runde 21.-24.04. inkl. Test-Fixes, tsc-Cleanup, Walkthrough-
Checkliste).

---

## Migrationen

### Migration 173 — `173_memory_consents.sql`

**Zweck:** Erweiterung der `care_consents.feature`-CHECK-Constraint um
`ai_onboarding`. Dokumentations-Comments auf `care_consents` und
`user_memory_consents`, damit klar ist, welcher Consent-Key in welcher
Tabelle wohnt.

**Aenderungen:**
- `ALTER TABLE public.care_consents` — neue CHECK-Liste:
  `sos`, `checkin`, `medications`, `care_profile`, `emergency_contacts`,
  `ai_onboarding`.
- `COMMENT ON TABLE` fuer beide Consent-Tabellen (Zwei-Systeme-Klarstellung
  laut [reference_two_consent_systems.md](../../../memory/reference_two_consent_systems.md)).
- **Keine** neue Tabelle, **keine** Spalten-Aenderung in `user_memory_consents`.

**Idempotent:** ja (`drop constraint if exists` + add).
**Rueckbau:** `173_memory_consents.down.sql`.

### Migration 174 — `174_tighten_memory_consents_rls.sql`

**Zweck:** Schliesst Codex-Review-Befund F6.2 — `caregiver_consents`-Policy
in Mig 122 war als `FOR ALL` definiert (Caregiver konnte Memory-Consents
des Seniors GRANT/REVOKE/UPDATE/DELETE). Einwilligung muss nach Art. 7
DSGVO hoechstpersoenlich vom Senior kommen.

**Aenderungen:**
- `DROP POLICY caregiver_consents` auf `user_memory_consents`.
- `CREATE POLICY caregiver_consents_select FOR SELECT` — Caregiver darf
  Consent-Status lesen, aber **nicht** aendern.
- API-Routen `/api/memory/consent/grant` + `/api/memory/consent/revoke`
  lehnen caregiver-on-behalf-of-senior bereits ab (parallel-Commit zu
  Mig 174).
- `COMMENT ON POLICY` mit DSGVO-Audit-Hinweis (Art. 7).

**Idempotent:** ja (drop + create).
**Rueckbau:** `174_tighten_memory_consents_rls.down.sql`.

### Push-Reihenfolge (siehe Push-Checklist)

1. Mig 173 via MCP `apply_migration` auf Prod (`uylszchlyhbpbmslcnka`).
2. Mig 174 ebenso.
3. Verifizieren via `SELECT version, name FROM supabase_migrations.schema_migrations WHERE version IN ('173', '174')`.
4. Erst dann `git push origin master`.

---

## Test-Stand (verifiziert 2026-04-21, Haertungs-Runde Baustein 1+2)

| Suite | Ergebnis | Notiz |
|---|---|---|
| Vitest Voll-Suite | **3480 passed / 3 skipped / 0 failed** | Skips dokumentiert in `.claude/rules/testing.md` |
| `npx tsc --noEmit` | **0 Errors** | Skip-Liste leer (B3 dda2a66) |
| E2E Smoke | 11 passed + 1 flaky (Retry gruen) | nicht-blockierend |
| Welle-C-Smoke (158 Tests) | gruen | Memory + Onboarding + STT + Confirm-Dialog |

### Aktiv geskippte Tests (3)

- `billing-checkout.test.ts` — Stripe-Mock-Drift, Reaktivierung nach
  Stripe-SDK-Update (Folge-Ticket).
- `hilfe/tasks` (2 Tests) — `maybeSingle`-Mock-Pattern Phase-1-Drift,
  Reaktivierung nach Helper-Refactor (Folge-Ticket).

Begruendung + Reaktivierungs-Pfad in `.claude/rules/testing.md` (Parent
HEAD `14c70f6`).

### Bereinigt waehrend Haertungs-Runde

- 3 Consent-Tests auf 6 Features angepasst (Welle C ergaenzte
  `ai_onboarding`).
- `sos-detail.test.ts` — lokaler `vi.mock("@/lib/supabase/admin")` mit
  Select-Argument-Dispatch.
- 9 tsc-Errors via Typ-Casts behoben (E2E-Specs x01/x19/s12 + Unit-Tests
  device-fingerprint, quartier-info-vorlesen).

---

## DSGVO-Erfuellung

| Artikel | Wo erfuellt | Status |
|---|---|---|
| Art. 6 — Einwilligung | `care_consents.ai_onboarding` (Mig 173) + `user_memory_consents.memory_basis/care/personal` (Mig 122). DB-RLS prueft Consent vor INSERT in `user_memory_facts`. | LIVE im Code |
| Art. 7(3) — Widerruf | Senior kann jederzeit Consent widerrufen (`/profil/gedaechtnis/consent`) und einzelne Fakten loeschen (`SeniorMemoryFactList` mit Confirm-Dialog). Mig 174 schliesst Caregiver-Schreibrechte auf Consent-Tabelle. | LIVE im Code |
| Art. 15 — Auskunft | `/profil/gedaechtnis/uebersicht` zeigt alle gespeicherten Fakten (eigene + Caregiver-Eintraege, gleiche Tabelle). Audit-Log einsehbar. | LIVE im Code |
| Art. 17 — Loeschung | Einzel-Loeschung pro Fakt + Reset-All-Funktion (loescht kategorie-uebergreifend, inkl. Caregiver-Eintraege). Sofort-Wirkung dank RLS + Cascade. | LIVE im Code |
| Art. 25 — Privacy by Default | `AI_PROVIDER=off` als Default bis AVV durch. Caregiver-Pfad greift nur bei aktivem `caregiver_links`-Eintrag. Revoke des Links stoppt sofort alle weiteren Writes. `notFound()` statt 403, um Existenz des Senior-Accounts nicht zu leaken. | LIVE im Code |
| Art. 32 — Sicherheit | Felder-Encryption AES-256-GCM (`lib/care/field-encryption.ts`). RLS `caregiver_facts_*` in Mig 122. `revoked_at IS NULL`-Filter doppelt (Application + DB). Audit-Log mit `actor_role` + `target_user_id`. | LIVE im Code |

**AVV-Status (Voraussetzung fuer Aktivierung):**
- AVV Anthropic — wird am Notar-Tag 27.04.2026 unterschrieben (Theobase
  GmbH, nicht privat).
- AVV Mistral — gleiches Datum.
- Beide AVV-PDFs werden in `IONOS-Cloud/Theobase-GmbH/AVV/` abgelegt.
- Erst nach AVV-Signatur darf `AI_PROVIDER=anthropic` (oder `mistral`) in
  Vercel-Env gesetzt werden.

---

## Bekannte Einschraenkungen

### 1. `AI_PROVIDER=off` bis AVV durch

Der KI-Provider-Layer ist im Code vollstaendig vorhanden, aber im Default-
Env auf `off` gestellt. Solange das Flag nicht auf `anthropic` oder
`mistral` gesetzt wird, lehnt `lib/ai/provider.ts` jede LLM-Anfrage ab und
das Senior-Onboarding faellt auf einen reinen Tipp-Pfad zurueck (kein
Sprach-Flow, kein `save_memory`-Auto-Trigger).

**Aufhebung:** nach Notar 27.04.2026 + Founder-Bestaetigung "AVV signiert"
+ Setzen des Env-Vars in Vercel-Production.

### 2. E2E-Tests x20b-e optional, nicht im Release-Cut

`tests/e2e/cross-portal/x20-caregiver-memory.spec.ts` enthaelt:
- `x20a` — lauffaehig mit Feature-Guard (skippt sich, wenn Senior-Test-
  Account oder caregiver_link fehlt).
- `x20b-e` — als TODO-Kommentare dokumentiert: Fakt anlegen, Provenance-
  Badge, Senior loescht, Link-Widerruf -> 404.

Voraussetzung fuer Aktivierung: Senior-Test-Account in lokaler
Supabase-Instanz oder Preview-Branch (Rote Zone, Founder-Go). Aufwand
~60-90 min in eigener Session.

**Reaktivierungs-Plan:** Haertungs-Runde Baustein 5 (Sa/So 25./26.04.,
optional). Wenn nicht geschafft: nach Push.

### 3. Provenance-Badge generisch ("Von Angehoerigen")

Senior sieht bei Caregiver-Eintraegen das Badge "Von Angehoerigen", nicht
den konkreten Namen ("Von Tochter Anna"). Fuer Phase 1 ausreichend, weil
in der Praxis meist genau 1 Caregiver pro Senior existiert.

**Aufruest-Pfad (YAGNI bis MRR > 0):** `useMemoryFacts` um
`includeSourceNames` erweitern, RPC `get_display_names` ueber dedupli-
zierte `source_user_id`s aufrufen, Badge mit
`{name ?? "Angehoerigen"}` rendern. Geschaetzt ~30 min.

### 4. Walkthrough-Befunde noch ausstehend

Founder-Walkthrough (B4) ist fuer Fr 24.04. terminiert (Checkliste in
`docs/plans/2026-04-24-baustein-4-walkthrough-checkliste.md`). Stolper-
stellen werden in eigenen Commits gefixt; bei > 5 schweren Befunden
verschiebt sich der Push.

### 5. Pre-Existing Test-Skips dokumentiert

3 Tests bewusst geskippt (siehe Test-Stand oben). Reaktivierungs-Tickets
in `.claude/rules/testing.md`. Kein Welle-C-Regress.

---

## Push-Voraussetzungen (vor `git push origin master`)

Alle Punkte mit Founder-Go in der Reihenfolge:

- [ ] GmbH Theobase im Handelsregister eingetragen (HRB-Nummer).
- [ ] AVV Anthropic + Mistral signiert (PDFs in IONOS-Cloud).
- [ ] `ANTHROPIC_API_KEY` + `MISTRAL_API_KEY` als Organization-Keys
      vorhanden.
- [ ] Founder-Walkthrough B4 abgeschlossen, kritische Stolperstellen
      gefixt.
- [ ] B6 Task 6.1 wiederholt: `npm run test` + `npx tsc --noEmit` direkt
      vor Push (Re-Verifikation).
- [ ] Mig 173 + Mig 174 via MCP `apply_migration` auf Prod, verifiziert.
- [ ] Founder-Go fuer `git push origin master` (Rote Zone).

Detail-Checkliste: `docs/plans/2026-04-27-push-checklist-welle-c.md`
(wird in B6 Task 6.3 aktualisiert).

---

## Referenzen

- Plan: `docs/plans/2026-04-21-haertungs-runde-vor-push-plan.md`
- Handoff B1-B3: `docs/plans/2026-04-21-handoff-b1-b3-done-b4-vorbereitet.md`
- Handoff Welle-C-C8: `docs/plans/2026-04-20-handoff-welle-c-c8-done.md`
- Walkthrough-Checkliste: `docs/plans/2026-04-24-baustein-4-walkthrough-checkliste.md`
- Push-Checkliste: `docs/plans/2026-04-27-push-checklist-welle-c.md`
- Zwei Consent-Systeme: `memory/reference_two_consent_systems.md`
- Testing-Regeln: `.claude/rules/testing.md`
- Pre-Check-Regeln: `.claude/rules/pre-check.md`
- DB-Migration-Regeln: `.claude/rules/db-migrations.md`

---

**Release-Notes-Autor:** Claude Sonnet 4.7 (B6 Task 6.2 vorgezogen, Variante B)
**Erstellt:** 2026-04-21 (Haertungs-Runde, nach B4-Vorbereitung)
**Naechster Schritt:** Founder-Walkthrough Fr 24.04., dann B6 Task 6.1
(Final-Re-Verify) + Task 6.3 (Push-Checkliste aktualisieren) am Mo 26.04.
