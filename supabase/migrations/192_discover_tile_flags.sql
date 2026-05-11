-- 192_discover_tile_flags.sql
-- Nachbar.io — Feature-Flags pro DiscoverGrid-Tile
--
-- Hintergrund: Founder will im Admin-Dashboard jeden einzelnen DiscoverGrid-Tile
-- separat ein-/ausschalten koennen (statt nur das ganze Modul). Dazu legen wir
-- pro Tile einen Feature-Flag-Eintrag an, den der existierende
-- FeatureFlagManager (components/admin/FeatureFlagManager.tsx) automatisch in
-- seine Toggle-Liste aufnimmt. Lesepfad: DiscoverGrid + getFeatureFlags().
--
-- Konvention: DISCOVER_TILE_<UPPER_NAME_OHNE_SLASH>
-- Default enabled=true (alle Tiles bleiben sichtbar bis Founder einzelne abschaltet).
-- KEINE required_roles/plans/enabled_quarters Einschraenkungen — pure Sichtbarkeit.
--
-- File-first nach .claude/rules/db-migrations.md. Apply auf Prod nur mit
-- Founder-Go (Rote Zone, siehe feedback_vercel_deploy_ki_hand.md §5).

INSERT INTO feature_flags (key, enabled, description) VALUES
  -- Primary-Tiles (12 — immer sichtbar im DiscoverGrid)
  ('DISCOVER_TILE_BOARD', true, 'Discover-Tile: Brett (Nachrichtenbrett)'),
  ('DISCOVER_TILE_MARKETPLACE', true, 'Discover-Tile: Marktplatz'),
  ('DISCOVER_TILE_LEIHBOERSE', true, 'Discover-Tile: Leihboerse'),
  ('DISCOVER_TILE_MITESSEN', true, 'Discover-Tile: Mitessen'),
  ('DISCOVER_TILE_MAP', true, 'Discover-Tile: Karte'),
  ('DISCOVER_TILE_HILFE', true, 'Discover-Tile: Hilfe'),
  ('DISCOVER_TILE_GRUPPEN', true, 'Discover-Tile: Gruppen'),
  ('DISCOVER_TILE_PRAEVENTION', true, 'Discover-Tile: Praevention'),
  ('DISCOVER_TILE_WASTE_CALENDAR', true, 'Discover-Tile: Muellkalender'),
  ('DISCOVER_TILE_REPORTS', true, 'Discover-Tile: Maengelmeldungen'),
  ('DISCOVER_TILE_EVENTS', true, 'Discover-Tile: Veranstaltungen'),
  ('DISCOVER_TILE_EXPERTS', true, 'Discover-Tile: Experten'),

  -- Secondary-Tiles (13 — sichtbar nach "Mehr entdecken"-Klick)
  ('DISCOVER_TILE_MY_DAY', true, 'Discover-Tile: Mein Tag'),
  ('DISCOVER_TILE_PACKAGES', true, 'Discover-Tile: Pakete'),
  ('DISCOVER_TILE_PFLEGEGRAD_NAVIGATOR', true, 'Discover-Tile: Pflegegrad-Navigator'),
  ('DISCOVER_TILE_WHOHAS', true, 'Discover-Tile: Wer hat?'),
  ('DISCOVER_TILE_MESSAGES', true, 'Discover-Tile: Chat'),
  ('DISCOVER_TILE_NOISE', true, 'Discover-Tile: Laerm-Meldung'),
  ('DISCOVER_TILE_HANDWERKER', true, 'Discover-Tile: Handwerker'),
  ('DISCOVER_TILE_LOST_FOUND', true, 'Discover-Tile: Fundbuero'),
  ('DISCOVER_TILE_TIPS', true, 'Discover-Tile: Tipps'),
  ('DISCOVER_TILE_CITY_SERVICES', true, 'Discover-Tile: Rathaus'),
  ('DISCOVER_TILE_CARE_SHOPPING', true, 'Discover-Tile: Einkaufshilfe'),
  ('DISCOVER_TILE_CARE_TASKS', true, 'Discover-Tile: Aufgabentafel'),
  ('DISCOVER_TILE_SPRECHSTUNDE', true, 'Discover-Tile: Sprechstunde')
ON CONFLICT (key) DO NOTHING;
