-- Freiwillige Anerkennung fuer Hilfeanfragen, ohne Zahlungsabwicklung in der App.
ALTER TABLE help_requests
  ADD COLUMN IF NOT EXISTS recognition_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS suggested_recognition_cents integer,
  ADD COLUMN IF NOT EXISTS recognition_handling text NOT NULL DEFAULT 'outside_app_only';

ALTER TABLE help_requests
  DROP CONSTRAINT IF EXISTS help_requests_recognition_type_check,
  ADD CONSTRAINT help_requests_recognition_type_check
    CHECK (recognition_type IN ('free', 'thank_you', 'suggested_amount', 'by_agreement'));

ALTER TABLE help_requests
  DROP CONSTRAINT IF EXISTS help_requests_recognition_handling_check,
  ADD CONSTRAINT help_requests_recognition_handling_check
    CHECK (recognition_handling = 'outside_app_only');

ALTER TABLE help_requests
  DROP CONSTRAINT IF EXISTS help_requests_suggested_recognition_cents_check,
  ADD CONSTRAINT help_requests_suggested_recognition_cents_check
    CHECK (
      (
        recognition_type = 'suggested_amount'
        AND suggested_recognition_cents IS NOT NULL
        AND suggested_recognition_cents BETWEEN 100 AND 5000
      )
      OR
      (
        recognition_type <> 'suggested_amount'
        AND suggested_recognition_cents IS NULL
      )
    );

COMMENT ON COLUMN help_requests.recognition_type IS
  'Freiwillige Anerkennung fuer die Hilfeanfrage; keine App-Zahlung.';
COMMENT ON COLUMN help_requests.suggested_recognition_cents IS
  'Optionaler unverbindlicher Wunschbetrag in Cent, nur ausserhalb der App zu klaeren.';
COMMENT ON COLUMN help_requests.recognition_handling IS
  'Immer outside_app_only; die Quartier-App nimmt keine Zahlungen an und zahlt nichts aus.';
