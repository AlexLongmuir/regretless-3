import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  title?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  title,
}) => {
  const progressPercentage = Math.min((currentStep / totalSteps) * 100, 100);

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={styles.progressTrack}>
        <View 
          style={[
            styles.progressFill,
            { width: `${progressPercentage}%` }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.grey[700],
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  progressTrack: {
    height: 6,
    backgroundColor: theme.colors.grey[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[500],
    borderRadius: 3,
  },
});