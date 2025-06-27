import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../utils/theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  style,
}) => {
  return (
    <View style={[styles.base, styles[size], styles[variant], style]}>
      <Text style={[styles.text, styles[`${variant}Text`], styles[`${size}Text`]]}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    minHeight: 20,
  },
  md: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    minHeight: 24,
  },
  lg: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 32,
  },
  primary: {
    backgroundColor: theme.colors.primary[100],
  },
  secondary: {
    backgroundColor: theme.colors.secondary[100],
  },
  success: {
    backgroundColor: theme.colors.success[100],
  },
  warning: {
    backgroundColor: theme.colors.warning[100],
  },
  error: {
    backgroundColor: theme.colors.error[100],
  },
  text: {
    fontFamily: theme.typography.fontFamily.system,
    fontWeight: theme.typography.fontWeight.semibold as any,
  },
  smText: {
    fontSize: theme.typography.fontSize.caption2,
    lineHeight: theme.typography.lineHeight.caption2,
  },
  mdText: {
    fontSize: theme.typography.fontSize.caption1,
    lineHeight: theme.typography.lineHeight.caption1,
  },
  lgText: {
    fontSize: theme.typography.fontSize.subheadline,
    lineHeight: theme.typography.lineHeight.subheadline,
  },
  primaryText: {
    color: theme.colors.primary[700],
  },
  secondaryText: {
    color: theme.colors.secondary[700],
  },
  successText: {
    color: theme.colors.success[700],
  },
  warningText: {
    color: theme.colors.warning[700],
  },
  errorText: {
    color: theme.colors.error[700],
  },
});