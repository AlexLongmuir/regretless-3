/**
 * Current Life Step - First question screen of onboarding
 * 
 * Asks user to describe their current life situation
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { EmojiListRow } from '../../components';
import { useOnboardingContext } from '../../contexts/OnboardingContext';

const lifeOptions = [
  { emoji: '😊', text: 'Content with my life' },
  { emoji: '🌱', text: 'Eager to learn more' },
  { emoji: '😐', text: 'Feeling neutral now' },
  { emoji: '😔', text: 'More downs than ups' },
  { emoji: '💔', text: 'Feeling lost and overwhelmed' },
  { emoji: '🤔', text: 'Reflecting on my goals' },
  { emoji: '💪', text: 'Determined to overcome challenges' },
];

const CurrentLifeStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, updateAnswer } = useOnboardingContext();
  
  const selectedAnswer = state.answers[1]; // Question ID 1 for current life

  const handleOptionSelect = (text: string) => {
    updateAnswer(1, text);
    // Auto-navigate to next page after selection
    navigation.navigate('MainDream' as never);
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
        <Text style={styles.title}>How would you describe your current life?</Text>
        
        <View style={styles.optionsContainer}>
          {lifeOptions.map((option, index) => (
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

export default CurrentLifeStep;
