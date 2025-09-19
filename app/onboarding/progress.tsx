/**
 * Progress Step - We're setting everything up for you
 * 
 * Shows progress with variable messages and 10s delay before auto-navigation
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { OnboardingHeader } from '../../components/onboarding';

const progressMessages = [
  "Analyzing your responses...",
  "Generating personalized recommendations...",
  "Creating your custom plan...",
  "Optimizing for your goals...",
  "Finalizing your results...",
  "Almost ready...",
];

const ProgressStep: React.FC = () => {
  const navigation = useNavigation();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Progress animation over 10 seconds
    const progressAnimation = Animated.timing(animatedValue, {
      toValue: 1,
      duration: 10000,
      useNativeDriver: false,
    });

    // Message rotation every 1.5 seconds
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % progressMessages.length);
    }, 1500);

    // Progress update every 100ms
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 1;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          // Auto-navigate to final page
          setTimeout(() => {
            navigation.navigate('Final' as never);
          }, 500);
        }
        return newProgress;
      });
    }, 100);

    progressAnimation.start();

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
      progressAnimation.stop();
    };
  }, [navigation, animatedValue]);

  const handleBack = () => {
    navigation.goBack();
  };

  const progressWidth = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        onBack={handleBack}
        showProgress={true}
      />
      
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressPercentage}>{progress}%</Text>
          <Text style={styles.progressTitle}>We're setting everything up for you</Text>
        </View>

        <View style={styles.messageContainer}>
          <Text style={styles.currentMessage}>
            {progressMessages[currentMessageIndex]}
          </Text>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Finalising Results</Text>
          
          <View style={styles.checklistContainer}>
            <View style={styles.checklistItem}>
              <View style={[styles.checkbox, progress > 8 && styles.checkboxChecked]} />
              <Text style={styles.checklistText}>Creating your personalized dream plan</Text>
            </View>
            <View style={styles.checklistSubItems}>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 16 && styles.checkboxChecked]} />
                <Text style={styles.checklistText}>Goal areas and timeline</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 24 && styles.checkboxChecked]} />
                <Text style={styles.checklistText}>Daily action recommendations</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 32 && styles.checkboxChecked]} />
                <Text style={styles.checklistText}>Progress tracking system</Text>
              </View>
            </View>
            
            <View style={styles.checklistItem}>
              <View style={[styles.checkbox, progress > 40 && styles.checkboxChecked]} />
              <Text style={styles.checklistText}>Setting up your daily workflow</Text>
            </View>
            <View style={styles.checklistSubItems}>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 48 && styles.checkboxChecked]} />
                <Text style={styles.checklistText}>Today's action cards</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 56 && styles.checkboxChecked]} />
                <Text style={styles.checklistText}>Progress photo gallery</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 64 && styles.checkboxChecked]} />
                <Text style={styles.checklistText}>Streak tracking</Text>
              </View>
            </View>
            
            <View style={styles.checklistItem}>
              <View style={[styles.checkbox, progress > 72 && styles.checkboxChecked]} />
              <Text style={styles.checklistText}>Preparing your progress dashboard</Text>
            </View>
            <View style={styles.checklistSubItems}>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 80 && styles.checkboxChecked]} />
                <Text style={styles.checklistText}>Weekly/monthly analytics</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 88 && styles.checkboxChecked]} />
                <Text style={styles.checklistText}>Achievement milestones</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 96 && styles.checkboxChecked]} />
                <Text style={styles.checklistText}>AI-powered insights</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing['3xl'],
  },
  progressPercentage: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 48,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.md,
  },
  progressTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[700],
    textAlign: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
    minHeight: 40,
  },
  currentMessage: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailsTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.md,
  },
  checklistContainer: {
    gap: theme.spacing.sm,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.grey[300],
    marginRight: theme.spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  checklistText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.grey[700],
  },
  checklistSubItems: {
    marginLeft: 24,
  },
});

export default ProgressStep;
