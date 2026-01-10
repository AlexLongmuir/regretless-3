/**
 * OnboardingImage - Shared image component for onboarding screens
 * 
 * Provides consistent image styling with the notebook writing image
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme } from '../../utils/theme';

interface OnboardingImageProps {
  source: any;
  style?: any;
  borderRadius?: number;
}

export const OnboardingImage: React.FC<OnboardingImageProps> = ({
  source,
  style,
  borderRadius = 16,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  return (
    <View style={styles.container}>
      <Image
        source={source}
        style={[styles.image, { borderRadius }, style]}
        contentFit="contain"
        transition={0}
      />
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.xl,
  },
  image: {
    width: 280,
    height: 280,
  },
});
