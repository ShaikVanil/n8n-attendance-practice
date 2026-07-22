-- Company Holidays Schema
-- This schema manages company holidays and their integration with leave planning

CREATE TABLE IF NOT EXISTS company_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('public', 'company', 'floating', 'optional')),
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50), -- 'yearly', 'monthly', etc.
  office_location VARCHAR(255), -- NULL means applies to all offices
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Holiday observances for tracking which employees observe optional holidays
CREATE TABLE IF NOT EXISTS holiday_observances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_id UUID NOT NULL REFERENCES company_holidays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_observed BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(holiday_id, user_id)
);

-- Holiday calendar configurations per office
CREATE TABLE IF NOT EXISTS holiday_calendar_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_location VARCHAR(255) UNIQUE NOT NULL,
  country_code VARCHAR(3), -- ISO country code for automatic holiday imports
  region_code VARCHAR(10), -- State/province code
  auto_import_enabled BOOLEAN DEFAULT false,
  last_import_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_holidays_date ON company_holidays(date);
CREATE INDEX IF NOT EXISTS idx_company_holidays_office ON company_holidays(office_location);
CREATE INDEX IF NOT EXISTS idx_company_holidays_type ON company_holidays(type);
CREATE INDEX IF NOT EXISTS idx_holiday_observances_user ON holiday_observances(user_id);
CREATE INDEX IF NOT EXISTS idx_holiday_observances_holiday ON holiday_observances(holiday_id);

-- Insert some default holidays
INSERT INTO company_holidays (name, date, type, description, is_recurring, recurrence_pattern) VALUES
('New Year''s Day', '2024-01-01', 'public', 'New Year celebration', true, 'yearly'),
('Independence Day', '2024-07-04', 'public', 'National Independence Day', true, 'yearly'),
('Christmas Day', '2024-12-25', 'public', 'Christmas celebration', true, 'yearly'),
('Thanksgiving', '2024-11-28', 'public', 'Thanksgiving Day', true, 'yearly'),
('Labor Day', '2024-09-02', 'public', 'Labor Day', true, 'yearly')
ON CONFLICT DO NOTHING;

-- RLS Policies for holidays
ALTER TABLE company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_observances ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_calendar_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS company_holidays_view_all ON company_holidays;
DROP POLICY IF EXISTS company_holidays_admin_manage ON company_holidays;
DROP POLICY IF EXISTS holiday_observances_self ON holiday_observances;
DROP POLICY IF EXISTS holiday_observances_admin_all ON holiday_observances;
DROP POLICY IF EXISTS holiday_calendar_configs_admin_only ON holiday_calendar_configs;

-- All users can view holidays
CREATE POLICY company_holidays_view_all ON company_holidays
    FOR SELECT TO public
    USING (true);

-- Only admins can manage holidays
CREATE POLICY company_holidays_admin_manage ON company_holidays
    FOR ALL TO public
    USING (get_current_user_role() = 'admin');

-- Users can manage their own holiday observances
CREATE POLICY holiday_observances_self ON holiday_observances
    FOR ALL TO public
    USING (user_id = get_current_user_id());

-- Admins can view all holiday observances
CREATE POLICY holiday_observances_admin_all ON holiday_observances
    FOR SELECT TO public
    USING (get_current_user_role() = 'admin');

-- Only admins can manage holiday calendar configurations
CREATE POLICY holiday_calendar_configs_admin_only ON holiday_calendar_configs
    FOR ALL TO public
    USING (get_current_user_role() = 'admin');