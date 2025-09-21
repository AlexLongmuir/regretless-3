/**
 * Name Step - Second screen of onboarding
 * 
 * User enters their name to personalize the experience
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TextInput, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { OnboardingHeader, OnboardingImage } from '../../components/onboarding';
import { useOnboardingContext } from '../../contexts/OnboardingContext';

// Use the golden city sunrise image for name screen
const cityImage = require('../../assets/images/onboarding/20250916_0840_Golden City Sunrise_simple_compose_01k58qf6d3ekhv8gkph5ac0ygy.png');

const NameStep: React.FC = () => {
  const navigation = useNavigation();
  const { updateName } = useOnboardingContext();
  const [name, setName] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleContinue = () => {
    Keyboard.dismiss(); // Close keyboard when continuing
    if (name.trim()) {
      updateName(name.trim());
      navigation.navigate('Understanding' as never);
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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <OnboardingImage source={cityImage} borderRadius={10} />
          </View>
          
          <Text style={styles.title}>What's your name?</Text>
          
          <Input
            ref={inputRef}
            value={name}
            onChangeText={setName}
            placeholder="Start writing..."
            variant="borderless"
            style={styles.input}
          />
        </View>
        
        {/* Add spacing area before button */}
        <View style={styles.spacingArea} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="black"
          disabled={!name.trim()}
          style={styles.button}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground, // Grey background like create flow
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing['4xl'], // Extra padding to ensure content is scrollable above keyboard
  },
  content: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
    minHeight: '100%', // Ensure content takes full height
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.grey[900],
    textAlign: 'left',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  input: {
    width: '100%',
    marginBottom: 0, // Remove margin since we have spacing area
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
  },
});

export default NameStep;
