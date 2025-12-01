import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { Button } from '../components/Button';
import { useData } from '../contexts/DataContext';
import { Switch } from '../components/Switch';

interface ScreenshotMenuPageProps {
  navigation: any;
}

const ScreenshotMenuPage: React.FC<ScreenshotMenuPageProps> = ({ navigation }) => {
  const { isScreenshotMode, toggleScreenshotMode } = useData();

  const handleToggle = (value: boolean) => {
    toggleScreenshotMode(value);
    if (value) {
      Alert.alert(
        'Screenshot Mode Enabled',
        'The app is now using mock data. You can navigate to pages to take consistent screenshots. Toggle off to restore your real data.'
      );
    }
  };

  const navigateTo = (screen: string, params?: any, tab?: string) => {
    if (!isScreenshotMode) {
      Alert.alert('Enable Screenshot Mode', 'Please enable Screenshot Mode first to see the mock data.');
      return;
    }

    if (tab) {
      // For our custom TabNavigator, we pass activeTab as a param
      navigation.navigate('Tabs', { activeTab: tab });
    } else {
      navigation.navigate(screen, params);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="chevron_left"
          onPress={() => navigation.goBack()}
          variant="secondary"
          size="md"
        />
        <Text style={styles.title}>Screenshot Studio</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.textContainer}>
              <Text style={styles.label}>Enable Screenshot Mode</Text>
              <Text style={styles.description}>
                Replaces all app data with perfect, deterministic mock data for App Store screenshots.
              </Text>
            </View>
            <Switch value={isScreenshotMode} onValueChange={handleToggle} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Navigation</Text>
        
        <View style={styles.grid}>
          <Button
            title="Dreams Page"
            onPress={() => navigateTo('Tabs', undefined, 'Dreams')}
            variant="outline"
            style={styles.navButton}
          />
          
          <Button
            title="Dream Detail"
            onPress={() => navigateTo('Dream', { dreamId: 'mock-dream-1' })}
            variant="outline"
            style={styles.navButton}
          />
          
          <Button
            title="Today Page"
            onPress={() => navigateTo('Tabs', undefined, 'Today')}
            variant="outline"
            style={styles.navButton}
          />
          
          <Button
            title="Action Detail"
            onPress={() => navigateTo('ActionOccurrence', { occurrenceId: 'mock-occ-1' })}
            variant="outline"
            style={styles.navButton}
          />
          
          <Button
            title="Progress Page"
            onPress={() => navigateTo('Tabs', undefined, 'Progress')}
            variant="outline"
            style={styles.navButton}
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: 'bold' }}>Note: </Text>
            While in Screenshot Mode, background refreshing is disabled. Any changes you make (completing actions, editing) will be temporary and discarded when you toggle this mode off.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: 14,
    color: theme.colors.grey[600],
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  grid: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  navButton: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  infoBox: {
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary[500],
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.primary[900],
    lineHeight: 20,
  },
});

export default ScreenshotMenuPage;

