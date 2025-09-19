/**
 * Motivation Step - What's the biggest reason you want to achieve your dreams?
 * 
 * Asks user to identify their primary motivation for achieving their dreams
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { EmojiListRow } from '../../components';
import { useOnboardingContext } from '../../contexts/OnboardingContext';

const motivationOptions = [
  { emoji: '⭐', text: 'Make my family proud' },
  { emoji: '🏆', text: 'Inspire others' },
  { emoji: '🌈', text: 'Live without regrets' },
  { emoji: '🤝', text: 'Connect with inspiring individuals' },
  { emoji: '❤️', text: 'Find a meaningful relationship' },
  { emoji: '🌍', text: 'Embrace every adventure' },
  { emoji: '🎉', text: 'Experience life to its fullest' },
];

const MotivationStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, updateAnswer } = useOnboardingContext();
  
  const selectedAnswer = state.answers[11]; // Question ID 11 for motivation

  const handleOptionSelect = (text: string) => {
    updateAnswer(11, text);
    // Auto-navigate to next page after selection
    navigation.navigate('Potential' as never);
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
        <Text style={styles.title}>What's the biggest reason you want to achieve your dreams?</Text>
        
        <View style={styles.optionsContainer}>
          {motivationOptions.map((option, index) => (
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

export default MotivationStep;
