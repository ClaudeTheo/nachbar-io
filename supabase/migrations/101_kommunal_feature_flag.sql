-- Migration 101: Feature-Flag fuer Kommunal-Modul
-- Steuert Sichtbarkeit aller Kommunal-Seiten (Soft-Launch)

INSERT INTO feature_flags ("key", enabled, required_roles, required_plans, enabled_quarters, admin_override, description)
VALUES (
  'KOMMUNAL_MODULE',
  true,  -- aktiv fuer Pilot
  '{}',  -- keine Rollen-Einschraenkung (alle Bewohner)
  '{}',  -- keine Plan-Einschraenkung (auch Free)
  '{}',  -- alle Quartiere (leer = keine Einschraenkung)
  true,  -- Admin kann immer sehen
  'Kommunal-Modul: Maengelmelder, Muellkalender, Rathaus-Services'
)
ON CONFLICT ("key") DO NOTHING;
