/**
 * LoginPage - Authentication Screen
 * 
 * This is the main authentication screen that users see when not logged in.
 * It provides multiple authentication options:
 * 1. Email and password sign in/up
 * 2. Magic link (passwordless email)
 * 3. OAuth with Apple and Google
 * 
 * Why this design:
 * - Single screen for all auth methods reduces complexity
 * - Users can choose their preferred authentication method
 * - Consistent UI/UX for all auth flows
 * - Error handling and loading states are centralized
 * 
 * This is a basic implementation - you can enhance it with:
 * - Better styling and animations
 * - Form validation
 * - "Remember me" functionality
 * - Terms of service links
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, Animated, Dimensions, Easing } from 'react-native';
import { theme } from '../utils/theme';
import { useAuthContext } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import * as AppleAuthentication from 'expo-apple-authentication';

const { width } = Dimensions.get('window');

// Preload images
const rocketshipImage = require('../assets/images/3drocketship.png');
const transcendImage = require('../assets/images/transcend.png');
const lifecoachImage = require('../assets/images/lifecoach.png');

export const LoginPage: React.FC = () => {
  // Get auth functions from context
  const { 
    signInWithApple,
    signInWithGoogle,
    signInWithOAuth, 
    loading, 
    clearError 
  } = useAuthContext();

  // Local state for rotating messages
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const messages = [
    { 
      title: "Realise Your Dreams", 
      description: "Translate your dreams into reality and track your progress with our powerful goal-setting framework.",
      image: rocketshipImage 
    },
    { 
      title: "Transcend Your Limits", 
      description: "Break through barriers and achieve what you once thought impossible.",
      image: transcendImage 
    },
    { 
      title: "Your Personal Life Coach", 
      description: "Get personalized guidance and accountability to stay on track with your goals.",
      image: lifecoachImage 
    }
  ];

  useEffect(() => {
    const checkAppleSignInAvailability = async () => {
      if (Platform.OS === 'ios') {
        try {
          const isAvailable = await AppleAuthentication.isAvailableAsync();
          setIsAppleSignInAvailable(isAvailable);
        } catch (error) {
          setIsAppleSignInAvailable(false);
        }
      } else {
        setIsAppleSignInAvailable(false);
      }
    };

    checkAppleSignInAvailability();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentMessageIndex + 1) % messages.length;
      
      // Create a smooth, modern animation sequence
      Animated.parallel([
        // Fade out and scale down current content
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Slide out to the left
        Animated.timing(slideAnim, {
          toValue: -width * 0.3,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Change content
        setCurrentMessageIndex(nextIndex);
        
        // Reset position for slide in from right
        slideAnim.setValue(width * 0.3);
        scaleAnim.setValue(0.8);
        fadeAnim.setValue(0);
        
        // Animate in the new content
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.back(1.1)),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 9000);

    return () => clearInterval(interval);
  }, [slideAnim, fadeAnim, scaleAnim, messages.length, currentMessageIndex, width]);

  const handleEmailAuth = () => {
    // Navigate to email auth screen or show modal
    console.log('Email auth pressed');
  };

  const handleAppleSignIn = async () => {
    clearError();
    const result = await signInWithApple();

    if (!result.success && result.error !== 'Sign in was cancelled') {
      Alert.alert('Apple Sign In Failed', result.error || 'Something went wrong');
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    const result = await signInWithGoogle();

    if (!result.success && result.error !== 'Sign in was cancelled') {
      Alert.alert('Google Sign In Failed', result.error || 'Something went wrong');
    }
  };

  const handleOAuth = async (provider: 'apple' | 'google') => {
    clearError();
    const result = await signInWithOAuth(provider);

    if (!result.success) {
      Alert.alert(
        `${provider} Sign In Failed`, 
        result.error || 'Something went wrong'
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* App Title */}
      <View style={styles.header}>
        <Text style={styles.appName}>Regretless</Text>
      </View>

      {/* Rotating Messages */}
      <View style={styles.messageContainer}>
        <Animated.View style={[
          styles.messageContent, 
          { 
            transform: [
              { translateX: slideAnim },
              { scale: scaleAnim }
            ],
            opacity: fadeAnim
          }
        ]}>
          <Animated.Image
            source={messages[currentMessageIndex].image}
            style={[
              styles.messageImage,
              { opacity: fadeAnim }
            ]}
            resizeMode="contain"
          />
          <Animated.Text style={[
            styles.rotatingMessage,
            { opacity: fadeAnim }
          ]}>
            {messages[currentMessageIndex].title}
          </Animated.Text>
          <Animated.Text style={[
            styles.rotatingDescription,
            { opacity: fadeAnim }
          ]}>
            {messages[currentMessageIndex].description}
          </Animated.Text>
        </Animated.View>
      </View>

      {/* Auth Buttons */}
      <View style={styles.authButtons}>
        {/* Apple Sign In Button */}
        <Button
          title="Continue with Apple"
          icon="apple"
          onPress={isAppleSignInAvailable ? handleAppleSignIn : () => handleOAuth('apple')}
          variant="outline"
          disabled={loading}
          style={styles.authButton}
        />
        
        {/* Google Sign In Button */}
        <Button
          title="Continue with Google"
          icon="google"
          onPress={handleGoogleSignIn}
          variant="outline"
          disabled={loading}
          style={styles.authButton}
        />

        {/* Email Sign In Button */}
        <Button
          title="Continue with Email"
          icon="email"
          onPress={handleEmailAuth}
          variant="outline"
          disabled={loading}
          style={styles.authButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface[50],
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl * 2,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  appName: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title1,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.title1,
    color: theme.colors.primary[600],
    letterSpacing: 1,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    overflow: 'hidden',
  },
  messageContent: {
    alignItems: 'center',
  },
  messageImage: {
    width: 200,
    height: 200,
    marginBottom: theme.spacing.md,
  },
  rotatingMessage: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.grey[700],
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  rotatingDescription: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.grey[600],
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  authButtons: {
    width: '100%',
    gap: theme.spacing.md,
  },
  authButton: {
    width: '100%',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default LoginPage;