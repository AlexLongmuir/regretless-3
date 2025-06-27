import React from 'react';
import { StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { theme } from '../utils/theme';

interface IconProps {
  name: keyof typeof theme.icons;
  size?: number;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color = 'white' 
}) => {
  const iconConfig = theme.icons[name];
  
  if (iconConfig.library === 'MaterialIcons') {
    return (
      <MaterialIcons 
        name={iconConfig.name} 
        size={size} 
        color={color}
        style={styles.icon}
      />
    );
  }
  
  if (iconConfig.library === 'FontAwesome') {
    return (
      <FontAwesome 
        name={iconConfig.name} 
        size={size} 
        color={color}
        style={styles.icon}
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