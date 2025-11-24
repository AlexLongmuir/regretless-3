/**
 * Understanding Step - Fourth screen of onboarding
 * 
 * Explains how the app works and what users can expect
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader, OnboardingImage } from '../../components/onboarding';
import { markOnboardingCompleted } from '../../utils/onboardingFlow';
import { useOnboardingContext } from '../../contexts/OnboardingContext';

// Use the silhouette moving forward image for understanding screen
const silhouetteImage = require('../../assets/images/onboarding/20250916_0855_Silhouette Moving Forward_simple_compose_01k58r9xcefs5rm7mgk7c0b9r5.png');

const UnderstandingStep: React.FC = () => {
  const navigation = useNavigation();
  const { state } = useOnboardingContext();

  const handleContinue = () => {
    navigation.navigate('CurrentLife' as never);
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
        <Text style={styles.title}>{state.name} help us understand more about your situation</Text>
        <Text style={styles.subtitle}>Answer all questions honestly</Text>
        
        <View style={styles.imageContainer}>
          <OnboardingImage source={silhouetteImage} borderRadius={10} />
        </View>
        
        <Text style={styles.description}>
          We will use the answers to design a tailor-made program to help you achieve your dreams in a way that works for you
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          title="Lets Start"
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
    backgroundColor: theme.colors.pageBackground, // Grey background like create flow
  },
  content: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.grey[900],
    textAlign: 'left',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: 20,
    color: theme.colors.black,
    textAlign: 'left',
    marginBottom: theme.spacing.md,
  },
  description: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: 20,
    color: theme.colors.black,
    textAlign: 'left',
    marginTop: theme.spacing.md,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
});

export default UnderstandingStep;
