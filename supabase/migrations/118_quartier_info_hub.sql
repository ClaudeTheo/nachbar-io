-- Migration 118: Quartier-Info-Hub
-- Tabellen fuer gecachte Quartier-Informationen und NINA-Warnungen

-- 1. quartier_info_cache: Gecachte Daten (Wetter, Pollen, NINA)
CREATE TABLE IF NOT EXISTS quartier_info_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('weather', 'pollen', 'nina')),
  data JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (quarter_id, source)
);

CREATE INDEX idx_quartier_info_cache_quarter_source ON quartier_info_cache(quarter_id, source);
CREATE INDEX idx_quartier_info_cache_expires ON quartier_info_cache(expires_at);

-- 2. nina_warnings: NINA-Warnungen (Bundesamt fuer Bevoelkerungsschutz)
CREATE TABLE IF NOT EXISTS nina_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_id TEXT NOT NULL UNIQUE,
  ags TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Extreme', 'Severe', 'Moderate', 'Minor')),
  headline TEXT NOT NULL,
  description TEXT,
  sent_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  push_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nina_warnings_ags ON nina_warnings(ags);
CREATE INDEX idx_nina_warnings_expires ON nina_warnings(expires_at);

-- 3. RLS aktivieren
ALTER TABLE quartier_info_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE nina_warnings ENABLE ROW LEVEL SECURITY;

-- quartier_info_cache: Authentifizierte User duerfen lesen
CREATE POLICY "quartier_info_cache_select" ON quartier_info_cache
  FOR SELECT TO authenticated
  USING (true);

-- nina_warnings: Authentifizierte User duerfen lesen
CREATE POLICY "nina_warnings_select" ON nina_warnings
  FOR SELECT TO authenticated
  USING (true);
