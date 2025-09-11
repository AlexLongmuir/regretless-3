import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../utils/theme';

interface AIRatingRingProps {
  rating: number;
  category: 'okay' | 'good' | 'very_good' | 'excellent';
  size?: number;
  strokeWidth?: number;
}

const AIRatingRing: React.FC<AIRatingRingProps> = ({ 
  rating, 
  category, 
  size = 120, 
  strokeWidth = 8 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (rating / 100) * circumference;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'excellent':
        return '#10B981'; // Green
      case 'very_good':
        return '#22C55E'; // Light Green
      case 'good':
        return '#F59E0B'; // Orange
      case 'okay':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'excellent':
        return 'Excellent';
      case 'very_good':
        return 'Very Good';
      case 'good':
        return 'Good';
      case 'okay':
        return 'Okay';
      default:
        return 'Unknown';
    }
  };

  const color = getCategoryColor(category);
  const label = getCategoryLabel(category);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.grey[400]}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      
      {/* Center content */}
      <View style={styles.centerContent}>
        <Text style={[styles.rating, { color }]}>{rating}</Text>
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rating: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default AIRatingRing;
