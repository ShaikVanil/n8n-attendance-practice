# Tailwind Design System Guide

## Design System Configuration

### Extended Tailwind Config
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Brand Colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // Main brand color
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Secondary Colors
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Success, Warning, Error
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        serif: ['Merriweather', 'ui-serif', 'Georgia'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}
```

## Component Design System

### Button Variants
```typescript
// src/components/ui/Button.tsx
import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@utils/helpers';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-500 text-white hover:bg-primary-600',
        destructive: 'bg-error-500 text-white hover:bg-error-600',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50 hover:text-gray-900',
        secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200',
        ghost: 'hover:bg-gray-100 hover:text-gray-900',
        link: 'text-primary-500 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```

### Input Components
```typescript
// src/components/ui/Input.tsx
import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@utils/helpers';

const inputVariants = cva(
  'flex w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-gray-300 focus-visible:ring-primary-500',
        error: 'border-error-500 focus-visible:ring-error-500',
        success: 'border-success-500 focus-visible:ring-success-500',
      },
      inputSize: {
        default: 'h-10',
        sm: 'h-9 text-xs',
        lg: 'h-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
    },
  }
);

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: string;
  label?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, inputSize, error, label, helperText, ...props }, ref) => {
    const inputVariant = error ? 'error' : variant;

    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          className={cn(inputVariants({ variant: inputVariant, inputSize, className }))}
          ref={ref}
          {...props}
        />
        {(error || helperText) && (
          <p className={cn(
            'text-xs',
            error ? 'text-error-600' : 'text-gray-500'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
```

### Card Components
```typescript
// src/components/ui/Card.tsx
import React, { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@utils/helpers';

const cardVariants = cva(
  'rounded-lg border bg-white text-gray-950 shadow-sm',
  {
    variants: {
      variant: {
        default: 'border-gray-200',
        outlined: 'border-2 border-gray-300',
        elevated: 'shadow-md border-gray-100',
      },
      padding: {
        none: '',
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
    },
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
);

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
);

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-gray-500', className)}
      {...props}
    />
  )
);

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
);

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardTitle.displayName = 'CardTitle';
CardDescription.displayName = 'CardDescription';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
```

## Layout Components

### Container System
```typescript
// src/components/layout/Container.tsx
import React, { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@utils/helpers';

const containerVariants = cva(
  'mx-auto w-full',
  {
    variants: {
      size: {
        sm: 'max-w-screen-sm',
        md: 'max-w-screen-md',
        lg: 'max-w-screen-lg',
        xl: 'max-w-screen-xl',
        '2xl': 'max-w-screen-2xl',
        full: 'max-w-full',
      },
      padding: {
        none: '',
        sm: 'px-4 sm:px-6',
        default: 'px-4 sm:px-6 lg:px-8',
        lg: 'px-6 sm:px-8 lg:px-12',
      },
    },
    defaultVariants: {
      size: 'xl',
      padding: 'default',
    },
  }
);

export interface ContainerProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(containerVariants({ size, padding, className }))}
        {...props}
      />
    );
  }
);

Container.displayName = 'Container';

export { Container, containerVariants };
```

### Grid System
```typescript
// src/components/layout/Grid.tsx
import React, { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@utils/helpers';

const gridVariants = cva(
  'grid',
  {
    variants: {
      cols: {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        6: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6',
        12: 'grid-cols-12',
      },
      gap: {
        none: 'gap-0',
        sm: 'gap-2',
        default: 'gap-4',
        md: 'gap-6',
        lg: 'gap-8',
        xl: 'gap-12',
      },
    },
    defaultVariants: {
      cols: 1,
      gap: 'default',
    },
  }
);

export interface GridProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {}

const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols, gap, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(gridVariants({ cols, gap, className }))}
        {...props}
      />
    );
  }
);

Grid.displayName = 'Grid';

export { Grid, gridVariants };
```

## Typography System

### Text Components
```typescript
// src/components/ui/Typography.tsx
import React, { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@utils/helpers';

const typographyVariants = cva(
  '',
  {
    variants: {
      variant: {
        h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
        h2: 'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
        h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
        h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
        p: 'leading-7 [&:not(:first-child)]:mt-6',
        blockquote: 'mt-6 border-l-2 pl-6 italic',
        code: 'relative rounded bg-gray-100 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
        lead: 'text-xl text-gray-600',
        large: 'text-lg font-semibold',
        small: 'text-sm font-medium leading-none',
        muted: 'text-sm text-gray-500',
      },
    },
    defaultVariants: {
      variant: 'p',
    },
  }
);

export interface TypographyProps
  extends HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: keyof JSX.IntrinsicElements;
}

const Typography = forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, as, ...props }, ref) => {
    const Component = as || getDefaultElement(variant);
    
    return (
      <Component
        ref={ref}
        className={cn(typographyVariants({ variant, className }))}
        {...props}
      />
    );
  }
);

function getDefaultElement(variant: TypographyProps['variant']) {
  switch (variant) {
    case 'h1':
      return 'h1';
    case 'h2':
      return 'h2';
    case 'h3':
      return 'h3';
    case 'h4':
      return 'h4';
    case 'blockquote':
      return 'blockquote';
    case 'code':
      return 'code';
    default:
      return 'p';
  }
}

Typography.displayName = 'Typography';

export { Typography, typographyVariants };
```

## Utility Classes

### Custom CSS Classes
```css
/* src/styles/components.css */
@layer components {
  /* Button Groups */
  .btn-group {
    @apply inline-flex rounded-md shadow-sm;
  }

  .btn-group > .btn:not(:first-child) {
    @apply -ml-px rounded-l-none;
  }

  .btn-group > .btn:not(:last-child) {
    @apply rounded-r-none;
  }

  /* Form Groups */
  .form-group {
    @apply space-y-1;
  }

  .form-label {
    @apply block text-sm font-medium text-gray-700;
  }

  .form-input {
    @apply block w-full rounded-md border-gray-300 shadow-sm;
    @apply focus:border-primary-500 focus:ring-primary-500;
  }

  .form-error {
    @apply text-sm text-error-600;
  }

  .form-help {
    @apply text-sm text-gray-500;
  }

  /* Status Indicators */
  .status-badge {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }

  .status-success {
    @apply bg-success-100 text-success-800;
  }

  .status-warning {
    @apply bg-warning-100 text-warning-800;
  }

  .status-error {
    @apply bg-error-100 text-error-800;
  }

  .status-info {
    @apply bg-blue-100 text-blue-800;
  }

  /* Loading States */
  .loading-overlay {
    @apply absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center;
  }

  .loading-spinner {
    @apply animate-spin h-5 w-5 text-primary-500;
  }

  /* Interactive Elements */
  .interactive {
    @apply transition-colors duration-200 ease-in-out;
    @apply hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
  }

  .clickable {
    @apply cursor-pointer select-none;
  }

  /* Layout Utilities */
  .center {
    @apply flex items-center justify-center;
  }

  .full-screen {
    @apply min-h-screen w-full;
  }

  .card-hover {
    @apply transition-shadow duration-200 ease-in-out hover:shadow-lg;
  }
}

@layer utilities {
  /* Custom utilities */
  .text-balance {
    text-wrap: balance;
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  .animate-fade-in {
    animation: fadeIn 0.5s ease-in-out forwards;
  }

  .animate-slide-up {
    animation: slideUp 0.3s ease-out forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { 
      opacity: 0; 
      transform: translateY(10px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
}
```

## Design Tokens

### Design System Constants
```typescript
// src/styles/tokens.ts
export const designTokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#16a34a',
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706',
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626',
    },
  },
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
  },
  typography: {
    fontSizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
};

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};
```

This comprehensive Tailwind design system provides a solid foundation for consistent, maintainable, and scalable React applications with proper theming, component variants, and utility classes.