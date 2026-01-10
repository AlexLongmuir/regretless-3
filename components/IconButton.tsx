import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { Icon } from './Icon';

interface IconButtonProps {
  icon: keyof typeof theme.icons;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
  iconColor?: string;
  iconSize?: number; // Custom icon size override
  iconWrapperStyle?: ViewStyle; // Style for wrapper around icon (e.g., marginLeft: -1)
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'md',
  variant = 'primary',
  disabled = false,
  style,
  iconColor: customIconColor,
  iconSize: customIconSize,
  iconWrapperStyle,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const iconSize = customIconSize || (size === 'sm' ? 18 : size === 'lg' ? 28 : 24);
  const buttonSize = size === 'sm' ? 32 : size === 'lg' ? 44 : 40;
  const borderRadius = buttonSize / 2;
  
  const iconColor = customIconColor || (variant === 'ghost' 
    ? theme.colors.icon.default 
    : variant === 'secondary'
    ? theme.colors.text.secondary
    : variant === 'primary'
    ? theme.colors.text.primary
    : theme.colors.text.primary);

  const iconElement = (
    <Icon 
      name={icon} 
      size={iconSize} 
      color={disabled ? theme.colors.disabled.inactive : iconColor}
    />
  );

  // Use dynamic tint based on theme - dark for dark mode, light for light mode
  const blurTint = isDark ? 'dark' : 'light';
  
  // Adjust activeOpacity for better contrast in dark mode
  // In dark mode, use lower opacity so the icon stays more visible
  const activeOpacity = isDark ? 0.7 : 0.8;

  // In dark mode, completely remove BlurView and use solid View to eliminate fuzzy edges
  if (isDark) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={activeOpacity}
        style={[
          styles.glassButtonWrapper,
          { width: buttonSize, height: buttonSize, borderRadius },
          style,
        ]}
      >
        <View
          style={[
            styles.glassButton,
            { width: buttonSize, height: buttonSize, borderRadius },
            disabled && styles.disabled,
            { backgroundColor: theme.colors.background.card },
          ]}
        >
          {iconWrapperStyle ? (
            <View style={iconWrapperStyle}>
              {iconElement}
            </View>
          ) : (
            iconElement
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // In light mode, use BlurView for glass effect
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      style={[
        styles.glassButtonWrapper,
        { width: buttonSize, height: buttonSize, borderRadius },
        style,
      ]}
    >
      <BlurView 
        intensity={100} 
        tint={blurTint}
        style={[
          styles.glassButton,
          { width: buttonSize, height: buttonSize, borderRadius },
          disabled && styles.disabled,
        ]}
      >
        {iconWrapperStyle ? (
          <View style={iconWrapperStyle}>
            {iconElement}
          </View>
        ) : (
          iconElement
        )}
      </BlurView>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  glassButtonWrapper: {
    overflow: 'hidden',
  },
  glassButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.card + 'F0', // ~95% opacity (only used in light mode)
    borderWidth: 0.5,
    borderColor: theme.colors.border.default,
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabled: {
    opacity: 0.6,
  },
});