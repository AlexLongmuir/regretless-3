import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { theme } from '../utils/theme';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  activeColor?: string;
  inactiveColor?: string;
  style?: ViewStyle;
}

export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  size = 'md',
  activeColor = theme.colors.primary[500],
  inactiveColor = theme.colors.grey[300],
  style,
}) => {
  const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  const toggleSwitch = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  const trackWidth = styles[size].width;
  const thumbSize = styles[`${size}Thumb`].width;
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, trackWidth - thumbSize - 2],
  });

  const trackColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });

  return (
    <Pressable
      style={[styles.container, style]}
      onPress={toggleSwitch}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.track,
          styles[size],
          { backgroundColor: trackColor },
          disabled && styles.disabled,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            styles[`${size}Thumb`],
            { transform: [{ translateX }] },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  track: {
    borderRadius: 999,
    justifyContent: 'center',
  },
  thumb: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: 999,
    shadowColor: theme.colors.grey[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  sm: {
    width: 36,
    height: 20,
  },
  smThumb: {
    width: 16,
    height: 16,
  },
  md: {
    width: 44,
    height: 24,
  },
  mdThumb: {
    width: 20,
    height: 20,
  },
  lg: {
    width: 52,
    height: 28,
  },
  lgThumb: {
    width: 24,
    height: 24,
  },
});