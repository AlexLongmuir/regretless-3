/**
 * Achievement Comparison Step - Shows comparison between with/without plans
 * 
 * Displays chart image showing start & finish rates with/without plans
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';

const AchievementComparisonStep: React.FC = () => {
  const navigation = useNavigation();

  const handleContinue = () => {
    navigation.navigate('LongTermResults' as never);
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
      
      <View style={styles.content}>
        <Text style={styles.title}>Dreamer plans turn intent into action</Text>
        
        <View style={styles.chartContainer}>
          <View style={styles.whiteContainer}>
            <Image 
              source={require('../../assets/images/onboarding/chart.png')}
              style={styles.chartImage}
              resizeMode="contain"
            />
            <Text style={styles.description}>
              Turn vague goals concrete: 94 studies show better success with defined goals and plans
            </Text>
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
    marginBottom: 0,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 0,
    width: '100%',
  },
  whiteContainer: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
  },
  chartImage: {
    width: '100%',
    maxWidth: 600,
    height: 400,
    marginBottom: 0,
  },
  description: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.grey[500],
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

export default AchievementComparisonStep;
