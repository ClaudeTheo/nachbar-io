# Phase E Handoff — Manuelle Verifikation

Stand: 2026-04-17

## Was ist erledigt

### Phase A — Migrationen
- Migration 157 (Feature-Flags + bbk_ars/bw_ars) angewendet + verifiziert
- Migration 158 (external_warning_cache + sync_log) war bereits angewendet + verifiziert
- Alle 3 Verifikations-SELECTs pro Migration bestanden

### Phase C — Task 12: DWD-Hitze x Heartbeat-Eskalation
- `lib/care/heat-warning-check.ts`: checkActiveHeatWarning, getHeatAwareEscalationStage, buildHeatAlertBody
- `modules/care/services/heartbeat-escalation.service.ts`: integriert, bei DWD-Hitze (severe/extreme) wird reminder_24h direkt zu alert_48h hochgestuft
- 8 Tests gruen in `lib/care/__tests__/heartbeat-heat-escalation.test.ts`
- 6 bestehende Eskalationstests weiterhin gruen

### Phase D — Task 15: Code-Review
- Alle 6 Kriterien PASS (RLS, checkFeatureAccess, Attribution, API-Format, Cron-Admin, Graceful Degradation)
- Review-Protokoll: `docs/reviews/2026-04-17-welle-1-review.md`

### Phase D — Task 16: /datenquellen + Attribution
- Neue Public-Seite `/datenquellen` mit NINA/BBK, DWD, UBA, Haftungsausschluss
- Datenschutz: neuer Abschnitt 17 "Amtliche Warnungen und Umweltdaten"
- LandingFooter + Datenschutz-Footer: Datenquellen-Link ergaenzt
- LGL-BW-Anzeige How-To: `docs/admin/lgl-bw-anzeige-howto.md`

### Bonus: Hauskoordinaten-Korrektur
- Script `scripts/resolve-all-positions.ts` hat alle Bad Saeckinger Haushalte gegen LGL-BW WFS aufgeloest
- 32 exakte Treffer + 4 Kandidaten korrigiert (von manual_svg_legacy auf lgl_bw_house_coordinate)
- 14 fiktive/Nicht-BW-Adressen uebersprungen

### Flag-Aktivierung
- NINA_WARNINGS_ENABLED = true (Bad Saeckingen)
- DWD_WEATHER_WARNINGS_ENABLED = true (Bad Saeckingen)
- UBA_AIR_QUALITY_ENABLED = true (Bad Saeckingen)
- LGL_BW_BUILDING_OUTLINES_ENABLED = false (wartet auf LGL-Anzeige-Formular)

## Git-Stand

```
git log --oneline -5:
22f41e7 chore(scripts): add LGL-BW household position resolver
41e8a43 feat(legal): add /datenquellen page and privacy section for external APIs
ca58fad review(welle-1): integration review — all 6 criteria pass
c620b30 feat(care): DWD heat warning accelerates heartbeat escalation
2706076 docs(plans): add research handoff and BW coordinates plan
```

Branch: master, 23 Commits ahead von origin/master (inzwischen gepusht).

## Was die naechste Session pruefen soll (Task 17)

1. Vercel-Deploy pruefen: https://nachbar-io.vercel.app
2. `/datenquellen` visuell pruefen (Layout, Links, Haftungsausschluss)
3. Datenschutz Abschnitt 17 sichtbar?
4. Admin-UI: 10 Flags unter "Externe APIs" gruppiert?
5. Cron `/api/cron/external-warnings`: Hat er 200 OK in Vercel Logs?
6. `/api/warnings/nina` als Bad-Saeckingen-Mitglied aufrufen
7. ExternalWarningBanner auf Dashboard sichtbar (wenn Warnungen vorhanden)?
8. Karten-Pins: liegen die korrigierten Positionen auf den Gebaeuden?

### Optional: DWD-Hitze-Simulation
```sql
INSERT INTO external_warning_cache (
  provider, external_id, headline, severity, event_code,
  quarter_id, status, raw_payload, attribution_text,
  onset_at, expires_at
) VALUES (
  'dwd', 'sim-hitze-001', 'Amtliche Warnung vor Hitze', 'severe', 'HITZE',
  'ee6cfcab-f615-47cd-afe7-808a27cb584b', 'active', '{}'::jsonb,
  'Quelle: Deutscher Wetterdienst',
  now(), now() + interval '24 hours'
);
-- Dann: Heartbeat-Cron abwarten (alle 30 Min)
-- Erwartet: Senior mit 24h+ Inaktivitaet bekommt alert_48h statt reminder_24h
-- Aufraeumen: DELETE FROM external_warning_cache WHERE external_id = 'sim-hitze-001';
```

## Nicht-verhandelbare Grenzen (unveraendert)
- Kein git push ohne Founder-Go (bereits gepusht mit Go)
- modules/info-hub/ und app/api/cron/nina-sync/route.ts eingefroren
- Cron immer getAdminSupabase()
- device-fingerprint.test.ts:267 ignorieren (Altlast)
