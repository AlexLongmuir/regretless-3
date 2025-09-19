/**
 * OnboardingImage - Shared image component for onboarding screens
 * 
 * Provides consistent image styling with the notebook writing image
 */

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { theme } from '../../utils/theme';

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
  return (
    <View style={styles.container}>
      <Image
        source={source}
        style={[styles.image, { borderRadius }, style]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
