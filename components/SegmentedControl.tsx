import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedIndex,
  onSelect,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.container}>
      <View style={styles.segmentedContainer}>
        {options.map((option, index) => {
          const isSelected = index === selectedIndex;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.segment,
                isSelected && styles.segmentSelected,
                index === 0 && styles.segmentFirst,
                index === options.length - 1 && styles.segmentLast,
              ]}
              onPress={() => onSelect(index)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.segmentText,
                  isSelected && styles.segmentTextSelected,
                ]}
                numberOfLines={1}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: isDark 
      ? 'rgba(255, 255, 255, 0.15)' 
      : 'rgba(0, 0, 0, 0.1)',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  segmentFirst: {
    marginRight: 0,
  },
  segmentLast: {
    marginLeft: 0,
  },
  segmentSelected: {
    backgroundColor: isDark 
      ? theme.colors.background.card 
      : theme.colors.background.card,
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text.inverse,
    textAlign: 'center',
  },
  segmentTextSelected: {
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
});
