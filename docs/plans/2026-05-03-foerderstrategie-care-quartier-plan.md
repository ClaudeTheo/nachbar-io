# Care-Quartier Foerderstrategie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task.
> This is a strategy/docs plan. Do not create code, routes, migrations, provider
> integrations, deployments, or production actions unless Thomas explicitly
> opens a separate implementation block.

## Goal

Create a safe, fundable Care-Quartier positioning for nachbar.io:

1. `45b`/UStA as the strongest recurring operating model, preferably through an
   already recognized partner at first.
2. Quartiersimpulse BW as the best municipal pilot path for Bad Saeckingen.
3. `40 Abs. 4 SGB XI` only as an optional hardware/setup bundle path in the
   individual case.
4. DiPA as a later evidence- and compliance-heavy path, not as MVP revenue.
5. Startup/innovation grants as development capital, not user reimbursement.

The end result should be a 2-page partner/funding concept that Thomas can use
with Kommune, Pflegestuetzpunkt, Nachbarschaftshilfe or Wohlfahrtstraeger
without making reimbursement promises.

## Non-Negotiables

- Do not build the M4 Pflegekassen-PDF before M4.0 and M4.1 are complete.
- Do not claim guaranteed reimbursement.
- Do not say "App wird von der Pflegekasse bezahlt".
- Do not treat DiPA as current product status.
- Do not apply migrations or touch Supabase Prod.
- Do not deploy.
- Do not add Vercel env/provider/cost changes.
- Do not use real personal data or live AI processing.
- Do not stage old untracked handoff files or `.codex-welle-d-3001.pid`.

## Existing Anchors

- `modules/hilfe/*` already contains `45b`-/Nachbarschaftshilfe receipt and
  report logic.
- Recent CareCircle hardening makes active `caregiver_links` a stronger product
  base for care coordination.
- `docs/plans/handoff/2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md`
  is the current M4 warning source: M4 PDF remains blocked.
- Current public/product wording may need a later softening pass where it sounds
  like direct Pflegekassen-payment is guaranteed.

## Task 1: Source And Wording Freeze

**Files**

- Create or update a small source/wording section inside the later concept file.
- No code files.

**Steps**

1. Re-check official sources before external use:
   - `45a SGB XI` and `45b SGB XI`
   - Baden-Wuerttemberg UStA recognition rules
   - Quartiersimpulse BW
   - `40 Abs. 4 SGB XI`
   - BfArM DiPA information
2. Record a "Stand: <date>" note and mark that legal/commercial use needs a
   final human/legal review.
3. Freeze forbidden wording:
   - "Die App wird erstattet."
   - "Die Pflegekasse zahlt nachbar.io."
   - "Garantierte Foerderung."
   - "`40 SGB XI`-foerderfaehig" without caveat.
   - "DiPA-zugelassen" before actual BfArM listing.
4. Freeze allowed wording:
   - "Kann Teil eines anerkannten Unterstuetzungsangebots im Alltag sein."
   - "Kann ueber anerkannte Partner und je nach Landesrecht abrechenbar werden."
   - "Hardware/Einrichtung kann im Einzelfall beantragt werden; die Pflegekasse
     entscheidet."
   - "Nachbar.io ist Technologiepartner fuer Quartiers- und Care-Koordination."

**Acceptance**

- A reusable allowed/forbidden wording block exists.
- No public reimbursement promise was introduced.

## Task 2: Two-Page Funding Concept Draft

**Files**

- `docs/plans/2026-05-04-care-quartier-foerderkonzept-draft.md`

**Steps**

1. Draft the concept with this title:
   "QuartierApp Care: Digital unterstuetztes Angebot zur Unterstuetzung im
   Alltag fuer Senioren zuhause".
2. Use these sections:
   - Problem: seniors at home, relatives overloaded, local help fragmented.
   - Offer: digital begleiteten Nachbarschaftshilfe- und CareCircle-Service.
   - Pilot Bad Saeckingen: 20-40 households, relatives, local helpers, optional
     Echo/Tablet, check-ins, help coordination, evaluation after 6 months.
   - Funding mix: UStA/`45b`, Quartiersimpulse, `40` hardware bundle, later DiPA.
   - Role split: Kommune/Traeger, recognized partner, nachbar.io, relatives.
   - Next decisions for Thomas.
3. Keep the tone quiet and factual. No startup hype.

**Acceptance**

- Thomas can send the draft internally or use it as the basis for a partner
  conversation.
- The concept does not imply that software alone is automatically reimbursed.

## Task 3: UStA Partner Model

**Files**

- Extend the draft from Task 2.
- Optional later handoff if this becomes a separate implementation block.

**Steps**

1. Pre-check existing `modules/hilfe` logic for `45b` receipt/report terms.
2. Document which parts are reusable for a partner model:
   - task documentation
   - monthly/yearly receipts
   - helper/resident flow
   - caregiver/care-circle connection points
3. Write partner questions:
   - Is the partner already recognized under UStA?
   - Which services are recognized?
   - Can digital coordination be part of the service documentation?
   - Who signs, bills, documents and quality-assures the support?
   - How are volunteers/helpers trained?

**Acceptance**

- There is a clear partner-first model.
- The model distinguishes software subscription from recognized support service.

## Task 4: Quartiersimpulse Pilot Model

**Files**

- Extend the draft from Task 2.

**Steps**

1. Define the municipal pilot as:
   "Digital unterstuetztes Senioren- und Nachbarschaftsquartier Bad Saeckingen".
2. Make the applicant role explicit:
   - preferred: Stadt/Gemeinde
   - possible: Landkreis or municipal network with local partner
   - nachbar.io: technology partner, not sole grant applicant
3. Include pilot parameters:
   - 20-40 senior households
   - 3-6 month first evaluation window
   - relatives and local helpers onboarded
   - citizen participation/workshops
   - privacy-safe evaluation metrics

**Acceptance**

- One section can be reused as a municipal pitch skeleton.
- The pilot is framed as local social infrastructure, not just app rollout.

## Task 5: `40 Abs. 4` Hardware Bundle Side Path

**Files**

- Extend the draft from Task 2 only after M4.0/M4.1 inputs are available.
- Do not create the M4 PDF generator.

**Steps**

1. Wait for Thomas to complete M4.0 Pflegestuetzpunkt/Pflegekasse feedback.
2. Wait for Thomas/Codex to complete M4.1 bundle definition.
3. Only then draft bundle variants:
   - device
   - fixed location/holder
   - setup
   - WLAN onboarding
   - CareCircle configuration
   - training
   - handover protocol
   - recurring app/service fee listed separately
4. Add the standard caveat: individual application, decision by Pflegekasse.

**Acceptance**

- No `40` promise exists.
- No PDF generator exists before the block is explicitly unblocked.

## Task 6: DiPA Later Evidence Plan

**Files**

- Extend the draft from Task 2 or create a later DiPA-specific plan.

**Steps**

1. Do not use DiPA as a current sales claim.
2. Define future evidence metrics:
   - check-in completion rate
   - missed-check-in escalations
   - relative response times
   - documented support tasks
   - subjective caregiver relief survey
   - senior independence/social contact indicators
   - privacy incident count
3. Define later prerequisites:
   - DSFA/FMEA alignment
   - intended-use boundary
   - data protection review
   - BfArM consultation
   - evidence design

**Acceptance**

- DiPA is a long-range path with prerequisites, not a near-term promise.
- No concrete monthly reimbursement amount appears unless separately verified.

## Task 7: Repo/Vault Handoff

**Files**

- Repo: this plan and the concept draft.
- Vault: optional short pointer only, if Thomas wants it.

**Steps**

1. Keep technical diffs and implementation state in repo docs.
2. Keep strategic decision and business why in the Vault, if mirrored.
3. Do not duplicate full text unless Thomas requests a one-time transfer.

**Acceptance**

- A future agent knows where to continue.
- There is no repo/vault double-maintenance burden.

## Task 8: Later Public Wording Audit

**Files To Inspect Later**

- `app/(app)/hilfe/anleitung/senior/page.tsx`
- `app/(app)/hilfe/*`
- `docs/*` pages that mention Pflegekasse, `45b`, Entlastungsbetrag or
  reimbursement

**Steps**

1. Run a repo-wide wording search before editing.
2. Identify text that sounds like guaranteed payment.
3. Replace with cautious service-/partner wording.
4. Add guard tests only if the wording is user-facing and recurring.

**Acceptance**

- Public wording is consistent with the funding strategy.
- No existing Hilfe functionality is changed by accident.

## Verification For This Plan

For docs-only execution:

1. Read back changed files with `Get-Content`.
2. Run `git diff --check`.
3. Run `git status --short --branch`.
4. Stage only files owned by the active INBOX row.
5. Commit with an English docs/strategy message.
6. Push only if Founder-Go is still in effect for this current block.

## Stop Conditions

Stop and ask Thomas before any of the following:

- creating the M4 Pflegekassen-PDF
- changing public product pages
- adding a migration
- touching Supabase Prod
- adding costs or provider integrations
- using exact current grant amounts in public-facing material without fresh
  source verification
