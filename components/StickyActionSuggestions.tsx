import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { theme } from '../utils/theme';

interface StickyActionSuggestionsProps {
  onApprove: () => void;
  onImprove: () => void;
  visible: boolean;
  animatedValue?: Animated.Value;
}

export const StickyActionSuggestions: React.FC<StickyActionSuggestionsProps> = ({
  onApprove,
  onImprove,
  visible,
  animatedValue,
}) => {
  if (!visible) return null;

  const animatedStyle = animatedValue ? {
    opacity: animatedValue,
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [100, 0],
        }),
      },
    ],
  } : {};

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.content}>
        <Text style={styles.title}>How do these actions look?</Text>
        <Text style={styles.subtitle}>Your personalized action plan is ready for review</Text>
        
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, styles.approveButton]}
            onPress={onApprove}
          >
            <Text style={[styles.buttonText, styles.approveButtonText]}>
              This looks good!
            </Text>
          </Pressable>
          
          <Pressable
            style={[styles.button, styles.improveButton]}
            onPress={onImprove}
          >
            <Text style={[styles.buttonText, styles.improveButtonText]}>
              Could be improved
            </Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0, // Always at the very bottom of screen
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface[50],
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.grey[200],
    shadowColor: theme.colors.grey[900],
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000, // Ensure it appears above other elements
    paddingBottom: 34, // Account for safe area (iPhone home indicator)
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  approveButton: {
    backgroundColor: theme.colors.primary[500],
  },
  improveButton: {
    backgroundColor: theme.colors.surface[50],
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
  },
  buttonText: {
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  approveButtonText: {
    color: theme.colors.surface[50],
  },
  improveButtonText: {
    color: theme.colors.grey[700],
  },
});