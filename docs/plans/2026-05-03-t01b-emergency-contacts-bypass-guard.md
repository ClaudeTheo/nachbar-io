# T-01b Emergency-Contacts Bypass-/Servicepfad-Guard

Stand: 2026-05-03 abend

## Ziel

`care_profiles.emergency_contacts.phone` darf nicht ueber clientseitige oder
sonstige Bypass-Pfade direkt aus `care_profiles` gelesen oder geschrieben
werden. Der regulaere Pfad bleibt:

- Lesen: `/api/care/profile` -> `getCareProfile` -> Entschluesselung
- Schreiben: `/api/care/profile` -> `updateCareProfile` -> Verschluesselung
- Consent-Revoke: `consent-routes.service.ts` darf `emergency_contacts` auf
  `null` setzen

Keine Prod-Aktion, kein Deploy, keine Migration, keine Provider-/Env-Aenderung.

## Pre-Check

Gelaufen:

```powershell
rg -n "emergency_contacts|care_profiles|encryptEmergencyContacts|decryptEmergencyContacts|getCareProfile|updateCareProfile" app modules lib __tests__ supabase docs -g '!node_modules'
rg -n "from\(['\"]care_profiles['\"]\)|\.from\(\"care_profiles\"\)|\.from\('care_profiles'\)" app modules lib __tests__ -g '!node_modules'
rg -n "emergencyContacts|emergency contacts|Notfallkontakt|Notfallkontakte|EmergencyContact" app modules lib __tests__ -g '!node_modules'
```

Befund:

- Infrastruktur existiert bereits:
  `modules/care/services/profile.service.ts` nutzt
  `encryptEmergencyContacts` und `decryptEmergencyContacts`.
- App-/Senior-Seiten nutzen bereits `getCareProfile`.
- Bypass gefunden:
  `modules/care/hooks/useCareProfile.ts` las clientseitig direkt
  `.from('care_profiles').select('*')`.

## TDD

RED:

```powershell
npx vitest run __tests__/guards/care-profile-service-path.test.ts __tests__/hooks/useCareProfile.test.ts
```

Erwartete Failures:

- Guard meldete `modules/care/hooks/useCareProfile.ts` als direkten
  `care_profiles`-Zugriff.
- Hook-Test lief noch in den alten Supabase-Browserclient-Pfad.

GREEN:

- Neuer Guard:
  `__tests__/guards/care-profile-service-path.test.ts`
- `useCareProfile` laedt jetzt ueber
  `/api/care/profile?senior_id=<userId>`.
- Der Route-Handler nutzt weiterhin `getCareProfile`; damit werden
  Telefonnummern serverseitig entschluesselt und nicht roh aus der DB in den
  Client-Hook gelesen.

## Verifikation

Gezielt gruen:

```powershell
npx vitest run __tests__/guards/care-profile-service-path.test.ts __tests__/hooks/useCareProfile.test.ts
```

Weitere Verifikation lokal:

- `npx vitest run __tests__/guards/care-profile-service-path.test.ts __tests__/hooks/useCareProfile.test.ts app/api/care/profile/route.test.ts modules/care/services/field-encryption.test.ts lib/care/field-encryption.test.ts`
  -> 5 Dateien / 71 Tests passed.
- `npx eslint __tests__/guards/care-profile-service-path.test.ts __tests__/hooks/useCareProfile.test.ts modules/care/hooks/useCareProfile.ts --no-warn-ignored`
  -> gruen.
- `git diff --check`
  -> keine Whitespace-Fehler; nur bekannte CRLF-Warnungen.
- `npx tsc --noEmit`
  -> gruen nach `seniorId`-Konstante im Hook.
- `npm run build:local`
  -> gruen; bekannte lokale Noise:
  `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`.
- `npx vitest run --changed`
  -> 2 Dateien / 9 Tests passed.
- `npm run lint`
  -> gruen.
