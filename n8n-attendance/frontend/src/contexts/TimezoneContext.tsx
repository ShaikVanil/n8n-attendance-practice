import React, { createContext, useContext, useEffect, useState } from 'react';
import { locationService } from '../services/locationService';
import { setOfficeTimezone } from '../utils/dateUtils';

interface TimezoneContextType {
  officeTimezone: string;
  updateOfficeTimezone: (timezone: string) => void;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export const TimezoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [officeTimezone, setOfficeTimezoneState] = useState<string>('UTC');

  useEffect(() => {
    // Fetch office timezone from API
    const fetchOfficeTimezone = async () => {
      try {
        const offices = await locationService.getOfficeLocations();
        if (offices.length > 0) {
          const timezone = offices[0].timezone || 'UTC';
          setOfficeTimezoneState(timezone);
          setOfficeTimezone(timezone);
        }
      } catch (error) {
        console.error('Failed to fetch office timezone:', error);
      }
    };

    fetchOfficeTimezone();
  }, []);

  const updateOfficeTimezone = (timezone: string) => {
    setOfficeTimezoneState(timezone);
    setOfficeTimezone(timezone);
  };

  return (
    <TimezoneContext.Provider value={{ officeTimezone, updateOfficeTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
};

export const useTimezone = () => {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
};