/**
 * Intro Step - First screen showing the main app interface
 * 
 * Shows what the app looks like with sample dreams before onboarding
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { BottomNavigation } from '../../components/BottomNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { preloadOnboardingImages } from '../../utils/preloadOnboardingImages';

// Sample dream data for the mockup
const sampleDreams = [
  {
    id: '1',
    title: 'Get ripped by my 28th Birthday',
    dayCount: 45,
    totalDays: 90,
    endDate: '19th November 2025',
    streak: 33,
    image: require('../../assets/images/lifecoach.png'),
  },
  {
    id: '2',
    title: 'Travel to 4 different countries by end of 2025',
    dayCount: 12,
    totalDays: 230,
    endDate: '31st December 2025',
    streak: 12,
    image: require('../../assets/images/transcend.png'),
  },
  {
    id: '3',
    title: 'Launch side business app',
    dayCount: 12,
    totalDays: 90,
    endDate: '30th November 2025',
    streak: 0,
    image: require('../../assets/images/3drocketship.png'),
  },
  {
    id: '4',
    title: 'Do one new thing every week until end of the year',
    dayCount: 1,
    totalDays: 90,
    endDate: '31st December 2025',
    streak: 0,
    image: require('../../assets/images/lifecoach.png'),
  },
];

const IntroStep: React.FC = () => {
  const navigation = useNavigation();

  // Preload all onboarding images when this screen mounts
  // This ensures images are ready instantly when users navigate through onboarding
  useEffect(() => {
    preloadOnboardingImages();
  }, []);

  const handleContinue = () => {
    navigation.navigate('Welcome' as never);
  };

  const renderDreamCard = (dream: typeof sampleDreams[0]) => (
    <View key={dream.id} style={styles.dreamCard}>
      <Image source={dream.image} style={styles.dreamImage} />
      <View style={styles.dreamContent}>
        <Text style={styles.dreamDayCount}>Day {dream.dayCount} of {dream.totalDays}</Text>
        <Text style={styles.dreamTitle} numberOfLines={2}>{dream.title}</Text>
        <Text style={styles.dreamEndDate}>{dream.endDate}</Text>
      </View>
      <View style={styles.streakContainer}>
        <MaterialIcons name="local-fire-department" size={16} color="#FF6B35" />
        <Text style={styles.streakText}>{dream.streak}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.phoneFrame}>
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>10:00</Text>
          <View style={styles.statusIcons}>
            <View style={styles.signalIcon} />
            <View style={styles.wifiIcon} />
            <View style={styles.batteryIcon} />
          </View>
        </View>

        {/* App Header */}
        <View style={styles.appHeader}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="auto-awesome" size={24} color={theme.colors.grey[900]} />
            <Text style={styles.appTitle}>Dreamer</Text>
          </View>
          <MaterialIcons name="add" size={24} color={theme.colors.grey[900]} />
        </View>

        {/* Dreams List */}
        <ScrollView style={styles.dreamsList} showsVerticalScrollIndicator={false}>
          {sampleDreams.map(renderDreamCard)}
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomNavigation 
          activeTab="Dreams" 
          onTabPress={() => {}} 
          style={styles.bottomNav}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Dreams Made Real</Text>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Continue"
            onPress={handleContinue}
            variant="black"
            style={styles.button}
            style={styles.button}
          />
          
          {/* Temporary test button - remove in production */}
          <Button
            title="🧪 Test Purchase Flow"
            onPress={() => navigation.navigate('TrialContinuation' as never)}
            variant="outline"
            style={[styles.button, styles.testButton]}
          />
          
          <Text style={styles.signInText}>
            Already purchases? <Text style={styles.signInLink} onPress={() => navigation.navigate('PostPurchaseSignIn' as never)}>Sign in</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  phoneFrame: {
    width: 300,
    height: 600,
    backgroundColor: '#000',
    borderRadius: 30,
    padding: 4,
    marginBottom: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    backgroundColor: '#fff',
  },
  statusTime: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signalIcon: {
    width: 18,
    height: 12,
    backgroundColor: '#000',
    borderRadius: 2,
  },
  wifiIcon: {
    width: 16,
    height: 12,
    backgroundColor: '#000',
    borderRadius: 2,
  },
  batteryIcon: {
    width: 24,
    height: 12,
    backgroundColor: '#000',
    borderRadius: 2,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grey[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  appTitle: {
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
  },
  dreamsList: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  dreamCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.grey[200],
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  dreamImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: theme.spacing.sm,
  },
  dreamContent: {
    flex: 1,
  },
  dreamDayCount: {
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.grey[600],
    marginBottom: 2,
  },
  dreamTitle: {
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[900],
    marginBottom: 2,
  },
  dreamEndDate: {
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.grey[600],
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakText: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: '#FF6B35',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    marginBottom: theme.spacing.lg,
    borderRadius: theme.radius.xl,
  },
  testButton: {
    marginBottom: theme.spacing.md,
    borderColor: theme.colors.primary[500],
    borderWidth: 2,
  },
  signInText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  signInLink: {
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[900],
  },
});

export default IntroStep;
