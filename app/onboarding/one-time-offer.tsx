/**
 * One Time Offer Step - One-time offer with 30-second delay
 * 
 * Shows after holding 30 seconds on the last page with special discount offer
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { trackEvent } from '../../lib/mixpanel';

const OneTimeOfferStep: React.FC = () => {
  const navigation = useNavigation();
  const [showOffer, setShowOffer] = useState(false);
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'one_time_offer'
      });
    }, [])
  );

  const handleBack = () => {
    navigation.goBack();
  };

  useEffect(() => {
    console.log('OneTimeOfferStep mounted, starting 3-second timer...');
    // Show offer after 3 seconds
    const timer = setTimeout(() => {
      console.log('Timer completed, showing offer...');
      setShowOffer(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, 3000); // 3 seconds for testing

    return () => {
      console.log('Cleaning up timer...');
      clearTimeout(timer);
    };
  }, [fadeAnim, scaleAnim]);

  const handleClaimOffer = () => {
    // Handle claiming the offer
    console.log('Claiming limited offer');
    // Navigate to payment or next step
  };



  if (!showOffer) {
    return (
      <View style={styles.container}>
        <OnboardingHeader onBack={handleBack} />
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>Please wait...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OnboardingHeader onBack={handleBack} />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <Text style={styles.title}>One Time Offer</Text>
        <Text style={styles.subtitle}>You will never see this again</Text>
        
        <View style={styles.offerCard}>
          <View style={styles.confettiContainer}>
            <View style={[styles.confetti, styles.confetti1]} />
            <View style={[styles.confetti, styles.confetti2]} />
            <View style={[styles.confetti, styles.confetti3]} />
            <View style={[styles.confetti, styles.confetti4]} />
            <View style={[styles.confetti, styles.confetti5]} />
          </View>
          
          <View style={styles.suitcaseIcon}>
            <Ionicons name="briefcase" size={40} color={theme.colors.primary[600]} />
          </View>
          
          <Text style={styles.offerTitle}>Here's a 80% off discount</Text>
          <Text style={styles.offerPrice}>Only $1.66 / month</Text>
          <Text style={styles.offerSubtext}>Lowest price ever</Text>
        </View>
        
        <Button
          title="Claim your limited offer now!"
          onPress={handleClaimOffer}
          variant="black"
          style={styles.claimButton}
        />
      </Animated.View>
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
    paddingTop: theme.spacing.xl,
    justifyContent: 'center',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[600],
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
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  offerCard: {
    backgroundColor: theme.colors.grey[100],
    borderRadius: 16,
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
    position: 'relative',
    overflow: 'hidden',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confetti1: {
    backgroundColor: theme.colors.primary[400],
    top: '20%',
    left: '10%',
  },
  confetti2: {
    backgroundColor: theme.colors.secondary[400],
    top: '30%',
    right: '15%',
  },
  confetti3: {
    backgroundColor: theme.colors.success[400],
    top: '60%',
    left: '20%',
  },
  confetti4: {
    backgroundColor: theme.colors.warning[400],
    top: '70%',
    right: '25%',
  },
  confetti5: {
    backgroundColor: theme.colors.error[400],
    top: '40%',
    left: '50%',
  },
  suitcaseIcon: {
    marginBottom: theme.spacing.lg,
  },
  offerTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  offerPrice: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.primary[600],
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  offerSubtext: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  claimButton: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
});

export default OneTimeOfferStep;
