import * as Haptics from 'expo-haptics';

/**
 * Trigger light haptic feedback for button presses and interactions
 * Gracefully handles platforms that don't support haptics (e.g., web)
 */
export const triggerHaptic = async (): Promise<void> => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    // Silently fail on platforms that don't support haptics (e.g., web)
    // This is expected behavior and doesn't need to be logged
  }
};
