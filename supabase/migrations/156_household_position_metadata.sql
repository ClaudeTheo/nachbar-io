-- Migration 156: Household-Positionsmetadaten fuer amtliche BW-Hauskoordinaten
-- Hinweis: Der erste BW-Happy-Path kann vor der Migration bereits nur mit lat/lng laufen.
-- Diese Spalten machen den LGL-Import danach nachvollziehbar und stabil.

ALTER TABLE households
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS position_source TEXT
    CHECK (position_source IN (
      'lgl_bw_house_coordinate',
      'lgl_bw_address_match',
      'geocoder_rooftop',
      'geocoder_interpolated',
      'geocoder_street',
      'geocoder_approximate',
      'manual_svg_legacy',
      'manual_pin_confirmation',
      'unknown'
    )),
  ADD COLUMN IF NOT EXISTS position_accuracy TEXT
    CHECK (position_accuracy IN (
      'building',
      'rooftop',
      'interpolated',
      'street',
      'approximate',
      'unknown'
    )),
  ADD COLUMN IF NOT EXISTS position_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS position_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS position_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS position_raw_payload JSONB;

CREATE INDEX IF NOT EXISTS idx_households_position_verified
  ON households(position_verified);
