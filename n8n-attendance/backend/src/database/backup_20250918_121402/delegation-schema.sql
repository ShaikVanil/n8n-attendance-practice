-- Approval Delegation Schema
-- Supports manager delegation of approval authority when unavailable

-- Delegation configurations table
CREATE TABLE IF NOT EXISTS approval_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delegate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delegation_type VARCHAR(50) NOT NULL CHECK (delegation_type IN ('leave_approval', 'timesheet_approval', 'all_approvals')),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_active_delegation UNIQUE (delegator_id, delegation_type, start_date)
);

-- Leave approval steps table (enhanced from architecture)
CREATE TABLE IF NOT EXISTS leave_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approver_role VARCHAR(20) NOT NULL CHECK (approver_role IN ('manager', 'hr', 'admin')),
  step_order INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delegated', 'skipped')),
  approved_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  is_delegated BOOLEAN DEFAULT false,
  delegated_to UUID REFERENCES users(id) ON DELETE SET NULL,
  delegation_id UUID REFERENCES approval_delegations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Delegation history for audit trail
CREATE TABLE IF NOT EXISTS delegation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id UUID NOT NULL REFERENCES approval_delegations(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'activated', 'deactivated', 'extended', 'terminated')),
  performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  previous_end_date DATE,
  new_end_date DATE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_approval_delegations_delegator ON approval_delegations(delegator_id);
CREATE INDEX IF NOT EXISTS idx_approval_delegations_delegate ON approval_delegations(delegate_id);
CREATE INDEX IF NOT EXISTS idx_approval_delegations_active ON approval_delegations(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_approval_steps_request ON leave_approval_steps(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_leave_approval_steps_approver ON leave_approval_steps(approver_id);
CREATE INDEX IF NOT EXISTS idx_delegation_history_delegation ON delegation_history(delegation_id);

-- Function to check if a user has active delegation
CREATE OR REPLACE FUNCTION get_active_delegate(
  delegator_user_id UUID,
  delegation_type_param VARCHAR(50),
  check_date DATE DEFAULT CURRENT_DATE
) RETURNS UUID AS $$
DECLARE
  delegate_user_id UUID;
BEGIN
  SELECT delegate_id INTO delegate_user_id
  FROM approval_delegations
  WHERE delegator_id = delegator_user_id
    AND delegation_type = delegation_type_param
    AND is_active = true
    AND start_date <= check_date
    AND (end_date IS NULL OR end_date >= check_date)
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN delegate_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically handle delegation in approval steps
CREATE OR REPLACE FUNCTION handle_approval_delegation()
RETURNS TRIGGER AS $$
DECLARE
  delegate_user_id UUID;
  delegation_record_id UUID;
BEGIN
  -- Check if there's an active delegation for this approver
  SELECT id, delegate_id INTO delegation_record_id, delegate_user_id
  FROM approval_delegations
  WHERE delegator_id = NEW.approver_id
    AND delegation_type IN ('leave_approval', 'all_approvals')
    AND is_active = true
    AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If delegation exists, update the approval step
  IF delegate_user_id IS NOT NULL THEN
    NEW.is_delegated := true;
    NEW.delegated_to := delegate_user_id;
    NEW.delegation_id := delegation_record_id;
    NEW.approver_id := delegate_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log delegation history
CREATE OR REPLACE FUNCTION log_delegation_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO delegation_history (delegation_id, action, performed_by, new_end_date, reason)
    VALUES (NEW.id, 'created', NEW.delegator_id, NEW.end_date, NEW.reason);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active != NEW.is_active THEN
      INSERT INTO delegation_history (delegation_id, action, performed_by, reason)
      VALUES (NEW.id, 
              CASE WHEN NEW.is_active THEN 'activated' ELSE 'deactivated' END,
              NEW.delegator_id, 
              'Status changed');
    END IF;
    
    IF OLD.end_date != NEW.end_date THEN
      INSERT INTO delegation_history (delegation_id, action, performed_by, previous_end_date, new_end_date, reason)
      VALUES (NEW.id, 'extended', NEW.delegator_id, OLD.end_date, NEW.end_date, 'End date modified');
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
BEGIN
  -- Drop existing triggers if they exist
  DROP TRIGGER IF EXISTS update_approval_delegations_updated_at ON approval_delegations;
  DROP TRIGGER IF EXISTS update_leave_approval_steps_updated_at ON leave_approval_steps;
  DROP TRIGGER IF EXISTS handle_delegation_trigger ON leave_approval_steps;
  DROP TRIGGER IF EXISTS log_delegation_history_trigger ON approval_delegations;
  
  -- Create triggers
  CREATE TRIGGER update_approval_delegations_updated_at 
    BEFORE UPDATE ON approval_delegations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
  CREATE TRIGGER update_leave_approval_steps_updated_at 
    BEFORE UPDATE ON leave_approval_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
  CREATE TRIGGER handle_delegation_trigger 
    BEFORE INSERT ON leave_approval_steps
    FOR EACH ROW EXECUTE FUNCTION handle_approval_delegation();
    
  CREATE TRIGGER log_delegation_history_trigger 
    AFTER INSERT OR UPDATE ON approval_delegations
    FOR EACH ROW EXECUTE FUNCTION log_delegation_history();
END $$;