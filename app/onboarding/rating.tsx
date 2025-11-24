/**
 * Rating Step - Give us a rating
 * 
 * Shows user rating interface with stars and testimonial
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';

const RatingStep: React.FC = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const promptForReview = async () => {
      try {
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          await StoreReview.requestReview();
        }
      } catch (error) {
        console.log('Store review prompt unavailable', error);
      }
    };

    promptForReview();
  }, []);

  const handleContinue = () => {
    navigation.navigate('Generating' as never);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <Text key={index} style={styles.starEmoji}>⭐</Text>
    ));
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        onBack={handleBack}
        showProgress={true}
      />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Give us a rating</Text>
        
        <View style={styles.ratingContainer}>
          <View style={styles.starsContainer}>
            {renderStars()}
          </View>
          
          <Text style={styles.subtitle}>Dreamer was made for people like you</Text>
          
          <View style={styles.userCountContainer}>
            <View style={styles.avatarContainer}>
              <Image 
                source={require('../../assets/images/onboarding/user-images/20250916_1911_Professional Woman Portrait_simple_compose_01k59vj1yje2vrjgm9xmqk2jz1.png')}
                style={styles.avatar}
              />
              <Image 
                source={require('../../assets/images/onboarding/user-images/20250916_1912_Cafe Portrait Relaxation_simple_compose_01k59vhpmvfhxr16vh7ckf2nke.png')}
                style={styles.avatar}
              />
              <Image 
                source={require('../../assets/images/onboarding/user-images/20250916_1906_Casual Indoor Selfie_simple_compose_01k59v95vsfgrb7s3sftspaqnc.png')}
                style={styles.avatar}
              />
            </View>
            <Text style={styles.userCountText}>+ many more Dreamer users</Text>
          </View>
        </View>

        <View style={styles.testimonialCard}>
          <View style={styles.testimonialHeader}>
            <Image 
              source={require('../../assets/images/onboarding/user-images/20250916_1907_Street Selfie Moment_simple_compose_01k59vbb8te8vs2fe7yv8c4t92.png')}
              style={styles.testimonialAvatar}
            />
            <View style={styles.testimonialInfo}>
              <Text style={styles.testimonialName}>Marcus Johnson</Text>
              <View style={styles.testimonialStars}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Text key={index} style={styles.smallStar}>⭐</Text>
                ))}
              </View>
            </View>
          </View>
          <Text style={styles.testimonialText}>
            "I wanted to start my own fitness coaching business. Dreamer helped me create a clear plan and I'm now helping 20+ clients reach their goals!"
          </Text>
        </View>

        <View style={styles.testimonialCard}>
          <View style={styles.testimonialHeader}>
            <Image 
              source={require('../../assets/images/onboarding/user-images/20250916_1904_Golden Hour Portrait_simple_compose_01k59v5jqpfy5t97a7p5rqck6b.png')}
              style={styles.testimonialAvatar}
            />
            <View style={styles.testimonialInfo}>
              <Text style={styles.testimonialName}>Sarah Chen</Text>
              <View style={styles.testimonialStars}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Text key={index} style={styles.smallStar}>⭐</Text>
                ))}
              </View>
            </View>
          </View>
          <Text style={styles.testimonialText}>
            "I finally learned Spanish and landed my dream job in Barcelona! Dreamer broke down my goal into manageable daily actions that actually worked."
          </Text>
        </View>

        <View style={styles.testimonialCard}>
          <View style={styles.testimonialHeader}>
            <Image 
              source={require('../../assets/images/onboarding/user-images/20250916_1904_Cafe Portrait Relaxation_simple_compose_01k59v5zd1f7aa9dpecjwgh8xe.png')}
              style={styles.testimonialAvatar}
            />
            <View style={styles.testimonialInfo}>
              <Text style={styles.testimonialName}>Priya Patel</Text>
              <View style={styles.testimonialStars}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Text key={index} style={styles.smallStar}>⭐</Text>
                ))}
              </View>
            </View>
          </View>
          <Text style={styles.testimonialText}>
            "I dreamed of writing a novel for years but never knew where to start. Dreamer gave me daily writing goals and I finished my first draft in 6 months!"
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="primary"
          size="lg"
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
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing['2xl'],
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  starEmoji: {
    fontSize: 32,
    marginHorizontal: theme.spacing.sm,
  },
  smallStar: {
    fontSize: 12,
    marginRight: 2,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  userCountContainer: {
    alignItems: 'center',
  },
  avatarContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginLeft: -20,
    borderWidth: 4,
    borderColor: 'white',
  },
  userCountText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.grey[600],
  },
  testimonialCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  testimonialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.md,
  },
  testimonialInfo: {
    flex: 1,
  },
  testimonialName: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[900],
    marginBottom: 4,
  },
  testimonialStars: {
    flexDirection: 'row',
  },
  testimonialText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.grey[700],
    lineHeight: 20,
    fontStyle: 'italic',
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

export default RatingStep;
