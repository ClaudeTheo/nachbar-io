-- Migration 177: Zusaetzliche Phase-1-Schutzflags
-- File-first angelegt. NICHT auf Prod anwenden ohne Founder-Go.

insert into public.feature_flags (key, enabled, required_roles, description)
values
  (
    'BILLING_ENABLED',
    false,
    array[]::text[],
    'Stripe-Checkout / Billing live'
  ),
  (
    'TWILIO_ENABLED',
    false,
    array[]::text[],
    'Twilio SMS / Phone (AVV noetig)'
  ),
  (
    'CHECKIN_MESSAGES_ENABLED',
    false,
    array[]::text[],
    'Care-Check-in-Schreib-Endpoints (HR + Care-AVV)'
  )
on conflict (key) do nothing;
