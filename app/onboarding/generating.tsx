/**
 * Generating Step - Time to generate your custom plan!
 * 
 * Shows generating animation with placeholder graphics
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { trackEvent } from '../../lib/mixpanel';

const GeneratingStep: React.FC = () => {
  const navigation = useNavigation();

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'generating'
      });
    }, [])
  );

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
        <Image 
          source={require('../../assets/images/onboarding/20250916_0842_Swirling Abstract Energy_simple_compose_01k58qjb1ae89sraq48r9636ze.png')}
          style={styles.onboardingImage}
          resizeMode="contain"
        />
        
        
        <Text style={styles.title}>Time to generate your custom plan!</Text>
        
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Continue"
          onPress={() => navigation.navigate('Progress' as never)}
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingImage: {
    width: 260,
    height: 260,
    marginBottom: theme.spacing.lg,
    borderRadius: 10,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing['3xl'],
  },
  buttonContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
});

export default GeneratingStep;
