/**
 * Long Term Results Step - Shows reminder effectiveness and success rates
 * 
 * Displays a before/after bar chart showing success rate improvement with reminders
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { markOnboardingCompleted } from '../../utils/onboardingFlow';
import { trackEvent } from '../../lib/mixpanel';

const LongTermResultsStep: React.FC = () => {
  const navigation = useNavigation();

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'long_term_results'
      });
    }, [])
  );

  const handleContinue = async () => {
    // Navigate to obstacles page instead of paywall
    navigation.navigate('Obstacles' as never);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Data for finishing odds comparison
  const beforeRate = 50; // 1x (baseline)
  const afterRate = 100; // 2x (doubled)
  const improvement = afterRate - beforeRate; // 50% improvement

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        onBack={handleBack}
        showProgress={true}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>Dreamer nudges nearly double your finishing odds</Text>
        
        <View style={styles.chartContainer}>
          {/* Labels above chart */}
          <View style={styles.chartLabels}>
            <Text style={styles.chartLabel}>Without Dreamer</Text>
            <Text style={styles.chartLabel}>With Dreamer</Text>
          </View>
          
          <View style={styles.barChart}>
            {/* Before bar */}
            <View style={styles.barGroup}>
              <View style={styles.barContainer}>
                <View style={[styles.bar, styles.beforeBar, { height: `${beforeRate}%` }]}>
                  <Text style={[styles.barValue, styles.beforeBarValue]}>1x</Text>
                </View>
              </View>
            </View>

            {/* After bar */}
            <View style={styles.barGroup}>
              <View style={styles.barContainer}>
                <View style={[styles.bar, styles.afterBar, { height: `${afterRate}%` }]}>
                  <Text style={styles.barValue}>2x</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Improvement indicator */}
          <View style={styles.improvementIndicator}>
            <Text style={styles.improvementText}>Randomised trials show reminders nearly double your chance of completion</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="black"
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
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
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing['2xl'],
    width: '100%',
    maxWidth: 320,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    marginBottom: theme.spacing.md,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 160,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    position: 'relative',
  },
  bar: {
    width: 60,
    borderRadius: theme.radius.sm,
    minHeight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beforeBar: {
    backgroundColor: theme.colors.grey[300],
  },
  afterBar: {
    backgroundColor: theme.colors.border.selected,
  },
  barValue: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: 'white',
    textAlign: 'center',
  },
  beforeBarValue: {
    color: theme.colors.grey[700],
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.md,
  },
  chartLabel: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
    textAlign: 'center',
    flex: 1,
  },
  improvementIndicator: {
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
  },
  improvementText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  description: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.grey[700],
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
});

export default LongTermResultsStep;
