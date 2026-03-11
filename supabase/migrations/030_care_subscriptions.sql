-- 030_care_subscriptions.sql
CREATE TABLE care_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan text DEFAULT 'free' CHECK (plan IN ('free','basic','family','professional','premium')),
  status text DEFAULT 'trial' CHECK (status IN ('active','trial','cancelled','expired')),
  trial_ends_at timestamptz,
  current_period_start date,
  current_period_end date,
  payment_provider text,
  external_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TRIGGER care_subscriptions_updated_at
  BEFORE UPDATE ON care_subscriptions
  FOR EACH ROW EXECUTE FUNCTION care_update_updated_at();

ALTER TABLE care_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_sub_select_own" ON care_subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "care_sub_select_admin" ON care_subscriptions
  FOR SELECT USING (is_admin());
CREATE POLICY "care_sub_insert_own" ON care_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "care_sub_update_own" ON care_subscriptions
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "care_sub_update_admin" ON care_subscriptions
  FOR UPDATE USING (is_admin());
