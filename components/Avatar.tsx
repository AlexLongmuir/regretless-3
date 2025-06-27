import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../utils/theme';

interface AvatarProps {
  name?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  backgroundColor?: string;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  initials,
  size = 'md',
  backgroundColor,
  style,
}) => {
  const getInitials = (fullName: string): string => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayInitials = initials || (name ? getInitials(name) : '?');

  return (
    <View
      style={[
        styles.base,
        styles[size],
        backgroundColor ? { backgroundColor } : styles.defaultBackground,
        style,
      ]}
    >
      <Text style={[styles.text, styles[`${size}Text`]]}>
        {displayInitials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  sm: {
    width: 32,
    height: 32,
  },
  md: {
    width: 40,
    height: 40,
  },
  lg: {
    width: 56,
    height: 56,
  },
  xl: {
    width: 80,
    height: 80,
  },
  defaultBackground: {
    backgroundColor: theme.colors.primary[500],
  },
  text: {
    color: theme.colors.surface[50],
    fontWeight: '600',
  },
  smText: {
    fontSize: 12,
  },
  mdText: {
    fontSize: 16,
  },
  lgText: {
    fontSize: 20,
  },
  xlText: {
    fontSize: 28,
  },
});