-- Project Management Schema
-- This schema supports project creation, assignment, and cross-location reporting

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- Used in timesheets
    description TEXT,
    client_name VARCHAR(255),
    project_manager_id UUID NOT NULL REFERENCES users(id),
    start_date DATE,
    end_date DATE,
    estimated_hours DECIMAL(8,2),
    budget DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    location_id UUID REFERENCES office_locations(id), -- Primary location
    is_cross_location BOOLEAN DEFAULT false, -- Allows cross-location assignments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project team assignments
CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'developer', 'designer', 'analyst', 'tester', etc.
    hourly_rate DECIMAL(8,2),
    allocated_hours DECIMAL(8,2),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    assigned_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id, role)
);

-- Project managers - allows multiple managers per project for cross-location support
CREATE TABLE IF NOT EXISTS project_managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES office_locations(id), -- Manager's location responsibility
    is_primary BOOLEAN DEFAULT false, -- Primary project manager
    permissions JSONB DEFAULT '{"approve_timesheets": true, "manage_assignments": true, "view_reports": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, manager_id, location_id)
);

-- Project time tracking summary
CREATE TABLE IF NOT EXISTS project_time_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_hours DECIMAL(4,2) DEFAULT 0,
    billable_hours DECIMAL(4,2) DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    location_id UUID REFERENCES office_locations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code);
CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_location ON projects(location_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_managers_project ON project_managers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_managers_manager ON project_managers(manager_id);
CREATE INDEX IF NOT EXISTS idx_project_time_summary_project_date ON project_time_summary(project_id, date);
CREATE INDEX IF NOT EXISTS idx_project_time_summary_user_date ON project_time_summary(user_id, date);

-- Update timestamp trigger for projects
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers before creating new ones
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

-- Update timestamp trigger for project_time_summary
DROP TRIGGER IF EXISTS update_project_time_summary_updated_at ON project_time_summary;
CREATE TRIGGER update_project_time_summary_updated_at
    BEFORE UPDATE ON project_time_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();