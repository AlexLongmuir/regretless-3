/**
 * contexts/SessionContext.tsx
 * 
 * Session state management for the app that tracks user session lifecycle
 * and stores session-specific data that should reset when the app goes to background.
 * 
 * Key features:
 * - Tracks app session lifecycle using AppState listener
 * - Stores session-specific state (like selected date in TodayPage)
 * - Automatically clears session data when app goes to background and returns
 * - Provides simple get/set interface for session data
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Session data structure
 */
interface SessionData {
  selectedDate?: string; // ISO date string for TodayPage selected date
  [key: string]: any; // Allow other session data to be stored
}

/**
 * Context interface
 */
interface SessionContextType {
  getSessionData: <T = any>(key: string) => T | undefined;
  setSessionData: <T = any>(key: string, value: T) => void;
  clearSession: () => void;
  isSessionActive: boolean;
}

const SessionContext = createContext<SessionContextType | null>(null);

/**
 * SessionProvider Component
 * 
 * Manages app session lifecycle and provides session data storage.
 * Session data is cleared when the app goes to background and returns to foreground.
 */
export const SessionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [sessionData, setSessionData] = useState<SessionData>({});
  const [isSessionActive, setIsSessionActive] = useState(true);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const sessionStartTime = useRef<number>(Date.now());

  // Track app state changes to detect background/foreground transitions
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousAppState = appState.current;
      appState.current = nextAppState;

      // If app was in background/inactive and now active, clear session data
      if (previousAppState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App returned from background, clearing session data');
        setSessionData({});
        setIsSessionActive(true);
        sessionStartTime.current = Date.now();
      }
      // If app goes to background/inactive, mark session as inactive
      else if (nextAppState.match(/inactive|background/)) {
        console.log('App went to background, marking session as inactive');
        setIsSessionActive(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Get session data by key
  const getSessionData = useCallback(<T = any>(key: string): T | undefined => {
    return sessionData[key] as T | undefined;
  }, [sessionData]);

  // Set session data by key
  const setSessionDataValue = useCallback(<T = any>(key: string, value: T) => {
    setSessionData(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Clear all session data
  const clearSession = useCallback(() => {
    setSessionData({});
  }, []);

  const value: SessionContextType = {
    getSessionData,
    setSessionData: setSessionDataValue,
    clearSession,
    isSessionActive
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

/**
 * Custom hook to use session context
 */
export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
