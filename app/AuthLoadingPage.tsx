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

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';

export const AuthLoadingPage: React.FC = () => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  
  return (
    <View style={styles.splashContainer}>
      <View style={styles.titleContainer}>
        <Image 
          source={require('../assets/star.png')} 
          style={styles.splashIcon}
          contentFit="contain"
        />
        <Text style={styles.splashText}>Dreamer</Text>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  splashContainer: {
    flex: 1,
    // Match the app's page background color to prevent flash
    // In dark mode: dark grey (#302F2F)
    // In light mode: page background (grey[200] = #E5E7EB) to match app screens
    backgroundColor: isDark ? '#302F2F' : theme.colors.background.page,
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

export default AuthLoadingPage;