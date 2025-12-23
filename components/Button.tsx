import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, View, ActivityIndicator } from 'react-native';
import { theme } from '../utils/theme';
import { Icon } from './Icon';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'black' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: keyof typeof theme.icons;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  icon,
}) => {
  const isDisabled = disabled || loading;
  const textColor = variant === 'secondary' ? theme.colors.grey[800] : theme.colors.text.inverse;
  const indicatorColor = variant === 'secondary' ? theme.colors.grey[800] : theme.colors.text.inverse;

  return (
    <Pressable
      style={[
        styles.base,
        styles[size],
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={indicatorColor} />
        ) : (
          <>
            {icon && (
              <Icon 
                name={icon} 
                size={20} 
                color={variant === 'secondary' ? theme.colors.grey[800] : theme.colors.text.inverse}
              />
            )}
            <Text style={[
              styles.text, 
              styles[`${variant}Text` as keyof typeof styles], 
              isDisabled && styles.disabledText,
              icon && styles.textWithIcon
            ]}>
              {title}
            </Text>
          </>
        )}
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
    backgroundColor: theme.colors.background.card,
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
    color: theme.colors.text.inverse,
  },
  successText: {
    color: theme.colors.text.inverse,
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