-- Scheduled reports configuration table
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('attendance', 'team_summary', 'statistics')),
    schedule_cron VARCHAR(100) NOT NULL, -- Cron expression for scheduling
    filters JSONB, -- Report filters (date range, employees, departments, etc.)
    recipients JSONB NOT NULL, -- Array of email addresses
    format VARCHAR(10) DEFAULT 'pdf' CHECK (format IN ('pdf', 'csv', 'excel')),
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled report execution logs
CREATE TABLE IF NOT EXISTS scheduled_report_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_report_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'running')),
    error_message TEXT,
    file_path TEXT, -- Path to generated report file
    recipients_sent JSONB, -- List of recipients who received the report
    execution_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_logs_report_id ON scheduled_report_logs(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_logs_execution_time ON scheduled_report_logs(execution_time DESC);