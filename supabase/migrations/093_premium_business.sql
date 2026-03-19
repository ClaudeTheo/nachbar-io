-- Migration 093: Premium-Dienstleister-Profile
-- Erweiterte Felder fuer hervorgehobene Profile (Feature-Flag gesteuert)

ALTER TABLE community_tips ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE community_tips ADD COLUMN IF NOT EXISTS opening_hours TEXT;
ALTER TABLE community_tips ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE community_tips ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false;

-- Feature-Flag einfuegen
INSERT INTO feature_flags (key, enabled, required_roles, required_plans, description)
VALUES ('PREMIUM_BUSINESS', false, '{}', '{}', 'Premium-Dienstleister-Profile (hervorgehoben, mehr Bilder)')
ON CONFLICT (key) DO NOTHING;

-- Index fuer Premium-Sortierung
CREATE INDEX IF NOT EXISTS idx_community_tips_premium ON community_tips(is_premium DESC, created_at DESC);
