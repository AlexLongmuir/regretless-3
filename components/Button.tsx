import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, View } from 'react-native';
import { theme } from '../utils/theme';
import { Icon } from './Icon';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
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
            color="white"
          />
        )}
        <Text style={[
          styles.text, 
          styles[`${variant}Text`], 
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
    backgroundColor: theme.colors.secondary[500],
  },
  outline: {
    backgroundColor: theme.colors.primary[600],
    borderWidth: 1,
    borderColor: theme.colors.primary[600],
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
    color: theme.colors.surface[50],
  },
  outlineText: {
    color: theme.colors.surface[50],
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