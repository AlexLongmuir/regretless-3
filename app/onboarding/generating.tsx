/**
 * Generating Step - Time to generate your custom plan!
 * 
 * Shows generating animation with placeholder graphics
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { Icon } from '../../components/Icon';

const GeneratingStep: React.FC = () => {
  const navigation = useNavigation();

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
        <Image 
          source={require('../../assets/images/onboarding/20250916_0842_Swirling Abstract Energy_simple_compose_01k58qjb1ae89sraq48r9636ze.png')}
          style={styles.onboardingImage}
          resizeMode="contain"
        />
        
        <View style={styles.allDoneContainer}>
          <View style={styles.tickContainer}>
            <Icon name="check" size={24} color="white" />
          </View>
          <Text style={styles.allDoneText}>All Done</Text>
        </View>
        
        <Text style={styles.title}>Time to generate your custom plan!</Text>
        
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Continue"
          onPress={() => navigation.navigate('Progress' as never)}
          variant="primary"
          size="lg"
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingImage: {
    width: 260,
    height: 260,
    marginBottom: theme.spacing.lg,
    borderRadius: 10,
  },
  allDoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  tickContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  allDoneText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.gold,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing['3xl'],
  },
  buttonContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },
});

export default GeneratingStep;
