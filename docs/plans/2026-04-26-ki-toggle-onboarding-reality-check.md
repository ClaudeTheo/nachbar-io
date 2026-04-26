# KI-Toggle und Onboarding-Consent - Reality-Check

Stand: 2026-04-26
Projekt: Nachbar.io Closed Pilot
Scope: lokaler Code-Check, kein Push, kein Deploy, kein Prod-DB-Zugriff

## Ergebnis

Der geplante "Onboarding-Consent-Step" muss nicht neu gebaut werden. Die zentrale Infrastruktur existiert bereits und sollte weiterverwendet werden.

| Planpunkt | Existiert im Code | Bewertung |
|---|---|---|
| KI-Consent im Registrierungsfluss | `app/(auth)/register/components/RegisterStepAiConsent.tsx` | Vorhanden. Bietet Ja, Nein und Spaeter entscheiden. |
| Backend-Insert fuer KI-Consent | `lib/services/registration.service.ts` | Vorhanden. `aiConsentChoice` wird in `users.settings.ai_enabled` und `care_consents.feature = "ai_onboarding"` gespeichert. |
| Nachtraegliches KI-Toggle | `modules/ai/components/AiHelpSettingsToggle.tsx` und `app/api/settings/ai/route.ts` | Vorhanden. Toggle schreibt User-Setting und Consent. |
| AI-Provider-Off | `lib/ai/provider.ts` | Vorhanden. Default ist `off`, kein stiller Fallback auf echte Anbieter. |
| Consent-Guard vor Provider-Call | `app/api/ai/onboarding/turn/route.ts` | Vorhanden fuer `ai_onboarding`. |
| Toggle-Guard vor Provider-Call | `app/api/ai/onboarding/turn/route.ts` | Luecke gefunden und lokal geschlossen. |

## Geschlossene Luecke

Vor dem Fix pruefte die Route `/api/ai/onboarding/turn` zwar `ai_onboarding`, aber nicht zusaetzlich `users.settings.ai_enabled`.

Risiko:

- Ein Nutzer konnte die KI-Hilfe nach erteilter Einwilligung ausschalten.
- Die Route haette trotzdem Memory-Kontext laden und den Provider anfragen koennen, solange der alte Consent noch `granted` war.

Lokaler Fix:

- Die Route prueft jetzt zuerst `getAiHelpState(supabase, user.id)`.
- Wenn `enabled !== true`, antwortet sie mit `503 ai_disabled`.
- In diesem Fall werden weder `loadMemoryContext` noch `getProvider` aufgerufen.

## Verifikation

Gezielte Pruefung:

- `npm test -- app/api/ai/onboarding/turn/__tests__/route.test.ts`
- `npx eslint "app/api/ai/onboarding/turn/route.ts" "app/api/ai/onboarding/turn/__tests__/route.test.ts"`
- `npx tsc --noEmit`

## Offene Folgeaufgabe

Die UI-Meldung fuer `ai_disabled` ist funktional, aber noch allgemein formuliert. Fuer den Pilot waere spaeter sinnvoll, zwischen "vom Nutzer ausgeschaltet" und "Provider/AVV noch nicht freigegeben" genauer zu unterscheiden.
