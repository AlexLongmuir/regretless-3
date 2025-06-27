/**
 * Root Layout Component
 * 
 * This is the main layout component that wraps the entire application.
 * It sets up the authentication context and navigation structure.
 * 
 * Structure:
 * 1. AuthProvider - Provides authentication state to entire app
 * 2. Navigation - Main navigation component that handles routing
 * 
 * Why this pattern:
 * - AuthProvider at the root ensures all components can access auth state
 * - Single place to initialize app-wide providers and setup
 * - Clean separation between authentication and navigation concerns
 */

import React from 'react';
import Navigation from '../navigation';
import { AuthProvider } from '../contexts/AuthContext';

export default function Layout() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}