-- Migration 061: Onboarding-Schritte Tracking
-- Speichert welche Onboarding-Push-Nachrichten ein User bereits erhalten hat

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step TEXT NOT NULL CHECK (step IN ('welcome','profile','pinnwand','connect','help','feedback')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, step)
);

CREATE INDEX idx_onboarding_user ON onboarding_steps(user_id);

-- RLS: Nur Service Role (Cron) darf lesen/schreiben
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

-- Admin-only Policy
CREATE POLICY "admin_onboarding_steps" ON onboarding_steps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );
