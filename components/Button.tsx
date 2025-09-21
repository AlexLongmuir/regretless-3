import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, View } from 'react-native';
import { theme } from '../utils/theme';
import { Icon } from './Icon';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'black' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  icon?: keyof typeof theme.icons;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  icon,
}) => {
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
      <View style={styles.content}>
        {icon && (
          <Icon 
            name={icon} 
            size={20} 
            color={variant === 'secondary' ? theme.colors.grey[800] : "white"}
          />
        )}
        <Text style={[
          styles.text, 
          styles[`${variant}Text` as keyof typeof styles], 
          disabled && styles.disabledText,
          icon && styles.textWithIcon
        ]}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
  },
  xs: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    minHeight: 24,
  },
  sm: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    minHeight: 32,
  },
  md: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  lg: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 52,
  },
  primary: {
    backgroundColor: theme.colors.primary[600],
  },
  secondary: {
    backgroundColor: 'white',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary[600],
  },
  black: {
    backgroundColor: theme.colors.black,
  },
  success: {
    backgroundColor: theme.colors.success[500],
  },
  disabled: {
    backgroundColor: theme.colors.grey[300],
    borderColor: theme.colors.grey[300],
  },
  text: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.callout,
  },
  primaryText: {
    color: theme.colors.surface[50],
  },
  secondaryText: {
    color: theme.colors.grey[800],
  },
  outlineText: {
    color: theme.colors.primary[600],
  },
  blackText: {
    color: '#ffffff',
  },
  successText: {
    color: '#ffffff',
  },
  disabledText: {
    color: theme.colors.grey[500],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWithIcon: {
    marginLeft: theme.spacing.sm,
  },
});