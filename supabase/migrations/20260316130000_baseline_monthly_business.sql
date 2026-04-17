CREATE TABLE IF NOT EXISTS monthly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  total_income_cents integer DEFAULT 0,
  total_expense_cents integer DEFAULT 0,
  total_tax_collected_cents integer DEFAULT 0,
  total_tax_paid_cents integer DEFAULT 0,
  net_profit_cents integer DEFAULT 0,
  subscription_count integer DEFAULT 0,
  video_credit_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (year, month)
);
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_summaries ON monthly_summaries FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS business_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('income','expense')),
  category text NOT NULL,
  description text NOT NULL,
  amount_cents integer NOT NULL,
  tax_rate numeric(5,2) DEFAULT 19.00,
  tax_amount_cents integer,
  net_amount_cents integer,
  currency text DEFAULT 'EUR',
  invoice_number text,
  counterparty text,
  reference text,
  receipt_url text,
  booked_at timestamptz NOT NULL DEFAULT now(),
  period_start date,
  period_end date,
  business_form text DEFAULT 'einzelunternehmen' CHECK (business_form IN ('einzelunternehmen','gmbh')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE business_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read_transactions ON business_transactions FOR SELECT USING (true);
CREATE POLICY admin_insert_transactions ON business_transactions FOR INSERT WITH CHECK (true);
