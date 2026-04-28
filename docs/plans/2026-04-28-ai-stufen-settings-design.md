# AI-Stufen-Settings (Block 3) — Design

> Brainstorming-Output 2026-04-28 abend. Founder-Approved Sektion für
> Sektion. Codex-Korrekturen aus zwei Review-Pässen integriert.
>
> Vorgänger: `docs/plans/2026-04-28-evening-handover.md` (Stand HEAD `573bba2`).
> Nächster Schritt: Bite-Sized-Plan via `superpowers:writing-plans` in
> der nächsten Session (Token-Limit-Regel `feedback_session_handoff_bei_65_prozent.md`).

## Ziel

Heute hat der User im Onboarding eine 4-Stufen-Wahl (Aus/Basis/Alltag/Später,
plus disabled Persönlich) und einen DB-Wert `users.settings.ai_assistance_level`.
**Nach dem Onboarding gibt es kein UI, um die Stufe zu ändern.** Wer „Aus"
wählt, kann später nicht ohne Founder-Hilfe auf „Basis" wechseln. Block 3
schließt diese User-Journey-Lücke.

## Founder-Entscheidungen (7 Brainstorming-Fragen)

| # | Frage | Antwort |
|---|---|---|
| 1 | Wo lebt der Stufen-Picker? | `app/(app)/einstellungen/gedaechtnis/page.tsx` (Adapter, kein Neubau) |
| 2 | Wie viele Stufen im Settings? | 3 wählbar (Aus/Basis/Alltag) + 1 disabled (Persönlich). Kein „Später entscheiden" im Settings |
| 3 | UI-Pattern? | Stufen-Cards 1:1 wie Onboarding — Konsistenz, Senior-UX, Test-Wiederverwendung |
| 4 | Komponente extrahieren? | Ja — `AiAssistanceLevelPicker`, beide Caller importieren. Onboarding refactored sich mit |
| 5 | API-Erweiterung? | Bestehende Route `/api/settings/ai` erweitert um `ai_assistance_level`. `ai_enabled` davon abgeleitet |
| 6 | Audit/Consent-Update bei Stufen-Wechsel? | Jeder Wechsel = Audit-Eintrag. Consent-Update **nur bei On/Off-Schwellen-Überschreitung** |
| 7 | Klick auf gesperrte Persönlich-Card? | Inline-Hinweis-Block (kein Toast, kein Sheet, kein Auto-Dismiss) |

## Approach: Refactor-First (Approach 1)

Approach 2 (Settings-First mit Inline-Cards) widerspricht Frage 4. Approach 3
(Big-Bang) widerspricht TDD-strict. Refactor-First gewählt.

5 Schritte (TDD strict, jeder eigener RED→GREEN→Commit):

1. Neutrale Typ-Datei `lib/ki-help/ai-assistance-levels.ts`
2. Picker-Komponente `components/ki-help/AiAssistanceLevelPicker.tsx`
3. Onboarding-Refactor (verhaltens-identisch, bestehende 12 Tests bleiben grün)
4. Settings-Container Refactor (`AiHelpSettingsToggle.tsx`)
5. API-Route + Service-Erweiterung

**Schritt 6 (Sunset alter `ai_enabled`-POST-Pfad)** ist explizit **NICHT** Teil
dieses Plans — eigener späterer Block mit Founder-Go (Codex-Korrektur 1).

## Architektur

### Geteilte Komponente

`components/ki-help/AiAssistanceLevelPicker.tsx`

```ts
import type { AiAssistanceLevel } from "@/lib/ki-help/ai-assistance-levels";

interface AiAssistanceLevelPickerProps {
  value: AiAssistanceLevel | null;
  onChange: (level: AiAssistanceLevel) => void;
  mode: "onboarding" | "settings";
  onLockedClick?: () => void;
  disabled?: boolean;
  className?: string;
}
```

Render-Verhalten:
- `mode="onboarding"` → 4 Cards: Aus / Basis / Alltag / Später entscheiden
- `mode="settings"` → 3 Cards: Aus / Basis / Alltag (kein „Später entscheiden")
- Beide Modi zusätzlich 1 disabled Card: Persönlich (gesperrt)
- Selection-Visual via `aria-pressed={value === level}`
- Touch-Targets ≥ 80 px (Senior-Mode-Regel CLAUDE.md)
- Klick auf Persönlich-Card: ruft `onLockedClick?.()` auf, wenn gesetzt; sonst no-op

### Neutrale Typ-Datei

`lib/ki-help/ai-assistance-levels.ts`:

```ts
export type AiAssistanceLevel = "off" | "basic" | "everyday" | "later";

export interface LevelOption {
  level: AiAssistanceLevel;
  label: string;
  description: string;
  icon: ComponentType;
  modes: Array<"onboarding" | "settings">;
}

export const LEVEL_OPTIONS: ReadonlyArray<LevelOption> = [
  // off / basic / everyday — beide Modi
  // later — nur onboarding
];

export function deriveEnabledFromLevel(level: AiAssistanceLevel): boolean {
  return level !== "off";
}
```

`AiAssistanceLevel` wird damit aus `app/(auth)/register/components/types.ts`
zur neutralen Datei verschoben (Codex-Korrektur 2). `types.ts` re-exportiert
für Backwards-Kompat innerhalb des Register-Stacks.

### Settings-Datenfluss (Zielarchitektur, nicht Ist-Zustand)

```
gedaechtnis/page.tsx
  └── <AiHelpSettingsToggle />              (Container bleibt, interner Refactor)
        ├── GET /api/settings/ai → { enabled, assistanceLevel }
        ├── <AiAssistanceLevelPicker mode="settings" value={level} onChange={...} onLockedClick={...} />
        ├── {showLockHint && <PersonalLockHint onDismiss={...} />}
        └── onChange(level) → POST /api/settings/ai { ai_assistance_level: level }
              ↓ Route validiert + delegiert
        setAiAssistanceLevel(supabase, userId, level, reason)
              ├── prev_level = current users.settings.ai_assistance_level
              ├── persist users.settings.ai_assistance_level = level
              ├── derive ai_enabled = level !== "off"
              ├── audit-log push { reason, from: prev_level, to: level, at }
              └── if threshold-crossed (off↔active):
                    updateConsents(supabase, userId, { ai_onboarding: enabled })
              ↓ Response
        Picker re-render mit neuem Value
```

**Wichtig (Codex-Korrektur 3):** Consent-Update wird **ausschließlich im Service**
entschieden, nicht zusätzlich in der Route. Heute ruft die Route `updateConsents`
selbst — das wird im Refactor entfernt.

### Bestehende Wrapper bleiben (Codex-Korrektur 4)

`setAiHelpEnabled(supabase, userId, enabled, reason)` wird zum Wrapper:

```ts
function setAiHelpEnabled(supabase, userId, enabled, reason) {
  return setAiAssistanceLevel(
    supabase,
    userId,
    enabled ? "basic" : "off",
    reason,
  );
}
```

Damit bleiben bestehende Voice-/AI-Tests (z.B. `app/api/voice/tts/route.ts`)
unverändert grün.

### Onboarding-Datenfluss (verhaltens-identisch, nur Render-Pfad geändert)

```
RegisterStepAiConsent.tsx
  └── <AiAssistanceLevelPicker mode="onboarding" value={...} onChange={chooseLevel} />
        (Selection + Submit-Logik bleibt im Step-Component)
```

Submit-Pfad (Magic Link, Checkbox-Einwilligung, Compliance-Footer) bleibt
unverändert. Nur der Card-Render-Block wird durch den Picker ersetzt.

## Persönlich-Lock-Hinweis

### Wording (Founder-approved)

```
Persönlich ist noch gesperrt.
Diese Stufe kommt mit Phase 2, sobald die nötigen Schutzmaßnahmen aktiv sind.
Wir informieren Sie dann. Sie entscheiden neu, ob Sie diese Stufe nutzen möchten.
```

Konsistent zur FAQ-Antwort `personal-locked` in `lib/ki-help/faq-content.ts`
(Codex-Repair-Wording von 2026-04-28 Vormittag).

### Verhalten

- Klick auf Persönlich-Card → `onLockedClick?.()` → Container setzt
  `showLockHint=true`
- Inline-Hinweis-Block erscheint **direkt unter den Stufen-Cards**
- Bleibt sichtbar, bis User auf X klickt oder die Seite verlässt
- **Kein Auto-Dismiss, kein Timer**
- Schließen-Button mit `aria-label="Hinweis schließen"`

### Umsetzung

Inline im Settings-Container, **keine eigene Komponenten-Datei** (YAGNI).
Bei späterem zweiten Caller extrahieren.

## Datei-Struktur

### Neu

| Datei | Zweck |
|---|---|
| `lib/ki-help/ai-assistance-levels.ts` | Neutrale Type-Datei + `LEVEL_OPTIONS` + `deriveEnabledFromLevel` |
| `components/ki-help/AiAssistanceLevelPicker.tsx` | Geteilte Card-Komponente, beide Modi |
| `__tests__/lib/ki-help/ai-assistance-levels.test.ts` | Constants-Snapshot + Helper-Roundtrip |
| `__tests__/components/ki-help/AiAssistanceLevelPicker.test.tsx` | Render, Selection, onChange, onLockedClick, Mode-Filter, a11y, Touch-Targets |
| `__tests__/components/AiHelpSettingsToggle.test.tsx` | Settings-Container neu (Stufen-Wechsel + Persönlich-Lock-Hinweis) |
| `__tests__/lib/ai/user-settings-level.test.ts` | `setAiAssistanceLevel` Threshold-Crossing-Logik |
| `__tests__/api/settings-ai-level.test.ts` | API-Route POST mit `{ ai_assistance_level }` + Wrapper-Pfad |

### Geändert

| Datei | Änderung |
|---|---|
| `app/(auth)/register/components/types.ts` | `AiAssistanceLevel` re-exportiert von `lib/ki-help/ai-assistance-levels` |
| `app/(auth)/register/components/RegisterStepAiConsent.tsx` | Inline-Cards entfernt, `<AiAssistanceLevelPicker mode="onboarding" />` eingesetzt. Verhalten identisch |
| `modules/ai/components/AiHelpSettingsToggle.tsx` | Switch entfernt, Picker eingesetzt. Fetch/POST-Logik bleibt im Container, wird auf `level` umgestellt. Inline-`PersonalLockHint`-Block ergänzt |
| `app/api/settings/ai/route.ts` | POST akzeptiert `{ ai_assistance_level }` (neu) + `{ ai_enabled }` (alt, bleibt während Plan-Phase aktiv). GET liefert `{ enabled, assistanceLevel }`. Route ruft Service einmalig, **kein direktes `updateConsents`** mehr |
| `lib/ai/user-settings.ts` | Neu: `setAiAssistanceLevel(level, reason)`. Wrapper `setAiHelpEnabled(enabled, reason)` delegiert. `getAiHelpState` liefert `{ enabled, assistanceLevel }`. Audit-Schema: `{ reason, from, to, at }` |

### Unverändert

`modules/care/services/consent-routes.service.ts` (`updateConsents`) — wird
weiterhin aufgerufen, nur jetzt aus dem Service statt aus der Route.

## Test-Strategie pro Schritt

### Schritt 1: `lib/ki-help/ai-assistance-levels.ts`

- `LEVEL_OPTIONS` hat 4 Einträge mit unique IDs (`off`, `basic`, `everyday`, `later`)
- Jeder Eintrag hat nicht-leere Label + Beschreibung
- `modes`-Filter funktioniert: 3 Einträge für `settings`, 4 für `onboarding`
- `deriveEnabledFromLevel("off") === false`, alle anderen → true

### Schritt 2: `AiAssistanceLevelPicker`

- Onboarding-Mode rendert 4 wählbare + 1 disabled Card
- Settings-Mode rendert 3 wählbare + 1 disabled Card
- `value` steuert `aria-pressed` korrekt
- `onChange` wird mit korrektem Level aufgerufen
- `onLockedClick` wird auf Persönlich-Klick aufgerufen (Settings-Mode)
- `onLockedClick` ist optional — fehlend → no-op auf Klick (Onboarding-Mode)
- Persönlich-Card hat `aria-disabled="true"` und ändert `value` nicht
- Touch-Targets ≥ 80 px (className-Test gegen `min-h-[80px]` o.ä.)
- Snapshot-Test gegen Wording-Drift

### Schritt 3: Onboarding-Refactor

- **Bestehende 12 Tests in `register-ai-consent.test.tsx` müssen alle grün bleiben**
- Keine neuen Tests in diesem Schritt — Refactor ist verhaltens-identisch
- Wenn Test rot wird → Picker-Implementation ist nicht verhaltens-identisch → Picker fixen, nicht Test
- Commit-Message: explizit „refactor only, no behaviour change"

### Schritt 4: Settings-Container

- GET → Cards rendern Initial-Zustand korrekt (z.B. `basic`-Card als `aria-pressed=true`)
- Stufen-Wechsel `off → basic` ruft POST mit `{ ai_assistance_level: "basic" }`
- Stufen-Wechsel `basic → everyday` ruft POST mit `{ ai_assistance_level: "everyday" }`
- Stufen-Wechsel `everyday → off` ruft POST mit `{ ai_assistance_level: "off" }`
- Klick auf Persönlich → `showLockHint=true` → Hinweis-Block sichtbar
- Hinweis enthält alle 3 Founder-Sätze (Snapshot)
- Klick auf Schließen-Button → Hinweis verschwindet
- **Kein `vi.useFakeTimers()`, kein Auto-Dismiss-Test** (Founder-Korrektur)
- Optimistic-UI: bei API-Fehler rollback auf vorigen Wert

### Schritt 5: API + Service

Service-Tests (`setAiAssistanceLevel`):
- `off → basic`: persist + Audit + `updateConsents({ ai_onboarding: true })`
- `basic → everyday`: persist + Audit, **kein** Consent-Touch
- `everyday → off`: persist + Audit + `updateConsents({ ai_onboarding: false })`
- `later → basic`: behandelt wie `off → basic` (Consent setzen)
- Audit-Eintrag-Form `{ reason, from, to, at }` als Snapshot

Wrapper-Tests (`setAiHelpEnabled`):
- `setAiHelpEnabled(true)` → äquivalent zu `setAiAssistanceLevel("basic")`
- `setAiHelpEnabled(false)` → äquivalent zu `setAiAssistanceLevel("off")`

Route-Tests:
- POST `{ ai_assistance_level: "basic" }` → 200 + Service einmal aufgerufen
- POST `{ ai_assistance_level: "invalid" }` → 400
- POST `{ ai_enabled: true }` (alter Pfad) → 200 + Wrapper aufgerufen
- POST `{}` → 400
- GET → `{ enabled, assistanceLevel }`
- Route ruft `updateConsents` **NICHT direkt** auf (nur Service)

## Risiken + Mitigation

| Risiko | Mitigation |
|---|---|
| Schritt-3-Refactor bricht bestehende Onboarding-Tests | TDD strict: Tests bleiben unverändert, Picker muss verhaltens-identisch sein. Bei Bruch → Picker fixen |
| Merge-Konflikt mit Codex' Block-1+2-Arbeit an `RegisterStepAiConsent.tsx` | Block 3 startet **erst nach Codex-Block-1+2-Merge**. Reihenfolge im Stand-Header dokumentiert |
| Wrapper `setAiHelpEnabled` Voice-/AI-Tests brechen | Wrapper-Tests in Schritt 5 (Roundtrip-Verifikation) |
| Wording-Drift zwischen Inline-Hinweis und FAQ-Antwort `personal-locked` | Snapshot-Test in beiden Test-Files; falls strict gewünscht: Single-Source via `lib/ki-help/personal-lock-message.ts` (heute YAGNI) |

## Zusatznoten (kurz abgehakt)

- **Migration laufender User:** Heute keine echten Nutzer (Memory `project_prod_db_test_data_only.md`). Default für bestehende User: aus existierendem `users.settings.ai_assistance_level` (gesetzt durch Onboarding) ableiten. Falls leer: `enabled=false → "off"`, `enabled=true → "basic"`. Keine eigene Migration nötig
- **i18n:** Keine i18n-Infrastruktur im Repo. UI-Texte hartcodiert auf Deutsch (CLAUDE.md-Sprachregel). Kein Scope für Block 3
- **Telemetrie:** Audit-Log ist bereits Pflicht (DSGVO-Nachweis). Keine zusätzliche KPI/Analytics — kein Scope für Block 3

## Reihenfolge / Scheduling

- **Block 3 startet NICHT heute Abend.** Brainstorming + Design-Doc komplett, aber Plan-Erstellung + Implementation nächste Session
- **Vor Block-3-Implementation:** Codex-Block-1+2 (DSGVO-Wording-Pass + Preview-Routen-Flag) sollten gemergt sein. Sonst Merge-Risiko an `RegisterStepAiConsent.tsx`
- **Plan-Doc** kommt im Schritt nach Brainstorming via `superpowers:writing-plans` als
  `docs/plans/2026-04-29-ai-stufen-settings-plan.md` (oder dem Datum des
  tatsächlichen Implementations-Tages)

## Codex-Korrekturen-Verzeichnis

Die folgenden Sektionen wurden direkt durch Codex-Reviews aus zwei Pässen
verbessert:

| Sektion | Codex-Korrektur | Übernommen |
|---|---|---|
| Sektion 1 | `onLockedClick` in Props ergänzen | Ja |
| Sektion 1 | `AiAssistanceLevel` neutral verorten | Ja |
| Sektion 1 | API backwards-compatible (während Refactor) | Ja |
| Sektion 1 | Audit-Log-Schema-Test-pflichtig | Ja |
| Sektion 1 | Container-Logik bleibt in `AiHelpSettingsToggle` | Ja |
| Sektion 2 | Schritt 6 (Sunset) raus aus Block 3 | Ja, eigener späterer Block |
| Sektion 2 | `onLockedClick` in Props/Tests explizit | Ja |
| Sektion 2 | Consent-Update zentralisiert im Service | Ja |
| Sektion 2 | Wrapper `setAiHelpEnabled` behalten | Ja |
| Sektion 3 | Auto-Dismiss raus | Ja, Timer-Test entfällt |

Damit ist das Design durch zwei unabhängige Reviews gehärtet, bevor irgendein
Code geschrieben wird.
