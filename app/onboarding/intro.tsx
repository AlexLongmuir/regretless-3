/**
 * Intro Step - First screen showing the main app interface
 * 
 * Shows what the app looks like with sample dreams before onboarding
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { preloadOnboardingImages, onboardingImages } from '../../utils/preloadOnboardingImages';

const IntroStep: React.FC = () => {
  const navigation = useNavigation();

  // Preload all onboarding images when this screen mounts
  // This ensures images are ready instantly when users navigate through onboarding
  useEffect(() => {
    preloadOnboardingImages();
  }, []);

  const handleContinue = () => {
    navigation.navigate('Welcome' as never);
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/images/onboarding/screenshots/DreamsPage.png')} 
        style={styles.screenshot}
        resizeMode="contain"
      />

      <View style={styles.content}>
        <Text style={styles.title}>Make Your Dreams Real</Text>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Continue"
            onPress={handleContinue}
            variant="black"
            style={styles.button}
          />
          
          {/* Temporary test button - remove in production */}
          {/* <Button
            title="🧪 Test Purchase Flow"
            onPress={() => navigation.navigate('TrialContinuation' as never)}
            variant="outline"
            style={[styles.button, styles.testButton]}
          /> */}
          
          <Text style={styles.signInText}>
            Already purchased? <Text style={styles.signInLink} onPress={() => navigation.navigate('PostPurchaseSignIn' as never)}>Sign in</Text>
          </Text>
          
          <Text style={styles.skipText} onPress={() => navigation.navigate('TrialOffer' as never)}>
            Skip to purchase
          </Text>
        </View>
      </View>

      {/* Force load critical onboarding images by rendering them invisibly to ensure instant navigation */}
      <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }} pointerEvents="none">
        <Image source={onboardingImages.individualityImage} />
        <Image source={onboardingImages.cityImage} />
        <Image source={onboardingImages.silhouetteImage} />
      </View>
    </View>
  );
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl * 2,
  },
  screenshot: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.6,
    marginBottom: theme.spacing.xl,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title1,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    marginBottom: theme.spacing.lg,
    borderRadius: theme.radius.xl,
  },
  testButton: {
    marginBottom: theme.spacing.md,
    borderColor: theme.colors.primary[500],
    borderWidth: 2,
  },
  signInText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  signInLink: {
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[900],
  },
  skipText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginTop: theme.spacing.md,
    textDecorationLine: 'underline',
  },
});

export default IntroStep;
