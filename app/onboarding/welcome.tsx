/**
 * Welcome Step - First screen of onboarding
 * 
 * Introduces the app and welcomes the user to the journey
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader, OnboardingImage } from '../../components/onboarding';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { getDefaultImages, getDefaultImagesPublic } from '../../frontend-services/backend-bridge';
import { supabaseClient } from '../../lib/supabaseClient';

// Use the individuality image for welcome screen
const individualityImage = require('../../assets/images/onboarding/20250916_0844_Individuality Amidst Motion_simple_compose_01k58qptvqfr5awmazzyd181js.png');

const WelcomeStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, setPreloadedDefaultImages } = useOnboardingContext();

  // Preload images on mount if not already loaded
  useEffect(() => {
    if (state.preloadedDefaultImages !== null && state.preloadedDefaultImages !== undefined) {
      // Already preloaded, skip
      return
    }

    const preloadImages = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        
        let response: any;
        
        if (session?.access_token) {
          response = await getDefaultImages(session.access_token);
        } else {
          response = await getDefaultImagesPublic();
        }
        
        if (response && response.success && response.data && Array.isArray(response.data.images) && response.data.images.length > 0) {
          // Prefetch all images in parallel
          await Promise.all(
            response.data.images.map((image: any) => {
              if (image && image.signed_url) {
                return Image.prefetch(image.signed_url).catch(() => {
                  // Silently fail individual prefetches
                })
              }
              return Promise.resolve()
            })
          )
          
          // Store in context
          setPreloadedDefaultImages(response.data.images)
        }
      } catch (error) {
        // Silently fail - image selection page will fetch on demand
        console.error('Failed to preload images:', error)
      }
    }

    preloadImages()
  }, [state.preloadedDefaultImages, setPreloadedDefaultImages])

  const handleContinue = () => {
    navigation.navigate('Name' as never);
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        showProgress={true}
        showBackButton={true}
        onBack={() => navigation.goBack()}
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
    borderRadius: theme.radius.xl,
  },
});

export default WelcomeStep;
