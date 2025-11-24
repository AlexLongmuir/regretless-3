import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, View } from 'react-native';
import { BlurView } from 'expo-blur';
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
  const iconSize = customIconSize || (size === 'sm' ? 18 : size === 'lg' ? 28 : 24);
  const buttonSize = size === 'sm' ? 32 : size === 'lg' ? 44 : 40;
  const borderRadius = buttonSize / 2;
  
  const iconColor = customIconColor || (variant === 'ghost' 
    ? theme.colors.grey[700] 
    : variant === 'secondary'
    ? theme.colors.grey[800]
    : variant === 'primary'
    ? theme.colors.grey[900]
    : theme.colors.grey[900]);

  const iconElement = (
    <Icon 
      name={icon} 
      size={iconSize} 
      color={disabled ? theme.colors.grey[400] : iconColor}
    />
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.glassButtonWrapper,
        { width: buttonSize, height: buttonSize, borderRadius },
        style,
      ]}
    >
      <BlurView 
        intensity={100} 
        tint="light" 
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

const styles = StyleSheet.create({
  glassButtonWrapper: {
    overflow: 'hidden',
  },
  glassButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
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