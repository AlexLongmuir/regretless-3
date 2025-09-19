/**
 * Obstacles Step - What's stopping you from reaching your goals?
 * 
 * Asks user to identify obstacles preventing them from reaching their goals
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { EmojiListRow } from '../../components';
import { useOnboardingContext } from '../../contexts/OnboardingContext';

const obstacleOptions = [
  { emoji: '🚫', text: 'Fear of taking risks' },
  { emoji: '⏰', text: 'Procrastination and time mismanagement' },
  { emoji: '😔', text: 'Lack of motivation or support' },
  { emoji: '💰', text: 'Insufficient funds or resources' },
  { emoji: '🧠', text: 'Negative mindset or self-doubt' },
  { emoji: '🔄', text: 'Inability to adapt to change' },
  { emoji: '😰', text: 'Fear of failure or rejection' },
];

const ObstaclesStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, updateAnswer } = useOnboardingContext();
  
  const selectedAnswer = state.answers[10]; // Question ID 10 for obstacles

  const handleOptionSelect = (text: string) => {
    updateAnswer(10, text);
    // Auto-navigate to next page after selection
    navigation.navigate('Motivation' as never);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        onBack={handleBack}
        showProgress={true}
      />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>What's stopping you from reaching your goals?</Text>
        
        <View style={styles.optionsContainer}>
          {obstacleOptions.map((option, index) => (
            <EmojiListRow
              key={index}
              emoji={option.emoji}
              text={option.text}
              type="navigate"
              onNavigate={() => handleOptionSelect(option.text)}
            />
          ))}
        </View>
      </ScrollView>

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
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.grey[900],
    textAlign: 'left',
    marginBottom: theme.spacing['2xl'],
  },
  optionsContainer: {
    gap: theme.spacing.sm,
  },
});

export default ObstaclesStep;
