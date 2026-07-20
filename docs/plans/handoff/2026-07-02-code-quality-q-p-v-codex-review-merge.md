# Codex-Brief: Finale Review + Merge der Code-Quality-PRs #70 / #71 / #72

**Projekt: Nachbar.io** · Erstellt: 2026-07-02 (Claude) · Risk: COMPLIANCE
**Founder-Go:** Thomas hat am 2026-07-02 die Umsetzung der Wellen Q/P/V mit „go" freigegeben (Befund-Report → Founder-Entscheid → Umsetzung). Merge nach deiner Review + Founder-Go. **Rote-Zone-Grenzen: kein Vercel-Env, keine Prod-Migration, kein Provider-Live, kein Geld.**
**Kompakt-Brief (KI-Inbox):** `firmen-gedaechtnis/06_KI-Zusammenarbeit/Uebergabe-an-naechste-Codex-Session-2026-07-02-Code-Quality-PRs-70-71-72-Review.md` · Befund-Report: `…/Befund-Report-Nachbar-io-Code-Qualitaet-2026-07-02.md`

## Ausgangslage

- Basis aller drei Branches: `origin/master = f508917` (#69 W5/A2:5 gemergt). Die PRs sind **unabhängig** (keine überlappenden Dateien, kein Stack), Merge-Reihenfolge egal.
- Kein Auth-/RLS-/Admin-Surface, keine Migration → Mini-Audit nicht getriggert (geprüft gegen `.claude/rules/security-mini-audit.md`).

## PR #70 — Welle Q (`claude/code-quality-quick-wins`, `c61abc6`)

7 Dateien, +5/−400. Drei unabhängige Quick-Wins:

1. **Toter Code:** `app/(auth)/register/components/RegisterStepPilotRole.tsx` + `__tests__/app/register-pilot-role.test.tsx` gelöscht. Verifikation: repo-weiter Grep — einzige Code-Referenzen waren der eigene Test + ein (falscher) Barrel-Kommentar; W4b-2 (#68) hat stattdessen `app/(app)/profile/components/PilotRoleSelector.tsx` gebaut. `RegisterFormState.pilotRole` bewusst BEHALTEN (wird von `RegisterStepAiConsent` an die Registration übergeben — chirurgische Grenze).
2. **Toter Export:** `updateUserSettings` aus `lib/services/profile.service.ts`, Barrel `lib/services/index.ts` und `profile.service.test.ts` entfernt. Verifikation: kein Produktions-Aufrufer (repo-weiter Grep, nur Barrel + eigener Test). Damit entfällt der einzige ungenutzte Load-merge-write-Pfad auf `users.settings`; die bewussten Pfade (`setPilotRoleServer` Mig-198-bedingt, kiosk-pin) bleiben unangetastet.
3. **Lint-Fix:** `eslint.config.mjs` `globalIgnores` + `.claude/**` (gleicher Ausschluss wie `vitest.config.ts`) → voller `npm run lint` grün trotz Stale-Worktree `elated-mestorf-e47719`.

Gates: `npx tsc --noEmit` ✅ · voller `npm run lint` ✅ (vorher 6 Fehler) · Vitest gezielt (`lib/services`, `app/(auth)/register`, `__tests__/app`) 82 Dateien / 440 Tests ✅ · PR-CI (S1-S6 + S7) grün.

## PR #71 — Welle P (`claude/code-quality-preview-consolidation`, `4ec3ad4`)

3 Dateien, +101/−254. Dev-only, kein Prod-Verhaltens-Change:

- Der Register-Flow hatte **zwei parallele Dev-Preview-Mechanismen**: `?previewStep=`-Param in `register/page.tsx` + Route `/register/preview/[step]` → `RegisterPreviewForm`. Beide mussten synchron gepflegt werden (W4b-Lehre); `buildLocalPreviewState` war 1:1 dupliziert. E2E nutzt keinen von beiden (verifiziert).
- Entfernt: Param-Pfad (`LOCAL_PREVIEW_STEPS`, `isLocalPreviewEnabled`, `buildLocalPreviewState`, `getLocalPreviewStep`, `isLocalPreview`-State) aus `page.tsx`. Route bleibt einziger Mechanismus (prod-gegated via `notFound()`).
- Tests: `register-page-dev-preview.test.tsx` → `register-preview.test.tsx` (git mv). Route-/Form-Abdeckung erhalten (prod-404, identity/ui-mode-Rendering, „kein Link-Versand"-Guard) + **neuer Regressions-Guard**: `?previewStep=identity` zeigt jetzt den normalen Entry-Schritt.
- Review-Fokus: `RegisterStepAiConsent` bekommt kein `isPreview`-Prop mehr von page.tsx (Default `false` — Prop-Signatur unverändert, `RegisterPreviewForm` übergibt weiter `isPreview`).

Gates: tsc ✅ · eslint scoped ✅ · Vitest 77 Dateien / 375 Tests ✅ · PR-CI lief beim Schreiben (S7 grün, S1-S6 pending).

## PR #72 — Welle V (`claude/code-quality-vitest-split`, `c88ebf3`)

3 Dateien, +91/−49. Reine Test-Infrastruktur:

- `vitest.config.ts`: `test.projects` — **node** (`**/*.test.ts`, environment node) + **dom** (`**/*.test.tsx` + `DOM_TEST_TS`-Liste, jsdom). `SHARED_EXCLUDE` unverändert (worktrees etc.), Coverage/Pool/Timeouts via `extends: true` geerbt.
- `vitest.setup.ts` → gesplittet: `vitest.setup.env.ts` (Dummy-ENV, beide Projekte) + `vitest.setup.dom.ts` (git mv; RTL-Cleanup, jest-dom, IntersectionObserver, next/navigation+link+image-Mocks — nur dom).
- `DOM_TEST_TS` (11 Einträge): `__tests__/hooks/**` (renderHook), `companion-streaming`, `auth-apple`, `platform-storage`, `ios-audio-manager`, `whisper-engine`, `use-refresh-rotation`, `lib/quarters/hooks`, `photon-client` (Test erwartet explizit jsdom-Proxy-Verhalten).
- **Messung:** node-Projekt 468 Dateien / 3568 Tests in 31 s (environment 80 ms statt Minuten); voller `npm run test` 148 s (741 Dateien, **5217 passed / 1 skipped** — identische Suite-Größe wie vor dem Split); `--shard=1/3` kompatibel (Exit 0).
- Review-Fokus: Ist die `DOM_TEST_TS`-Liste vollständig? (Empirisch validiert: voller node-Lauf grün.) CI (`deploy.yml` → `npm run test`) unverändert kompatibel.

Gates: tsc ✅ · eslint scoped (config + beide Setups) ✅ · Voll-Suite ✅.

## 1:1-Kommandos (nach deiner Review, mit Founder-Go)

```bash
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
gh pr merge 70 --squash --delete-branch
gh pr merge 71 --squash --delete-branch
gh pr merge 72 --squash --delete-branch
git fetch origin && git switch master && git pull
npx vitest run   # Nach-Merge-Smoke (erwartet: 741 Dateien grün, ~148 s)
```

Bei CRITICAL/HIGH-Findings: STOP, zurück an Claude/Founder. Deploy ist separater Founder-Entscheid (workflow_dispatch), nicht Teil dieses Auftrags.
