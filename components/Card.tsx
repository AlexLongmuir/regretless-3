import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../utils/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
}) => {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  default: {
    backgroundColor: theme.colors.surface[50],
  },
  outlined: {
    backgroundColor: theme.colors.surface[50],
    borderWidth: 1,
    borderColor: theme.colors.grey[200],
  },
  elevated: {
    backgroundColor: theme.colors.surface[50],
    shadowColor: theme.colors.grey[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});