import React, { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseClient } from '../lib/supabaseClient';
import { lightTheme, darkTheme, Theme } from '../utils/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children, initialMode }: { children: ReactNode; initialMode?: ThemeMode }) => {
  const [mode, setMode] = useState<ThemeMode>(initialMode || 'system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  // Load theme immediately using useLayoutEffect for faster initial load
  useLayoutEffect(() => {
    // If initialMode was provided, use it and skip loading (already loaded in App.tsx)
    if (initialMode) {
      return;
    }
    
    // Load saved theme preference - prioritize AsyncStorage for fast initial load
    const loadTheme = async () => {
      try {
        // First, load from AsyncStorage immediately (fast, local)
        const savedMode = await AsyncStorage.getItem('theme_mode');
        if (savedMode) {
          setMode(savedMode as ThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme from AsyncStorage', error);
      }
    };
    loadTheme();
  }, [initialMode]);

  // Load from database after initial render (slower, but authoritative)
  useEffect(() => {
    const syncFromDatabase = async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('theme_mode')
            .eq('user_id', user.id)
            .single();

          if (!error && profile?.theme_mode) {
            const savedMode = await AsyncStorage.getItem('theme_mode');
            // Only update if different from AsyncStorage value
            if (profile.theme_mode !== savedMode) {
              setMode(profile.theme_mode as ThemeMode);
              // Sync to AsyncStorage for next time
              await AsyncStorage.setItem('theme_mode', profile.theme_mode);
            }
          }
        }
      } catch (error) {
        console.error('Failed to sync theme from database', error);
      }
    };
    syncFromDatabase();

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  const saveMode = async (newMode: ThemeMode) => {
    try {
      setMode(newMode);
      
      // Save to AsyncStorage immediately for fast local access
      await AsyncStorage.setItem('theme_mode', newMode);

      // Also save to database if user is authenticated
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const { error } = await supabaseClient
          .from('profiles')
          .update({ theme_mode: newMode })
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to save theme preference to database', error);
          // Continue even if database save fails - AsyncStorage backup is in place
        }
      }
    } catch (error) {
      console.error('Failed to save theme preference', error);
    }
  };

  const isDark =
    mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  const activeTheme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, mode, setMode: saveMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  // Check if we're inside a LightThemeProvider first (lazy require to avoid circular dependency)
  try {
    const lightThemeModule = require('./LightThemeProvider');
    const LightThemeContext = lightThemeModule.LightThemeContext;
    if (LightThemeContext) {
      const lightContext = useContext(LightThemeContext);
      if (lightContext) {
        return lightContext;
      }
    }
  } catch (e) {
    // LightThemeProvider not available, continue to regular theme
  }
  
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
