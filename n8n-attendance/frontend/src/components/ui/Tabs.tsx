import React, { useState } from 'react';

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, children, className = '' }) => {
  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { value, onValueChange } as any);
        }
        return child;
      })}
    </div>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

export const TabsList: React.FC<TabsListProps> = ({ children, value, onValueChange }) => {
  return (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { value, onValueChange } as any);
        }
        return child;
      })}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value: triggerValue, children, value, onValueChange }) => {
  const isActive = value === triggerValue;
  
  return (
    <button
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        isActive 
          ? 'bg-white text-gray-900 shadow-sm' 
          : 'text-gray-600 hover:text-gray-900'
      }`}
      onClick={() => onValueChange?.(triggerValue)}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value: contentValue, children, value, className = '' }) => {
  if (value !== contentValue) return null;
  
  return (
    <div className={className}>
      {children}
    </div>
  );
};