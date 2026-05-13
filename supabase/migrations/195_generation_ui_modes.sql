-- G2 Generationen-Modi: users.ui_mode fuer youth/comfort vorbereiten.
-- File-first: nicht auf Prod anwenden ohne ausdrueckliches Founder-Go.

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_ui_mode_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_ui_mode_check
  CHECK (ui_mode IN ('youth', 'active', 'comfort', 'senior'));
