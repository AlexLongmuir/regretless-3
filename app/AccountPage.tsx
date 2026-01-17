import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { useAuthContext } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ListRow } from '../components/ListRow';
import { notificationService } from '../lib/NotificationService';
import { deleteAccount } from '../frontend-services/backend-bridge';
import { trackEvent } from '../lib/mixpanel';
import { resetDailyWelcome } from '../hooks/useDailyWelcome';
import { AchievementUnlockedSheet } from '../components/AchievementUnlockedSheet';
import { AchievementsSheet } from '../components/AchievementsSheet';
import { FigurineSelectorSheet } from '../components/FigurineSelectorSheet';
import { checkNewAchievements, getAchievements, getPrecreatedFigurines } from '../frontend-services/backend-bridge';
import { supabaseClient } from '../lib/supabaseClient';
import type { AchievementUnlockResult, Achievement, UserAchievement } from '../backend/database/types';
import { BOTTOM_NAV_PADDING } from '../utils/bottomNavigation';

const AccountPage = ({ navigation, scrollRef }: { navigation?: any; scrollRef?: React.RefObject<ScrollView | null> }) => {
  const { theme, mode, setMode, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, isDark, insets.top), [theme, isDark, insets.top]);
  const { user, signOut, loading } = useAuthContext();
  const { state, getDreamsWithStats, checkAchievements } = useData();
  const [dreamStats, setDreamStats] = useState({ created: 0, completed: 0 });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [testAchievements, setTestAchievements] = useState<AchievementUnlockResult[]>([]);
  const [achievements, setAchievements] = useState<(Achievement & { user_progress?: UserAchievement | null })[]>([]);
  const [showAchievementsSheet, setShowAchievementsSheet] = useState(false);
  const [showFigurineSheet, setShowFigurineSheet] = useState(false);
  const [figurineUrl, setFigurineUrl] = useState<string | null>(null);

  // Calculate image dimensions - rounded square
  const screenWidth = Dimensions.get('window').width;
  const contentWidth = screenWidth - (theme.spacing.md * 2); // Account for horizontal padding
  const imageSize = Math.min(contentWidth * 0.7, 300); // Square image, 70% of content width or max 300px

  // Initialize notification service
  useEffect(() => {
    const initializeNotifications = async () => {
      await notificationService.initialize();
    };
    initializeNotifications();
  }, []);

  // Prefetch precreated figurines in background for faster loading when sheet opens
  useEffect(() => {
    const prefetchFigurines = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const response = await getPrecreatedFigurines(session?.access_token).catch(() => null);
        
        if (response?.success && response.data?.figurines) {
          // Prefetch all figurine images in background - fire and forget
          response.data.figurines.forEach((figurine: any) => {
            if (figurine.signed_url) {
              Image.prefetch(figurine.signed_url).catch(() => {
                // Silently fail - images will load normally
              });
            }
          });
        }
      } catch (error) {
        // Silently fail - prefetching is not critical
      }
    };
    
    prefetchFigurines();
  }, [user]);

  // Load user's figurine from profile and prefetch image
  useEffect(() => {
    const loadUserFigurine = async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('figurine_url')
            .eq('user_id', user.id)
            .single();

          if (!error && profile?.figurine_url) {
            setFigurineUrl(profile.figurine_url);
            // Prefetch the image for faster loading
            Image.prefetch(profile.figurine_url).catch(() => {
              // Silently fail - image will load normally
            });
          } else {
            setFigurineUrl(null);
          }
        }
      } catch (error) {
        console.error('Error loading user figurine:', error);
        setFigurineUrl(null);
      }
    };

    loadUserFigurine();
  }, [user]);

  // Reload figurine when sheet closes (in case it was updated)
  useEffect(() => {
    if (!showFigurineSheet) {
      const loadUserFigurine = async () => {
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            const { data: profile, error } = await supabaseClient
              .from('profiles')
              .select('figurine_url')
              .eq('user_id', user.id)
              .single();

            if (!error && profile?.figurine_url) {
              setFigurineUrl(profile.figurine_url);
            } else {
              setFigurineUrl(null);
            }
          }
        } catch (error) {
          console.error('Error loading user figurine:', error);
        }
      };
      loadUserFigurine();
    }
  }, [showFigurineSheet]);

  // Load dream statistics
  useEffect(() => {
    const loadStats = async () => {
      await getDreamsWithStats();
    };
    loadStats();
  }, [getDreamsWithStats]);

  // Calculate stats from data
  useEffect(() => {
    if (state.dreamsWithStats?.dreams) {
      const dreams = state.dreamsWithStats.dreams;
      const created = dreams.length;
      const completed = dreams.filter((dream: any) => dream.archived_at).length;
      setDreamStats({ created, completed });
    }
  }, [state.dreamsWithStats]);

  useFocusEffect(
    React.useCallback(() => {
      trackEvent('account_viewed');
    }, [])
  );


  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            trackEvent('account_logout_pressed');
            const result = await signOut();
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            trackEvent('account_delete_pressed');
            Alert.alert(
              'Confirm Deletion',
              'This will permanently delete all your data. Type "DELETE" to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I understand, delete my account',
                  style: 'destructive',
                  onPress: async () => {
                    if (isDeleting) return;
                    
                    setIsDeleting(true);
                    
                    try {
                      const result = await deleteAccount((user as any)?.access_token);
                      
                      if (result.success) {
                        Alert.alert(
                          'Account Deleted',
                          'Your account has been successfully deleted.',
                          [
                            {
                              text: 'OK',
                              onPress: async () => {
                                await signOut();
                              },
                            },
                          ]
                        );
                      } else {
                        Alert.alert('Error', result.error || 'Failed to delete account');
                      }
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', 'An unexpected error occurred while deleting your account');
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleForceDailyWelcome = async () => {
    Alert.alert(
      'Force Daily Welcome',
      'This will reset the daily welcome so it shows again on the next app foreground or reload.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          onPress: async () => {
            trackEvent('account_setting_pressed', { setting_name: 'force_daily_welcome' });
            await resetDailyWelcome();
            Alert.alert(
              'Daily Welcome Reset',
              'The daily welcome will appear the next time you return to the app.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  const handleForceAchievementModal = async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      // Try to get a real achievement first
      const achievementsResponse = await checkNewAchievements(session.access_token);
      
      if (achievementsResponse.success && achievementsResponse.data.new_achievements.length > 0) {
        // Show real achievements
        setTestAchievements(achievementsResponse.data.new_achievements);
        setShowAchievementModal(true);
      } else {
        // If no new achievements, get any unlocked achievement for testing
        const allAchievementsResponse = await getAchievements(session.access_token);
        if (allAchievementsResponse.success && allAchievementsResponse.data.achievements.length > 0) {
          const unlockedAchievement = allAchievementsResponse.data.achievements.find(
            (a: any) => a.user_progress
          );
          
          if (unlockedAchievement) {
            setTestAchievements([{
              achievement_id: unlockedAchievement.id,
              title: unlockedAchievement.title,
              description: unlockedAchievement.description,
              image_url: unlockedAchievement.image_url || '',
            }]);
            setShowAchievementModal(true);
          } else {
            Alert.alert(
              'No Achievements',
              'You don\'t have any unlocked achievements yet. Complete some actions to unlock achievements!'
            );
          }
        } else {
          Alert.alert('Error', 'Failed to load achievements');
        }
      }
    } catch (error) {
      console.error('Error forcing achievement modal:', error);
      Alert.alert('Error', 'Failed to show achievement modal');
    }
  };

  const handleCheckAchievements = async () => {
    try {
      await checkAchievements();
      Alert.alert(
        'Achievement Check',
        'Checked for new achievements. If any were unlocked, they should appear automatically.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error checking achievements:', error);
      Alert.alert('Error', 'Failed to check achievements');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollRef} 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {/* Figurine Image - rounded square */}
        <TouchableOpacity 
          onPress={() => {
            trackEvent('account_profile_picture_pressed');
            setShowFigurineSheet(true);
          }}
          activeOpacity={0.9}
          style={[styles.imageBackground, { width: imageSize, height: imageSize }]}
        >
          {figurineUrl ? (
            <Image
              source={{ uri: figurineUrl }}
              style={styles.backgroundImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
              priority="high"
            />
          ) : (
            <View style={styles.placeholderBackground}>
              <View style={styles.placeholderIconContainer}>
                <Text style={styles.placeholderIconText}>
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* User Info - left aligned below image */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user?.email?.split('@')[0] || 'User'}
          </Text>
          
          <Text style={styles.joinDate}>
            Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '01/01/2020'}
          </Text>

          <Text style={styles.stats}>
            {dreamStats.created} Dreams Created • {dreamStats.completed} Completed
          </Text>
        </View>

        {/* Settings List */}
        <View style={styles.listContainer}>
          <ListRow
            title="Display"
            leftIcon="auto_awesome"
            onPress={() => {
              trackEvent('account_setting_pressed', { setting_name: 'display' });
              navigation?.navigate('DisplaySettings');
            }}
            isFirst={true}
          />
          <ListRow
            title="Notification Settings"
            leftIcon="notifications"
            onPress={() => {
              trackEvent('account_setting_pressed', { setting_name: 'notifications' });
              navigation?.navigate('NotificationSettings');
            }}
          />
          <ListRow
            title="Contact Us"
            leftIcon="contact_support"
            onPress={() => {
              trackEvent('account_setting_pressed', { setting_name: 'contact_us' });
              navigation?.navigate('ContactUs');
            }}
          />
          <ListRow
            title="Terms & Services"
            leftIcon="policy"
            onPress={() => {
              trackEvent('account_setting_pressed', { setting_name: 'terms' });
              navigation?.navigate('TermsOfService');
            }}
          />
          <ListRow
            title="Privacy Policy"
            leftIcon="privacy_tip"
            onPress={() => {
              trackEvent('account_setting_pressed', { setting_name: 'privacy' });
              navigation?.navigate('PrivacyPolicy');
            }}
          />
          {(user?.id === '9e0ec607-8bad-4731-84eb-958f98833131' || user?.id === '0952cd47-5227-4f9f-98b3-1e89b2296157') && (
            <>
              <ListRow
                title="Screenshot Studio"
                leftIcon="photo" // Changed from camera_alt as it might not be in the icon map, using photo which is
                onPress={() => {
                  trackEvent('account_setting_pressed', { setting_name: 'screenshot_studio' });
                  navigation?.navigate('ScreenshotMenu');
                }}
              />
              <ListRow
                title="Force Daily Welcome"
                leftIcon="refresh"
                onPress={handleForceDailyWelcome}
              />
              <ListRow
                title="Force Achievement Modal"
                leftIcon="emoji_events"
                onPress={handleForceAchievementModal}
              />
              <ListRow
                title="Check Achievements (Global)"
                leftIcon="refresh"
                onPress={handleCheckAchievements}
              />
            </>
          )}
          <ListRow
            title="Log Out"
            leftIcon="logout"
            onPress={handleLogout}
            variant="destructive"
          />
          <ListRow
            title="Delete Account"
            leftIcon="delete_forever"
            onPress={handleDeleteAccount}
            variant="destructive"
            isLast={true}
          />
        </View>
      </ScrollView>

      <AchievementUnlockedSheet
        visible={showAchievementModal}
        achievements={testAchievements}
        onClose={() => {
          setShowAchievementModal(false);
          setTestAchievements([]);
        }}
        onViewAchievements={async () => {
          setShowAchievementModal(false);
          setTestAchievements([]);
          // Load achievements and open achievements sheet
          try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.access_token) {
              const response = await getAchievements(session.access_token);
              if (response.success) {
                setAchievements(response.data.achievements);
                setShowAchievementsSheet(true);
              }
            }
          } catch (error) {
            console.error('Error loading achievements:', error);
          }
        }}
      />

      <AchievementsSheet
        visible={showAchievementsSheet}
        onClose={() => setShowAchievementsSheet(false)}
        achievements={achievements}
      />

      <FigurineSelectorSheet
        visible={showFigurineSheet}
        onClose={() => setShowFigurineSheet(false)}
        onSelect={(url) => {
          setFigurineUrl(url);
          // Prefetch the new image for faster loading
          if (url) {
            Image.prefetch(url).catch(() => {
              // Silently fail - image will load normally
            });
          }
          // Don't close the sheet - let user continue editing
        }}
      />
    </View>
  );
};

const createStyles = (theme: Theme, isDark?: boolean, topInset: number = 0) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: topInset, // Padding to push content below safe area
    paddingBottom: BOTTOM_NAV_PADDING,
  },
  imageBackground: {
    width: 300,
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: theme.spacing.lg, // Match bottom padding
    marginBottom: theme.spacing.lg,
    alignSelf: 'center', // Center align
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIconText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 60,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.surface[50],
  },
  userInfo: {
    marginBottom: theme.spacing.xl,
  },
  userName: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 28,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: 34,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    textAlign: 'left',
  },
  joinDate: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    textAlign: 'left',
  },
  stats: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.text.tertiary,
    textAlign: 'left',
  },
  listContainer: {
    width: '100%',
    backgroundColor: theme.colors.background.card,
    borderRadius: 10,
    overflow: 'hidden',
  },
});

export default AccountPage; 
