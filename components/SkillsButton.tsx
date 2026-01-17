import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { Icon } from './Icon';

interface SkillsButtonProps {
  level: number;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}

export const SkillsButton: React.FC<SkillsButtonProps> = ({
  level,
  onPress,
  size = 'md',
  variant = 'secondary',
  disabled = false,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme, isDark]);
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 28 : 24;
  const buttonHeight = size === 'sm' ? 32 : size === 'lg' ? 44 : 40;
  const borderRadius = buttonHeight / 2;
  
  const iconColor = variant === 'ghost' 
    ? theme.colors.icon.default 
    : variant === 'secondary'
    ? theme.colors.text.secondary
    : theme.colors.primary[500];

  // Use dynamic tint based on theme - dark for dark mode, light for light mode
  const blurTint = isDark ? 'dark' : 'light';
  const activeOpacity = 0.7;

  // Use a fallback level of 1 if level is undefined or 0
  const displayLevel = level || 1;

  const buttonContent = (
    <View style={styles.buttonContent}>
      <Text style={[styles.levelBadge, { color: disabled ? theme.colors.disabled.text : theme.colors.text.primary }]}>
        {displayLevel}
      </Text>
      <Icon 
        name="military_tech" 
        size={16}
        color={disabled ? theme.colors.disabled.inactive : (isDark ? theme.colors.text.primary : theme.colors.black)}
      />
    </View>
  );

  // In dark mode, completely remove BlurView and use solid View
  if (isDark) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={activeOpacity}
        style={[
          styles.glassButtonWrapper,
          { height: buttonHeight, borderRadius, minWidth: buttonHeight + 20 },
          style,
        ]}
      >
        <View
          style={[
            styles.glassButton,
            { height: buttonHeight, borderRadius, minWidth: buttonHeight + 20 },
            disabled && styles.disabled,
            { backgroundColor: theme.colors.background.card },
          ]}
        >
          {buttonContent}
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
          { height: buttonHeight, borderRadius, minWidth: buttonHeight + 20 },
          style,
        ]}
      >
        <BlurView 
          intensity={100} 
          tint={blurTint}
          style={[
            styles.glassButton,
            { height: buttonHeight, borderRadius, minWidth: buttonHeight + 20 },
            disabled && styles.disabled,
          ]}
        >
        {buttonContent}
      </BlurView>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  glassButtonWrapper: {
    overflow: 'hidden',
  },
  glassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  levelBadge: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
    includeFontPadding: false,
  },
  disabled: {
    opacity: 0.6,
  },
});
