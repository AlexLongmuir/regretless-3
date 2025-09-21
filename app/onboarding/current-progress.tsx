/**
 * Current Progress Step - Progress level selection screen
 * 
 * Asks user about their current progress in their dream
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TextInput } from 'react-native';
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
  const inputRef = useRef<TextInput>(null);

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
    Keyboard.dismiss(); // Close keyboard when continuing
    if (selectedAnswer || customProgress.trim()) {
      navigation.navigate('AchievementComparison' as never);
    }
  };

  const handleBack = () => {
    Keyboard.dismiss(); // Close keyboard when going back
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <OnboardingHeader 
        onBack={handleBack}
        showProgress={true}
      />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What's your current progress in your dream?</Text>
        
        <Input
          ref={inputRef}
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
        
        {/* Add spacing area before button */}
        <View style={styles.spacingArea} />
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
    </KeyboardAvoidingView>
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
    paddingBottom: theme.spacing['4xl'], // Extra padding to ensure content is scrollable above keyboard
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
    marginBottom: theme.spacing.lg, // Add spacing between input and first list row
  },
  spacingArea: {
    height: theme.spacing['4xl'], // Large spacing between input and button
  },
  optionsContainer: {
    gap: theme.spacing.sm,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.pageBackground, // Ensure footer has background
  },
  button: {
    width: '100%',
  },
});

export default CurrentProgressStep;
