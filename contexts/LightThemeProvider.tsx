import React, { createContext, useContext, ReactNode } from 'react';
import { lightTheme, Theme } from '../utils/theme';

interface LightThemeContextType {
  theme: Theme;
  mode: 'light';
  setMode: (mode: 'light') => void;
  isDark: false;
}

export const LightThemeContext = createContext<LightThemeContextType | undefined>(undefined);

/**
 * LightThemeProvider - Forces light theme regardless of system settings
 * 
 * Use this to wrap components that should always be in light mode,
 * such as the onboarding flow.
 */
export const LightThemeProvider = ({ children }: { children: ReactNode }) => {
  const value: LightThemeContextType = {
    theme: lightTheme,
    mode: 'light',
    setMode: () => {}, // No-op since we always use light
    isDark: false,
  };

  return (
    <LightThemeContext.Provider value={value}>
      {children}
    </LightThemeContext.Provider>
  );
};

/**
 * useLightTheme - Hook to access light theme context
 * 
 * This hook will always return the light theme, even if used within
 * a regular ThemeProvider. Use this in onboarding components.
 */
export const useLightTheme = () => {
  const context = useContext(LightThemeContext);
  if (!context) {
    // If not wrapped in LightThemeProvider, just return light theme directly
    // This prevents circular dependency issues
    return {
      theme: lightTheme,
      mode: 'light' as const,
      setMode: () => {},
      isDark: false,
    };
  }
  return context;
};
