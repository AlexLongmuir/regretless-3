/**
 * Final Step - Congratulations, your custom plan is ready!
 * 
 * Shows final results with AreaChips and completion animation
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { AreaGrid } from '../../components/AreaChips';
import { Ionicons } from '@expo/vector-icons';
import { useEntitlementsContext } from '../../contexts/EntitlementsContext';

const targetAreas = [
  {
    id: 'planning',
    title: 'Planning',
    emoji: '✍️',
    completedActions: 0,
    totalActions: 3,
  },
  {
    id: 'developing',
    title: 'Developing',
    emoji: '🔧',
    completedActions: 0,
    totalActions: 3,
  },
  {
    id: 'launching',
    title: 'Launching',
    emoji: '🚀',
    completedActions: 0,
    totalActions: 3,
  },
  {
    id: 'marketing',
    title: 'Marketing',
    emoji: '📢',
    completedActions: 0,
    totalActions: 3,
  },
];

const FinalStep: React.FC = () => {
  const navigation = useNavigation();
  const { restorePurchases, loading } = useEntitlementsContext();
  const [showAreas, setShowAreas] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Show areas after a short delay
    const timer = setTimeout(() => {
      setShowAreas(true);
      
      // Animate areas in
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 1000);

    return () => clearTimeout(timer);
  }, [animatedValue]);

  const handleContinue = () => {
    // Navigate to trial offer flow
    navigation.navigate('TrialOffer' as never);
  };


  const handleAreaPress = (id: string) => {
    // Handle area selection
    console.log('Area pressed:', id);
  };

  const handleEditArea = (id: string) => {
    // Handle area editing
    console.log('Edit area:', id);
  };

  const handleRemoveArea = (id: string) => {
    // Handle area removal
    console.log('Remove area:', id);
  };

  const handleAddArea = () => {
    // Handle adding new area
    console.log('Add new area');
  };

  const handleRestore = async () => {
    try {
      const result = await restorePurchases();
      
      if (result.success) {
        // Navigate to PostPurchaseSignIn
        navigation.navigate('PostPurchaseSignIn' as never);
      } else {
        Alert.alert('No Purchases', result.error || 'No active subscriptions found.');
      }
    } catch (error: any) {
      Alert.alert('Restore Error', error.message || 'Something went wrong');
    }
  };

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.checkmarkContainer}>
            <Ionicons name="checkmark-circle" size={32} color={theme.colors.primary[600]} />
          </View>
          <Text style={styles.title}>Congratulations, your custom plan is ready!</Text>
        </View>

        <View style={styles.goalContainer}>
          <Text style={styles.goalLabel}>You should achieve</Text>
          <View style={styles.goalTextContainer}>
            <Text style={styles.goalTextGold}>Getting fit & healthy</Text>
            <Text style={styles.goalTextBlack}> by September 28</Text>
          </View>
        </View>

        {showAreas && (
          <Animated.View 
            style={[
              {
                opacity,
                transform: [{ translateY }],
              }
            ]}
          >
            <AreaGrid 
              areas={targetAreas}
              onEdit={handleEditArea}
              onRemove={handleRemoveArea}
              onAdd={handleAddArea}
              onPress={handleAreaPress}
              clickable={true}
              showProgress={true}
              title="Target Areas"
              showAddButton={false}
              showEditButtons={false}
              showRemoveButtons={false}
            />
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="primary"
          size="lg"
          style={styles.continueButton}
        />
        
        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
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
    paddingTop: theme.spacing['3xl'],
    paddingBottom: theme.spacing['2xl'],
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  checkmarkContainer: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 30,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: 36,
    color: theme.colors.grey[900],
    textAlign: 'center',
  },
  goalContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  goalLabel: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 18,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.sm,
  },
  goalTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTextGold: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.gold,
  },
  goalTextBlack: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
  },
  buttonContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },
  continueButton: {
    marginBottom: theme.spacing.md,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  restoreText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[500],
  },
});

export default FinalStep;
