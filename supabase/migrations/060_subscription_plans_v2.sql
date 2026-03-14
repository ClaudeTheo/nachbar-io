-- Migration 060: Subscription-Plans umbenennen
-- free/basic/family/professional/premium → free/plus/pro
-- Gemaess Strategie-Dokument Phase 4

-- 1) Bestehende Plans migrieren
UPDATE care_subscriptions SET plan = 'free' WHERE plan IN ('free', 'basic');
UPDATE care_subscriptions SET plan = 'plus' WHERE plan IN ('family');
UPDATE care_subscriptions SET plan = 'pro' WHERE plan IN ('professional', 'premium');

-- 2) Constraint aktualisieren
ALTER TABLE care_subscriptions DROP CONSTRAINT IF EXISTS care_subscriptions_plan_check;
ALTER TABLE care_subscriptions ADD CONSTRAINT care_subscriptions_plan_check
  CHECK (plan IN ('free', 'plus', 'pro'));
