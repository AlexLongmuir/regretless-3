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

import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import Navigation from './navigation';
import { AuthProvider } from './contexts/AuthContext';
import { EntitlementsProvider } from './contexts/EntitlementsContext';
import { SessionProvider } from './contexts/SessionContext';
import { ToastProvider } from './components/toast/ToastProvider';
import { CreateDreamProvider } from './contexts/CreateDreamContext';
import { DataProvider } from './contexts/DataContext';
import { notificationService } from './lib/NotificationService';
import { initializeRevenueCat } from './lib/revenueCat';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

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
        
        console.log('All services initialized successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing services:', error);
        // Still set initialized to true to prevent app from hanging
        setIsInitialized(true);
      }
    };
    initializeServices();
  }, []);

  // Show loading screen while services are initializing
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initializing...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <EntitlementsProvider>
        <SessionProvider>
          <DataProvider>
            <ToastProvider>
              <CreateDreamProvider>
                <Navigation />
              </CreateDreamProvider>
              <StatusBar style="auto" />
            </ToastProvider>
          </DataProvider>
        </SessionProvider>
      </EntitlementsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});
