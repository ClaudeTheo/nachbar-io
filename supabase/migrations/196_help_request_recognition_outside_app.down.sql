ALTER TABLE help_requests
  DROP CONSTRAINT IF EXISTS help_requests_suggested_recognition_cents_check,
  DROP CONSTRAINT IF EXISTS help_requests_recognition_handling_check,
  DROP CONSTRAINT IF EXISTS help_requests_recognition_type_check;

ALTER TABLE help_requests
  DROP COLUMN IF EXISTS recognition_handling,
  DROP COLUMN IF EXISTS suggested_recognition_cents,
  DROP COLUMN IF EXISTS recognition_type;
