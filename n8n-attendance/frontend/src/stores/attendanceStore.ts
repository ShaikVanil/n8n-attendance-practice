import { create } from 'zustand';
import { attendanceService } from '../services/attendanceService';
import {
  Attendance,
  AttendanceStatus,
  CheckInRequest,
  CheckOutRequest,
  AttendanceHistoryParams,
} from '../types/attendance';

interface AttendanceStore {
  // State
  status: AttendanceStatus | null;
  history: Attendance[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // Private state for request deduplication
  _fetchingStatus: boolean;
  
  // Actions
  fetchStatus: (force?: boolean) => Promise<void>;
  updateStatus: (status: AttendanceStatus) => void; // Add this method
  checkIn: (data: CheckInRequest) => Promise<void>;
  checkOut: (data: CheckOutRequest) => Promise<void>;
  fetchHistory: (params?: AttendanceHistoryParams) => Promise<void>;
  clearError: () => void;
}

const CACHE_DURATION = 30000; // 30 seconds cache

export const useAttendanceStore = create<AttendanceStore>((set, get) => ({
  // Initial state
  status: null,
  history: [],
  loading: false,
  error: null,
  lastFetched: null,
  _fetchingStatus: false,

  // Fetch current attendance status with deduplication
  fetchStatus: async (force = false) => {
    const state = get();
    
    // Prevent duplicate requests
    if (state._fetchingStatus) {
      return;
    }
    
    // Check cache validity
    const now = Date.now();
    if (!force && state.lastFetched && (now - state.lastFetched) < CACHE_DURATION) {
      return;
    }
    
    set({ _fetchingStatus: true, loading: true, error: null });
    try {
      const status = await attendanceService.getStatus();
      set({ 
        status, 
        loading: false, 
        _fetchingStatus: false,
        lastFetched: now
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch attendance status',
        loading: false,
        _fetchingStatus: false
      });
    }
  },

  // Check in
  checkIn: async (data: CheckInRequest) => {
    set({ loading: true, error: null });
    try {
      await attendanceService.checkIn(data);
      // Refresh status after check-in (force refresh)
      await get().fetchStatus(true);
      set({ loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to check in',
        loading: false 
      });
    }
  },

  // Check out
  checkOut: async (data: CheckOutRequest) => {
    set({ loading: true, error: null });
    try {
      await attendanceService.checkOut(data);
      // Refresh status after check-out (force refresh)
      await get().fetchStatus(true);
      set({ loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to check out',
        loading: false 
      });
    }
  },

  // Fetch attendance history
  fetchHistory: async (params: AttendanceHistoryParams = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await attendanceService.getHistory(params);
      set({ history: response.attendance, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch attendance history',
        loading: false 
      });
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
  
  // Add this new method for real-time updates
  updateStatus: (status: AttendanceStatus) => {
    set({ status, lastFetched: Date.now() });
  },
}));