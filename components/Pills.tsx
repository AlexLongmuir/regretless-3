import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../utils/theme';

interface Pill {
  id: string;
  label: string;
  selected?: boolean;
}

interface PillsProps {
  pills: Pill[];
  onPillPress: (pillId: string) => void;
  scrollable?: boolean;
}

export const Pills: React.FC<PillsProps> = ({
  pills,
  onPillPress,
  scrollable = false,
}) => {
  const renderPills = () => (
    <View style={styles.container}>
      {pills.map((pill) => (
        <TouchableOpacity
          key={pill.id}
          style={[
            styles.pill,
            pill.selected && styles.selectedPill,
          ]}
          onPress={() => onPillPress(pill.id)}
        >
          <Text style={[
            styles.pillText,
            pill.selected && styles.selectedPillText,
          ]}>
            {pill.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {renderPills()}
      </ScrollView>
    );
  }

  return renderPills();
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  scrollContainer: {
    paddingHorizontal: theme.spacing.md,
  },
  pill: {
    backgroundColor: theme.colors.grey[200],
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  selectedPill: {
    backgroundColor: theme.colors.primary[500],
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.grey[700],
  },
  selectedPillText: {
    color: theme.colors.surface[100],
  },
});