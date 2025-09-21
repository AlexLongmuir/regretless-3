/**
 * Main Dream Step - Second question screen of onboarding
 * 
 * Asks user about their main dream with input field and preset options
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

const dreamPresets = [
  { emoji: '✨', text: 'Achieve financial freedom' },
  { emoji: '🌍', text: 'Travel to every continent' },
  { emoji: '🎨', text: 'Master a new skill or hobby' },
  { emoji: '📚', text: 'Write a bestselling book' },
  { emoji: '🎶', text: 'Learn to play a musical instrument' },
  { emoji: '💡', text: 'Develop a growth mindset' },
  { emoji: '🧘‍♀️', text: 'Cultivate inner peace and mindfulness' },
];

const MainDreamStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, updateAnswer } = useOnboardingContext();
  
  const [customDream, setCustomDream] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState(''); // Local state for selected answer
  const inputRef = useRef<TextInput>(null);

  const handlePresetSelect = (text: string) => {
    setSelectedAnswer(text);
    updateAnswer(2, text);
    setCustomDream(text);
  };

  const handleCustomInput = (text: string) => {
    setCustomDream(text);
    setSelectedAnswer(''); // Clear any selected preset when typing custom input
    if (text.trim()) {
      updateAnswer(2, text.trim());
    }
  };

  const handleContinue = () => {
    Keyboard.dismiss(); // Close keyboard when continuing
    if (selectedAnswer || customDream.trim()) {
      navigation.navigate('RealisticGoal' as never);
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
        <Text style={styles.title}>What's the main dream you want to achieve?</Text>
        
        <Input
          ref={inputRef}
          value={customDream}
          onChangeText={handleCustomInput}
          placeholder="Start writing..."
          variant="borderless"
          style={styles.input}
        />

        <View style={styles.optionsContainer}>
          {dreamPresets.map((preset, index) => (
            <EmojiListRow
              key={index}
              emoji={preset.emoji}
              text={preset.text}
              type="select"
              onSelect={handlePresetSelect}
              isSelected={selectedAnswer === preset.text}
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
          disabled={!selectedAnswer && !customDream.trim()}
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

export default MainDreamStep;
