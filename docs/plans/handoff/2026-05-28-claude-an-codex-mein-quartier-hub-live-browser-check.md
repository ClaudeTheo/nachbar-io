# Auftrag an Codex: Live-Browser-Check „Mein Quartier"-Hub

**Datum:** 2026-05-28
**Autor:** Claude (Opus)
**Owner ab jetzt:** Codex (Browser-/Terminal-nah). Claude fasst den `nachbar-io`-Working-Tree NICHT an, bis du fertig bist (geteilter Tree).
**Status:** Code fertig + lokal committed, Tests gruen. Fehlt: Live-Browser-Verifikation im echten Dev-Server.

---

## Was du tun sollst

Den neuen „Mein Quartier"-Hub unter `/quartier` **im echten Browser** verifizieren (nicht nur Unit-Test). Die Route ist Auth-gated (`app/(app)/`) und braucht den lokalen Supabase-Stack + eingeloggten User — deshalb konnte Claude es nicht testen.

## Kontext (durable)

- Theobase GmbH eingetragen (HRB 735685), aber **kein Go-Live, keine echten Nutzer**.
- Branch: **`claude/mein-quartier-hub`**, HEAD = **`b091323`** (`feat(app): mein-quartier hub at /quartier`). Working Tree ist clean.
- Welle: App-Struktur Welle 3, **Option C** (deine eigene Empfehlung): `/quartier` ist wieder der kanonische Bottom-Tab, aber als **schlanker statischer Hub** (`app/(app)/quartier/QuartierHub.tsx`). `/quartier-info` ist nur EINE Kachel. B-5 gilt weiter fuer `/hier-bei-mir`/Voice.

## Vorbereitung

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status --short --branch          # erwartet: auf claude/mein-quartier-hub, clean
git log --oneline -1                 # erwartet: b091323
npm run supabase:start               # lokaler Docker-Stack (Voraussetzung)
npm run dev                          # Port 3000, laeuft per Default gegen 127.0.0.1:54321
```

Login: bitte deinen bekannten lokalen Auth-Pfad nutzen (E2E-Auth-Profile / storageState bzw. lokalen Test-User registrieren). Auf KEINEN Fall Prod-Bypass-Secrets in Prod setzen — der lokale Stack reicht. Ziel ist eine eingeloggte Senior-/Erwachsenen-Ansicht.

## Konkret zu pruefen

1. **Hub rendert** unter `http://localhost:3000/quartier`:
   - Ueberschrift „Mein Quartier" sichtbar.
   - 12 Kacheln in dieser Reihenfolge, jede klickbar und auf die richtige Route:
     1. Wetter & Warnungen → `/quartier-info`
     2. Rathaus & Services → `/city-services`
     3. Veranstaltungen → `/events`
     4. Karte → `/map`
     5. Gruppen → `/gruppen`
     6. Schwarzes Brett → `/board`
     7. Nachrichten → `/news`
     8. Muellkalender → `/waste-calendar`
     9. Handwerker → `/handwerker`
     10. Experten → `/experts`
     11. Gefunden & Verloren → `/lost-found`
     12. Abstimmungen → `/polls`
   - Zurueck-Button → `/dashboard`.
2. **BottomNav:** Tab „Mein Quartier" (Aktiv 55+: „Quartier") landet auf `/quartier` — NICHT mehr auf `/quartier-info`. Kein Redirect-Flash.
3. **Dashboard:** Start-Kachel „Mein Quartier" (Rathaus, Karte, Veranstaltungen) fuehrt auf `/quartier`.
4. **Konsole/Netzwerk:** keine roten Errors beim Laden des Hubs; keine 404/500 auf den verlinkten Routen (Stichprobe 2-3 Kacheln reicht, v.a. `/quartier-info`, `/city-services`, `/gruppen`).
5. **Senior-Tauglichkeit:** Kacheln >= 80px Touch-Target, Labels lesbar, Kontrast ok. Bei Comfort-/Senior-Modus zusaetzlich gegenchecken, dass nichts abgeschnitten ist.

## Liefern

- Quittung als Markdown unter `nachbar-io/docs/plans/handoff/2026-05-28-codex-an-claude-mein-quartier-hub-live-check-quittung.md`:
  - Befund je Punkt 1-5 (ok / nicht ok + Detail).
  - Screenshot-Pfad(e) (mind. 1 vom Hub).
  - Konsole-/Netzwerk-Auffaelligkeiten.
  - Empfehlung: PR-reif ja/nein.
- Falls du einen UI-Fix machst: kleiner Commit auf `claude/mein-quartier-hub`, Tests gruen halten (`npx vitest run __tests__/app/quartier-hub.test.tsx components/nav/__tests__/NavConfig.test.ts __tests__/app/dashboard-ui-mode.test.tsx`).

## Bekannt / nicht dein Thema

- Vorbestehender roter Test `__tests__/pages/quartier-info-vorlesen.test.tsx` („Fallback wenn kein Quartier zugeordnet") ist schon auf master rot (households-Fetch ohne Quartier) — separat geflaggt, **nicht** Teil dieser Welle.

## Rote Zonen (unveraendert)

- Kein `git push origin master`, kein Merge nach master, kein Deploy.
- Keine Prod-DB / Prod-Migration / Secrets / Billing.
- Lokaler Supabase-Stack ist ok (kein Prod).
- PR-Erstellung + Merge erst mit Founder-Go.

## Referenzen

- Hub: `app/(app)/quartier/QuartierHub.tsx`, `app/(app)/quartier/page.tsx`
- Nav: `components/nav/NavConfig.ts`
- Dashboard-Kachel: `app/(app)/dashboard/page.tsx`
- Deine Richtungs-Quittung: `docs/plans/handoff/2026-05-28-codex-an-claude-mein-quartier-hub-richtung-quittung.md`
- App-Struktur: `docs/plans/2026-05-26-app-struktur-rollenkonzept.md`
