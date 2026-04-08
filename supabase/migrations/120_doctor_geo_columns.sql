-- Migration 120: Geo-Koordinaten fuer Aerzte-Umkreissuche
-- Angewendet via Supabase MCP am 2026-04-08

ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_doctor_profiles_geo
  ON public.doctor_profiles (visible)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Migration 121: Status 'available' fuer freie Terminslots
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check
  CHECK (status = ANY (ARRAY['available', 'booked', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']));
