# React Testing Guide

## Testing Strategy Overview

### Testing Pyramid for React Applications
```
                 /\
                /  \
               / E2E \     <- End-to-End Tests (Few)
              /______\
             /        \
            /Integration\ <- Integration Tests (Some)
           /____________\
          /              \
         /   Unit Tests   \  <- Unit Tests (Many)
        /________________\
```

## Unit Testing

### Component Testing with React Testing Library

#### Basic Component Test
```typescript
// src/components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button loading>Submit</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Submit')).toBeInTheDocument();
    // Check for loading spinner
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('applies correct variant styles', () => {
    render(<Button variant="secondary">Secondary</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-200');
  });
});
```

#### Form Component Testing
```typescript
// src/components/__tests__/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

const mockOnSubmit = jest.fn();

describe('LoginForm', () => {
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders form fields', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows error message', () => {
    render(<LoginForm onSubmit={mockOnSubmit} error="Invalid credentials" />);
    
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
```

### Custom Hook Testing

#### Basic Hook Test
```typescript
// src/hooks/__tests__/useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '../useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.decrement();
    });
    
    expect(result.current.count).toBe(4);
  });

  it('resets count', () => {
    const { result } = renderHook(() => useCounter(10));
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(11);
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.count).toBe(10);
  });
});
```

#### Async Hook Test
```typescript
// src/hooks/__tests__/useApi.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useApi } from '../useApi';

// Mock the API function
const mockApiFunction = jest.fn();

describe('useApi', () => {
  beforeEach(() => {
    mockApiFunction.mockClear();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useApi(mockApiFunction));
    
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles successful API call', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockApiFunction.mockResolvedValue(mockData);
    
    const { result } = renderHook(() => useApi(mockApiFunction));
    
    act(() => {
      result.current.execute();
    });
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });
  });

  it('handles API error', async () => {
    const mockError = new Error('API Error');
    mockApiFunction.mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useApi(mockApiFunction));
    
    act(() => {
      result.current.execute();
    });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe('API Error');
    });
  });
});
```

### Zustand Store Testing

#### Store Test Setup
```typescript
// src/stores/__tests__/authStore.test.ts
import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '../authStore';
import { authService } from '@services/authService';

// Mock the auth service
jest.mock('@services/authService');
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useAuthStore.getState().reset();
    });
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAuthStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles successful login', async () => {
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
    const mockToken = 'mock-token';
    
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      token: mockToken,
    });

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles login error', async () => {
    const mockError = new Error('Invalid credentials');
    mockAuthService.login.mockRejectedValue(mockError);

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'wrong-password');
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('handles logout', () => {
    // First, set up authenticated state
    act(() => {
      useAuthStore.setState({
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        token: 'mock-token',
        isAuthenticated: true,
      });
    });

    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
```

## Integration Testing

### Component Integration with Context
```typescript
// src/components/__tests__/Dashboard.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../Dashboard';
import { useAuthStore } from '@stores/authStore';
import { useDataStore } from '@stores/dataStore';

// Mock stores
jest.mock('@stores/authStore');
jest.mock('@stores/dataStore');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseDataStore = useDataStore as jest.MockedFunction<typeof useDataStore>;

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Dashboard Integration', () => {
  beforeEach(() => {
    // Mock authenticated user
    mockUseAuthStore.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@example.com' },
      isAuthenticated: true,
      loading: false,
      error: null,
    } as any);

    // Mock data store
    mockUseDataStore.mockReturnValue({
      items: [
        { id: '1', title: 'Item 1', status: 'active' },
        { id: '2', title: 'Item 2', status: 'inactive' },
      ],
      loading: false,
      error: null,
      fetchItems: jest.fn(),
    } as any);
  });

  it('renders dashboard with user data', async () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    mockUseDataStore.mockReturnValue({
      items: [],
      loading: true,
      error: null,
      fetchItems: jest.fn(),
    } as any);

    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles error state', () => {
    mockUseDataStore.mockReturnValue({
      items: [],
      loading: false,
      error: 'Failed to load data',
      fetchItems: jest.fn(),
    } as any);

    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });
});
```

### API Integration Testing with MSW
```typescript
// src/services/__tests__/apiService.integration.test.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { apiService } from '../apiService';

// Mock server setup
const server = setupServer(
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ])
    );
  }),

  rest.post('/api/users', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({ id: '3', name: 'New User', email: 'new@example.com' })
    );
  }),

  rest.get('/api/users/error', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: 'Server Error' }));
  })
);

describe('API Service Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('fetches users successfully', async () => {
    const users = await apiService.getUsers();
    
    expect(users).toHaveLength(2);
    expect(users[0]).toEqual({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('creates user successfully', async () => {
    const newUser = await apiService.createUser({
      name: 'New User',
      email: 'new@example.com',
    });
    
    expect(newUser).toEqual({
      id: '3',
      name: 'New User',
      email: 'new@example.com',
    });
  });

  it('handles API errors', async () => {
    server.use(
      rest.get('/api/users', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server Error' }));
      })
    );

    await expect(apiService.getUsers()).rejects.toThrow('Server Error');
  });
});
```

## End-to-End Testing

### Cypress E2E Tests
```typescript
// cypress/e2e/auth.cy.ts
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('allows user to login with valid credentials', () => {
    cy.get('[data-testid=email-input]').type('test@example.com');
    cy.get('[data-testid=password-input]').type('password123');
    cy.get('[data-testid=login-button]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-testid=user-menu]').should('contain', 'Test User');
  });

  it('shows error for invalid credentials', () => {
    cy.get('[data-testid=email-input]').type('test@example.com');
    cy.get('[data-testid=password-input]').type('wrongpassword');
    cy.get('[data-testid=login-button]').click();

    cy.get('[data-testid=error-message]')
      .should('be.visible')
      .and('contain', 'Invalid credentials');
  });

  it('validates required fields', () => {
    cy.get('[data-testid=login-button]').click();

    cy.get('[data-testid=email-error]').should('contain', 'Email is required');
    cy.get('[data-testid=password-error]').should('contain', 'Password is required');
  });
});

describe('Dashboard', () => {
  beforeEach(() => {
    // Login before each test
    cy.login('test@example.com', 'password123');
    cy.visit('/dashboard');
  });

  it('displays user dashboard with data', () => {
    cy.get('[data-testid=welcome-message]').should('contain', 'Welcome');
    cy.get('[data-testid=dashboard-stats]').should('be.visible');
    cy.get('[data-testid=recent-items]').should('have.length.greaterThan', 0);
  });

  it('allows user to create new item', () => {
    cy.get('[data-testid=create-item-button]').click();
    cy.get('[data-testid=item-title-input]').type('New Test Item');
    cy.get('[data-testid=item-description-input]').type('Test description');
    cy.get('[data-testid=save-item-button]').click();

    cy.get('[data-testid=success-message]')
      .should('be.visible')
      .and('contain', 'Item created successfully');
    
    cy.get('[data-testid=recent-items]')
      .should('contain', 'New Test Item');
  });
});
```

### Playwright E2E Tests
```typescript
// tests/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('successful login flow', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid=email-input]', 'test@example.com');
    await page.fill('[data-testid=password-input]', 'password123');
    await page.click('[data-testid=login-button]');

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid=user-menu]')).toContainText('Test User');
  });

  test('login with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid=email-input]', 'test@example.com');
    await page.fill('[data-testid=password-input]', 'wrongpassword');
    await page.click('[data-testid=login-button]');

    await expect(page.locator('[data-testid=error-message]'))
      .toBeVisible();
    await expect(page.locator('[data-testid=error-message]'))
      .toContainText('Invalid credentials');
  });
});
```

## Testing Utilities

### Custom Render Function
```typescript
// src/test-utils/index.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
}

const AllTheProviders = ({ children, initialEntries = ['/'] }: {
  children: React.ReactNode;
  initialEntries?: string[];
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  component: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialEntries, ...renderOptions } = options;
  
  return render(component, {
    wrapper: ({ children }) => (
      <AllTheProviders initialEntries={initialEntries}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

export * from '@testing-library/react';
export { customRender as render };
```

### Test Data Factories
```typescript
// src/test-utils/factories.ts
export const createUser = (overrides = {}) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createItem = (overrides = {}) => ({
  id: '1',
  title: 'Test Item',
  description: 'Test description',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createApiResponse = <T>(data: T, overrides = {}) => ({
  data,
  message: 'Success',
  success: true,
  timestamp: '2024-01-01T00:00:00Z',
  ...overrides,
});
```

### Mock Setup Files
```typescript
// src/setupTests.ts
import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

This comprehensive testing guide covers all aspects of testing React applications with TypeScript, from unit tests to E2E tests, providing a solid foundation for maintaining high code quality and reliability.