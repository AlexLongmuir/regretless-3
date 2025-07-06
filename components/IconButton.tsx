import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../utils/theme';
import { Icon } from './Icon';

interface IconButtonProps {
  icon: keyof typeof theme.icons;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
  iconColor?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'md',
  variant = 'primary',
  disabled = false,
  style,
  iconColor: customIconColor,
}) => {
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 28 : 24;
  const iconColor = customIconColor || (variant === 'ghost' 
    ? theme.colors.grey[700] 
    : variant === 'secondary'
    ? theme.colors.grey[800]
    : theme.colors.surface[50]);

  return (
    <Pressable
      style={[
        styles.base,
        styles[size],
        styles[variant],
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Icon 
        name={icon} 
        size={iconSize} 
        color={iconColor}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
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
    width: 44,
    height: 44,
  },
  primary: {
    backgroundColor: theme.colors.primary[600],
  },
  secondary: {
    backgroundColor: theme.colors.defaultGrey,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: theme.colors.grey[300],
    opacity: 0.6,
  },
});