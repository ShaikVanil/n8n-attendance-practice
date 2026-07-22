import { create } from 'zustand';
import { leaveService } from '../services/leaveService';
import {
  LeaveType,
  LeaveRequest,
  LeaveBalance,
  CreateLeaveRequestRequest,
  UpdateLeaveRequestRequest,
  ReviewLeaveRequestRequest,
  LeaveRequestFilters,
  PaginatedLeaveResponse,
  LeaveRequestWithDetails,
  LeaveBalanceWithType,
  UserLeaveOverview
} from '../types/leave';

interface LeaveStore {
  // State
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequestWithDetails[];
  leaveBalances: LeaveBalanceWithType[];
  userOverview: UserLeaveOverview | null;
  currentRequest: LeaveRequestWithDetails | null;
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchLeaveTypes: () => Promise<void>;
  submitLeaveRequest: (data: CreateLeaveRequestRequest) => Promise<void>;
  fetchLeaveRequests: (filters?: LeaveRequestFilters) => Promise<void>;
  fetchLeaveRequest: (id: string) => Promise<void>;
  updateLeaveRequest: (id: string, data: UpdateLeaveRequestRequest) => Promise<void>;
  cancelLeaveRequest: (id: string) => Promise<void>;
  reviewLeaveRequest: (id: string, data: ReviewLeaveRequestRequest) => Promise<void>;
  fetchLeaveBalances: (userId?: string, year?: number) => Promise<void>;
  fetchUserOverview: (userId: string) => Promise<void>;
  calculateLeaveDays: (startDate: string, endDate: string, halfDay?: boolean) => Promise<number>;
  checkEligibility: (leaveTypeId: string, startDate: string, endDate: string) => Promise<{ eligible: boolean; reason?: string; availableDays: number }>;
  clearError: () => void;
  clearCurrentRequest: () => void;
}

export const useLeaveStore = create<LeaveStore>((set, get) => ({
  // Initial state
  leaveTypes: [],
  leaveRequests: [],
  leaveBalances: [],
  userOverview: null,
  currentRequest: null,
  pagination: {
    total: 0,
    page: 1,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  },
  loading: false,
  error: null,

  // Fetch leave types
  fetchLeaveTypes: async () => {
    set({ loading: true, error: null });
    try {
      const leaveTypes = await leaveService.getLeaveTypes();
      set({ leaveTypes, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch leave types',
        loading: false 
      });
    }
  },

  // Submit leave request
  submitLeaveRequest: async (data: CreateLeaveRequestRequest) => {
    set({ loading: true, error: null });
    try {
      await leaveService.submitLeaveRequest(data);
      // Refresh leave requests after submission
      await get().fetchLeaveRequests();
      set({ loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to submit leave request',
        loading: false 
      });
      throw error; // Re-throw to handle in component
    }
  },

  // Fetch leave requests
  fetchLeaveRequests: async (filters: LeaveRequestFilters = {}) => {
    set({ loading: true, error: null });
    try {
      const response: PaginatedLeaveResponse<LeaveRequestWithDetails> = await leaveService.getLeaveRequests(filters);
      set({ 
        leaveRequests: response.data,
        pagination: {
          total: response.total,
          page: response.page,
          totalPages: response.totalPages,
          hasNext: response.hasNext,
          hasPrev: response.hasPrev
        },
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch leave requests',
        loading: false 
      });
    }
  },

  // Fetch single leave request
  fetchLeaveRequest: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const request = await leaveService.getLeaveRequest(id);
      set({ currentRequest: request, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch leave request',
        loading: false 
      });
    }
  },

  // Update leave request
  updateLeaveRequest: async (id: string, data: UpdateLeaveRequestRequest) => {
    set({ loading: true, error: null });
    try {
      await leaveService.updateLeaveRequest(id, data);
      // Refresh leave requests after update
      await get().fetchLeaveRequests();
      if (get().currentRequest?.id === id) {
        await get().fetchLeaveRequest(id);
      }
      set({ loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to update leave request',
        loading: false 
      });
      throw error;
    }
  },

  // Cancel leave request
  cancelLeaveRequest: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await leaveService.cancelLeaveRequest(id);
      // Refresh leave requests after cancellation
      await get().fetchLeaveRequests();
      if (get().currentRequest?.id === id) {
        await get().fetchLeaveRequest(id);
      }
      set({ loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to cancel leave request',
        loading: false 
      });
      throw error;
    }
  },

  // Review leave request (for managers/admins)
  reviewLeaveRequest: async (id: string, data: ReviewLeaveRequestRequest) => {
    set({ loading: true, error: null });
    try {
      await leaveService.reviewLeaveRequest(id, data);
      // Refresh leave requests after review
      await get().fetchLeaveRequests();
      if (get().currentRequest?.id === id) {
        await get().fetchLeaveRequest(id);
      }
      set({ loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to review leave request',
        loading: false 
      });
      throw error;
    }
  },

  // Fetch leave balances
  fetchLeaveBalances: async (userId?: string, year?: number) => {
    set({ loading: true, error: null });
    try {
      const balances = userId 
        ? await leaveService.getUserLeaveBalance(userId, year)
        : await leaveService.getLeaveBalances({ year });
      set({ leaveBalances: balances, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch leave balances',
        loading: false 
      });
    }
  },

  // Fetch user overview
  fetchUserOverview: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const overview = await leaveService.getUserLeaveOverview(userId);
      set({ userOverview: overview, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch user overview',
        loading: false 
      });
    }
  },

  // Calculate leave days
  calculateLeaveDays: async (startDate: string, endDate: string, halfDay: boolean = false) => {
    try {
      const result = await leaveService.calculateLeaveDays(startDate, endDate, halfDay);
      return result.totalDays;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to calculate leave days' });
      throw error;
    }
  },

  // Check eligibility
  checkEligibility: async (leaveTypeId: string, startDate: string, endDate: string) => {
    try {
      return await leaveService.checkLeaveEligibility(leaveTypeId, startDate, endDate);
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to check eligibility' });
      throw error;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Clear current request
  clearCurrentRequest: () => set({ currentRequest: null })
}));