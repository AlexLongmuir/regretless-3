/**
 * Current Progress Step - Progress level selection screen
 * 
 * Asks user about their current progress in their dream
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { OnboardingHeader } from '../../components/onboarding';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { trackEvent } from '../../lib/mixpanel';


const CurrentProgressStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, updateAnswer } = useOnboardingContext();
  
  const [customProgress, setCustomProgress] = useState(state.answers[4] || '');
  const selectedAnswer = state.answers[4]; // Question ID 4 for current progress
  const inputRef = useRef<TextInput>(null);
  
  // Get the user's dream from the context (question ID 2)
  const userDream = state.answers[2] || 'your dream';

  // Initialize from context when component mounts or when navigating back
  useFocusEffect(
    React.useCallback(() => {
      const answer = state.answers[4] || '';
      if (answer) {
        setCustomProgress(answer);
      }
    }, [state.answers[4]])
  );

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'current_progress'
      });
    }, [])
  );


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
        
        <Text style={styles.dreamReminder}>
          Your dream: <Text style={styles.dreamText}>{userDream}</Text>
        </Text>
        
        <Text style={styles.explanation}>
          Help us create the best goal for you by sharing:
        </Text>
        <Text style={styles.bulletPoints}>
          • Where you've failed or succeeded before{'\n'}
          • What you enjoyed or didn't enjoy{'\n'}
          • What would help or not help you{'\n'}
          • Any relevant experiences or insights
        </Text>
        
        <Input
          ref={inputRef}
          value={customProgress}
          onChangeText={handleCustomInput}
          placeholder="Start writing or tap mic to speak..."
          variant="borderless"
          style={styles.input}
          multiline={true}
          showMicButton={true}
        />
        
        {/* Add spacing area before button */}
        <View style={styles.spacingArea} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="black"
          style={styles.button}
          disabled={!customProgress.trim()}
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
    marginBottom: theme.spacing.md,
  },
  dreamReminder: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[500],
    textAlign: 'left',
    marginBottom: theme.spacing['2xl'],
  },
  dreamText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[500],
  },
  input: {
    width: '100%',
    minHeight: 120,
    marginBottom: theme.spacing.lg,
  },
  explanation: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[500],
    textAlign: 'left',
    marginBottom: theme.spacing.sm,
  },
  bulletPoints: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[500],
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  spacingArea: {
    height: theme.spacing['4xl'], // Large spacing between input and button
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.pageBackground, // Ensure footer has background
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
});

export default CurrentProgressStep;
