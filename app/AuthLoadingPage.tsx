/**
 * AuthLoadingPage - Loading Screen During Authentication Check
 * 
 * This component displays while the app is checking the user's authentication status.
 * It's shown when:
 * 1. App first loads and we're checking for an existing session
 * 2. Processing authentication redirects from OAuth or magic links
 * 3. Any other auth operations that need time to complete
 * 
 * Why we need this:
 * - Prevents showing the wrong screen while auth state is unknown
 * - Provides better UX than a blank screen or flash of content
 * - Gives users feedback that something is happening
 * 
 * This is a simple loading screen - you can enhance it with animations,
 * your app logo, or other branding elements.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../utils/theme';

export const AuthLoadingPage: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App logo or branding could go here */}
        <Text style={styles.appName}>Regretless</Text>
        
        {/* Loading indicator */}
        <ActivityIndicator 
          size="large" 
          color={theme.colors.primary[500]} 
          style={styles.spinner}
        />
        
        {/* Loading text */}
        <Text style={styles.loadingText}>Getting things ready...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  appName: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.largeTitle,
    color: theme.colors.primary[600],
    marginBottom: theme.spacing.xl,
  },
  spinner: {
    marginBottom: theme.spacing.md,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
});

export default AuthLoadingPage;