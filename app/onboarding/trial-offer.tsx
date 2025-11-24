/**
 * Trial Offer Step - Free trial offer with app preview
 * 
 * Shows app preview with iPhone frame and free trial offer
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';

const TrialOfferStep: React.FC = () => {
  const navigation = useNavigation();

  const handleTryFree = () => {
    navigation.navigate('TrialReminder' as never);
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow_left"
          onPress={() => navigation.goBack()}
          variant="ghost"
          size="md"
          style={styles.backButton}
        />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>We want you to try Dreamer for free</Text>
        
        <View style={styles.phoneContainer}>
          <View style={styles.phoneFrame}>
            <View style={styles.phoneStatusBar}>
              <Text style={styles.statusTime}>10:00</Text>
              <View style={styles.statusIcons}>
                <View style={styles.signalIcon} />
                <View style={styles.wifiIcon} />
              </View>
            </View>
            
            <View style={styles.appContent}>
              <View style={styles.progressSection}>
                <View style={styles.dayStreak}>
                  <Text style={styles.flameIcon}>🔥</Text>
                  <Text style={styles.streakNumber}>12</Text>
                </View>
                <View style={styles.progressDots}>
                  <View style={[styles.dot, styles.orangeDot]} />
                  <View style={[styles.dot, styles.orangeDot]} />
                  <View style={[styles.dot, styles.orangeDot]} />
                  <View style={[styles.dot, styles.greyDot]} />
                  <View style={[styles.dot, styles.greyDot]} />
                </View>
              </View>
              
              <View style={styles.thisWeekSection}>
                <Text style={styles.sectionTitle}>This Week</Text>
                <Text style={styles.weekStats}>7 Actions Planned</Text>
                <Text style={styles.weekStats}>4 Actions Done</Text>
                <Text style={styles.weekStats}>3 Actions Overdue</Text>
              </View>
              
              <View style={styles.progressPhotosSection}>
                <Text style={styles.sectionTitle}>Progress Photos</Text>
                <View style={styles.photosGrid}>
                  <View style={styles.photoThumb} />
                  <View style={styles.photoThumb} />
                  <View style={styles.photoThumb} />
                  <View style={styles.photoThumb} />
                </View>
              </View>
              
              <View style={styles.goalCard}>
                <Text style={styles.goalDay}>Day 40 of 230</Text>
                <Text style={styles.goalText}>Travel to 4 different countries by end of 2025</Text>
                <Text style={styles.goalDate}>31st December 2025</Text>
                <View style={styles.goalIcon}>
                  <Text style={styles.goalIconText}>12</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.offerSection}>
          <Text style={styles.noPaymentText}>✓ No Payment Due Now</Text>
          <Button
            title="Try for £0.00"
            onPress={handleTryFree}
            variant="black"
            style={styles.tryButton}
          />
          <Text style={styles.pricingText}>
            Just £39.99 per year (£3.33 / month)
          </Text>
        </View>
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
    paddingTop: theme.spacing.xl,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.largeTitle,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  phoneContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  phoneFrame: {
    width: 200,
    height: 400,
    backgroundColor: '#000',
    borderRadius: 25,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  phoneStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  statusTime: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  signalIcon: {
    width: 16,
    height: 10,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  wifiIcon: {
    width: 16,
    height: 10,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  appContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: theme.spacing.md,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  dayStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  flameIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.grey[900],
  },
  progressDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orangeDot: {
    backgroundColor: theme.colors.primary[500],
  },
  greyDot: {
    backgroundColor: theme.colors.grey[300],
  },
  thisWeekSection: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
  },
  weekStats: {
    fontSize: 12,
    color: theme.colors.grey[600],
    marginBottom: 2,
  },
  progressPhotosSection: {
    marginBottom: theme.spacing.md,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  photoThumb: {
    width: 30,
    height: 30,
    backgroundColor: theme.colors.grey[200],
    borderRadius: 4,
  },
  goalCard: {
    backgroundColor: theme.colors.grey[50],
    borderRadius: 8,
    padding: theme.spacing.sm,
    position: 'relative',
  },
  goalDay: {
    fontSize: 12,
    color: theme.colors.grey[600],
    marginBottom: 4,
  },
  goalText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.grey[900],
    marginBottom: 4,
  },
  goalDate: {
    fontSize: 10,
    color: theme.colors.grey[500],
  },
  goalIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    backgroundColor: theme.colors.primary[100],
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalIconText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  offerSection: {
    alignItems: 'center',
  },
  noPaymentText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.lg,
  },
  tryButton: {
    width: '100%',
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.xl,
  },
  pricingText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['3xl'],
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
});

export default TrialOfferStep;
