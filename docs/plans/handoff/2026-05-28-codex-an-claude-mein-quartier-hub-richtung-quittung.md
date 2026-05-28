# Codex-Quittung: Richtung "Mein Quartier"-Hub

**Datum:** 2026-05-28  
**Von:** Codex  
**An:** Claude / Thomas  
**Status:** Architektur-Empfehlung, kein Code gebaut, kein Push, kein Deploy, keine Prod-DB.

## 1. Empfehlung

**Option C:** `/quartier` soll wieder der kanonische "Mein Quartier"-Tab werden, aber als neuer schlanker Hub, nicht als wiederbelebter Legacy-Hub; `/quartier-info` bleibt eine einzelne Kachel fuer "Wetter & Warnungen".

## 2. Begruendung

Architektur: Die Bottom-Nav braucht einen stabilen Bereichs-Einstieg, waehrend `/quartier-info` fachlich ein Inhaltsmodul fuer Wetter, Warnungen, Muell, OePNV, Apotheken und Rathausdaten ist. Ein Hub unter `/quartier` trennt Navigation von Content und passt zur 4-Tab-Struktur aus `docs/plans/2026-05-26-app-struktur-rollenkonzept.md`.

Wartbarkeit: `QuartierHubLegacy` ist als Rollback-Pfad mit Supabase-Counts und alter Community-Sortierung gebaut. Fuer Welle 3 ist ein neuer statischer/konfigurierter Hub wartbarer: eine Kachel-Liste, klare Links, keine neuen Datenabfragen, keine Feature-Flag-Abhaengigkeit, weniger Loading-/Fehlerzustaende.

Senior-Mode: Ein eigener Hub kann mit grossen Touch-Zielen, ruhiger Reihenfolge und maximaler Scanbarkeit gebaut werden. `/quartier-info` oben mit zusaetzlicher Kachel-Navigation zu ueberladen waere fuer Senior Mode schlechter, weil Live-Info, Warnungen und Navigation auf einer Seite konkurrieren.

Konsistenz mit B-5: B-5 war fuer Phase 1 richtig, weil die damalige Kachel "HIER BEI MIR" nach Wetter/Muell/was gerade ist klang. Diese Bedeutung soll erhalten bleiben: `/hier-bei-mir`, Warnungs-CTAs und Voice-/Info-Kontexte koennen weiter direkt auf `/quartier-info` zeigen. Welle 3 ist eine spaetere Strukturentscheidung fuer den Bottom-Tab, nicht eine inhaltliche Widerlegung von B-5.

## 3. Bau-Skizze

Geaenderte oder neue Dateien:

- `app/(app)/quartier/page.tsx`: Feature-Flag-Redirect entfernen und den neuen Hub direkt rendern.
- `app/(app)/quartier/QuartierHub.tsx`: neu; reine Hub-Komponente mit statischer Kachel-Konfiguration.
- `app/(app)/quartier/QuartierHubLegacy.tsx`: nicht weiter als Basis ausbauen; entweder loeschen oder klar als ersetzter B-5-Rollback-Code entfernen, sobald Tests gruen sind.
- `components/nav/NavConfig.ts`: `seniorNav` und `orgAdminNav` von `/quartier-info` auf `/quartier` umstellen; `activeResidentNav` erbt das automatisch.
- `components/nav/__tests__/NavConfig.test.ts`: Erwartungen fuer Senior, Aktiv 55+ und Org-Admin auf `/quartier` anpassen.
- `app/(app)/dashboard/page.tsx`: Start-Kachel "Mein Quartier" ebenfalls auf `/quartier` zeigen lassen.
- `__tests__/app/dashboard-ui-mode.test.tsx`: Erwartung fuer die Start-Kachel auf `/quartier` anpassen.
- `tests/e2e/scenarios/auth-dashboard.spec.ts`: BottomNav-Test fuer Quartier erwartet `/quartier` und prueft eine Hub-Kachel statt `info-weather`.
- Optional: `app/menu-structure-preview/MenuStructurePreviewClient.tsx` aktualisieren, damit Preview und echte Route nicht wieder auseinanderlaufen.
- Optional: B-5-Kommentar in `app/(app)/hier-bei-mir/page.tsx` ergaenzen: `/quartier-info` bleibt kanonisch fuer "HIER BEI MIR"/Wetter-Muell, aber nicht mehr fuer den Bottom-Tab.

Kachel-Liste, empfohlene Reihenfolge:

1. **Wetter & Warnungen** -> `/quartier-info`
2. **Rathaus & Services** -> `/city-services`
3. **Veranstaltungen** -> `/events`
4. **Karte** -> `/map`
5. **Gruppen** -> `/gruppen`
6. **Schwarzes Brett** -> `/board`
7. **Nachrichten** -> `/news`
8. **Muellkalender** -> `/waste-calendar`
9. **Handwerker** -> `/handwerker`
10. **Experten** -> `/experts`
11. **Gefunden & Verloren** -> `/lost-found`
12. **Abstimmungen** -> `/polls`

Nicht in die erste Hub-Welle packen: `/arzt` und andere medizinische oder abrechnungsnahe Bereiche. Die gehoeren spaeter rollen-/produktlogisch entschieden, nicht als allgemeine Quartier-Kachel.

Umgang mit `legacy_quartier_hub`:

- Nicht invertieren und nicht fuer den neuen Hub wiederverwenden. Der Name bedeutet explizit Legacy-Rollback.
- In `app/(app)/quartier/page.tsx` nicht mehr abfragen.
- Keine Migration fuer das Flag schreiben. Falls irgendwo eine manuelle Prod-Zeile existiert, bleibt sie ohne Wirkung; Entfernen aus Prod waere eine rote Zone und ist nicht noetig.
- Rollback fuer diese lokale Aufbauphase ueber Git/PR, nicht ueber Runtime-Flag.

## 4. Tests / TDD

TDD-Start:

1. RED: Neuer Component-Test `__tests__/app/quartier-hub.test.tsx` oder `__tests__/app/quartier-page.test.tsx`, der Heading "Mein Quartier" und die 12 Ziel-Links prueft.
2. RED: `components/nav/__tests__/NavConfig.test.ts` auf `/quartier` fuer Senior, Aktiv 55+ und Org-Admin umstellen.
3. RED: `__tests__/app/dashboard-ui-mode.test.tsx` fuer die Dashboard-Kachel auf `/quartier`.
4. RED: Falls die Page direkt testbar ist, sicherstellen, dass `/quartier/page.tsx` weder `redirect("/quartier-info")` ausloest noch `legacy_quartier_hub` braucht.
5. GREEN: Hub bauen, Nav/Dashboard umstellen.

Betroffene bestehende Tests:

- `components/nav/__tests__/NavConfig.test.ts`
- `__tests__/app/dashboard-ui-mode.test.tsx`
- `tests/e2e/scenarios/auth-dashboard.spec.ts`

Voraussichtlich unveraendert:

- `__tests__/pages/quartier-info-vorlesen.test.tsx`
- `__tests__/pages/quartier-info-rathaus-external-link.test.tsx`
- `__tests__/api/quartier-info-route.test.ts`
- `tests/e2e/multi-agent/phase-d-features.spec.ts`, solange direkte `/quartier-info`-Tests weiterhin als Info-Modul-Tests gelten.

Empfohlene Verifikation nach Umsetzung:

```bash
npm run test -- __tests__/app/quartier-hub.test.tsx components/nav/__tests__/NavConfig.test.ts __tests__/app/dashboard-ui-mode.test.tsx
npm run lint -- "app/(app)/quartier/page.tsx" "app/(app)/quartier/QuartierHub.tsx" components/nav/NavConfig.ts __tests__/app/quartier-hub.test.tsx components/nav/__tests__/NavConfig.test.ts __tests__/app/dashboard-ui-mode.test.tsx
npx tsc --noEmit
```

E2E nur gezielt, wenn die Branch-Zeit es hergibt:

```bash
npm run test:e2e -- tests/e2e/scenarios/auth-dashboard.spec.ts
```

## 5. Migration, Mini-Audit, Risiko

Migration: **Nein.** Das ist eine Navigations-/UI-Aenderung ohne neue Tabellen, Policies, Secrets, Cronjobs oder Prod-Schreibzugriffe.

Mini-Audit: **Kein Security-/RLS-Mini-Audit noetig**, weil der Hub nur auf bereits existierende `(app)`-Routen verlinkt. Sinnvoll ist aber ein kleiner Routen-Audit vor dem Bau: jede geplante Kachel muss auf eine existierende, nicht kaputte Route zeigen; keine medizinische, Billing- oder Admin-Flaeche versehentlich in den allgemeinen Hub aufnehmen.

Risiko:

- UX-/IA-Risiko mittel: eine dokumentierte Phase-1-Entscheidung wird sichtbar ueberholt. Mit Kommentar und Handoff sauber als "B-5 bleibt fuer `/quartier-info`, Welle 3 gewinnt fuer Bottom-Tab" dokumentieren.
- Test-Churn niedrig bis mittel: Nav-, Dashboard- und ein E2E-Test erwarten heute `/quartier-info`.
- Daten-/DSGVO-/RLS-Risiko niedrig: keine neuen Datenabfragen, keine neuen API-Routen, keine Migration.
- Senior-Mode-Risiko niedrig, wenn die Kacheln mindestens 80 px Touch-Target, klare Labels und wenig Text bekommen.

## 6. Naechster sinnvoller Schritt

Claude kann Thomas die Richtung als **C: neuer `/quartier`-Hub** zur Baufreigabe vorlegen. Wenn Thomas "go" sagt, sollte Codex klein schneiden: zuerst Tests rot machen, dann nur Hub/Nav/Dashboard umstellen, danach gezielt verifizieren. Kein Push/Merge/Deploy ohne neues konkretes Go.
