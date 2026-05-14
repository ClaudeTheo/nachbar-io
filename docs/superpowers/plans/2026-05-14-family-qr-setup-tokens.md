# Family QR Setup Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eltern und Angehoerige koennen Kinder- und Senior-Zugaenge per kurzem Code/QR sicher einrichten. Kinder koennen sich nicht ohne Eltern registrieren. Senioren werden bei Code-Nutzung automatisch mit dem Angehoerigen verknuepft, aber sensible Daten bleiben bis zur ausdruecklichen Freigabe geschuetzt. Das Pilot-Onboarding bleibt einfach, ohne Job-Marktplatz, ohne Zahlungsmodell und ohne Prod-Write im Implementierungsschritt.

**Architecture:** Ein gemeinsamer Setup-Invitation-Kern verwaltet kurzlebige, einmalige Tokens. QR-Codes enthalten nur eine URL mit opaque Token, nie Adresse, Name, Haushalt oder Rolle. Die bestehenden Systeme bleiben fuehrend: `households.invite_code` fuer Hausnummer-Verifikation, `caregiver_links` fuer Senioren/Angehoerige, `youth_guardian_consents` fuer Jugend-Freigaben, `qrcode.react` fuer QR-Anzeige und das vorhandene Device-Pairing fuer Senior-Geraete. Neue Persistenz wird file-first als Migration angelegt und erst nach separatem Founder-Go angewendet.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase Postgres/RLS, Vitest, Playwright, Tailwind v4, bestehende `qrcode`/`qrcode.react` Pakete.

---

## Founder-/Compliance-Guardrails 2026-05-14

- U13: keine Aufgabenannahme und keine selbststaendige Registrierung.
- U18: nur kostenlose/niedrig-riskante Funktionen, nur mit Elternfreigabe.
- Kinder koennen sich nicht ueber den normalen Registrierungsweg anmelden.
- Eltern koennen bis zu 5 direkte Kinderkonten anlegen; weitere Kinder muessen beantragt/admin-geprueft werden.
- Ein Kind kann ein anderes Kind nur als Freund vorschlagen. Die Freigabe erteilt das Elternteil des einladenden Kindes, mit klarer Vertraulichkeitswarnung.
- Kein Job-Marktplatz, kein Zahlungsmodell, keine Wallets, Guthaben, Coins, IBAN, Payment-Links oder Auszahlungen.
- Migrationen nur file-first anlegen, nicht gegen Prod anwenden.
- Kein Deploy, kein Push ohne Founder-Go.

---

## Online Best-Practice Findings

- **NIST SP 800-63B:** QR-Codes koennen fuer Binding-/Recovery-Codes sinnvoll sein, wenn sie aus einer vertrauenswuerdigen, authentifizierten Quelle kommen. Account-Bindings brauchen Lifecycle-Aufzeichnung, Ablauf, Benachrichtigung und Widerruf. Quelle: https://pages.nist.gov/800-63-4/sp800-63b.html
- **OWASP Email Validation & Verification Cheat Sheet:** Verifikations-/Reset-Tokens sollen kryptografisch zufaellig, single-use, zeitlich begrenzt, nach Nutzung/Expiry invalidiert und rate-limited sein. Quelle: https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html
- **OWASP Authentication Cheat Sheet:** Reauthentifizierung ist bei riskanten Aktionen wie Account-Recovery, Authenticator-Binding und sensiblen Aenderungen wichtig. Quelle: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- **ICO Age Appropriate Design Code:** Kinder brauchen altersgerechte Defaults, Datenminimierung, Transparenz, Schutz vor Ausbeutung und Unterstuetzung von Eltern, ohne die Rechte und wachsende Eigenstaendigkeit des Kindes zu ignorieren. Quelle: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/about-this-code/
- **FTC COPPA Parental Consent Guidance:** Die Zustimmungsmethode muss angemessen sicherstellen, dass die zustimmende Person tatsaechlich ein Elternteil ist; die konkrete Methode ist risikobasiert zu waehlen. Quelle: https://www.ftc.gov/business-guidance/privacy-security/verifiable-parental-consent-childrens-online-privacy-rule

**Produktfolgerung fuer Nachbar.io:** QR ist technisch gut, solange der QR nur ein kurzlebiger Einmal-Token ist und die eigentliche Berechtigung aus einer angemeldeten Eltern-/Angehoerigen-Session stammt. Fuer Kinder reicht ein von einem Kind weitergegebener Code nicht; Elternfreigabe ist das Gate. Fuer Senioren darf der Code die Beziehung automatisch anlegen, aber der Zugriff muss stufenweise und widerrufbar bleiben.

---

## Existing Codebase Anchors

- `package.json` enthaelt bereits `qrcode` und `qrcode.react`; keine neue QR-Library einfuehren.
- `app/(senior)/pair/page.tsx` und `app/api/device/pair/*` zeigen bereits QR-Pairing mit 10-Minuten-Token.
- `modules/care/services/caregiver/invite.service.ts` erstellt bestehende 8-stellige Caregiver-Codes.
- `modules/care/services/caregiver/redeem.service.ts` loest Caregiver-Codes atomar ein und erstellt `caregiver_links`.
- `supabase/migrations/071_caregiver_links.sql` definiert `caregiver_invites` und `caregiver_links`.
- `supabase/migrations/094_youth_profiles_and_consents.sql` definiert `youth_profiles` und `youth_guardian_consents`.
- `lib/auth/post-login-redirect.ts` und `lib/user-modes.ts` routen `ui_mode = 'youth'` bereits nach `/jugend`.
- `modules/youth/components/YouthHomeSurface.tsx` ist die moderne Jugend-UI; sie muss nach Setup-Code-Login konsistent genutzt werden.
- `modules/onboarding/components/OnboardingFlow.tsx` ist der passende Einstiegspunkt fuer Eltern-/Senior-Vorschlaege im Onboarding.
- `app/(app)/profile/page.tsx` ist aktuell der beste Ort fuer QR-Zugaenge auf der Profilseite.

---

## Target UX

### Eltern mit Kindern ab 13

1. Im Onboarding fragt die App ruhig: "Haben Sie Kinder ab 13 Jahren, die Nachbar.io im Jugendbereich nutzen sollen?"
2. Bei Ja erklaert die App kurz: Eltern erstellen den Zugang; Kinder registrieren sich nicht alleine.
3. Direkt danach oder spaeter im Profil erscheint "Kinderzugang einrichten".
4. Eltern erfassen nur das Noetigste: Anzeigename/Vorname, Geburtsjahr, optional Beziehung.
5. Die App erzeugt einen QR-Code und einen manuellen Kurzcode.
6. Das Kind scannt den Code, setzt die eigenen Zugangsdaten und landet mit `ui_mode = 'youth'` in `/jugend`.
7. Bis zur Freigabe gelten Jugend-Defaults: keine Zahlungs-/Anerkennungsfunktionen, keine Aufgabenannahme fuer U13, U18 nur kostenlose/niedrig-riskante Dinge mit Elternfreigabe.

### Kinder laden Freunde ein

1. Das Kind waehlt in der Jugend-App "Freund einladen".
2. Die App sagt altersgerecht: "Nur fuer Freunde, die Sie wirklich kennen und denen Ihre Familie vertraut."
3. Das Kind erstellt nur einen Vorschlag, noch keinen wirksamen Einladungscode.
4. Das Elternteil des einladenden Kindes bekommt eine Anfrage.
5. Vor Freigabe sieht das Elternteil eine klare Vertraulichkeitsmeldung:
   "Bitte bestaetigen Sie diese Einladung nur, wenn Sie das Kind oder die Familie persoenlich kennen und ein echtes Vertrauensverhaeltnis besteht. Der Code darf nicht oeffentlich geteilt werden."
6. Erst nach Elternfreigabe wird ein kurzlebiger QR-/Kurzcode erstellt.

### Senior per Angehoerigem anmelden

1. Im Onboarding oder Profil kann ein Nutzer "Senior-Zugang fuer Angehoerige einrichten" starten.
2. Der Angehoerige erfasst die minimalen Senior-Daten und waehlt die Beziehung.
3. Die App erstellt einen QR-/Kurzcode.
4. Der Senior scannt oder gibt den Code ein.
5. Weil der Code aus der Session des Angehoerigen stammt, wird automatisch ein `caregiver_links`-Eintrag angelegt.
6. Standard: Link ist aktiv fuer Basis-Verknuepfung, aber sensible Module bleiben auf minimalen Scopes, bis der Senior zustimmt.
7. Der Angehoerige bekommt ein eigenes Menue "Meine Senioren" mit Datenpflege, Erinnerungen und Hilfen; sensible Felder bleiben nach vorhandenen Care-Regeln verschluesselt.

### Hausnummer-Pilotcodes

1. Hausnummer-Codes bleiben fuer Adress-/Haushaltsverifikation zustaendig.
2. Pro Hausnummer werden 3 primaere Codes vorbereitet.
3. Jeder primaere Code darf bis zu 2 weitere Bewohner einladen.
4. Ersatzcodes werden nicht vorab breit verteilt, sondern im Admin-Dashboard einer Adresse zugeordnet und ausgegeben, wenn ein Haus mehr Bedarf hat.
5. Die Family-/Senior-QR-Codes ersetzen diese Hausnummer-Verifikation nicht; sie haengen an einem bereits verifizierten Nutzer.

---

## Data Model Plan

### New Migration

File-first anlegen:

`supabase/migrations/197_family_setup_invitations.sql`

Nicht anwenden, bis Founder explizit Prod-Migration-Go gibt.

Tables:

1. `family_child_links`
   - `id uuid primary key default gen_random_uuid()`
   - `guardian_user_id uuid not null references auth.users(id) on delete cascade`
   - `child_user_id uuid not null references auth.users(id) on delete cascade`
   - `relationship_type text not null check (relationship_type in ('parent','guardian','other'))`
   - `status text not null default 'active' check (status in ('active','revoked'))`
   - `consent_version text not null`
   - `created_at timestamptz not null default now()`
   - `revoked_at timestamptz`
   - `unique (guardian_user_id, child_user_id)`

2. `family_setup_invitations`
   - `id uuid primary key default gen_random_uuid()`
   - `token_hash text not null unique`
   - `short_code_hash text unique`
   - `flow_type text not null check (flow_type in ('child_direct','child_friend','senior_setup'))`
   - `status text not null default 'ready' check (status in ('pending_parent_approval','ready','claimed','expired','revoked','needs_admin_review'))`
   - `created_by uuid not null references auth.users(id) on delete cascade`
   - `guardian_user_id uuid references auth.users(id) on delete set null`
   - `target_user_id uuid references auth.users(id) on delete set null`
   - `household_id uuid references households(id) on delete set null`
   - `quarter_id uuid references quarters(id) on delete set null`
   - `target_ui_mode text not null check (target_ui_mode in ('youth','senior','comfort'))`
   - `relationship_type text`
   - `expires_at timestamptz not null`
   - `used_at timestamptz`
   - `used_by uuid references auth.users(id) on delete set null`
   - `metadata jsonb not null default '{}'::jsonb`
   - `created_at timestamptz not null default now()`
   - `updated_at timestamptz not null default now()`

3. `family_setup_audit`
   - `id uuid primary key default gen_random_uuid()`
   - `invitation_id uuid references family_setup_invitations(id) on delete set null`
   - `actor_user_id uuid references auth.users(id) on delete set null`
   - `event_type text not null`
   - `ip_hash text`
   - `user_agent_hash text`
   - `metadata jsonb not null default '{}'::jsonb`
   - `created_at timestamptz not null default now()`

4. `caregiver_links` extension:
   - Prefer additive columns only:
     - `setup_origin text check (setup_origin in ('manual_code','family_qr','device_pairing'))`
     - `consent_status text not null default 'active' check (consent_status in ('pending_senior_confirm','active','revoked'))`
     - `profile_edit_allowed boolean not null default false`
     - `sensitive_data_allowed boolean not null default false`
   - Existing reads using `revoked_at is null` keep working.
   - New sensitive pages additionally check the new booleans where applicable.

RLS:

- `family_setup_invitations`: creator/guardian may select own rows; service role handles token claim; no public SELECT by raw token.
- `family_child_links`: guardian and child may select own link; service role inserts; guardian can revoke.
- `family_setup_audit`: service role insert; admin read only.
- No address or invite-code leakage through client-visible policies.

---

## Implementation Tasks

### Task 1 - Precheck and Baseline

- [ ] Run:
  - `git status --short --branch`
  - `git log --oneline -8`
  - `rg -n "family_setup|setup_invit|youth_guardian|caregiver_links|QRCodeSVG|qrcode.react|invite_code" app modules lib supabase/migrations __tests__ package.json`
- [ ] Confirm no uncommitted user changes in files that will be edited.
- [ ] If conflicting user changes exist, stop and report before editing.

### Task 2 - Token Domain Service with Tests First

- [ ] Add tests in `__tests__/lib/family-setup/family-setup-token.test.ts`.
- [ ] Test:
  - generated raw token has at least 128 bits entropy equivalent;
  - token hash is stable and never returns raw token;
  - short code normalizes uppercase and strips spaces;
  - expiry helpers reject expired rows;
  - a claimed token cannot be claimed twice.
- [ ] Implement `lib/family-setup/token.ts`.
- [ ] Implement `lib/family-setup/types.ts`.
- [ ] Run:
  - `npx vitest run __tests__/lib/family-setup/family-setup-token.test.ts`
- [ ] Commit:
  - `git add lib/family-setup __tests__/lib/family-setup/family-setup-token.test.ts`
  - `git commit -m "feat(family): add setup token primitives"`

### Task 3 - Migration File First

- [ ] Add `supabase/migrations/197_family_setup_invitations.sql`.
- [ ] Include tables, indexes, RLS, comments and additive `caregiver_links` columns as above.
- [ ] Add migration text test in `__tests__/lib/family-setup/family-setup-migration.test.ts`.
- [ ] Test checks:
  - table names exist;
  - token hashes are unique;
  - RLS is enabled;
  - no raw token column exists;
  - `caregiver_links` additions are additive and nullable/defaulted safely.
- [ ] Run:
  - `npx vitest run __tests__/lib/family-setup/family-setup-migration.test.ts`
- [ ] Do not apply migration locally or Prod unless separate instruction is given.
- [ ] Commit:
  - `git add supabase/migrations/197_family_setup_invitations.sql __tests__/lib/family-setup/family-setup-migration.test.ts`
  - `git commit -m "feat(family): add setup invitation schema"`

### Task 4 - Child Account Creation Services

- [ ] Add tests in `__tests__/lib/family-setup/child-setup.service.test.ts`.
- [ ] Test:
  - parent can create child setup invitations for first 5 active children;
  - sixth child returns `needs_admin_review`/409 without token;
  - U13 child setup is allowed only as account creation, but task acceptance stays blocked by existing youth guardrails;
  - invitation is bound to creator household/quarter;
  - QR payload contains only `/setup/<token>` URL and no name/address/household id.
- [ ] Implement `lib/family-setup/child-setup.service.ts`.
- [ ] Use service-role only for privileged inserts; normal client for authenticated user context.
- [ ] Create `family_child_links` only when the child account claim succeeds.
- [ ] Ensure new child user gets `ui_mode = 'youth'`.
- [ ] Run:
  - `npx vitest run __tests__/lib/family-setup/child-setup.service.test.ts`
- [ ] Commit:
  - `git add lib/family-setup/child-setup.service.ts __tests__/lib/family-setup/child-setup.service.test.ts`
  - `git commit -m "feat(family): support guardian child setup"`

### Task 5 - Senior Setup Services

- [ ] Add tests in `__tests__/lib/family-setup/senior-setup.service.test.ts`.
- [ ] Test:
  - authenticated relative can create senior setup QR;
  - claim creates/updates senior user with `ui_mode = 'senior'` or selected senior mode;
  - claim automatically creates `caregiver_links` with `setup_origin = 'family_qr'`;
  - default `profile_edit_allowed = true` for practical setup data;
  - default `sensitive_data_allowed = false` until senior confirms;
  - duplicate caregiver link is idempotent or returns clear 409.
- [ ] Implement `lib/family-setup/senior-setup.service.ts`.
- [ ] Reuse `caregiver_links` and existing care permission helpers where possible.
- [ ] Run:
  - `npx vitest run __tests__/lib/family-setup/senior-setup.service.test.ts`
- [ ] Commit:
  - `git add lib/family-setup/senior-setup.service.ts __tests__/lib/family-setup/senior-setup.service.test.ts`
  - `git commit -m "feat(family): support senior setup links"`

### Task 6 - API Routes

- [ ] Add route tests:
  - `__tests__/api/family-setup-child.test.ts`
  - `__tests__/api/family-setup-senior.test.ts`
  - `__tests__/api/family-setup-claim.test.ts`
- [ ] Implement:
  - `app/api/family-setup/child/route.ts` POST create child QR/code.
  - `app/api/family-setup/senior/route.ts` POST create senior QR/code.
  - `app/api/family-setup/[token]/route.ts` GET safe preview, POST claim.
  - `app/api/family-setup/child/friend-request/route.ts` POST child proposal.
  - `app/api/family-setup/child/friend-request/[id]/approve/route.ts` POST parent approval.
- [ ] Security behavior:
  - creation routes require authenticated adult/guardian.
  - claim route never reveals whether a token hash exists beyond generic invalid/expired.
  - token claim uses atomic `status = 'ready' and used_at is null and expires_at > now()` update.
  - rate limit by IP/user where existing rate-limit helper supports it.
- [ ] Run:
  - `npx vitest run __tests__/api/family-setup-child.test.ts __tests__/api/family-setup-senior.test.ts __tests__/api/family-setup-claim.test.ts`
- [ ] Commit:
  - `git add app/api/family-setup __tests__/api/family-setup-*.test.ts`
  - `git commit -m "feat(family): add setup invitation APIs"`

### Task 7 - Parent and Senior UI

- [ ] Add focused component tests:
  - `__tests__/components/family-setup-panel.test.tsx`
  - `__tests__/components/family-setup-claim.test.tsx`
- [ ] Implement `modules/family-setup/components/FamilySetupPanel.tsx`.
- [ ] Implement `modules/family-setup/components/SetupQrCard.tsx` using existing `QRCodeSVG`.
- [ ] Implement `modules/family-setup/components/SetupClaimForm.tsx`.
- [ ] Update `app/(app)/profile/page.tsx` with section "Familie & Betreuung":
  - Kinderzugang einrichten.
  - Senior-Zugang einrichten.
  - Existing profile content remains usable.
- [ ] Add public claim page `app/(auth)/setup/[token]/page.tsx`.
- [ ] UI text:
  - Siezen for adults/seniors.
  - Youth copy simpler but not childish.
  - No in-app payment or recognition language.
  - Explicit warning: QR-Code nicht oeffentlich teilen.
- [ ] Run:
  - `npx vitest run __tests__/components/family-setup-panel.test.tsx __tests__/components/family-setup-claim.test.tsx`
- [ ] Commit:
  - `git add modules/family-setup app/(app)/profile/page.tsx app/(auth)/setup __tests__/components/family-setup-*.test.tsx`
  - `git commit -m "feat(family): add setup QR interfaces"`

### Task 8 - Onboarding Suggestions

- [ ] Add tests around `modules/onboarding/components/OnboardingFlow.tsx`.
- [ ] In onboarding, after user indicates children 13+:
  - show suggestion for youth app;
  - offer "Jetzt Kinderzugang vorbereiten" and "Spaeter im Profil".
- [ ] In onboarding, when user indicates senior relative/care need:
  - show suggestion for senior setup;
  - offer QR creation or later profile route.
- [ ] Do not block normal adult onboarding.
- [ ] Run:
  - `npx vitest run __tests__/modules/onboarding/onboarding-family-setup.test.tsx`
- [ ] Commit:
  - `git add modules/onboarding __tests__/modules/onboarding/onboarding-family-setup.test.tsx`
  - `git commit -m "feat(onboarding): suggest family setup paths"`

### Task 9 - Youth Friend Invitations

- [ ] Add tests in `__tests__/lib/family-setup/youth-friend-invites.test.ts`.
- [ ] Implement child proposal service:
  - child creates pending request only;
  - no raw setup token until parent approval;
  - parent approval checks active `family_child_links`;
  - approval creates `child_friend` setup invitation.
- [ ] Add parent notification hook using existing notification service if available; otherwise add event/audit row and surface in profile.
- [ ] Add UI entry in youth surface only if youth feature enabled and guardian link exists.
- [ ] Run:
  - `npx vitest run __tests__/lib/family-setup/youth-friend-invites.test.ts`
- [ ] Commit:
  - `git add lib/family-setup modules/youth __tests__/lib/family-setup/youth-friend-invites.test.ts`
  - `git commit -m "feat(youth): require guardian approval for friend invites"`

### Task 10 - Senior Data Menu for Angehoerige

- [ ] Inspect existing routes:
  - `app/(app)/caregiver`
  - `app/(app)/care`
  - `app/(app)/pflege-einstellungen`
  - `modules/care`
- [ ] Prefer extending existing caregiver UI over creating a duplicate.
- [ ] Add/extend route `app/(app)/caregiver/meine-senioren/page.tsx` or nearest existing equivalent.
- [ ] Capabilities:
  - list linked seniors;
  - show setup status and consent status;
  - edit non-sensitive profile/setup fields when `profile_edit_allowed = true`;
  - request sensitive-data approval instead of directly unlocking it;
  - revoke link if user has permission.
- [ ] Add tests:
  - `__tests__/app/caregiver/meine-senioren.test.tsx`
  - service tests for permission gates.
- [ ] Run:
  - `npx vitest run __tests__/app/caregiver/meine-senioren.test.tsx __tests__/lib/care/permissions.test.ts`
- [ ] Commit:
  - `git add app/(app)/caregiver modules/care __tests__/app/caregiver __tests__/lib/care/permissions.test.ts`
  - `git commit -m "feat(care): add linked senior management"`

### Task 11 - Admin Dashboard Support

- [ ] In root `nachbar-admin`, after repo situation is clarified, add management views for:
  - house number primary codes;
  - replacement codes assigned to address;
  - family setup invitations;
  - child count over 5 review queue;
  - senior setup consent status.
- [ ] Remove old admin surfaces that no longer match app logic.
- [ ] Do not implement until GitHub remote/repo target is clarified.

### Task 12 - End-to-End Verification

- [ ] Run unit/API/component tests added above.
- [ ] Run broader relevant tests:
  - `npx vitest run __tests__/api/register-complete-bugfix.test.ts __tests__/lib/auth/post-login-redirect.test.ts __tests__/lib/user-modes.test.ts __tests__/components/youth-home-surface.test.tsx`
- [ ] Run typecheck:
  - `npx tsc --noEmit`
- [ ] Run build:
  - `npm run build`
- [ ] Start local dev server:
  - `npm run dev`
- [ ] Browser/Playwright check:
  - adult onboarding still loads;
  - profile shows "Familie & Betreuung";
  - child setup QR renders;
  - senior setup QR renders;
  - setup token page rejects invalid/expired token;
  - youth account lands on `/jugend`.
- [ ] Commit final fixes if needed.
- [ ] Report push-ready only. Do not push without explicit PUSH-GO.

---

## Acceptance Criteria

- Normal U18 registration remains blocked.
- Parent-created child setup produces youth account and routes to `/jugend`.
- A guardian can directly manage no more than 5 child accounts without admin review.
- Child friend invite requires parent approval before any usable code exists.
- Parent approval copy includes confidentiality/trust warning.
- Senior setup code automatically links the Angehoerige via `caregiver_links`.
- Senior sensitive data is not unlocked solely by QR scan.
- QR payloads contain no PII or address data.
- All setup tokens are hashed server-side, single-use and time-limited.
- Existing house-number pilot invite flow still works.
- Existing device pairing still works.
- Tests, typecheck, build and browser verification pass.

---

## Open Product Decisions Before Implementation

1. Exact TTL:
   - Recommendation: child/senior setup links 24 hours; child friend links 12 hours; device pairing remains 10 minutes.
2. Senior default UI:
   - Recommendation: default `senior`; allow `comfort` only if adult relative says the person is comfortable with standard UI.
3. Child display data:
   - Recommendation: store only display name/nickname and birth year at setup, not full birth date.
4. More than 5 children:
   - Recommendation: create `needs_admin_review` row, no token, show "Wir pruefen das kurz" message.
5. Sensitive senior data:
   - Recommendation: profile basics can be prepared by Angehoerigem; medications/check-ins/memory require senior confirmation or existing Care consent.

