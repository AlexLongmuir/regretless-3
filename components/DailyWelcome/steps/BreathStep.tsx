import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Theme } from '../../../utils/theme';

// Conditionally import Lottie - install with: npx expo install lottie-react-native
let LottieView: any = null;
try {
  LottieView = require('lottie-react-native').default;
} catch (e) {
  console.warn('lottie-react-native not installed. Run: npx expo install lottie-react-native');
}

interface BreathStepProps {
  onComplete: () => void;
}

const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

export const BreathStep: React.FC<BreathStepProps> = ({ onComplete }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuthContext();
  // Get first name or default to 'Friend'
  const userName = user?.email ? toTitleCase(user.email.split('@')[0]) : 'Friend';
  
  const lottieRef = useRef<any>(null);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    // Fade in content smoothly
    contentOpacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.ease),
    });

    // Start Lottie animation if available
    if (LottieView && lottieRef.current) {
      lottieRef.current?.play();
    }

    // Auto-advance after 12 seconds (one full breath cycle + a bit)
    const timer = setTimeout(() => {
      onComplete();
    }, 12000);

    return () => {
      clearTimeout(timer);
      if (lottieRef.current) {
        lottieRef.current?.pause();
      }
    };
  }, []);

  // Animated style for content fade in
  const contentStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
    };
  });

  return (
    <View style={styles.container}>
      {/* Lottie breathing animation on top of background */}
      {LottieView ? (
        <LottieView
          ref={lottieRef}
          source={require('../../../assets/Breathe.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
          resizeMode="cover"
        />
      ) : (
        // Fallback: Simple placeholder while package is being installed
        <View style={styles.lottieAnimation} />
      )}
      
      <Animated.View style={[styles.content, contentStyle]}>
        <Text style={styles.greeting}>Welcome, {userName}</Text>
        <Text style={styles.instruction}>Take a second for a deep breath.</Text>
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  lottieAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    zIndex: 2,
  },
  greeting: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 24,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  instruction: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
});
