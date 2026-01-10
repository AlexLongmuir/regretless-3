import React from 'react';
import { StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../contexts/ThemeContext';

interface IconProps {
  name: string; // Changed to string to allow better compatibility if keyof check fails
  size?: number;
  color?: string;
  style?: any;
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color = 'white',
  style 
}) => {
  const { theme } = useTheme();
  // @ts-ignore
  const iconConfig = theme.icons[name];
  
  if (!iconConfig) {
    console.warn(`Icon "${name}" not found in theme.icons`);
    return null;
  }
  
  if (iconConfig.library === 'MaterialIcons') {
    return (
      <MaterialIcons 
        name={iconConfig.name} 
        size={size} 
        color={color}
        style={[styles.icon, style]}
      />
    );
  }
  
  if (iconConfig.library === 'FontAwesome') {
    return (
      <FontAwesome 
        name={iconConfig.name} 
        size={size} 
        color={color}
        style={[styles.icon, style]}
      />
    );
  }
  
  return null;
};

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
  },
});