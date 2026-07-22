import { useState, useEffect } from 'react';
import { breakService } from '../services/breakService';

interface BreakDurationStatus {
  has_active_break: boolean;
  break_id?: string;
  break_type?: string;
  elapsed_minutes?: number;
  max_duration_minutes?: number;
  remaining_minutes?: number;
  is_overtime?: boolean;
  warning_threshold?: number;
  was_auto_ended?: boolean;
  message?: string;
}

export const useBreakDurationMonitor = () => {
  const [status, setStatus] = useState<BreakDurationStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const checkDuration = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/breaks/check-duration', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking break duration:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDuration();
    
    // Check every 30 seconds
    const interval = setInterval(checkDuration, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { status, loading, checkDuration };
};