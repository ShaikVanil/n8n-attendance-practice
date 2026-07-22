import { create } from 'zustand';
import { timesheetService } from '../services/timesheetService';
import {
  Timesheet,
  TimesheetEntry,
  CreateTimesheetRequest,
  UpdateTimesheetRequest,
  TimesheetFilters,
  TimesheetListResponse
} from '../types/timesheet';

interface TimesheetStore {
  // State
  timesheets: Timesheet[];
  currentTimesheet: Timesheet | null;
  pendingTimesheets: Timesheet[];
  loading: boolean;
  error: string | null;
  total: number;
  
  // Actions
  fetchTimesheets: (filters?: TimesheetFilters) => Promise<void>;
  fetchTimesheetById: (id: string) => Promise<void>;
  createTimesheet: (data: CreateTimesheetRequest) => Promise<Timesheet>;
  updateTimesheet: (id: string, data: UpdateTimesheetRequest) => Promise<void>;
  deleteTimesheet: (id: string) => Promise<void>;
  submitTimesheet: (id: string) => Promise<void>;
  
  // Manager actions
  fetchPendingTimesheets: () => Promise<void>;
  approveTimesheet: (id: string, comments?: string) => Promise<void>;
  rejectTimesheet: (id: string, reason: string) => Promise<void>;
  
  // Entry actions
  createTimesheetEntry: (timesheetId: string, entryData: Partial<TimesheetEntry>) => Promise<void>;
  updateTimesheetEntry: (timesheetId: string, entryId: string, entryData: Partial<TimesheetEntry>) => Promise<void>;
  deleteTimesheetEntry: (timesheetId: string, entryId: string) => Promise<void>;
  autoPopulateFromAttendance: (timesheetId: string, weekStartDate: string) => Promise<void>;
  
  // Utility actions
  setCurrentTimesheet: (timesheet: Timesheet | null) => void;
  clearError: () => void;
  resetStore: () => void;
}

export const useTimesheetStore = create<TimesheetStore>((set, get) => ({
  // Initial state
  timesheets: [],
  currentTimesheet: null,
  pendingTimesheets: [],
  loading: false,
  error: null,
  total: 0,

  // Fetch timesheets with optional filters
  fetchTimesheets: async (filters?: TimesheetFilters) => {
    set({ loading: true, error: null });
    try {
      const response: TimesheetListResponse = await timesheetService.getTimesheets(filters);
      set({ 
        timesheets: response.timesheets, 
        total: response.total,
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch timesheets',
        loading: false 
      });
    }
  },

  // Fetch timesheet by ID
  fetchTimesheetById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const timesheet = await timesheetService.getTimesheetById(id);
      set({ currentTimesheet: timesheet, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch timesheet',
        loading: false 
      });
    }
  },

  // Create new timesheet
  createTimesheet: async (data: CreateTimesheetRequest) => {
    set({ loading: true, error: null });
    try {
      const newTimesheet = await timesheetService.createTimesheet(data);
      const { timesheets } = get();
      set({ 
        timesheets: [newTimesheet, ...timesheets],
        currentTimesheet: newTimesheet,
        loading: false 
      });
      return newTimesheet;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to create timesheet',
        loading: false 
      });
      throw error;
    }
  },

  // Update timesheet
  updateTimesheet: async (id: string, data: UpdateTimesheetRequest) => {
    set({ loading: true, error: null });
    try {
      const updatedTimesheet = await timesheetService.updateTimesheet(id, data);
      const { timesheets, currentTimesheet } = get();
      
      set({ 
        timesheets: timesheets.map(t => t.id === id ? updatedTimesheet : t),
        currentTimesheet: currentTimesheet?.id === id ? updatedTimesheet : currentTimesheet,
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to update timesheet',
        loading: false 
      });
    }
  },

  // Delete timesheet
  deleteTimesheet: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await timesheetService.deleteTimesheet(id);
      const { timesheets, currentTimesheet } = get();
      
      set({ 
        timesheets: timesheets.filter(t => t.id !== id),
        currentTimesheet: currentTimesheet?.id === id ? null : currentTimesheet,
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete timesheet',
        loading: false 
      });
    }
  },

  // Submit timesheet
  submitTimesheet: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const submittedTimesheet = await timesheetService.submitTimesheet(id);
      const { timesheets, currentTimesheet } = get();
      
      set({ 
        timesheets: timesheets.map(t => t.id === id ? submittedTimesheet : t),
        currentTimesheet: currentTimesheet?.id === id ? submittedTimesheet : currentTimesheet,
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to submit timesheet',
        loading: false 
      });
    }
  },

  // Fetch pending timesheets (for managers)
  fetchPendingTimesheets: async () => {
    set({ loading: true, error: null });
    try {
      const response = await timesheetService.getPendingTimesheets();
      set({ pendingTimesheets: response.timesheets, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch pending timesheets',
        loading: false 
      });
    }
  },

  // Approve timesheet (for managers)
  approveTimesheet: async (id: string, comments?: string) => {
    set({ loading: true, error: null });
    try {
      const approvedTimesheet = await timesheetService.approveTimesheet(id, comments);
      const { pendingTimesheets, timesheets } = get();
      
      set({ 
        pendingTimesheets: pendingTimesheets.filter(t => t.id !== id),
        timesheets: timesheets.map(t => t.id === id ? approvedTimesheet : t),
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to approve timesheet',
        loading: false 
      });
    }
  },

  // Reject timesheet (for managers)
  rejectTimesheet: async (id: string, reason: string) => {
    set({ loading: true, error: null });
    try {
      const rejectedTimesheet = await timesheetService.rejectTimesheet(id, reason);
      const { pendingTimesheets, timesheets } = get();
      
      set({ 
        pendingTimesheets: pendingTimesheets.filter(t => t.id !== id),
        timesheets: timesheets.map(t => t.id === id ? rejectedTimesheet : t),
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to reject timesheet',
        loading: false 
      });
    }
  },

  // Create timesheet entry
  createTimesheetEntry: async (timesheetId: string, entryData: Partial<TimesheetEntry>) => {
    set({ loading: true, error: null });
    try {
      await timesheetService.createTimesheetEntry(timesheetId, entryData);
      // Refresh the current timesheet to get updated entries
      if (get().currentTimesheet?.id === timesheetId) {
        await get().fetchTimesheetById(timesheetId);
      }
      set({ loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to create timesheet entry',
        loading: false 
      });
    }
  },

  // Update timesheet entry
  updateTimesheetEntry: async (timesheetId: string, entryId: string, entryData: Partial<TimesheetEntry>) => {
    set({ loading: true, error: null });
    try {
      await timesheetService.updateTimesheetEntry(timesheetId, entryId, entryData);
      // Refresh the current timesheet to get updated entries
      if (get().currentTimesheet?.id === timesheetId) {
        await get().fetchTimesheetById(timesheetId);
      }
      set({ loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to update timesheet entry',
        loading: false 
      });
    }
  },

  // Delete timesheet entry
  deleteTimesheetEntry: async (timesheetId: string, entryId: string) => {
    set({ loading: true, error: null });
    try {
      await timesheetService.deleteTimesheetEntry(timesheetId, entryId);
      // Refresh the current timesheet to get updated entries
      if (get().currentTimesheet?.id === timesheetId) {
        await get().fetchTimesheetById(timesheetId);
      }
      set({ loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete timesheet entry',
        loading: false 
      });
    }
  },

  // Auto-populate from attendance data
  autoPopulateFromAttendance: async (timesheetId: string, weekStartDate: string) => {
    set({ loading: true, error: null });
    try {
      const updatedTimesheet = await timesheetService.autoPopulateFromAttendance(timesheetId, weekStartDate);
      const { timesheets, currentTimesheet } = get();
      
      set({ 
        timesheets: timesheets.map(t => t.id === timesheetId ? updatedTimesheet : t),
        currentTimesheet: currentTimesheet?.id === timesheetId ? updatedTimesheet : currentTimesheet,
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to auto-populate from attendance',
        loading: false 
      });
    }
  },

  // Set current timesheet
  setCurrentTimesheet: (timesheet: Timesheet | null) => {
    set({ currentTimesheet: timesheet });
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Reset store
  resetStore: () => set({
    timesheets: [],
    currentTimesheet: null,
    pendingTimesheets: [],
    loading: false,
    error: null,
    total: 0
  })
}));