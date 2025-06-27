/**
 * Navigation Root - Authentication-Aware Navigation Container
 * 
 * This is the main navigation file that handles routing based on authentication state.
 * It demonstrates a key React Native pattern: conditional navigation based on app state.
 * 
 * Navigation Structure:
 * 1. If auth is loading → Show loading screen
 * 2. If user is not authenticated → Show auth screens (login, signup)
 * 3. If user is authenticated → Show main app screens (home, dreams, profile)
 * 
 * Why this pattern:
 * - Clean separation between authenticated and unauthenticated flows
 * - Prevents flashing wrong screens during auth state changes
 * - Centralized place to handle deep links and auth redirects
 * - Follows React Navigation best practices
 * 
 * Key Concepts for Junior Developers:
 * - NavigationContainer: Root component that manages navigation state
 * - Conditional rendering: Different navigation stacks based on auth state
 * - Deep linking: Handling URLs that open specific screens in the app
 * - Stack Navigator: Manages screen transitions with a stack-like behavior
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import pages
import HomePage from '../app/HomePage';
import ProfilePage from '../app/ProfilePage';
import DreamsPage from '../app/DreamsPage';
import LoginPage from '../app/LoginPage';
import AuthLoadingPage from '../app/AuthLoadingPage';

// Import components and hooks
import { BottomNavigation } from '../components/BottomNavigation';
import { useAuthContext } from '../contexts/AuthContext';

// Create stack navigators
const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

/**
 * AuthNavigator - Navigation for unauthenticated users
 * 
 * This navigator handles screens that users see when not logged in.
 * Currently just has login, but you could add:
 * - Onboarding screens
 * - Terms of service
 * - Password reset screens
 * - etc.
 */
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginPage} />
  </AuthStack.Navigator>
);

/**
 * MainNavigator - Navigation for authenticated users
 * 
 * This navigator handles the main app experience for logged-in users.
 * It uses a custom tab navigation approach rather than React Navigation's
 * bottom tabs to match your existing design.
 * 
 * How it works:
 * 1. State tracks which tab is active
 * 2. BottomNavigation component handles tab switching
 * 3. Screen content changes based on active tab
 * 
 * Alternative approach: You could replace this with React Navigation's
 * createBottomTabNavigator for more standard navigation patterns.
 */
const MainNavigator = () => {
  const [activeTab, setActiveTab] = useState('Home');

  /**
   * Handle tab press events
   * Updates the active tab state, which triggers re-render with new screen
   */
  const handleTabPress = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  /**
   * Get the appropriate screen component based on active tab
   * This is a simple way to handle tab navigation without React Navigation tabs
   */
  const getScreenComponent = () => {
    switch (activeTab) {
      case 'Dreams':
        return DreamsPage;
      case 'Profile':
        return ProfilePage;
      default:
        return HomePage;
    }
  };

  // Get the component for the currently active tab
  const ScreenComponent = getScreenComponent();

  return (
    <View style={styles.container}>
      {/* Main content area - renders the active tab's screen */}
      <View style={styles.screenContainer}>
        <ScreenComponent />
      </View>
      
      {/* Bottom navigation - always visible for authenticated users */}
      <BottomNavigation
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />
    </View>
  );
};

/**
 * AppNavigator - Main app navigation logic
 * 
 * This component decides which navigation stack to show based on auth state.
 * It's the core of our authentication-aware navigation.
 * 
 * Navigation Flow:
 * 1. App loads → AuthContext checks for existing session → loading = true
 * 2. Session check completes → loading = false, isAuthenticated is determined
 * 3. Based on isAuthenticated, show either AuthNavigator or MainNavigator
 * 
 * This pattern ensures users never see the wrong screens during auth transitions.
 */
const AppNavigator = () => {
  // Get authentication state from context
  const { isAuthenticated, loading, handleAuthRedirect } = useAuthContext();

  /**
   * Handle deep linking for authentication
   * 
   * This effect sets up a listener for URLs that open the app.
   * Most importantly, it handles OAuth and magic link redirects.
   * 
   * How it works:
   * 1. Listen for URL events when app is already running
   * 2. Check if app was opened with a URL when it launches
   * 3. If URL matches auth callback pattern, process it
   * 
   * Example URLs this handles:
   * - regretless://auth/callback?access_token=...  (magic link)
   * - regretless://auth/callback#access_token=...  (OAuth)
   */
  useEffect(() => {
    /**
     * Handle URL when app is already running
     * This fires when user clicks a link while app is in background/foreground
     */
    const handleUrlEvent = async (event: { url: string }) => {
      console.log('Received URL while app running:', event.url);
      
      // Check if this is an auth callback URL
      if (event.url.includes('auth/callback')) {
        await handleAuthRedirect(event.url);
      }
    };

    /**
     * Handle URL when app is launched from closed state
     * This checks if the app was opened with a URL
     */
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      
      if (initialUrl) {
        console.log('App launched with URL:', initialUrl);
        
        // Check if this is an auth callback URL
        if (initialUrl.includes('auth/callback')) {
          await handleAuthRedirect(initialUrl);
        }
      }
    };

    // Set up the URL event listener
    const urlSubscription = Linking.addEventListener('url', handleUrlEvent);
    
    // Check for initial URL
    handleInitialUrl();

    // Cleanup listener when component unmounts
    return () => {
      urlSubscription.remove();
    };
  }, [handleAuthRedirect]);

  // Show loading screen while checking authentication status
  if (loading) {
    return <AuthLoadingPage />;
  }

  // Show appropriate navigation stack based on authentication status
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        // User is logged in - show main app
        <MainStack.Screen name="Main" component={MainNavigator} />
      ) : (
        // User is not logged in - show authentication screens
        <MainStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </MainStack.Navigator>
  );
};

/**
 * Styles for the navigation components
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
});

/**
 * Root Navigation Component
 * 
 * This is the main export that gets used in App.tsx or layout.tsx.
 * It wraps everything in NavigationContainer, which is required for React Navigation.
 * 
 * NavigationContainer responsibilities:
 * - Manages navigation state
 * - Handles deep linking
 * - Provides navigation context to child components
 * - Handles hardware back button on Android
 * 
 * Why we export as default function:
 * - Simple, clean API for the root component
 * - NavigationContainer only needs to be rendered once in the app
 * - Keeps navigation setup encapsulated in this file
 */
export default () => (
  <NavigationContainer>
    <AppNavigator />
  </NavigationContainer>
);