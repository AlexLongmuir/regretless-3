import React from 'react';
import { View, Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../utils/theme';

interface NavigationTab {
  key: string;
  label: string;
  icon: string;
}

interface BottomNavigationProps {
  activeTab: string;
  onTabPress: (tabKey: string) => void;
  style?: ViewStyle;
}

const tabs: NavigationTab[] = [
  { key: 'Dreams', label: 'Dreams', icon: '✨' },
  { key: 'Comps', label: 'Comps', icon: '🧩' },
  { key: 'Today', label: 'Today', icon: '📅' },
  { key: 'Journal', label: 'Journal', icon: '📔' },
  { key: 'Utilities', label: 'Utilities', icon: '🔧' },
  { key: 'Profile', label: 'Profile', icon: '👤' },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onTabPress(tab.key)}
          >
            <Text style={[styles.icon, isActive && styles.activeIcon]}>
              {tab.icon}
            </Text>
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface[50],
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[200],
    paddingBottom: 20,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    shadowColor: theme.colors.grey[900],
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    minHeight: 60,
  },
  activeTab: {
    backgroundColor: theme.colors.primary[50],
  },
  icon: {
    fontSize: 24,
    marginBottom: 2,
  },
  activeIcon: {
    opacity: 1,
  },
  label: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.medium as any,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.grey[500],
  },
  activeLabel: {
    color: theme.colors.primary[600],
    fontWeight: theme.typography.fontWeight.semibold as any,
  },
});