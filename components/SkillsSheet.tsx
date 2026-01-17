import React, { useMemo, useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { SheetHeader } from './SheetHeader';
import { Icon } from './Icon';
import { supabaseClient } from '../lib/supabaseClient';
import { SkillType } from '../backend/database/types';

interface SkillsSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface SkillData {
  skill: SkillType;
  xp: number;
  level: number;
  emoji: string;
  levelUpThisWeek: boolean;
}

const SKILL_EMOJIS: Record<SkillType, string> = {
  'Fitness': '🏃',
  'Strength': '💪',
  'Nutrition': '🥗',
  'Writing': '✍️',
  'Learning': '📚',
  'Languages': '🗣️',
  'Music': '🎵',
  'Creativity': '🎨',
  'Business': '💼',
  'Marketing': '📢',
  'Sales': '💰',
  'Mindfulness': '🧘',
  'Communication': '💬',
  'Finance': '💳',
  'Travel': '✈️',
  'Career': '🚀',
  'Coding': '💻',
};

const ALL_SKILLS: SkillType[] = [
  'Fitness', 'Strength', 'Nutrition', 'Writing', 'Learning', 'Languages', 
  'Music', 'Creativity', 'Business', 'Marketing', 'Sales', 'Mindfulness', 
  'Communication', 'Finance', 'Travel', 'Career', 'Coding'
];

export const SkillsSheet: React.FC<SkillsSheetProps> = ({ 
  visible, 
  onClose
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [skillsData, setSkillsData] = useState<SkillData[]>([]);
  const [overallLevel, setOverallLevel] = useState(1);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [figurineUrl, setFigurineUrl] = useState<string | null>(null);

  // Background image
  const getBackgroundImageUrl = () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;
    return `${supabaseUrl}/storage/v1/object/public/achievement-images/SkillsBackground.png`;
  };
  const backgroundImageUrl = getBackgroundImageUrl();

  useEffect(() => {
    if (visible) {
      loadSkillsData();
    }
  }, [visible]);

  const loadSkillsData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) return;

      // Load user figurine
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('figurine_url')
        .eq('user_id', session.user.id)
        .single();

      if (!profileError && profile?.figurine_url) {
        setFigurineUrl(profile.figurine_url);
      }

      const { data: xpData, error } = await supabaseClient
        .from('user_xp')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;

      // Get completed occurrences from the past week to check for level ups
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString();

      const { data: recentCompletions, error: completionsError } = await supabaseClient
        .from('action_occurrences')
        .select(`
          id,
          xp_gained,
          completed_at,
          actions!inner(
            primary_skill,
            secondary_skill,
            est_minutes,
            difficulty
          )
        `)
        .eq('user_id', session.user.id)
        .not('completed_at', 'is', null)
        .gte('completed_at', oneWeekAgoStr);

      // Create a map of existing XP data
      const xpMap = new Map<SkillType, number>();
      xpData?.forEach(item => {
        xpMap.set(item.skill as SkillType, item.xp);
      });

      // Calculate XP gained per skill in the past week
      const weeklyXpMap = new Map<SkillType, number>();
      recentCompletions?.forEach((completion: any) => {
        // Handle both array and single object responses from Supabase
        const action = Array.isArray(completion.actions) ? completion.actions[0] : completion.actions;
        if (!action) return;
        
        const xpGained = completion.xp_gained || 0;
        if (xpGained > 0) {
          // Allocate XP to primary and secondary skills (70/30 split)
          const primaryXp = Math.round(xpGained * 0.7);
          const secondaryXp = xpGained - primaryXp;
          
          if (action.primary_skill) {
            const current = weeklyXpMap.get(action.primary_skill as SkillType) || 0;
            weeklyXpMap.set(action.primary_skill as SkillType, current + primaryXp);
          }
          if (action.secondary_skill) {
            const current = weeklyXpMap.get(action.secondary_skill as SkillType) || 0;
            weeklyXpMap.set(action.secondary_skill as SkillType, current + secondaryXp);
          }
        }
      });

      // Process all skills - include those with 0 XP
      const processedData: SkillData[] = ALL_SKILLS.map(skill => {
        const xp = xpMap.get(skill) || 0;
        const currentLevel = Math.floor(Math.sqrt(xp / 50)) + 1;
        
        // Check if level went up this week
        const weeklyXp = weeklyXpMap.get(skill) || 0;
        const previousXp = xp - weeklyXp;
        const previousLevel = Math.floor(Math.sqrt(previousXp / 50)) + 1;
        const levelUpThisWeek = currentLevel > previousLevel && weeklyXp > 0;
        
        return {
          skill,
          xp,
          level: currentLevel,
          emoji: SKILL_EMOJIS[skill],
          levelUpThisWeek
        };
      });

      // Sort by level (desc) then XP (desc), then alphabetically
      processedData.sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        if (b.xp !== a.xp) return b.xp - a.xp;
        return a.skill.localeCompare(b.skill);
      });

      setSkillsData(processedData);

      // Calculate overall stats
      const total = processedData.reduce((sum, item) => sum + item.xp, 0);
      setTotalXp(total);
      setOverallLevel(Math.floor(Math.sqrt(total / 50)) + 1);

    } catch (error) {
      console.error('Error loading skills data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to calculate XP needed for next level
  const getXpForNextLevel = (currentXp: number) => {
    const currentLevel = Math.floor(Math.sqrt(currentXp / 50)) + 1;
    const nextLevel = currentLevel + 1;
    // Inverse of Level = sqrt(XP/50) + 1  =>  Level - 1 = sqrt(XP/50) => (Level-1)^2 = XP/50 => XP = 50 * (Level-1)^2
    // But we want XP for NEXT level. 
    // Wait, let's double check formula: Level 1 starts at 0 XP. 
    // Level 2 starts when sqrt(XP/50) >= 1 => XP >= 50.
    // Level 3 starts when sqrt(XP/50) >= 2 => XP >= 200.
    // XP needed for level L is 50 * (L-1)^2.
    // XP needed for next level (currentLevel + 1) is 50 * (currentLevel)^2.
    
    const xpForNextLevel = 50 * Math.pow(currentLevel, 2);
    const xpForCurrentLevel = 50 * Math.pow(currentLevel - 1, 2);
    
    const progressInLevel = currentXp - xpForCurrentLevel;
    const totalForLevel = xpForNextLevel - xpForCurrentLevel;
    
    return {
      nextLevelXp: xpForNextLevel,
      progress: progressInLevel,
      total: totalForLevel,
      percent: Math.min(100, (progressInLevel / totalForLevel) * 100)
    };
  };

  const overallProgress = getXpForNextLevel(totalXp);

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.container}>
        {backgroundImageUrl && (
          <Image 
            source={{ uri: backgroundImageUrl }} 
            style={styles.backgroundImage}
            contentFit="cover"
            cachePolicy="disk"
            transition={0}
          />
        )}
        
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <SheetHeader onClose={onClose} title="Skills & Levels" />
          
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Figurine Image */}
            {figurineUrl && (
              <View style={styles.figurineContainer}>
                <Image
                  source={{ uri: figurineUrl }}
                  style={styles.figurineImage}
                  contentFit="cover"
                  cachePolicy="disk"
                />
              </View>
            )}

            {/* Overall Level Card */}
            <View style={styles.overallCard}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelNumber}>{overallLevel}</Text>
                <Text style={styles.levelLabel}>LEVEL</Text>
              </View>
              
              <View style={styles.overallStats}>
                <Text style={styles.overallTitle}>Overall Progress</Text>
                <Text style={styles.xpText}>{totalXp} Total XP</Text>
                
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${overallProgress.percent}%` }]} />
                </View>
                <Text style={styles.nextLevelText}>
                  {Math.round(overallProgress.total - overallProgress.progress)} XP to Level {overallLevel + 1}
                </Text>
              </View>
            </View>

            {/* Skills Grid */}
            <Text style={styles.sectionTitle}>Your Skills</Text>
            
            {loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Loading skills...</Text>
              </View>
            ) : (
              <View style={styles.skillsGrid}>
                {skillsData.map((skillItem) => {
                  const progress = getXpForNextLevel(skillItem.xp);
                  const hasXp = skillItem.xp > 0;
                  return (
                    <View 
                      key={skillItem.skill} 
                      style={[
                        styles.skillCard,
                        !hasXp && styles.skillCardEmpty
                      ]}
                    >
                      <View style={styles.skillHeader}>
                        <View style={styles.skillNameRow}>
                          <Text style={styles.skillEmoji}>{skillItem.emoji}</Text>
                          <Text 
                            style={[
                              styles.skillName, 
                              !hasXp && styles.skillNameEmpty
                            ]} 
                            numberOfLines={1}
                          >
                            {skillItem.skill}
                          </Text>
                        </View>
                        <View style={styles.skillLevelRow}>
                          {skillItem.levelUpThisWeek && (
                            <Icon 
                              name="arrow_upward" 
                              size={14} 
                              color={theme.colors.success[500]} 
                              style={styles.levelUpIcon}
                            />
                          )}
                          <View style={[
                            styles.skillLevelBadge,
                            !hasXp && styles.skillLevelBadgeEmpty
                          ]}>
                            <Text style={[
                              styles.skillLevelText,
                              !hasXp && styles.skillLevelTextEmpty
                            ]}>
                              {skillItem.level}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.skillProgressContainer}>
                        <View style={styles.miniProgressBarBg}>
                          {hasXp && (
                            <View style={[styles.miniProgressBarFill, { width: `${progress.percent}%` }]} />
                          )}
                        </View>
                        <Text style={[
                          styles.skillXpText,
                          !hasXp && styles.skillXpTextEmpty
                        ]}>
                          {skillItem.xp} XP
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            
            {/* Unlocked Skills List (if any skills with 0 XP are not shown above) */}
            {/* You could optionally show grayed out skills here */}
            
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme, isDark?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? theme.colors.background.page : '#F3F4F6',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 40,
  },
  
  // Figurine
  figurineContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  figurineImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: isDark ? theme.colors.border.default : 'rgba(0,0,0,0.1)',
  },
  
  // Overall Card
  overallCard: {
    flexDirection: 'row',
    backgroundColor: isDark ? theme.colors.background.card : '#FFFFFF',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: isDark ? theme.colors.border.default : 'rgba(0,0,0,0.05)',
  },
  levelBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
    shadowColor: theme.colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  levelNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 36,
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  overallStats: {
    flex: 1,
  },
  overallTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  xpText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[500],
    borderRadius: 4,
  },
  nextLevelText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    textAlign: 'right',
  },

  // Skills Grid
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skillCard: {
    width: '48%', // Roughly 2 columns with gap
    backgroundColor: isDark ? theme.colors.background.card : '#FFFFFF',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: isDark ? theme.colors.border.default : 'rgba(0,0,0,0.05)',
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skillNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  skillEmoji: {
    fontSize: 18,
  },
  skillName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  skillLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  levelUpIcon: {
    marginRight: 2,
  },
  skillLevelBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.background.pressed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillLevelText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  skillProgressContainer: {
    width: '100%',
  },
  miniProgressBarBg: {
    height: 4,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 4,
  },
  miniProgressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.success[500],
    borderRadius: 2,
  },
  skillXpText: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    textAlign: 'right',
  },
  skillCardEmpty: {
    opacity: 0.6,
  },
  skillNameEmpty: {
    color: theme.colors.text.tertiary,
  },
  skillLevelBadgeEmpty: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  },
  skillLevelTextEmpty: {
    color: theme.colors.text.tertiary,
  },
  skillXpTextEmpty: {
    color: theme.colors.text.tertiary,
  },
  
  // Empty State
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
});
