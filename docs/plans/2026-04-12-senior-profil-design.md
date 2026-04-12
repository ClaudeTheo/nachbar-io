# J-3: Senior-Profilseite — Design

**Datum:** 2026-04-12

## Zweck

Read-only Profilseite für Senioren unter `/profil`. Zeigt eigene Daten auf einen Blick. Kein Edit (Phase 2).

## Datenquellen

- `users` Tabelle: `display_name`, `avatar_url`
- `getCareProfile(supabase, userId, userId)`: `emergency_contacts` (Name, Beziehung, Telefon)
- Client-side: `isSubscribed()` aus `lib/push.ts` für Push-Status

## Sektionen

1. **Name + Avatar** — Großer Name, optionaler Avatar-Kreis
2. **Notfallkontakte** — Liste: Name, Beziehung, tel:-Link. Leer: "Keine Kontakte hinterlegt — bitten Sie Ihre Angehörigen."
3. **Benachrichtigungen** — Push an/aus + Toggle-Button (`subscribeToPush`/`unsubscribeFromPush`)
4. **App-Info** — "QuartierApp Bad Säckingen"

## Navigation

- Link unten auf `/kreis-start` (Zahnrad oder "Mein Profil")
- Zurück-Link oben → `/kreis-start`

## UI-Pattern

- kreis-start Pattern: min-height 80px, anthrazit Borders, 20px+ Font
- Server Component für Datenladung, Client-Wrapper für Push-Toggle
- Keine Emojis

## Dateien

- `app/(senior)/profil/page.tsx` — Server Component, lädt user + CareProfile
- `components/senior/ProfilView.tsx` — Client Component, rendert Sektionen + Push-Toggle
- `components/senior/PushToggle.tsx` — Client Component für Push an/aus
- Link auf `app/(senior)/kreis-start/page.tsx` ergänzen
