import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { theme } from '../utils/theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.grey[200], theme.colors.grey[300]],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor,
          borderRadius,
        },
        style,
      ]}
    />
  );
};

interface ActionChipSkeletonProps {
  style?: any;
}

export const ActionChipSkeleton: React.FC<ActionChipSkeletonProps> = ({ style }) => {
  // Randomize some widths to make skeletons look more varied
  const titleWidths = ['85%', '75%', '90%', '70%'];
  const subtitleWidths = ['55%', '65%', '50%', '60%'];
  const titleWidth = titleWidths[Math.floor(Math.random() * titleWidths.length)];
  const subtitleWidth = subtitleWidths[Math.floor(Math.random() * subtitleWidths.length)];

  return (
    <View style={[styles.chipSkeleton, style]}>
      <View style={styles.chipHeader}>
        <SkeletonLoader width={24} height={24} borderRadius={12} />
        <View style={styles.chipTextContainer}>
          <SkeletonLoader width={titleWidth} height={16} borderRadius={4} />
          <SkeletonLoader width={subtitleWidth} height={14} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      </View>
      <View style={styles.chipFooter}>
        <SkeletonLoader width={60} height={12} borderRadius={4} />
        <SkeletonLoader width={40} height={12} borderRadius={4} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chipSkeleton: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.grey[200],
  },
  chipHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  chipTextContainer: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  chipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default SkeletonLoader;
