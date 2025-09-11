import React, { useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import { DreamCard, DreamChipList } from '../components';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { useData } from '../contexts/DataContext';
import { useAuthContext } from '../contexts/AuthContext';
import type { Dream, DreamWithStats } from '../backend/database/types';


const DreamsPage = ({ navigation }: { navigation?: any }) => {
  const { state, getDreamsSummary, getDreamsWithStats } = useData();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();
  const dreams = state.dreamsSummary?.dreams || [];
  const dreamsWithStats = state.dreamsWithStats?.dreams || [];

  // Re-fetch data when user navigates back to this screen
  useFocusEffect(
    React.useCallback(() => {
      console.log('DreamsPage: useFocusEffect triggered');
      getDreamsSummary({ force: true });
      getDreamsWithStats({ force: true });
    }, [getDreamsSummary, getDreamsWithStats])
  );

  const handleDreamPress = (dreamId: string) => {
    const dream = dreams.find(d => d.id === dreamId);
    if (dream && navigation?.navigate) {
      navigation.navigate('Dream', {
        dreamId: dream.id,
        title: dream.title,
        startDate: dream.start_date,
        endDate: dream.end_date,
        description: dream.description,
      });
    }
  };

  const handleAddFirstDream = () => {
    if (navigation?.navigate) {
      navigation.navigate('CreateFlow');
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Loading...</Text>
        <Text style={styles.emptySubtitle}>
          Checking authentication status...
        </Text>
      </View>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Please Sign In</Text>
        <Text style={styles.emptySubtitle}>
          You need to be signed in to view your dreams.
        </Text>
        <Button
          title="Go to Login"
          onPress={() => navigation?.navigate?.('Login')}
          style={styles.addButton}
        />
      </View>
    );
  }

  if (dreams.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Start Your Journey</Text>
        <Text style={styles.emptySubtitle}>
          Add your first dream and begin tracking your progress toward achieving it.
        </Text>
        <Button
          title="Add Your First Dream"
          onPress={handleAddFirstDream}
          style={styles.addButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <View style={styles.titleContainer}>
                <Image source={require('../assets/star.png')} style={styles.appIcon} />
                <Text style={styles.title}>Regretless</Text>
              </View>
              <Text style={styles.subtitle}>
                Keep pushing forward. Every step counts.
              </Text>
            </View>
            <IconButton
              icon="add"
              onPress={handleAddFirstDream}
              variant="secondary"
              size="md"
            />
          </View>
        </View>

        <DreamChipList
          dreams={dreamsWithStats}
          onDreamPress={handleDreamPress}
        />

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 60,
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  appIcon: {
    width: 32,
    height: 32,
    marginRight: theme.spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.grey[600],
    lineHeight: 22,
  },
  footer: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.grey[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  addButton: {
    minWidth: 200,
  },
});

export default DreamsPage;