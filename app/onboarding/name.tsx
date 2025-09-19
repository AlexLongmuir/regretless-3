/**
 * Name Step - Second screen of onboarding
 * 
 * User enters their name to personalize the experience
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { OnboardingHeader, OnboardingImage } from '../../components/onboarding';
import { useOnboardingContext } from '../../contexts/OnboardingContext';

// Use the golden city sunrise image for name screen
const cityImage = require('../../assets/images/onboarding/20250916_0840_Golden City Sunrise_simple_compose_01k58qf6d3ekhv8gkph5ac0ygy.png');

const NameStep: React.FC = () => {
  const navigation = useNavigation();
  const { updateName } = useOnboardingContext();
  const [name, setName] = useState('');

  const handleContinue = () => {
    if (name.trim()) {
      updateName(name.trim());
      navigation.navigate('Understanding' as never);
    }
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
        <View style={styles.imageContainer}>
          <OnboardingImage source={cityImage} borderRadius={10} />
        </View>
        
        <Text style={styles.title}>What's your name?</Text>
        
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Start writing..."
          variant="borderless"
          style={styles.input}
        />
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="black"
          disabled={!name.trim()}
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground, // Grey background like create flow
  },
  content: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.grey[900],
    textAlign: 'left',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  input: {
    width: '100%',
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  button: {
    width: '100%',
  },
});

export default NameStep;
