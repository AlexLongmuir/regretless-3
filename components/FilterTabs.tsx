import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

interface FilterOption {
  key: string;
  label: string;
  count?: number;
}

interface FilterTabsProps {
  options: FilterOption[];
  activeFilter: string;
  onFilterChange: (filterKey: string) => void;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({
  options,
  activeFilter,
  onFilterChange,
}) => {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = activeFilter === option.key;
        
        return (
          <Pressable
            key={option.key}
            style={[
              styles.tab,
              isActive && styles.activeTab,
            ]}
            onPress={() => onFilterChange(option.key)}
          >
            <Text style={[
              styles.label,
              isActive && styles.activeLabel,
            ]}>
              {option.label}
            </Text>
            {option.count !== undefined && (
              <View style={[
                styles.countBadge,
                isActive && styles.activeCountBadge,
              ]}>
                <Text style={[
                  styles.count,
                  isActive && styles.activeCount,
                ]}>
                  {option.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface[200],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: theme.spacing.xs,
  },
  activeTab: {
    backgroundColor: theme.colors.grey[600],
    shadowColor: theme.colors.grey[400],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[600],
  },
  activeLabel: {
    color: theme.colors.surface[50],
    fontWeight: theme.typography.fontWeight.semibold as any,
  },
  countBadge: {
    backgroundColor: theme.colors.grey[300],
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  activeCountBadge: {
    backgroundColor: theme.colors.grey[500],
  },
  count: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[700],
  },
  activeCount: {
    color: theme.colors.surface[50],
  },
});