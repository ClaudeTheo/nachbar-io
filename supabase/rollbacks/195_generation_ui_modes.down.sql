-- Rollback G2 Generationen-Modi: youth/comfort vor Constraint-Rueckbau neutralisieren.
-- File-first: nicht auf Prod anwenden ohne ausdrueckliches Founder-Go.

UPDATE public.users
SET ui_mode = 'active'
WHERE ui_mode IN ('youth', 'comfort');

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_ui_mode_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_ui_mode_check
  CHECK (ui_mode IN ('active', 'senior'));
