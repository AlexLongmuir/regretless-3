import React from 'react';
import { View, Pressable, Text, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
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
  { key: 'Dreams', label: 'Dreams', icon: 'auto_awesome' },
  { key: 'Today', label: 'Today', icon: 'calendar' },
  { key: 'Progress', label: 'Progress', icon: 'trending_up' },
  { key: 'Account', label: 'Account', icon: 'person' },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabPress,
  style,
}) => {
  const renderIcon = (iconName: string, isActive: boolean) => {
    const iconConfig = theme.icons[iconName as keyof typeof theme.icons];
    if (iconConfig && iconConfig.library === 'MaterialIcons') {
      return (
        <MaterialIcons
          name={iconConfig.name as any}
          size={24}
          color={isActive ? theme.colors.primary[600] : theme.colors.grey[500]}
        />
      );
    }
    return null;
  };

  const renderTabContent = () => (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onTabPress(tab.key)}
          >
            {renderIcon(tab.icon, isActive)}
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // Use GlassView for iOS to get the native liquid glass effect
  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.container, style]}>
        <GlassView
          style={styles.blurContainer}
          glassEffectStyle="systemChromeMaterial" // Gives a nice native translucent look
        >
          {renderTabContent()}
        </GlassView>
      </View>
    );
  }

  // Fallback to BlurView for Android or other platforms
  return (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={80}
        tint="light"
        style={styles.blurContainer}
      >
        {renderTabContent()}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  blurContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    // For glass on iOS, we want transparent background so the blur shows through
    // For BlurView on Android, we might want a slight tint if needed, but keeping consistent
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 30,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 25,
    minHeight: 50,
    marginHorizontal: 1,
  },
  activeTab: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  label: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[500],
    textAlign: 'center',
    marginTop: 4,
  },
  activeLabel: {
    color: theme.colors.primary[600],
    fontWeight: theme.typography.fontWeight.semibold as any,
  },
});
