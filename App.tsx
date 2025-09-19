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
import { useEffect } from 'react';
import Navigation from './navigation';
import { AuthProvider } from './contexts/AuthContext';
import { EntitlementsProvider } from './contexts/EntitlementsContext';
import { ToastProvider } from './components/toast/ToastProvider';
import { CreateDreamProvider } from './contexts/CreateDreamContext';
import { DataProvider } from './contexts/DataContext';
import { notificationService } from './lib/NotificationService';
import { initializeRevenueCat } from './lib/revenueCat';

export default function App() {
  // Initialize services when app starts
  useEffect(() => {
    const initializeServices = async () => {
      // Initialize notifications
      await notificationService.initialize();
      
      // Initialize RevenueCat (will use mock if no API key provided)
      // Replace with your actual RevenueCat public API key when ready
      await initializeRevenueCat(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY);
    };
    initializeServices();
  }, []);

  return (
    <AuthProvider>
      <EntitlementsProvider>
        <DataProvider>
          <ToastProvider>
            <CreateDreamProvider>
              <Navigation />
            </CreateDreamProvider>
            <StatusBar style="auto" />
          </ToastProvider>
        </DataProvider>
      </EntitlementsProvider>
    </AuthProvider>
  );
}
