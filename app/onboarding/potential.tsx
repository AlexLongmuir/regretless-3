/**
 * Potential Step - You have great potential to reach your dreams
 * 
 * Shows user their potential with a graph visualization
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';

const PotentialStep: React.FC = () => {
  const navigation = useNavigation();

  const handleContinue = () => {
    navigation.navigate('Rating' as never);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        onBack={handleBack}
        showProgress={true}
      />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Tracking your progress with dreamer boosts success</Text>
        
        <View style={styles.graphContainer}>
          <View style={styles.graphCard}>
            {/* Completion bars chart */}
            <View style={styles.chartContainer}>
              <View style={styles.barGroup}>
                <Text style={styles.barLabel}>No tracking</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, styles.barNoTracking]} />
                </View>
              </View>
              
              <View style={styles.barGroup}>
                <Text style={styles.barLabel}>Tracking with Dreamer</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, styles.barPrivate]} />
                </View>
              </View>
              
              <View style={styles.barGroup}>
                <Text style={styles.barLabel}>Sharing Dreamer Progress</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, styles.barShared]} />
                </View>
              </View>
            </View>
            
            <Text style={styles.graphDescription}>
              19,961 people across 138 studies found recording progress drove stronger results
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="primary"
          size="lg"
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing['2xl'],
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  graphContainer: {
    alignItems: 'center',
  },
  graphCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  graphTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  chartContainer: {
    marginBottom: theme.spacing.lg,
  },
  barGroup: {
    marginBottom: theme.spacing.md,
  },
  barLabel: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.grey[700],
    marginBottom: theme.spacing.xs,
  },
  barContainer: {
    height: 20,
    backgroundColor: theme.colors.grey[200],
    borderRadius: 10,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 10,
  },
  barNoTracking: {
    width: '30%',
    backgroundColor: theme.colors.grey[400],
  },
  barPrivate: {
    width: '75%',
    backgroundColor: theme.colors.primary[500],
  },
  barShared: {
    width: '100%',
    backgroundColor: theme.colors.primary[600],
  },
  graphDescription: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.grey[700],
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
});

export default PotentialStep;
