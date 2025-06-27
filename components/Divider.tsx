import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../utils/theme';

interface DividerProps {
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  color?: string;
  thickness?: number;
  style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({
  label,
  orientation = 'horizontal',
  color = theme.colors.grey[200],
  thickness = 1,
  style,
}) => {
  if (orientation === 'vertical') {
    return (
      <View
        style={[
          styles.vertical,
          { backgroundColor: color, width: thickness },
          style,
        ]}
      />
    );
  }

  if (label) {
    return (
      <View style={[styles.labelContainer, style]}>
        <View style={[styles.line, { backgroundColor: color, height: thickness }]} />
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.line, { backgroundColor: color, height: thickness }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        { backgroundColor: color, height: thickness },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    width: '100%',
  },
  vertical: {
    height: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  line: {
    flex: 1,
  },
  label: {
    marginHorizontal: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.grey[500],
    fontWeight: '500',
  },
});