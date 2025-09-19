/**
 * Welcome Step - First screen of onboarding
 * 
 * Introduces the app and welcomes the user to the journey
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader, OnboardingImage } from '../../components/onboarding';

// Use the individuality image for welcome screen
const individualityImage = require('../../assets/images/onboarding/20250916_0844_Individuality Amidst Motion_simple_compose_01k58qptvqfr5awmazzyd181js.png');

const WelcomeStep: React.FC = () => {
  const navigation = useNavigation();

  const handleContinue = () => {
    navigation.navigate('Name' as never);
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        showProgress={true}
        showBackButton={true}
        onBack={() => navigation.navigate('Intro' as never)}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Dreamer</Text>
        <Text style={styles.subtitle}>Where your dreams are made real</Text>
        
        <OnboardingImage source={individualityImage} borderRadius={10} />
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
    backgroundColor: theme.colors.pageBackground, // Grey background like create flow
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.largeTitle,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  button: {
    width: '100%',
  },
});

export default WelcomeStep;
