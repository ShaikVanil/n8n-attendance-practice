import React from 'react';

interface AlertProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive';
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const Alert: React.FC<AlertProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  onClick
}) => {
  const baseClasses = 'p-4 rounded-md border';
  
  const variantClasses = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    destructive: 'bg-red-50 border-red-200 text-red-800'
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface AlertDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`text-sm ${className}`}>
      {children}
    </div>
  );
};