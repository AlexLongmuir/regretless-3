import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../utils/theme';

interface ProgressProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  label?: string;
  height?: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  showLabel = false,
  label,
  height = 8,
  color = theme.colors.primary[500],
  backgroundColor = theme.colors.grey[200],
  style,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label || `${Math.round(percentage)}%`}</Text>
        </View>
      )}
      <View
        style={[
          styles.track,
          { height, backgroundColor, borderRadius: height / 2 },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              height,
              backgroundColor: color,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    marginBottom: theme.spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.grey[700],
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    transition: 'width 0.3s ease',
  },
});