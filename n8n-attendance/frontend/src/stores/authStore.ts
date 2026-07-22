import { create } from 'zustand';
import { AuthService, User } from '../services/authService';

interface AuthStore {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User, token: string) => void;
  checkAuth: () => void;
  updateProfile: (userData: Partial<User>) => Promise<User>; // Changed from Promise<void> to Promise<User>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: AuthService.getToken(),

  login: async (email: string, password: string) => {
    const response = await AuthService.login({ email, password });
    set({ user: response.user, token: response.token });
  },

  logout: () => {
    AuthService.logout();
    set({ user: null, token: null });
  },

  setUser: (user: User, token: string) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },

  updateProfile: async (userData: Partial<User>) => {
    const updatedUser = await AuthService.updateProfile(userData);
    set({ user: updatedUser });
    return updatedUser; // Return the updated user
  },

  checkAuth: () => {
    const token = AuthService.getToken();
    const user = AuthService.getCurrentUser();
    
    if (token && user) {
      set({ user, token });
    } else {
      set({ user: null, token: null });
    }
  },
}));