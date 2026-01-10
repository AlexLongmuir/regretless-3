import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { ListRow } from '../components/ListRow';
import { IconButton } from '../components/IconButton';
import { Icon } from '../components/Icon';
import { trackEvent } from '../lib/mixpanel';

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
  },
  header: {
    backgroundColor: theme.colors.background.page,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as IconButton to balance the layout
  },
  titleContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 40,
  },
  listContainer: {
    width: '100%',
    backgroundColor: theme.colors.background.card,
    borderRadius: 10,
    overflow: 'hidden',
  },
  description: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
});

const DisplaySettingsPage = ({ navigation }: { navigation: any }) => {
  const { theme, mode, setMode, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleModeChange = (newMode: 'light' | 'dark' | 'system') => {
    setMode(newMode);
    trackEvent('display_theme_changed', { mode: newMode });
  };

  // Use white checkmark in dark mode for better visibility
  const checkIconColor = isDark ? '#FFFFFF' : theme.colors.primary[600];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="chevron_left"
          onPress={() => navigation.goBack()}
          variant="secondary"
          size="md"
        />
        <View style={styles.headerSpacer} />
      </View>
      
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Display</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Choose how the app appears. System will match your device settings.
        </Text>

        <View style={styles.listContainer}>
          <ListRow
            title="Light"
            leftIcon="auto_awesome"
            onPress={() => handleModeChange('light')}
            rightElement={mode === 'light' ? <Icon name="check" size={24} color={checkIconColor} /> : <View />}
            isFirst={true}
          />
          <ListRow
            title="Dark"
            leftIcon="auto_awesome"
            onPress={() => handleModeChange('dark')}
            rightElement={mode === 'dark' ? <Icon name="check" size={24} color={checkIconColor} /> : <View />}
          />
          <ListRow
            title="System"
            leftIcon="auto_awesome"
            onPress={() => handleModeChange('system')}
            rightElement={mode === 'system' ? <Icon name="check" size={24} color={checkIconColor} /> : <View />}
            isLast={true}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DisplaySettingsPage;
