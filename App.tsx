/**
 * App.tsx - Root Application Component
 * 
 * This is the main entry point of the React Native application.
 * It sets up the core providers and components that the entire app needs.
 * 
 * Structure:
 * 1. AuthProvider - Provides authentication context to entire app
 * 2. Navigation - Main navigation component (authentication-aware)
 * 3. StatusBar - Controls the system status bar appearance
 * 
 * Why this order matters:
 * - AuthProvider must wrap Navigation because Navigation uses useAuthContext()
 * - StatusBar can be anywhere, but we put it at the end for clarity
 * - This ensures all components have access to authentication state
 * 
 * Key concept for junior developers:
 * The component hierarchy here determines what has access to what:
 * - AuthProvider provides auth state to Navigation and all its children
 * - Navigation can access auth state and route users accordingly
 * - All screens inside Navigation can also access auth state
 * 
 * Authentication methods available:
 * - Native Apple Sign In (iOS only) - uses native iOS widget
 * - Google OAuth (all platforms) - uses web browser flow
 * - Email/password authentication
 * - Magic link (passwordless email) authentication
 */

import { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Appearance, ColorSchemeName, Animated } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Navigation from './navigation';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { EntitlementsProvider } from './contexts/EntitlementsContext';
import { SessionProvider } from './contexts/SessionContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { ToastProvider } from './components/toast/ToastProvider';
import { CreateDreamProvider } from './contexts/CreateDreamContext';
import { DataProvider } from './contexts/DataContext';
import { notificationService } from './lib/NotificationService';
import { initializeRevenueCat } from './lib/revenueCat';
import { initializeMixpanel, getMixpanelStatus } from './lib/mixpanel';
import { theme } from './utils/theme';
import { AchievementPopup } from './components/AchievementPopup';

// Globally disable font scaling to ensure consistent UI across devices
// This overrides system accessibility settings to maintain the "virtual iPhone" layout on iPad
if ((Text as any).defaultProps == null) {
  (Text as any).defaultProps = {};
}
(Text as any).defaultProps.allowFontScaling = false;

if ((TextInput as any).defaultProps == null) {
  (TextInput as any).defaultProps = {};
}
(TextInput as any).defaultProps.allowFontScaling = false;

type ThemeMode = 'light' | 'dark' | 'system';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  // Load saved theme preference immediately (before services initialize)
  useLayoutEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('theme_mode');
        if (savedMode) {
          setThemeMode(savedMode as ThemeMode);
        }
        setThemeLoaded(true);
      } catch (error) {
        console.error('Failed to load theme preference', error);
        setThemeLoaded(true); // Still mark as loaded even on error
      }
    };
    loadTheme();
  }, []);

  // Initialize services when app starts
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize notifications
        await notificationService.initialize();
        
        // Initialize RevenueCat (will use mock if no API key provided)
        const revenueCatApiKey = Constants.expoConfig?.extra?.revenueCatApiKey;
        console.log('🔑 RevenueCat API Key being used:', revenueCatApiKey ? revenueCatApiKey.substring(0, 15) + '...' : 'NOT SET');
        await initializeRevenueCat(revenueCatApiKey);
        
        // Initialize Mixpanel (will use no-op if no token provided)
        const mixpanelToken = Constants.expoConfig?.extra?.mixpanelToken;
        const mixpanelServerURL = Constants.expoConfig?.extra?.mixpanelServerURL;
        console.log('📊 Mixpanel Token being used:', mixpanelToken ? mixpanelToken.substring(0, 15) + '...' : 'NOT SET');
        console.log('🌍 Mixpanel Server URL:', mixpanelServerURL || 'https://api.mixpanel.com (US default)');
        await initializeMixpanel(mixpanelToken, mixpanelServerURL);
        
        // Log Mixpanel status for debugging
        const mixpanelStatus = getMixpanelStatus();
        console.log('📊 Mixpanel Status:', mixpanelStatus);
        
        console.log('All services initialized successfully');
        
        // TEMPORARY: Force splash screen to show for 3 seconds for testing
        setTimeout(() => {
          setIsInitialized(true);
          // Fade out splash screen smoothly
          Animated.timing(splashOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowSplash(false);
          });
        }, 3000);
      } catch (error) {
        console.error('Error initializing services:', error);
        // Still set initialized to true to prevent app from hanging
        setTimeout(() => {
          setIsInitialized(true);
          // Fade out splash screen smoothly
          Animated.timing(splashOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowSplash(false);
          });
        }, 3000);
      }
    };
    initializeServices();

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  // Calculate isDark based on saved theme preference (same logic as ThemeContext)
  // Only use the loaded theme mode after it's loaded - default to light mode until theme loads
  // This prevents showing dark mode when user prefers light mode
  // Handle null systemScheme by defaulting to light mode
  const isDark = themeLoaded 
    ? (themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark'))
    : false; // Default to light mode until theme preference is loaded
  // Ensure we never use dark mode if systemScheme is null (handle edge case)
  const safeIsDark = isDark && systemScheme !== null;
  const splashStyles = createSplashStyles(safeIsDark);
  
  // Show loading screen while services are initializing OR theme is not loaded yet
  // This prevents flash by ensuring theme is ready before showing the app
  const shouldShowSplashContent = !isInitialized || !themeLoaded || showSplash;

  // Use the same background as app screens to prevent flash
  // In dark mode: use the dark grey from splash screen (#302F2F)
  // In light mode: use the page background color (grey[200] = #E5E7EB) to match app screens
  const appBackgroundColor = isDark ? '#302F2F' : '#E5E7EB';

  return (
    <View style={{ flex: 1, backgroundColor: appBackgroundColor }}>
      {/* App content - always render but may be hidden behind splash */}
      <ThemeProvider initialMode={themeMode}>
        <AuthProvider>
          <EntitlementsProvider>
            <SessionProvider>
            <DataProvider>
              <AchievementPopup />
              <OnboardingProvider>
                <ToastProvider>
                  <CreateDreamProvider>
                    <Navigation />
                  </CreateDreamProvider>
                  <StatusBar style="auto" />
                </ToastProvider>
              </OnboardingProvider>
            </DataProvider>
          </SessionProvider>
        </EntitlementsProvider>
      </AuthProvider>
      </ThemeProvider>
      
      {/* Splash screen overlay - fades out smoothly */}
      {shouldShowSplashContent && (
        <Animated.View 
          style={[
            splashStyles.splashContainer,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: splashOpacity,
            }
          ]}
          pointerEvents={isInitialized && themeLoaded ? 'none' : 'auto'}
        >
          <View style={splashStyles.titleContainer}>
            <Image 
              source={require('./assets/star.png')} 
              style={splashStyles.splashIcon}
              contentFit="contain"
            />
            <Text style={splashStyles.splashText}>Dreamer</Text>
          </View>
          <StatusBar style="auto" />
        </Animated.View>
      )}
    </View>
  );
}

const createSplashStyles = (isDark: boolean) => StyleSheet.create({
  splashContainer: {
    flex: 1,
    // Match the app's page background color to prevent flash
    // In dark mode: dark grey (#302F2F)
    // In light mode: page background (grey[200] = #E5E7EB) to match app screens
    backgroundColor: isDark ? '#302F2F' : '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splashIcon: {
    width: 40,
    height: 40,
    marginRight: theme.spacing.sm,
  },
  splashText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: isDark ? '#FFFFFF' : theme.colors.text.primary,
  },
});
