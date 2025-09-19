/**
 * Current Progress Step - Progress level selection screen
 * 
 * Asks user about their current progress in their dream
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { OnboardingHeader } from '../../components/onboarding';
import { EmojiListRow } from '../../components';
import { useOnboardingContext } from '../../contexts/OnboardingContext';

const progressOptions = [
  { emoji: '🌿', text: 'Gaining some experience' },
  { emoji: '🌳', text: 'Developing my skills' },
  { emoji: '🌟', text: 'Confident in my abilities' },
  { emoji: '🏆', text: 'Near master level' },
  { emoji: '🚀', text: 'Living my dream fully' },
];

const CurrentProgressStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, updateAnswer } = useOnboardingContext();
  
  const [customProgress, setCustomProgress] = useState('');
  const selectedAnswer = state.answers[4]; // Question ID 4 for current progress

  const handlePresetSelect = (text: string) => {
    updateAnswer(4, text);
    setCustomProgress(text);
  };

  const handleCustomInput = (text: string) => {
    setCustomProgress(text);
    if (text.trim()) {
      updateAnswer(4, text.trim());
    }
  };

  const handleContinue = () => {
    if (selectedAnswer || customProgress.trim()) {
      navigation.navigate('AchievementComparison' as never);
    }
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
        <Text style={styles.title}>What's your current progress in your dream?</Text>
        
        <Input
          value={customProgress}
          onChangeText={handleCustomInput}
          placeholder="Start writing..."
          variant="borderless"
          style={styles.input}
        />

        <View style={styles.optionsContainer}>
          {progressOptions.map((option, index) => (
            <EmojiListRow
              key={index}
              emoji={option.emoji}
              text={option.text}
              type="select"
              onSelect={handlePresetSelect}
              isSelected={selectedAnswer === option.text}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="black"
          style={styles.button}
          disabled={!selectedAnswer && !customProgress.trim()}
        />
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
  input: {
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  optionsContainer: {
    gap: theme.spacing.sm,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  button: {
    width: '100%',
  },
});

export default CurrentProgressStep;
