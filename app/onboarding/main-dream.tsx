/**
 * Main Dream Step - Second question screen of onboarding
 * 
 * Asks user about their main dream with input field and preset options
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { OnboardingHeader } from '../../components/onboarding';
import { EmojiListRow } from '../../components';
import { DreamInputActions } from '../../components/DreamInputActions';
import { CelebritySelector, preloadCelebrities, preloadCelebrityDreams } from '../../components/CelebritySelector';
import { DreamboardUpload } from '../../components/DreamboardUpload';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { trackEvent } from '../../lib/mixpanel';

const dreamPresets = [
  { emoji: '💰', text: 'Launch my online business that generates £1,000 / month' },
  { emoji: '🌍', text: 'Travel to every continent' },
  { emoji: '🗣️', text: 'Become proficient in a new language and have a 10-minute conversation' },
  { emoji: '💻', text: 'Learn to code and build my first website in 4 months' },
  { emoji: '🏠', text: 'Save £25,000 for a house deposit' },
  { emoji: '📚', text: 'Read and apply principles from one new book each month for a year' },
  { emoji: '🎹', text: 'Learn to play 3 complete songs on piano' },
  { emoji: '👥', text: 'Overcome social anxiety and handle stress better in all situations' },
  { emoji: '🍳', text: 'Learn to cook 20 authentic dishes from different cuisines' },
  { emoji: '📸', text: 'Master photography and take 50 portfolio-worthy photos' },
  { emoji: '🌅', text: 'Transform my daily habits and build a sustainable morning routine' },
];

const MainDreamStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, updateAnswer } = useOnboardingContext();
  
  // Initialize from context - check if answer matches a preset
  const savedAnswer = state.answers[2] || '';
  const matchingPreset = dreamPresets.find(preset => preset.text === savedAnswer);
  
  const [customDream, setCustomDream] = useState(matchingPreset ? '' : savedAnswer);
  const [selectedAnswer, setSelectedAnswer] = useState(matchingPreset ? savedAnswer : ''); // Local state for selected answer
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showCelebs, setShowCelebs] = useState(false);
  const [showDreamboard, setShowDreamboard] = useState(false);
  const [personalized, setPersonalized] = useState<{ title: string; emoji?: string }[]>([]);

  // Preload celebrities and dreams when component mounts
  React.useEffect(() => {
    const preload = async () => {
      try {
        await preloadCelebrities()
        // Preload dreams (will skip if no auth - handled internally)
        await preloadCelebrityDreams().catch(e => {
          // Silently fail - dreams will be fetched when needed
        });
      } catch (e) {
        console.log('Failed to preload celebrities:', e);
      }
    };
    preload();
  }, []);

  // Initialize from context when component mounts or when navigating back
  useFocusEffect(
    React.useCallback(() => {
      const answer = state.answers[2] || '';
      if (answer) {
        const matchingPreset = dreamPresets.find(preset => preset.text === answer);
        if (matchingPreset) {
          setSelectedAnswer(answer);
          setCustomDream(answer);
        } else {
          setSelectedAnswer('');
          setCustomDream(answer);
        }
      }
    }, [state.answers[2]])
  );

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'dream_setup'
      });
    }, [])
  );

  const handlePresetSelect = (text: string) => {
    setSelectedAnswer(text);
    updateAnswer(2, text);
    setCustomDream(text);
    // Scroll to top to show the input field
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  const handleCustomInput = (text: string) => {
    setCustomDream(text);
    setSelectedAnswer(''); // Clear any selected preset when typing custom input
    if (text.trim()) {
      updateAnswer(2, text.trim());
    }
  };

  const handleContinue = () => {
    trackEvent('onboarding_started');
    Keyboard.dismiss(); // Close keyboard when continuing
    if (selectedAnswer || customDream.trim()) {
      navigation.navigate('RealisticGoal' as never);
    }
  };


  const handleGenerated = (dreams: { title: string; emoji?: string }[]) => {
    setPersonalized(prev => {
      // merge unique by title
      const map = new Map<string, { title: string; emoji?: string }>();
      [...prev, ...dreams].forEach(d => map.set(d.title, d));
      return Array.from(map.values());
    });
    // scroll to personalized section
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
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
        ref={scrollViewRef}
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

        <DreamInputActions
          title="Need inspiration?"
          onOpenCelebrities={() => setShowCelebs(true)}
          onOpenDreamboard={() => setShowDreamboard(true)}
        />

        {/* Personalized suggestions now live inside the bottom sheets (not on base page) */}

        <Text style={styles.optionsLabel}>Frequently chosen goals</Text>
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

      <CelebritySelector
        visible={showCelebs}
        onClose={() => setShowCelebs(false)}
        onGenerated={handleGenerated}
        onSelectTitle={handlePresetSelect}
      />
      <DreamboardUpload
        visible={showDreamboard}
        onClose={() => setShowDreamboard(false)}
        onGenerated={handleGenerated}
        onSelectTitle={handlePresetSelect}
      />
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
  optionsLabel: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.md,
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
    borderRadius: theme.radius.xl,
  },
});

export default MainDreamStep;
