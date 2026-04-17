-- Baseline fuer 5 Tabellen, die in Prod existieren, aber nie per Migration-File
-- angelegt wurden. Migration 078 (20260316143535) und 20260316174100 scheitern
-- sonst beim Supabase-Branch-Replay mit "relation does not exist".
--
-- Ur-Schema = Prod-Schema minus die Spalten/Indizes, die spaetere ALTER-Migrationen
-- hinzufuegen (078 fuegt user_agent, title, status, affected_services, authority_reference,
-- postmortem, resolution_summary, rows_deleted_last, created_at und mehrere Indizes
-- nachtraeglich hinzu — diese sind hier bewusst nicht enthalten).

-- admin_access_logs
CREATE TABLE IF NOT EXISTS admin_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  resource_type text NOT NULL,
  resource_id uuid,
  access_type text NOT NULL DEFAULT 'read',
  ip_address inet,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE admin_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_only ON admin_access_logs FOR ALL USING (auth.role() = 'service_role');

-- data_breach_incidents
CREATE TABLE IF NOT EXISTS data_breach_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  description text NOT NULL,
  affected_users integer DEFAULT 0,
  reported_to_authority boolean DEFAULT false,
  reported_at timestamptz,
  resolved_at timestamptz,
  admin_id uuid REFERENCES auth.users(id),
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE data_breach_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_only ON data_breach_incidents FOR ALL USING (auth.role() = 'service_role');

-- data_requests
CREATE TABLE IF NOT EXISTS data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_email text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('access','deletion','rectification','portability')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','rejected')),
  due_date timestamptz NOT NULL,
  completed_at timestamptz,
  admin_id uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_only ON data_requests FOR ALL USING (auth.role() = 'service_role');

-- retention_policies (UNIQUE auf table_name wird von Mig 078 INSERT ... ON CONFLICT gebraucht)
CREATE TABLE IF NOT EXISTS retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL UNIQUE,
  retention_days integer NOT NULL,
  legal_basis text NOT NULL,
  last_cleanup_at timestamptz,
  is_active boolean DEFAULT true
);
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_only ON retention_policies FOR ALL USING (auth.role() = 'service_role');

-- video_credits (unique index auf stripe_payment_id kommt in Mig 20260316174100 nach)
CREATE TABLE IF NOT EXISTS video_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_total integer NOT NULL CHECK (credits_total > 0),
  credits_used integer DEFAULT 0 CHECK (credits_used >= 0),
  stripe_payment_id text,
  purchased_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 year')
);
CREATE INDEX IF NOT EXISTS idx_video_credits_doctor ON video_credits(doctor_id);
ALTER TABLE video_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY video_credits_owner_select ON video_credits FOR SELECT USING (auth.uid() = doctor_id);
