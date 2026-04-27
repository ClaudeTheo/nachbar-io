# 2026-04-27 — KI-Consent-Polish + KI-Hilfe-Stufen (Design)

> Aktiver Workstream `topics/pilot-onboarding.md` — Punkt 2 der Codex-Empfehlung
> (KI-Einwilligungs-Screen warm, klar, vertrauensbildend). Erweitert um Stufen-
> Modell und KI-Hilfe-Begleiter-Visual nach Founder-/Codex-Spec 2026-04-27.

## Ziel

`RegisterStepAiConsent.tsx` auf das Niveau der bereits polished
`RegisterStepEntry.tsx` und `RegisterStepPilotRole.tsx` heben. Der Screen soll
fuer Senioren als Visitenkarte wirken: warm, ruhig, kontrollgebend, ehrlich.

**Story-Bogen:** B (Hilfe-Angebot, menschlich) -> A (Kontrolle, Kern) ->
C (Schutz, ruhig).

## Out of Scope (heute)

- Globaler Brand-Rename `Nachbar.io` -> `QuartierApp` ausserhalb
  `app/(auth)/register`. Nur die 7 sichtbaren Onboarding-Stellen werden auf
  „die QuartierApp" umgestellt.
- Funktionale Abstufung Basis vs. Alltag im Backend (z.B. unterschiedliche
  Provider-Presets oder Token-Limits). Heute wird der Stufen-Wert nur
  gespeichert, die KI-Funktionalitaet bleibt binary an `ai_enabled`
  gebunden. Funktional-Differenzierung folgt in Phase 2 (nach AVV).
- Live-Q&A des KI-Hilfe-Begleiters. Vor Consent vollstaendig statisches
  UI-Element, kein LLM-Call, keine Streaming-Verbindung.
- Erweiterung des `AiHelpSettingsToggle.tsx` auf Stufen-Auswahl. Heute bleibt
  das Settings-Toggle binary (an/aus). Stufen-Edit folgt als eigener Block.
- Persoenlich-Stufe als auswaehlbarer Wert. Heute disabled-Card mit
  Lock-Hinweis „nach Freigabe". Aktivierung kommt nach AVV.

## Pre-Check-Befund

Codebase-weiter Grep am 2026-04-27:

| Stichwort | Treffer | Bedeutung |
|---|---|---|
| `ai_assistance_level`, `aiAssistanceLevel`, `assistance_level`, `ai_level` | 0 | Neu, keine Kollision |
| `aiConsentChoice` Type | `app/(auth)/register/components/types.ts:33` exakt `"yes" \| "no" \| "later"` | a2-Erweiterung kompatibel |
| `users.settings.ai_enabled` (boolean) | `lib/ai/user-settings.ts`, `lib/services/registration.service.ts:514` | Existiert, Hauptschalter |
| `users.settings.ai_audit_log` | `lib/services/registration.service.ts:518`, `setAiHelpEnabled` | Existiert |
| `care_consents.feature='ai_onboarding'` | `persistAiOnboardingConsent` (`registration.service.ts`), `app/api/ai/onboarding/turn/route.ts`, Mig 173 | Existiert |
| `canUsePersonalAi` 3-fach-Guard | `lib/ai/user-settings.ts:85` | Existiert |
| `AiHelpSettingsToggle.tsx`, `/api/settings/ai`, `/api/ai/onboarding/turn` | `modules/ai/components/`, `app/api/...` | Existieren |
| Reality-Check vom 26.04 | `docs/plans/2026-04-26-ki-toggle-onboarding-reality-check.md` | Explizite Vorgabe: nicht neu bauen, weiterverwenden |
| Companion-/Maskottchen-Visual | nur `modules/voice/components/companion/TTSButton.tsx` (TTS-Knopf, kein Avatar/Glow) | Pulse-Punkt ist neu, keine Kollision |

**Konsequenz:** Der KI-Consent-Flow wird nicht neu gebaut. Bestehende
Infrastruktur (Mapping in `registration.service.ts`, `ai_enabled`,
`care_consents`) wird weiterverwendet. Erweiterung minimal: zusaetzlicher
Settings-Schluessel `ai_assistance_level` plus UI-Polish.

## Architektur

### UI-Komponente

`app/(auth)/register/components/RegisterStepAiConsent.tsx` (~270 LOC nach
Polish, +90 vs. IST).

**Sektionen (top-down):**

1. **Title** — `text-base font-semibold text-anthrazit`, zentriert:
   „Moechten Sie Unterstuetzung durch die KI-Hilfe?"

2. **Hero-Card** — `rounded-xl border border-rose-100 bg-rose-50/70 p-4`.
   - Links: pulsierender quartier-green Kreis (eigene Sub-Komponente
     `KiHelpPulseDot`, siehe unten).
   - Rechts: Begruessung „Hallo, ich bin die KI-Hilfe der QuartierApp. Ich
     kann spaeter beim Vorlesen, Formulieren und Verstehen helfen." plus
     drei Lucide-Bullets:
     - `Volume2` — „Nachrichten und Hinweise vorlesen lassen"
     - `Mic` — „Antworten sprechen statt tippen"
     - `MessageCircleQuestion` — „Kleine Fragen zur App oder zum Quartier
       stellen"

3. **Kontrolle-Card** — `rounded-xl border border-quartier-green/25
   bg-quartier-green/5 p-4`. ShieldCheck-Icon, Text: „Sie entscheiden
   selbst, ob und wann Sie mich nutzen moechten. Standardmaessig aus."

4. **Auswahl-Cards** (Grid, 4 wahlbar + 1 disabled):
   - **Aus** — `PowerOff`, Beschreibung „Die KI-Hilfe bleibt
     ausgeschaltet."
   - **Basis** — `BookOpen`, Beschreibung „Erklaeren, Vorlesen und einfache
     Hilfe in der App."
   - **Alltag** — `Sparkles`, Beschreibung „Beim Formulieren, Verstehen und
     kleinen Fragen unterstuetzen."
   - **Spaeter entscheiden** — `Clock`, Beschreibung „Sie entscheiden
     spaeter in den Einstellungen."
   - **Persoenlich (spaeter)** — `Lock`, `aria-disabled=true`, visuell grau
     reduziert, nicht klickbar, Beschreibung „Nur mit ausdruecklicher
     Einwilligung und aktiven Schutzmassnahmen, kommt mit Phase 2 nach
     Freigabe."

   Visuelle Selektion (klickbare Cards): `border-2 border-quartier-green
   bg-quartier-green/5` plus `CheckCircle2` oben rechts. Lokale
   `selectedLevel`-State, kein Auto-Submit.

5. **Compliance-Footer-Note** — `text-xs text-muted-foreground`, eine
   Zeile ganz unten: „Bei Aktivierung: pseudonymisiert, AVV beim Anbieter,
   Nutzung jederzeit widerrufbar."

6. **Submit-Button** — full-width, primary, `disabled` solange
   `selectedLevel` `null`: „Auswahl speichern und Link senden".

7. **Zurueck-Link** — wie heute: kleiner Text-Link mit `ArrowLeft`.

### Sub-Komponente `KiHelpPulseDot`

Neuer Pfad: `app/(auth)/register/components/KiHelpPulseDot.tsx`.

Pures CSS-Visual:

- 24 px Aussenkreis (`bg-quartier-green/20`).
- 10 px Innenkreis (`bg-quartier-green`).
- Animation: sanftes Pulsieren des Aussenkreises, 2.4 s ease-in-out,
  infinite, scale 1 -> 1.15 -> 1, opacity 0.6 -> 1 -> 0.6.
- `@media (prefers-reduced-motion: reduce)` -> Animation aus, statisch
  sichtbar.
- `aria-hidden="true"` (rein dekorativ, keine semantische Information).
- Keine externen Libraries (kein Framer-Motion, kein Lottie). Tailwind +
  optional kleine `<style>`-Block oder `@keyframes` in einer co-located
  CSS-Datei.

### Datenfluss

`RegisterFormState` Erweiterung in `types.ts`:

```ts
export type AiAssistanceLevel = "off" | "basic" | "everyday" | "later";

export interface RegisterFormState {
  ...
  aiConsentChoice?: "yes" | "no" | "later";   // bestehend, unveraendert
  aiAssistanceLevel?: AiAssistanceLevel;       // NEU
  ...
}
```

UI-Click-Mapping in `RegisterStepAiConsent.tsx`:

| Card | aiConsentChoice | aiAssistanceLevel |
|---|---|---|
| Aus | `"no"` | `"off"` |
| Basis | `"yes"` | `"basic"` |
| Alltag | `"yes"` | `"everyday"` |
| Spaeter entscheiden | `"later"` | `"later"` |
| Persoenlich | nicht klickbar | nicht klickbar |

`complete()` ruft wie bisher `POST /api/register/complete` mit beiden
Werten auf.

### API & Service

`POST /api/register/complete` Body erweitert um optionales
`aiAssistanceLevel`. Validierung gegen Whitelist
`["off","basic","everyday","later"]`, Default-Fallback bei fehlendem Wert
oder unbekanntem String: ableiten aus `aiConsentChoice` (yes -> basic,
no -> off, later -> later).

`lib/services/registration.service.ts:514` Erweiterung:

```ts
const aiEnabled = aiConsentChoice === "yes";
const aiAssistanceLevel: AiAssistanceLevel =
  isValidLevel(aiAssistanceLevelInput)
    ? aiAssistanceLevelInput
    : aiConsentChoice === "yes"
      ? "basic"
      : aiConsentChoice === "no"
        ? "off"
        : "later";

const settings: Record<string, unknown> = {
  ai_enabled: aiEnabled,
  ai_assistance_level: aiAssistanceLevel,           // NEU
  ai_audit_log: [
    {
      at: new Date().toISOString(),
      enabled: aiEnabled,
      assistance_level: aiAssistanceLevel,          // NEU
      source: "registration",
    },
  ],
  ...
};
```

`care_consents` Verhalten unveraendert: `persistAiOnboardingConsent`
schreibt nur bei `aiConsentChoice` `"yes"` oder `"no"`. Bei `"later"`
weiterhin kein Eintrag.

Keine SQL-Migration noetig, weil `users.settings` JSONB ist und
`care_consents`-Schema unveraendert bleibt.

### Brand-Migration im Onboarding (Y)

7 Stellen werden auf „die QuartierApp" gesetzt:

| Datei | Stelle | Kontext |
|---|---|---|
| `app/(auth)/register/page.tsx:108` | sichtbarer Header `Nachbar.io` | -> `QuartierApp` (ohne Punkt) als Wortmarke |
| `app/(auth)/register/components/RegisterStepEntry.tsx:26` | „Nachbar.io soll Menschen ..." | -> „Die QuartierApp soll Menschen ..." |
| `RegisterStepEntry.tsx:63` | H3 „Warum gibt es Nachbar.io?" | -> „Warum gibt es die QuartierApp?" |
| `RegisterStepPilotRole.tsx:49` | Error „Bitte waehlen Sie aus, wie Sie Nachbar.io im Pilot nutzen." | -> „... wie Sie die QuartierApp im Pilot nutzen." |
| `RegisterStepPilotRole.tsx:61` | H2 „Wie nutzen Sie Nachbar.io im Pilot?" | -> „Wie nutzen Sie die QuartierApp im Pilot?" |
| `RegisterStepPilotRole.tsx:64` | „Nachbar.io lebt davon ..." | -> „Die QuartierApp lebt davon ..." |
| `RegisterStepPilotRole.tsx:102` | „die Nachbar.io selbst nutzen." | -> „die die QuartierApp selbst nutzen." (Doppel-„die" pruefen, ggf. „Menschen, die die QuartierApp selbst nutzen" -> „Menschen, die selbst mit der QuartierApp arbeiten") |

Page-Header (`page.tsx:108`) bleibt als Wortmarke ohne Artikel:
`QuartierApp` (Brand-Logo-Stil), waehrend Fliesstext-Erwaehnungen den
Artikel „die QuartierApp" verwenden.

## Tests (TDD strict)

Bestehender Test `__tests__/app/register-ai-consent.test.tsx` wird
erweitert. Neue Tests werden RED zuerst geschrieben.

### Test-Plan

| Datei | Tests | Status |
|---|---|---|
| `__tests__/app/register-ai-consent.test.tsx` | (1) rendert Title, Hero-Begruessung, 4 wahlbare + 1 Persoenlich-disabled. (2) Klick auf Card markiert visuell, kein Auto-Submit. (3) Submit-Button disabled solange keine Auswahl, aktiv nach Auswahl. (4) Klick auf disabled Persoenlich-Card aendert State nicht. (5) Submit ruft `/api/register/complete` mit korrektem `aiConsentChoice` UND `aiAssistanceLevel` (alle 4 Mappings). (6) prefers-reduced-motion: Pulse-Animation deaktiviert (CSS-Klasse pruefen). | Neu, RED-first |
| `__tests__/app/register-ai-consent-pulse.test.tsx` | Snapshot-Test der `KiHelpPulseDot`-Komponente fuer normale Motion und reduced-motion. | Neu |
| `__tests__/api/register-complete-bugfix.test.ts` | Erweiterung: persist `ai_assistance_level` in `users.settings`. Default-Fallback bei fehlendem Input greift. Whitelist-Validation lehnt unbekannte Werte mit `400` ab. | Erweiterung |
| `__tests__/lib/registration-service.test.ts` (falls existiert, sonst neu) | `aiAssistanceLevel` wird in `users.settings` und in `ai_audit_log` geschrieben. Mapping-Tabelle als Parametrized-Test. | Neu/erweitert |
| `__tests__/app/register-pilot-role.test.tsx` | Erweiterung: Brand-Rename Pruefungen (H2-Text, Error-Text). | Erweiterung |
| `__tests__/app/register-entry.test.tsx` | Erweiterung: Brand-Rename Pruefungen. | Erweiterung |

Testlauf-Befehle:

```bash
cd nachbar-io
npx vitest run __tests__/app/register-ai-consent.test.tsx
npx vitest run __tests__/app/register-ai-consent-pulse.test.tsx
npx vitest run __tests__/api/register-complete-bugfix.test.ts
npx vitest run __tests__/lib/registration-service.test.ts
npx vitest run __tests__/app/register-pilot-role.test.tsx
npx vitest run __tests__/app/register-entry.test.tsx
npx tsc --noEmit
npx eslint app/\(auth\)/register/components/RegisterStepAiConsent.tsx
npx eslint app/\(auth\)/register/components/KiHelpPulseDot.tsx
npx eslint lib/services/registration.service.ts
```

## Fehlerbehandlung

- API-Fehler aus `/api/register/complete` und Magic-Link werden wie heute
  in `state.error` angezeigt (`text-emergency-red`-Zeile zwischen
  Auswahl und Submit). Kein Verhaltenswechsel.
- Kein KI-Call vor Consent: Pulse-Dot ist rein CSS, keine Network-Aktion,
  keine Telemetrie.
- prefers-reduced-motion: WCAG-relevant, Test absichert.
- Disabled Persoenlich-Card: `aria-disabled="true"`, `role="presentation"`,
  Klick-Handler kein No-op (keine Funktion an die Card gebunden).

## Migration / Backwards-Compatibility

- `aiConsentChoice` Type unveraendert. Bestehende Tests gegen yes/no/later
  laufen weiter.
- `users.settings.ai_enabled` Logik unveraendert. `canUsePersonalAi` bleibt
  3-fach-Guard.
- Neue `users.settings.ai_assistance_level`-Werte sind ergaenzend, nie
  bricht Lese-Code, weil JSON-optional. Default-Fallback im Service
  schreibt fuer Bestand keine ai_assistance_level (wird erst bei
  Re-Registration gesetzt).
- Keine SQL-Migration, kein Mig-File. JSONB-only.

## Risiken

| Risiko | Massnahme |
|---|---|
| Polish wirkt textlastig | Compliance als Footer-Note (Variante b), Trust-Cards kompakt halten, max 3 Bullet-Zeilen im Hero. |
| Persoenlich-Card erweckt unrealistische Erwartung | Lock-Icon plus Text „kommt mit Phase 2 nach Freigabe", visuell deutlich gedaempft. |
| Stufen-Wert wird gespeichert, aber Funktional-Differenzierung fehlt | Klarer Out-of-Scope-Eintrag oben. Phase 2 nach AVV. |
| Auto-Submit-Aufgabe bricht E2E-Tests | Kein bisheriger E2E hat AI-Consent Auto-Submit als Voraussetzung. Neuer Smoke-Test gegen localhost:3001 dokumentiert verifiziert. |
| Brand-Rename-Inkonsistenz ausserhalb Onboarding | Out-of-Scope dokumentiert, Folge-Workstream. |
| KiHelpPulseDot CSS-Animation vs. Tailwind-Klassen-Reihenfolge | Co-located Style oder `@keyframes`-Inline-Tag verwenden. Kein global.css-Touch. |

## Implementierungs-Reihenfolge (high-level)

1. types.ts erweitern (RED-erst gegen Type-Test).
2. KiHelpPulseDot.tsx neu (Tests fuer Render + reduced-motion).
3. RegisterStepAiConsent.tsx Polish + Stufen-Cards (Tests aufgebohrt).
4. lib/services/registration.service.ts Erweiterung (parametrized Mapping-Tests).
5. /api/register/complete Schema-Validierung (Whitelist-Test).
6. Brand-Rename in 7 Stellen (Visual-Tests fuer 2 betroffene Komponenten).
7. Lokale Verifikation: `npx vitest run`, `npx tsc --noEmit`, `npx eslint`,
   Smoke-Run gegen localhost:3001 mit Cloud-DB (Test-User-Praefix
   `ai-test-aiconsent-...`).
8. Lokal commit (kein Push).

Die exakte Reihenfolge mit RED-/GREEN-/REFACTOR-Schritten kommt im
nachgelagerten `writing-plans`-Output.

## Verifikation am Ende

- 4 + n neue/erweiterte Test-Files, alle gruen lokal.
- `npx tsc --noEmit` gruen.
- `npx eslint <touched files>` gruen.
- Manueller Smoke gegen localhost:3001:
  - Kompletter Register-Flow durchlaufen mit AI-Test-Praefix-Mail.
  - Auswahl jeder der 4 wahlbaren Cards einmal getestet.
  - DB-Verifikation: `users.settings.ai_assistance_level` korrekt
    geschrieben.
  - Persoenlich-Card visuell disabled, Klick aendert nichts.
  - Pulse-Animation in Edge sichtbar; mit Browser-Setting reduced-motion
    statisch.
- Test-User danach manuell als `must_delete_before_pilot=true` markieren
  (oder den Cleanup-Flag aus dem Pilot-Role-Mapping erben lassen).

## Memory / Topics

- `topics/pilot-onboarding.md` Naechster-Block-Hinweis aktualisieren
  (Punkt 2 abgehakt, Punkt 3 Mobile-Screenshots als Folge).
- Auto-Memory: `feedback_vercel_env_trailing_newline.md` Querverweis
  (PILOT_AUTO_VERIFY-Falle bleibt latent, beruehrt diesen Polish nicht).
- KI-Begleiter-Vision (Codex-Spec, Lia-/„KI-Hilfe"-Maskottchen, Pre-
  Scripted Tour, spaetere Live-Q&A) wird als eigener Workstream
  `topics/ki-begleiter-stufen.md` angelegt — eigenes Brainstorming, nicht
  in diesem Block. Heute liefert der Polish nur den ersten Touchpoint
  (statische Begruessung + Pulse-Dot).
