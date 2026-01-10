import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';

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
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.disabled.inactive, theme.colors.grey[200]],
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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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

interface DreamChipSkeletonProps {
  style?: any;
}

export const DreamChipSkeleton: React.FC<DreamChipSkeletonProps> = ({ style }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  return (
    <View style={[styles.dreamChipSkeleton, style]}>
      <View style={styles.dreamChipContent}>
        {/* Image skeleton */}
        <SkeletonLoader width={100} height={100} borderRadius={8} />
        
        {/* Content skeleton */}
        <View style={styles.dreamChipTextContainer}>
          {/* Progress row */}
          <View style={styles.dreamProgressRow}>
            <SkeletonLoader width={80} height={12} borderRadius={4} />
            <SkeletonLoader width={40} height={12} borderRadius={4} />
          </View>
          
          {/* Title */}
          <SkeletonLoader width="85%" height={18} borderRadius={4} style={{ marginTop: 8 }} />
          
          {/* Date */}
          <SkeletonLoader width="60%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
};

interface AreaChipSkeletonProps {
  style?: any;
}

export const AreaChipSkeleton: React.FC<AreaChipSkeletonProps> = ({ style }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // Randomize title width to make skeletons look more varied
  const titleWidths = ['70%', '80%', '75%', '85%'];
  const titleWidth = titleWidths[Math.floor(Math.random() * titleWidths.length)];

  return (
    <View style={[styles.areaChipSkeleton, style]}>
      {/* Icon skeleton on the left */}
      <SkeletonLoader width={40} height={40} borderRadius={8} style={{ marginRight: 16 }} />
      
      {/* Title and progress on the right */}
      <View style={{ flex: 1 }}>
        <SkeletonLoader width={titleWidth} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
        <View style={styles.areaProgressRow}>
          <SkeletonLoader width={60} height={12} borderRadius={4} />
          <SkeletonLoader width={40} height={12} borderRadius={4} />
        </View>
        <SkeletonLoader width="100%" height={6} borderRadius={3} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  chipSkeleton: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
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
  dreamChipSkeleton: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  dreamChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dreamChipTextContainer: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  dreamProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  areaChipSkeleton: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
  },
  areaProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default SkeletonLoader;
