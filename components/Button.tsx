import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, View, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { Icon } from './Icon';
import { triggerHaptic } from '../utils/haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'black' | 'success' | 'inverse';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: string;
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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const isDisabled = disabled || loading;
  const textColor =
    variant === 'secondary' ? theme.colors.text.primary
    : variant === 'inverse' ? theme.colors.black
    : theme.colors.text.inverse;
  const indicatorColor =
    variant === 'secondary' ? theme.colors.text.primary
    : variant === 'inverse' ? theme.colors.black
    : theme.colors.text.inverse;

  const handlePress = () => {
    if (!isDisabled) {
      triggerHaptic();
    }
    onPress();
  };

  return (
    <Pressable
      style={[
        styles.base,
        styles[size],
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
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
                color={textColor}
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

const createStyles = (theme: Theme) => StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl, // Max border radius for fully rounded buttons
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
    borderWidth: 1,
    borderColor: theme.colors.border.default,
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
  inverse: {
    backgroundColor: theme.colors.white,
    borderWidth: 0,
  },
  disabled: {
    backgroundColor: theme.colors.disabled.inactive,
    borderColor: theme.colors.disabled.inactive,
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
    color: theme.colors.text.primary,
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
  inverseText: {
    color: theme.colors.black,
  },
  disabledText: {
    color: theme.colors.disabled.text,
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
