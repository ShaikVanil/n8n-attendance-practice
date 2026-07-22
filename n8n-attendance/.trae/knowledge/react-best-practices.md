# React Best Practices Guide

## Project Structure & Organization

### Recommended Folder Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI elements (Button, Input, etc.)
│   ├── layout/         # Layout components (Header, Sidebar, etc.)
│   └── common/         # Shared components across features
├── features/           # Feature-based modules
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── types/
│   │   └── utils/
│   └── dashboard/
├── hooks/              # Shared custom hooks
├── stores/             # Zustand stores
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── services/           # API and external services
├── constants/          # Application constants
├── assets/             # Images, fonts, etc.
└── styles/             # Global styles and Tailwind config
```

## TypeScript Best Practices

### Component Props Definition
```typescript
// Use interface for component props
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// Use generic types for flexible components
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
}
```

### Custom Hook Typing
```typescript
// Define return types explicitly
interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useApi<T>(url: string): UseApiResult<T> {
  // Implementation
}
```

### Event Handler Types
```typescript
// Use React's built-in event types
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // Handle form submission
};
```

## Component Development

### Functional Components with TypeScript
```typescript
import React, { memo } from 'react';

interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  onEdit?: (userId: string) => void;
}

export const UserCard = memo<UserCardProps>(({ user, onEdit }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold">{user.name}</h3>
      <p className="text-gray-600">{user.email}</p>
      {onEdit && (
        <button
          onClick={() => onEdit(user.id)}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Edit
        </button>
      )}
    </div>
  );
});

UserCard.displayName = 'UserCard';
```

### Custom Hooks Best Practices
```typescript
// Custom hook for API calls
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const userData = await userService.getUser(userId);
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const refetch = useCallback(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  return { user, loading, error, refetch };
}
```

## State Management with Zustand

### Store Structure
```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,

        // Actions
        login: async (email: string, password: string) => {
          set({ loading: true, error: null });
          try {
            const response = await authService.login(email, password);
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
          }
        },

        logout: () => {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });
        },

        setUser: (user: User) => set({ user }),
        clearError: () => set({ error: null }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    )
  )
);
```

### Store Selectors
```typescript
// Create specific selectors for better performance
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthActions = () => useAuthStore((state) => ({
  login: state.login,
  logout: state.logout,
  clearError: state.clearError,
}));
```

## Tailwind CSS Best Practices

### Component-Based Styling
```typescript
// Define reusable style variants
const buttonVariants = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

interface ButtonProps {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  className?: string;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const classes = `${baseClasses} ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`;
  
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};
```

### Responsive Design Patterns
```typescript
// Mobile-first responsive component
export const ResponsiveGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
};

// Responsive typography
export const ResponsiveHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
      {children}
    </h1>
  );
};
```

## Performance Optimization

### Memoization Best Practices
```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive calculations
const ExpensiveComponent = memo<{ data: ComplexData[] }>(({ data }) => {
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      processed: expensiveCalculation(item),
    }));
  }, [data]);

  const handleItemClick = useCallback((id: string) => {
    // Handle click logic
  }, []);

  return (
    <div>
      {processedData.map(item => (
        <div key={item.id} onClick={() => handleItemClick(item.id)}>
          {item.processed}
        </div>
      ))}
    </div>
  );
});
```

### Code Splitting
```typescript
import { lazy, Suspense } from 'react';

// Lazy load components
const Dashboard = lazy(() => import('./Dashboard'));
const Profile = lazy(() => import('./Profile'));

export const App = () => {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Suspense>
    </Router>
  );
};
```

## Error Handling

### Error Boundaries
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!);
      }
      
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
          <p className="text-red-600">Please refresh the page or try again later.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### API Error Handling
```typescript
// Custom hook for API error handling
function useErrorHandler() {
  const showError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    // Log error for monitoring
    console.error('API Error:', error);
    
    // Show user-friendly message
    toast.error(message);
  }, []);

  return { showError };
}

// Usage in API service
export const apiService = {
  async get<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  },
};
```

## Testing Best Practices

### Component Testing
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserCard } from './UserCard';

const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
};

describe('UserCard', () => {
  it('renders user information correctly', () => {
    render(<UserCard user={mockUser} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<UserCard user={mockUser} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    expect(onEdit).toHaveBeenCalledWith('1');
  });
});
```

### Hook Testing
```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with correct value', () => {
    const { result } = renderHook(() => useCounter(10));
    
    expect(result.current.count).toBe(10);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter(0));
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

## Accessibility Best Practices

### Semantic HTML and ARIA
```typescript
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="modal-title" className="text-xl font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
```

### Form Accessibility
```typescript
export const FormField: React.FC<{
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, name, type = 'text', required, error, value, onChange }) => {
  return (
    <div className="mb-4">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && (
        <p id={`${name}-error`} className="text-red-500 text-sm mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

## Security Best Practices

### XSS Prevention
```typescript
// Use dangerouslySetInnerHTML sparingly and sanitize content
import DOMPurify from 'dompurify';

const SafeHtmlContent: React.FC<{ html: string }> = ({ html }) => {
  const sanitizedHtml = DOMPurify.sanitize(html);
  
  return (
    <div
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

// Prefer textContent over innerHTML when possible
const UserMessage: React.FC<{ message: string }> = ({ message }) => {
  return <p>{message}</p>; // React automatically escapes content
};
```

### Environment Variables
```typescript
// Use environment variables for sensitive configuration
const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  apiKey: process.env.REACT_APP_API_KEY, // Only for public APIs
  environment: process.env.NODE_ENV,
};

// Never commit sensitive keys to version control
// Use .env.local for local development secrets
```

## Bundle Optimization

### Tree Shaking
```typescript
// Import only what you need
import { debounce } from 'lodash/debounce'; // ✅ Good
import _ from 'lodash'; // ❌ Imports entire library

// Use named imports for better tree shaking
import { Button, Input } from '@/components/ui'; // ✅ Good
import * as UI from '@/components/ui'; // ❌ May import unused components
```

### Dynamic Imports
```typescript
// Lazy load heavy libraries
const ChartComponent = lazy(() => 
  import('recharts').then(module => ({
    default: module.LineChart
  }))
);

// Conditional loading
const loadHeavyFeature = async () => {
  if (user.isPremium) {
    const { PremiumFeature } = await import('./PremiumFeature');
    return PremiumFeature;
  }
  return null;
};
```

This comprehensive guide covers the essential React best practices for modern development with TypeScript, Tailwind CSS, and Zustand. Follow these patterns to build maintainable, performant, and accessible React applications.