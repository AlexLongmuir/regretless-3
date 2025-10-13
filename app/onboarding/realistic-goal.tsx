/**
 * Realistic Goal Step - Motivational screen showing goal is realistic
 * 
 * Shows motivational content about achieving dreams
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader, OnboardingImage } from '../../components/onboarding';
import { useOnboardingContext } from '../../contexts/OnboardingContext';

// Use the golden hour energy image for realistic goal screen
const goldenHourImage = require('../../assets/images/onboarding/20250916_0844_Golden-Hour Energy_simple_compose_01k58qq3znfbt9k5x9xktgcb5t.png');

const RealisticGoalStep: React.FC = () => {
  const navigation = useNavigation();
  const { state } = useOnboardingContext();
  
  // Get the dream from the context (question ID 2)
  const userDream = state.answers[2] || 'your dream';

  const handleContinue = () => {
    navigation.navigate('DreamImage' as never);
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
      
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <OnboardingImage source={goldenHourImage} borderRadius={10} />
        </View>
        
        <Text style={styles.title}>
          <Text style={styles.dreamText}>{userDream}</Text>
          <Text style={styles.titleText}> is totally within reach! We'll help you get there.</Text>
        </Text>
        
        <Text style={styles.description}>
          After using Dreamer, 90% of users report a clear and sustained progress towards achieving their dreams.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="black"
          style={styles.button}
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
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  dreamText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 24,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: 30,
    color: theme.colors.gold,
  },
  titleText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 24,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: 30,
    color: theme.colors.black,
  },
  description: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: 20,
    color: theme.colors.black,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  button: {
    width: '100%',
  },
});

export default RealisticGoalStep;
