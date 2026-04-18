-- 164_auth_null_token_backfill.sql
-- Fix: GoTrue scannt auth.users mit Go-Typ `string`, kein `sql.NullString`.
-- Rows mit NULL in den confirmation-/recovery-/change-Tokens crashen
-- /otp und /admin/generate_link mit "converting NULL to string is unsupported".
-- Entsteht, wenn User direkt via SQL/Admin ohne GoTrue-Defaults angelegt werden.
-- Fix: NULL -> '' (leerer String, semantisch identisch fuer GoTrue-Scans).

UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR reauthentication_token IS NULL
   OR email_change IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL;
