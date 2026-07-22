# Zustand State Management Template

## Basic Store Setup

### Authentication Store
```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { authService } from '@services/authService';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
}

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  clearError: () => void;
  reset: () => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        login: async (email: string, password: string) => {
          set({ loading: true, error: null });
          try {
            const response = await authService.login({ email, password });
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              loading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Login failed',
              loading: false,
            });
            throw error;
          }
        },

        register: async (userData: RegisterData) => {
          set({ loading: true, error: null });
          try {
            const response = await authService.register(userData);
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              loading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Registration failed',
              loading: false,
            });
            throw error;
          }
        },

        logout: () => {
          authService.logout();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });
        },

        refreshToken: async () => {
          try {
            const { token } = get();
            if (!token) throw new Error('No token available');
            
            const response = await authService.refreshToken(token);
            set({
              token: response.token,
              user: response.user,
            });
          } catch (error) {
            // If refresh fails, logout user
            get().logout();
            throw error;
          }
        },

        updateProfile: async (userData: Partial<User>) => {
          set({ loading: true, error: null });
          try {
            const updatedUser = await authService.updateProfile(userData);
            set({
              user: updatedUser,
              loading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Profile update failed',
              loading: false,
            });
            throw error;
          }
        },

        setUser: (user: User) => set({ user }),
        setToken: (token: string) => set({ token }),
        clearError: () => set({ error: null }),
        reset: () => set(initialState),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'auth-store' }
  )
);

// Selectors for optimal performance
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthToken = () => useAuthStore((state) => state.token);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthError = () => useAuthStore((state) => state.error);

export const useAuthActions = () => useAuthStore((state) => ({
  login: state.login,
  logout: state.logout,
  register: state.register,
  refreshToken: state.refreshToken,
  updateProfile: state.updateProfile,
  clearError: state.clearError,
  reset: state.reset,
}));
```

## Advanced Store Patterns

### UI Store for Global UI State
```typescript
// src/stores/uiStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface Modal {
  id: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

interface UiState {
  // Loading states
  globalLoading: boolean;
  loadingStates: Record<string, boolean>;
  
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Notifications
  notifications: Notification[];
  
  // Modals
  modals: Modal[];
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Mobile
  isMobile: boolean;
}

interface UiActions {
  // Loading
  setGlobalLoading: (loading: boolean) => void;
  setLoading: (key: string, loading: boolean) => void;
  
  // Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  
  // Notifications
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Modals
  openModal: (modal: Omit<Modal, 'id'>) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  
  // Theme
  setTheme: (theme: UiState['theme']) => void;
  
  // Mobile
  setIsMobile: (isMobile: boolean) => void;
}

export const useUiStore = create<UiState & UiActions>()(
  devtools(
    (set, get) => ({
      // Initial state
      globalLoading: false,
      loadingStates: {},
      sidebarOpen: true,
      sidebarCollapsed: false,
      notifications: [],
      modals: [],
      theme: 'system',
      isMobile: false,

      // Loading actions
      setGlobalLoading: (loading: boolean) => set({ globalLoading: loading }),
      
      setLoading: (key: string, loading: boolean) =>
        set((state) => ({
          loadingStates: {
            ...state.loadingStates,
            [key]: loading,
          },
        })),

      // Sidebar actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Notification actions
      addNotification: (notification) => {
        const id = Date.now().toString();
        const newNotification = { ...notification, id };
        
        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto-remove notification after duration
        if (notification.duration !== 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.duration || 5000);
        }
      },

      removeNotification: (id: string) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),

      // Modal actions
      openModal: (modal) => {
        const id = Date.now().toString();
        const newModal = { ...modal, id };
        
        set((state) => ({
          modals: [...state.modals, newModal],
        }));
      },

      closeModal: (id: string) =>
        set((state) => ({
          modals: state.modals.filter((m) => m.id !== id),
        })),

      closeAllModals: () => set({ modals: [] }),

      // Theme actions
      setTheme: (theme) => set({ theme }),

      // Mobile actions
      setIsMobile: (isMobile) => set({ isMobile }),
    }),
    { name: 'ui-store' }
  )
);

// Selectors
export const useGlobalLoading = () => useUiStore((state) => state.globalLoading);
export const useLoading = (key: string) => useUiStore((state) => state.loadingStates[key] || false);
export const useSidebar = () => useUiStore((state) => ({
  open: state.sidebarOpen,
  collapsed: state.sidebarCollapsed,
}));
export const useNotifications = () => useUiStore((state) => state.notifications);
export const useModals = () => useUiStore((state) => state.modals);
export const useTheme = () => useUiStore((state) => state.theme);
export const useIsMobile = () => useUiStore((state) => state.isMobile);
```

### Data Store with Optimistic Updates
```typescript
// src/stores/dataStore.ts
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { dataService } from '@services/dataService';

interface Item {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface DataState {
  items: Item[];
  selectedItem: Item | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

interface DataActions {
  // CRUD operations
  fetchItems: () => Promise<void>;
  fetchItem: (id: string) => Promise<void>;
  createItem: (data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateItem: (id: string, data: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  
  // Local state management
  setSelectedItem: (item: Item | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState: DataState = {
  items: [],
  selectedItem: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

export const useDataStore = create<DataState & DataActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      fetchItems: async () => {
        set({ loading: true, error: null });
        try {
          const items = await dataService.getItems();
          set({
            items,
            loading: false,
            lastUpdated: Date.now(),
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch items',
            loading: false,
          });
        }
      },

      fetchItem: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const item = await dataService.getItem(id);
          set({
            selectedItem: item,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch item',
            loading: false,
          });
        }
      },

      createItem: async (data) => {
        const tempId = `temp-${Date.now()}`;
        const tempItem: Item = {
          ...data,
          id: tempId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Optimistic update
        set((state) => ({
          items: [...state.items, tempItem],
        }));

        try {
          const newItem = await dataService.createItem(data);
          
          // Replace temp item with real item
          set((state) => ({
            items: state.items.map((item) =>
              item.id === tempId ? newItem : item
            ),
            lastUpdated: Date.now(),
          }));
        } catch (error) {
          // Rollback optimistic update
          set((state) => ({
            items: state.items.filter((item) => item.id !== tempId),
            error: error instanceof Error ? error.message : 'Failed to create item',
          }));
          throw error;
        }
      },

      updateItem: async (id: string, data) => {
        const originalItem = get().items.find((item) => item.id === id);
        if (!originalItem) return;

        // Optimistic update
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, ...data, updatedAt: new Date().toISOString() }
              : item
          ),
        }));

        try {
          const updatedItem = await dataService.updateItem(id, data);
          
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? updatedItem : item
            ),
            selectedItem: state.selectedItem?.id === id ? updatedItem : state.selectedItem,
            lastUpdated: Date.now(),
          }));
        } catch (error) {
          // Rollback optimistic update
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? originalItem : item
            ),
            error: error instanceof Error ? error.message : 'Failed to update item',
          }));
          throw error;
        }
      },

      deleteItem: async (id: string) => {
        const originalItems = get().items;

        // Optimistic update
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          selectedItem: state.selectedItem?.id === id ? null : state.selectedItem,
        }));

        try {
          await dataService.deleteItem(id);
          set({ lastUpdated: Date.now() });
        } catch (error) {
          // Rollback optimistic update
          set({
            items: originalItems,
            error: error instanceof Error ? error.message : 'Failed to delete item',
          });
          throw error;
        }
      },

      setSelectedItem: (item) => set({ selectedItem: item }),
      clearError: () => set({ error: null }),
      reset: () => set(initialState),
    })),
    { name: 'data-store' }
  )
);

// Selectors with computed values
export const useItems = () => useDataStore((state) => state.items);
export const useActiveItems = () => useDataStore((state) =>
  state.items.filter((item) => item.status === 'active')
);
export const useSelectedItem = () => useDataStore((state) => state.selectedItem);
export const useDataLoading = () => useDataStore((state) => state.loading);
export const useDataError = () => useDataStore((state) => state.error);

export const useItemById = (id: string) => useDataStore((state) =>
  state.items.find((item) => item.id === id)
);

export const useDataActions = () => useDataStore((state) => ({
  fetchItems: state.fetchItems,
  fetchItem: state.fetchItem,
  createItem: state.createItem,
  updateItem: state.updateItem,
  deleteItem: state.deleteItem,
  setSelectedItem: state.setSelectedItem,
  clearError: state.clearError,
  reset: state.reset,
}));
```

## Store Middleware Examples

### Custom Middleware for API Error Handling
```typescript
// src/stores/middleware/errorMiddleware.ts
import { StateCreator } from 'zustand';
import { useUiStore } from '@stores/uiStore';

export const errorMiddleware = <T extends object>(
  f: StateCreator<T, [], [], T>
): StateCreator<T, [], [], T> =>
  (set, get, api) => {
    const originalSet = set;
    
    // Override set to catch errors
    const wrappedSet = (partial: any, replace?: boolean) => {
      try {
        return originalSet(partial, replace);
      } catch (error) {
        // Log error and show notification
        console.error('Store error:', error);
        useUiStore.getState().addNotification({
          type: 'error',
          title: 'An error occurred',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    };

    return f(wrappedSet, get, api);
  };
```

### Custom Middleware for Loading States
```typescript
// src/stores/middleware/loadingMiddleware.ts
import { StateCreator } from 'zustand';

interface LoadingState {
  _loading: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
}

export const loadingMiddleware = <T extends object>(
  f: StateCreator<T, [], [], T>
): StateCreator<T & LoadingState, [], [], T & LoadingState> =>
  (set, get, api) => ({
    ...f(set, get, api),
    _loading: {},
    
    setLoading: (key: string, loading: boolean) =>
      set((state) => ({
        _loading: {
          ...state._loading,
          [key]: loading,
        },
      })),
    
    isLoading: (key: string) => get()._loading[key] || false,
  });
```

## Store Composition Pattern

### Combining Multiple Stores
```typescript
// src/stores/index.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useAuthStore } from './authStore';
import { useDataStore } from './dataStore';
import { useUiStore } from './uiStore';

// Create a root store that composes other stores
interface RootStore {
  auth: typeof useAuthStore.getState;
  data: typeof useDataStore.getState;
  ui: typeof useUiStore.getState;
}

export const useRootStore = create<RootStore>()(
  devtools(() => ({
    auth: useAuthStore.getState,
    data: useDataStore.getState,
    ui: useUiStore.getState,
  }))
);

// Re-export individual stores
export { useAuthStore, useDataStore, useUiStore };

// Export composed selectors
export const useAppState = () => ({
  user: useAuthStore((state) => state.user),
  isAuthenticated: useAuthStore((state) => state.isAuthenticated),
  items: useDataStore((state) => state.items),
  notifications: useUiStore((state) => state.notifications),
});
```

## Store Testing Utilities

### Test Helpers
```typescript
// src/stores/__tests__/testUtils.ts
import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '@stores/authStore';

// Helper to reset all stores before each test
export const resetAllStores = () => {
  act(() => {
    useAuthStore.getState().reset();
    // Add other store resets as needed
  });
};

// Helper to create a test user
export const createTestUser = () => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user' as const,
});

// Helper to mock store state
export const mockAuthState = (overrides = {}) => {
  act(() => {
    useAuthStore.setState({
      user: createTestUser(),
      isAuthenticated: true,
      loading: false,
      error: null,
      ...overrides,
    });
  });
};
```

This template provides a comprehensive foundation for state management using Zustand with TypeScript, including patterns for authentication, UI state, data management, middleware, and testing utilities.