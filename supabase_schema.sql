-- ============================================================================
-- 🚀 QuoteCraft Pro - Updated Supabase PostgreSQL Schema (Full & Migrations)
-- Run this script in your Supabase SQL Editor:
-- (Supabase Dashboard -> SQL Editor -> New query -> Paste & Click Run)
-- ============================================================================

-- 1. QUOTES TABLE
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  quote_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  client_address TEXT,
  kw_capacity NUMERIC NOT NULL,
  partner_brand TEXT NOT NULL,
  structure_type TEXT,
  total_cost NUMERIC NOT NULL,
  subsidy NUMERIC NOT NULL,
  net_cost NUMERIC NOT NULL,
  sales_rep TEXT,
  sales_username TEXT DEFAULT 'SALES',
  installer_brand TEXT DEFAULT 'kehansri',
  customer_type TEXT DEFAULT 'residential',
  system_type TEXT DEFAULT 'on-grid',
  status TEXT DEFAULT 'Generated',
  quote_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Safe migrations for existing quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sales_username TEXT DEFAULT 'SALES';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS installer_brand TEXT DEFAULT 'kehansri';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'residential';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS system_type TEXT DEFAULT 'on-grid';

-- 2. COMPANY CONFIG TABLE (Bank 1 & Bank 2 Support)
CREATE TABLE IF NOT EXISTS company_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  
  -- Bank 1 (Primary Account)
  bank_label TEXT DEFAULT 'KehanSri Solar (Primary)',
  bank_name TEXT NOT NULL DEFAULT 'ICICI BANK',
  account_name TEXT NOT NULL DEFAULT 'KehanSri Solar',
  account_number TEXT NOT NULL DEFAULT '38205006367',
  ifsc_code TEXT NOT NULL DEFAULT 'ICIC0000382',
  branch_address TEXT NOT NULL DEFAULT 'Banjara Hills, Road No 12, Hyderabad: 500034',

  -- Bank 2 (2nd Company Account)
  bank2_label TEXT DEFAULT 'K Energy Solutions (2nd Company)',
  bank2_name TEXT DEFAULT 'HDFC BANK LTD',
  bank2_account_name TEXT DEFAULT 'K Energy Solutions',
  bank2_account_number TEXT DEFAULT '50200088991122',
  bank2_ifsc_code TEXT DEFAULT 'HDFC0000456',
  bank2_branch_address TEXT DEFAULT 'Gachibowli Main Branch, Hyderabad: 500032',

  -- Company Details
  company_name TEXT NOT NULL DEFAULT 'KehanSri Solar',
  company_email TEXT DEFAULT 'sales@kehansrisolar.com',
  company_phone TEXT DEFAULT '+91 9493858086',
  company_address TEXT DEFAULT 'Plot 42, Silicon Valley, Hyderabad, Telangana: 500081',
  sales_username TEXT DEFAULT 'SALES',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Safe migrations for existing company_config table
ALTER TABLE company_config ADD COLUMN IF NOT EXISTS bank_label TEXT DEFAULT 'KehanSri Solar (Primary)';
ALTER TABLE company_config ADD COLUMN IF NOT EXISTS bank2_label TEXT DEFAULT 'K Energy Solutions (2nd Company)';
ALTER TABLE company_config ADD COLUMN IF NOT EXISTS bank2_name TEXT DEFAULT 'HDFC BANK LTD';
ALTER TABLE company_config ADD COLUMN IF NOT EXISTS bank2_account_name TEXT DEFAULT 'K Energy Solutions';
ALTER TABLE company_config ADD COLUMN IF NOT EXISTS bank2_account_number TEXT DEFAULT '50200088991122';
ALTER TABLE company_config ADD COLUMN IF NOT EXISTS bank2_ifsc_code TEXT DEFAULT 'HDFC0000456';
ALTER TABLE company_config ADD COLUMN IF NOT EXISTS bank2_branch_address TEXT DEFAULT 'Gachibowli Main Branch, Hyderabad: 500032';

-- 3. USERS TABLE (Sales Staff & Admin Accounts)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'sales',
  phone TEXT,
  email TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 4. SEED INITIAL CONFIG & DEFAULT USERS (If Empty)
INSERT INTO company_config (
  id, bank_label, bank_name, account_name, account_number, ifsc_code, branch_address,
  bank2_label, bank2_name, bank2_account_name, bank2_account_number, bank2_ifsc_code, bank2_branch_address,
  company_name, company_email, company_phone, company_address
) VALUES (
  1, 'KehanSri Solar (Primary)', 'ICICI BANK', 'KehanSri Solar', '38205006367', 'ICIC0000382', 'Banjara Hills, Road No 12, Hyderabad: 500034',
  'K Energy Solutions (2nd Company)', 'HDFC BANK LTD', 'K Energy Solutions', '50200088991122', 'HDFC0000456', 'Gachibowli Main Branch, Hyderabad: 500032',
  'KehanSri Solar', 'sales@kehansrisolar.com', '+91 9493858086', 'Plot 42, Silicon Valley, Hyderabad, Telangana: 500081'
) ON CONFLICT (id) DO NOTHING;

-- Seed Default Admin & Sales users (kehansri888 & sales888)
INSERT INTO users (id, username, display_name, password_hash, role, phone, email, is_active)
VALUES 
  ('usr_admin_master', 'ADMIN', 'Administrator', '998495085d3419bb9fe39103c80a256dfd8c7c77c617b3c2bb0df10bc82226fb', 'admin', '+91 9493858086', 'admin@kehansrisolar.com', 1),
  ('usr_sales_default', 'SALES', 'Sales Executive', 'd4e5f3aa5e3d7cb0ef4ce6143c74900a0dc1b61c9448ca3ca32be96e1ccb9649', 'sales', '+91 9493858086', 'sales@kehansrisolar.com', 1)
ON CONFLICT (username) DO NOTHING;

-- 5. ROW LEVEL SECURITY & PERMISSIONS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to quotes" ON quotes;
DROP POLICY IF EXISTS "Allow all access to config" ON company_config;
DROP POLICY IF EXISTS "Allow all access to users" ON users;

CREATE POLICY "Allow all access to quotes" ON quotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to config" ON company_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true) WITH CHECK (true);

-- 6. HIGH-PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_sales_username ON quotes(sales_username);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_type ON quotes(customer_type);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
