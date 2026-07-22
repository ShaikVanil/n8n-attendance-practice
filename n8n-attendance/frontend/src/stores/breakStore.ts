import { create } from 'zustand';
import { breakService } from '../services/breakService';
import { Break } from '../types/attendance';

interface BreakHistoryParams {
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

interface BreakStore {
  breaks: Break[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  lastFetched: number | null;
  _fetchingHistory: boolean;
  
  fetchBreakHistory: (params: BreakHistoryParams, reset?: boolean) => Promise<void>;
  clearError: () => void;
  resetBreaks: () => void;
}

const CACHE_DURATION = 60000; // 1 minute cache for break history

export const useBreakStore = create<BreakStore>((set, get) => ({
  breaks: [],
  loading: false,
  error: null,
  hasMore: true,
  currentPage: 0,
  lastFetched: null,
  _fetchingHistory: false,

  fetchBreakHistory: async (params: BreakHistoryParams, reset = false) => {
    const state = get();
    
    // Prevent duplicate requests
    if (state._fetchingHistory) {
      return;
    }
    
    // Check cache validity for same parameters
    const now = Date.now();
    const cacheKey = JSON.stringify(params);
    if (!reset && state.lastFetched && (now - state.lastFetched) < CACHE_DURATION) {
      return;
    }
    
    set({ _fetchingHistory: true, loading: true, error: null });
    
    try {
      const offset = reset ? 0 : state.currentPage * 20;
      const response = await breakService.getBreakHistory({
        ...params,
        limit: 20,
        offset
      });
      
      if (reset) {
        set({
          breaks: response.breaks,
          currentPage: 0,
          hasMore: response.breaks.length === 20,
          loading: false,
          _fetchingHistory: false,
          lastFetched: now
        });
      } else {
        set(state => ({
          breaks: [...state.breaks, ...response.breaks],
          currentPage: state.currentPage + 1,
          hasMore: response.breaks.length === 20,
          loading: false,
          _fetchingHistory: false,
          lastFetched: now
        }));
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load break history',
        loading: false,
        _fetchingHistory: false
      });
    }
  },

  clearError: () => set({ error: null }),
  resetBreaks: () => set({ breaks: [], currentPage: 0, hasMore: true, lastFetched: null })
}));