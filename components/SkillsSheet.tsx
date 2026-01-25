import React, { useMemo, useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { SheetHeader } from './SheetHeader';
import { Icon } from './Icon';
import { SegmentedControl } from './SegmentedControl';
import { supabaseClient } from '../lib/supabaseClient';
import { SkillType } from '../backend/database/types';
import { checkEvolutionAvailability, generateEvolution } from '../frontend-services/backend-bridge';
import { EvolutionSheet } from './EvolutionSheet';
import { Button } from './Button';

interface SkillsSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface SkillData {
  skill: SkillType;
  xp: number;
  level: number;
  iconName: string;
  levelUpThisWeek: boolean;
}

interface BeforeAfterSkillData extends SkillData {
  beforeXp: number;
  beforeLevel: number;
}

interface ProjectedSkillData extends SkillData {
  projectedXp: number;
  projectedLevel: number;
}

const SKILL_ICONS: Record<SkillType, string> = {
  'Fitness': 'directions_run',
  'Strength': 'fitness_center',
  'Nutrition': 'restaurant',
  'Writing': 'edit',
  'Learning': 'school',
  'Languages': 'language',
  'Music': 'music_note',
  'Creativity': 'palette',
  'Business': 'business',
  'Marketing': 'campaign',
  'Sales': 'attach_money',
  'Mindfulness': 'self_improvement',
  'Communication': 'chat',
  'Finance': 'account_balance_wallet',
  'Travel': 'flight',
  'Career': 'work',
  'Coding': 'code',
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
  const [selectedTab, setSelectedTab] = useState<'current' | 'beforeAfter' | 'end2025'>('current');
  const [skillsData, setSkillsData] = useState<SkillData[]>([]);
  const [beforeAfterData, setBeforeAfterData] = useState<BeforeAfterSkillData[]>([]);
  const [projectedData, setProjectedData] = useState<ProjectedSkillData[]>([]);
  const [overallLevel, setOverallLevel] = useState(1);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [figurineUrl, setFigurineUrl] = useState<string | null>(null);
  const [originalFigurineUrl, setOriginalFigurineUrl] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>('User');
  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null);
  const [evolutionAvailable, setEvolutionAvailable] = useState(false);
  const [evolutionLevel, setEvolutionLevel] = useState<number | null>(null);
  const [evolutionLevelToShow, setEvolutionLevelToShow] = useState<number>(0);
  const [isEvolving, setIsEvolving] = useState(false);
  const [showEvolutionSheet, setShowEvolutionSheet] = useState(false);
  const [evolvedFigurineUrl, setEvolvedFigurineUrl] = useState<string | null>(null);

  const calculateXpForOccurrence = ({
    estMinutes,
    difficulty,
    deferCount,
  }: {
    estMinutes?: number | null;
    difficulty?: 'easy' | 'medium' | 'hard' | string | null;
    deferCount?: number | null;
  }) => {
    // Mirrors `migrations/add_skills_and_xp.sql` calculate_xp_on_completion()
    const minutes = estMinutes ?? 15;
    const diff = (difficulty ?? 'easy') as string;

    const multiplier =
      diff === 'easy' ? 1.0 :
      diff === 'medium' ? 1.3 :
      diff === 'hard' ? 1.7 :
      1.0;

    let baseXp = Math.round(minutes * multiplier);
    if (baseXp < 5) baseXp = 5;
    if (baseXp > 60) baseXp = 60;

    const penalty = Math.min(10, 2 * (deferCount ?? 0));
    const finalXp = Math.max(1, baseXp - penalty);

    const primaryXp = Math.round(finalXp * 0.7);
    const secondaryXp = finalXp - primaryXp;

    return { finalXp, primaryXp, secondaryXp };
  };

  // Background image
  const getBackgroundImageUrl = () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const fallbackUrl =
      'https://cqzutvspbsspgtmcdqyp.supabase.co/storage/v1/object/public/achievement-images/SkillsBackground.png';
    if (!supabaseUrl) return fallbackUrl;
    return `${supabaseUrl}/storage/v1/object/public/achievement-images/SkillsBackground.png`;
  };
  const backgroundImageUrl = getBackgroundImageUrl();

  // Prefetch background image
  useEffect(() => {
    if (backgroundImageUrl) {
      Image.prefetch(backgroundImageUrl);
    }
  }, [backgroundImageUrl]);

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
      setUserDisplayName(session.user.email?.split('@')[0] || 'User');

      // Load user profile (figurine and creation date)
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('figurine_url, original_figurine_url, created_at')
        .eq('user_id', session.user.id)
        .single();

      if (!profileError && profile) {
        if (profile.figurine_url) {
          setFigurineUrl(profile.figurine_url);
        }
        if (profile.original_figurine_url) {
          setOriginalFigurineUrl(profile.original_figurine_url);
        } else if (profile.figurine_url) {
          // If no original_figurine_url, use current figurine_url as original
          setOriginalFigurineUrl(profile.figurine_url);
        }
        if (profile.created_at) {
          setUserCreatedAt(new Date(profile.created_at));
        }
      }

      // Check evolution availability
      try {
        const evolutionCheck = await checkEvolutionAvailability(session.access_token);
        if (evolutionCheck.success && evolutionCheck.data.available) {
          setEvolutionAvailable(true);
          setEvolutionLevel(evolutionCheck.data.evolution_level);
        } else {
          setEvolutionAvailable(false);
          setEvolutionLevel(null);
        }
      } catch (error) {
        console.error('Error checking evolution availability:', error);
        setEvolutionAvailable(false);
        setEvolutionLevel(null);
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
        const currentLevel = Math.floor(Math.sqrt(xp / 10)) + 1;
        
        // Check if level went up this week
        const weeklyXp = weeklyXpMap.get(skill) || 0;
        const previousXp = xp - weeklyXp;
        const previousLevel = Math.floor(Math.sqrt(previousXp / 10)) + 1;
        const levelUpThisWeek = currentLevel > previousLevel && weeklyXp > 0;
        
        return {
          skill,
          xp,
          level: currentLevel,
          iconName: SKILL_ICONS[skill],
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
      setOverallLevel(Math.floor(Math.sqrt(total / 10)) + 1);

      // Load Before/After data
      await loadBeforeAfterData(session.user.id, processedData);

      // Load Projected data
      await loadProjectedData(session.user.id, processedData);

    } catch (error) {
      console.error('Error loading skills data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBeforeAfterData = async (userId: string, currentData: SkillData[]) => {
    try {
      // Day 1 baseline: Level 1 with 0 XP for every skill.
      const beforeAfter: BeforeAfterSkillData[] = ALL_SKILLS.map(skill => {
        const current = currentData.find(d => d.skill === skill) || currentData[0];
        const beforeXp = 0;
        const beforeLevel = 1;

        return {
          ...current,
          beforeXp,
          beforeLevel,
        };
      });

      // Sort same as current
      beforeAfter.sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        if (b.xp !== a.xp) return b.xp - a.xp;
        return a.skill.localeCompare(b.skill);
      });

      setBeforeAfterData(beforeAfter);
    } catch (error) {
      console.error('Error loading before/after data:', error);
    }
  };

  const loadProjectedData = async (userId: string, currentData: SkillData[]) => {
    try {
      // Final-tab projection: "If you finished everything currently scheduled in your existing (non-archived) dreams"
      // 1) Try to scope to non-archived dreams. If this returns nothing (or errors), fall back to "all incomplete occurrences".
      let dreamIds: string[] | null = null;
      try {
        const { data: dreams, error: dreamsError } = await supabaseClient
          .from('dreams')
          .select('id')
          .eq('user_id', userId)
          .is('archived_at', null);

        if (!dreamsError && dreams) {
          dreamIds = dreams.map((d: any) => d?.id).filter(Boolean);
        }
      } catch {
        dreamIds = null;
      }

      const baseOccQuery = supabaseClient
        .from('action_occurrences')
        .select(`
          id,
          dream_id,
          defer_count,
          completed_at,
          actions!inner(
            primary_skill,
            secondary_skill,
            est_minutes,
            difficulty
          )
        `)
        .eq('user_id', userId)
        .is('completed_at', null);

      const { data: incompleteOccurrences, error: occError } =
        dreamIds && dreamIds.length > 0
          ? await baseOccQuery.in('dream_id', dreamIds)
          : await baseOccQuery;

      if (occError) throw occError;

      const remainingXpBySkill = new Map<SkillType, number>();
      (incompleteOccurrences || []).forEach((occ: any) => {
        const action = Array.isArray(occ.actions) ? occ.actions[0] : occ.actions;
        if (!action) return;

        const { primaryXp, secondaryXp } = calculateXpForOccurrence({
          estMinutes: action.est_minutes,
          difficulty: action.difficulty,
          deferCount: occ.defer_count,
        });

        if (action.primary_skill) {
          const skill = action.primary_skill as SkillType;
          remainingXpBySkill.set(skill, (remainingXpBySkill.get(skill) || 0) + primaryXp);
        }
        if (action.secondary_skill) {
          const skill = action.secondary_skill as SkillType;
          remainingXpBySkill.set(skill, (remainingXpBySkill.get(skill) || 0) + secondaryXp);
        }
      });

      const projected: ProjectedSkillData[] = ALL_SKILLS.map(skill => {
        const current = currentData.find(d => d.skill === skill) || currentData[0];
        const projectedXp = Math.max(0, current.xp + (remainingXpBySkill.get(skill) || 0));
        const projectedLevel = Math.floor(Math.sqrt(projectedXp / 10)) + 1;

        return { ...current, projectedXp, projectedLevel };
      });

      // Sort same as current
      projected.sort((a, b) => {
        if (b.projectedLevel !== a.projectedLevel) return b.projectedLevel - a.projectedLevel;
        if (b.projectedXp !== a.projectedXp) return b.projectedXp - a.projectedXp;
        return a.skill.localeCompare(b.skill);
      });

      setProjectedData(projected);
    } catch (error) {
      console.error('Error loading projected data:', error);
    }
  };

  // Helper to calculate XP needed for next level
  const getXpForNextLevel = (currentXp: number) => {
    const currentLevel = Math.floor(Math.sqrt(currentXp / 10)) + 1;
    const nextLevel = currentLevel + 1;
    // Inverse of Level = sqrt(XP/10) + 1  =>  Level - 1 = sqrt(XP/10) => (Level-1)^2 = XP/10 => XP = 10 * (Level-1)^2
    // But we want XP for NEXT level. 
    // Wait, let's double check formula: Level 1 starts at 0 XP. 
    // Level 2 starts when sqrt(XP/10) >= 1 => XP >= 10.
    // Level 3 starts when sqrt(XP/10) >= 2 => XP >= 40.
    // XP needed for level L is 10 * (L-1)^2.
    // XP needed for next level (currentLevel + 1) is 10 * (currentLevel)^2.
    
    const xpForNextLevel = 10 * Math.pow(currentLevel, 2);
    const xpForCurrentLevel = 10 * Math.pow(currentLevel - 1, 2);
    
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
  const overallSegments = 25;
  const filledSegments = Math.max(
    0,
    Math.min(overallSegments, Math.floor((overallProgress.percent / 100) * overallSegments))
  );
  const overallRemainingXp = Math.max(0, Math.round(overallProgress.total - overallProgress.progress));

  // Figurine sizing (match AccountPage sizing approach)
  const screenWidth = Dimensions.get('window').width;
  const contentWidth = screenWidth - theme.spacing.lg * 2;
  const figurineSize = Math.min(contentWidth * 0.7, 300);

  // Get icon color based on level (white for all levels now)
  const getIconColorForLevel = (level: number, hasXp: boolean): string => {
    return theme.colors.icon.inverse;
  };

  const handleEvolve = async () => {
    try {
      setIsEvolving(true);
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        console.error('No session token');
        return;
      }

      // Get original figurine URL (fallback to current if not set)
      const originalUrl = originalFigurineUrl || figurineUrl;
      if (!originalUrl) {
        console.error('No original figurine URL');
        return;
      }

      // Build skill levels object
      const skillLevels: Record<string, number> = {};
      skillsData.forEach(skill => {
        skillLevels[skill.skill] = skill.level;
      });

      // Get dream titles
      const { data: dreams, error: dreamsError } = await supabaseClient
        .from('dreams')
        .select('title')
        .eq('user_id', session.user.id)
        .is('archived_at', null);

      const dreamTitles = dreams && !dreamsError ? dreams.map(d => d.title) : [];

      // Generate evolution
      const result = await generateEvolution(session.access_token, {
        evolution_level: evolutionLevel!,
        original_figurine_url: originalUrl,
        skill_levels: skillLevels,
        dream_titles: dreamTitles,
      });

      if (result.success) {
        // Store evolution level before clearing it (for display in sheet)
        const levelToShow = evolutionLevel!;
        setEvolvedFigurineUrl(result.data.figurine_url);
        setFigurineUrl(result.data.figurine_url);
        setEvolutionAvailable(false);
        // Store the level in a separate state for display
        setEvolutionLevelToShow(levelToShow);
        setEvolutionLevel(null);
        setShowEvolutionSheet(true);
        // Reload skills data to refresh
        await loadSkillsData();
      } else {
        console.error('Evolution generation failed');
      }
    } catch (error) {
      console.error('Error evolving:', error);
    } finally {
      setIsEvolving(false);
    }
  };

  // Calculate overall stats for each view
  const getOverallStats = () => {
    if (selectedTab === 'current') {
      return { level: overallLevel, xp: totalXp };
    } else if (selectedTab === 'beforeAfter') {
      const beforeTotal = beforeAfterData.reduce((sum, item) => sum + item.beforeXp, 0);
      const beforeLevel = Math.floor(Math.sqrt(beforeTotal / 10)) + 1;
      return { level: overallLevel, xp: totalXp, beforeLevel, beforeXp: beforeTotal };
    } else {
      const projectedTotal = projectedData.reduce((sum, item) => sum + item.projectedXp, 0);
      const projectedLevel = Math.floor(Math.sqrt(projectedTotal / 10)) + 1;
      return { level: projectedLevel, xp: projectedTotal, isProjected: true };
    }
  };

  const currentOverallStats = getOverallStats();
  const currentOverallProgress = getXpForNextLevel(currentOverallStats.xp);
  const currentOverallRemainingXp = Math.max(0, Math.round(currentOverallProgress.total - currentOverallProgress.progress));

  // Render skill row for current view
  const renderCurrentSkillRow = (skillItem: SkillData) => {
    const hasXp = skillItem.xp > 0;
    return (
      <View 
        key={skillItem.skill} 
        style={[
          styles.skillRow,
          !hasXp && styles.skillRowEmpty
        ]}
      >
        <View style={styles.skillHeaderRow}>
          <View style={styles.skillHeaderLeft}>
            <View style={styles.skillIconContainer}>
              <Icon
                name={skillItem.iconName}
                size={18}
                color={getIconColorForLevel(skillItem.level, hasXp)}
              />
            </View>
            <Text
              style={[styles.skillName, !hasXp && styles.skillNameEmpty]}
              numberOfLines={1}
            >
              {skillItem.skill}
            </Text>
          </View>

          <View style={styles.skillHeaderRight}>
            {skillItem.levelUpThisWeek && (
              <Icon
                name="arrow_upward"
                size={16}
                color={theme.colors.icon.inverse}
                style={styles.levelUpIcon}
              />
            )}
            <Text style={[styles.skillLevelText, !hasXp && styles.skillLevelTextEmpty]}>
              {skillItem.level}
            </Text>
          </View>
        </View>

        {hasXp && (() => {
          const skillProgress = getXpForNextLevel(skillItem.xp);
          return (
            <View style={styles.skillProgressWrap}>
              <View style={styles.skillBarBg}>
                <View style={[styles.skillBarFill, { width: `${skillProgress.percent}%` }]} />
              </View>
            </View>
          );
        })()}
      </View>
    );
  };

  // Render skill row for before/after view
  const renderBeforeAfterSkillRow = (skillItem: BeforeAfterSkillData) => {
    const hasXp = skillItem.xp > 0 || skillItem.beforeXp > 0;
    const levelChanged = skillItem.level !== skillItem.beforeLevel;
    return (
      <View 
        key={skillItem.skill} 
        style={[
          styles.skillRow,
          !hasXp && styles.skillRowEmpty
        ]}
      >
        <View style={styles.skillHeaderRow}>
          <View style={styles.skillHeaderLeft}>
            <View style={styles.skillIconContainer}>
              <Icon
                name={skillItem.iconName}
                size={18}
                color={getIconColorForLevel(skillItem.level, hasXp || skillItem.beforeXp > 0)}
              />
            </View>
            <Text
              style={[styles.skillName, !hasXp && styles.skillNameEmpty]}
              numberOfLines={1}
            >
              {skillItem.skill}
            </Text>
          </View>

          <View style={styles.skillHeaderRight}>
            {levelChanged && (
              <Icon
                name="arrow_upward"
                size={16}
                color={theme.colors.icon.inverse}
                style={styles.levelUpIcon}
              />
            )}
            <View style={styles.beforeAfterLevelContainer}>
              <Text style={[styles.skillLevelText, !skillItem.beforeXp && styles.skillLevelTextEmpty, styles.beforeLevel]}>
                {skillItem.beforeLevel}
              </Text>
              <Text style={styles.beforeAfterArrow}>→</Text>
              <Text style={[styles.skillLevelText, !skillItem.xp && styles.skillLevelTextEmpty]}>
                {skillItem.level}
              </Text>
            </View>
          </View>
        </View>

        {hasXp && (
          <View style={styles.beforeAfterXpContainer}>
            <Text style={styles.beforeAfterXpText}>
              {skillItem.beforeXp} XP → {skillItem.xp} XP
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Render skill row for projected view
  const renderProjectedSkillRow = (skillItem: ProjectedSkillData) => {
    const hasXp = skillItem.xp > 0 || skillItem.projectedXp > 0;
    return (
      <View 
        key={skillItem.skill} 
        style={[
          styles.skillRow,
          !hasXp && styles.skillRowEmpty,
          styles.projectedRow
        ]}
      >
        <View style={styles.skillHeaderRow}>
          <View style={styles.skillHeaderLeft}>
            <View style={styles.skillIconContainer}>
              <Icon
                name={skillItem.iconName}
                size={18}
                color={getIconColorForLevel(skillItem.projectedLevel, hasXp)}
              />
            </View>
            <Text
              style={[styles.skillName, !hasXp && styles.skillNameEmpty]}
              numberOfLines={1}
            >
              {skillItem.skill}
            </Text>
          </View>

          <View style={styles.skillHeaderRight}>
            <Text style={[styles.skillLevelText, !hasXp && styles.skillLevelTextEmpty]}>
              {skillItem.projectedLevel}
            </Text>
          </View>
        </View>

        {hasXp && (() => {
          const skillProgress = getXpForNextLevel(skillItem.projectedXp);
          return (
            <View style={styles.skillProgressWrap}>
              <View style={styles.skillBarBg}>
                <View style={[styles.skillBarFill, { width: `${skillProgress.percent}%` }]} />
              </View>
            </View>
          );
        })()}
      </View>
    );
  };

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
            priority="high"
          />
        )}
        
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <SheetHeader onClose={onClose} title="Skills & Levels" titleColor={theme.colors.text.inverse} />
          
          <SegmentedControl
            options={['Current', 'Day 1 → Now', 'Dream You']}
            selectedIndex={selectedTab === 'current' ? 0 : selectedTab === 'beforeAfter' ? 1 : 2}
            onSelect={(index) => {
              if (index === 0) setSelectedTab('current');
              else if (index === 1) setSelectedTab('beforeAfter');
              else setSelectedTab('end2025');
            }}
          />
          
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop:
                  selectedTab === 'current' && figurineUrl
                    ? Math.max(figurineSize / 2, theme.spacing.lg)
                    : theme.spacing.lg,
              }
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Current Tab UI */}
            {selectedTab === 'current' && (
              <>
                <View style={styles.profileCard}>
                  {figurineUrl && (
                    <View
                      style={[
                        styles.profileFigurineWrap,
                        {
                          width: figurineSize,
                          height: figurineSize,
                          marginLeft: -figurineSize / 2,
                          top: -figurineSize / 2,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: figurineUrl }}
                        style={[styles.figurineImage, { width: figurineSize, height: figurineSize }]}
                        contentFit="cover"
                        cachePolicy="disk"
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.profileCardInner,
                      {
                        paddingTop: figurineUrl
                          ? figurineSize / 2 + theme.spacing.md
                          : theme.spacing.md,
                      },
                    ]}
                  >
                    <Text style={styles.profileName} numberOfLines={1}>
                      {userDisplayName}
                    </Text>

                    <View style={styles.levelBadgeRow}>
                      <View style={[
                        styles.levelBadgePill,
                        currentOverallStats.level === 2 && styles.levelBadgePillLevel2
                      ]}>
                        <Text style={[
                          styles.levelBadgePillText,
                          currentOverallStats.level === 2 && styles.levelBadgePillTextLevel2
                        ]}>
                          Level {currentOverallStats.level}
                        </Text>
                      </View>
                      <Text style={styles.totalXpText}>
                        {currentOverallStats.xp.toLocaleString()} XP earned
                      </Text>
                    </View>

                    <View style={styles.profileProgressWrap}>
                      <View style={styles.skillBarBg}>
                        <View style={[styles.skillBarFill, { width: `${currentOverallProgress.percent}%` }]} />
                      </View>
                      <Text style={styles.nextLevelText}>
                        <Text style={styles.nextLevelXpBold}>{currentOverallRemainingXp} XP</Text> to Level {currentOverallStats.level + 1}
                      </Text>
                    </View>

                    {evolutionAvailable && evolutionLevel && (
                      <View style={styles.evolveButtonContainer}>
                        <Button
                          title={`Evolve to Level ${evolutionLevel}`}
                          onPress={handleEvolve}
                          variant="inverse"
                          size="md"
                          disabled={isEvolving}
                          loading={isEvolving}
                        />
                      </View>
                    )}
                  </View>
                </View>

                {loading ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Loading skills...</Text>
                  </View>
                ) : (
                  <View style={styles.skillsList}>
                    {skillsData.map(renderCurrentSkillRow)}
                  </View>
                )}
              </>
            )}

            {/* Day 1 → Now Tab UI */}
            {selectedTab === 'beforeAfter' && (
              <>
                <View style={styles.twoContainerRow}>
                  <View style={styles.twoColumnSide}>
                    <View style={styles.sideHeader}>
                      <Text style={styles.sideHeaderLabel}>Day 1</Text>
                      <View style={styles.sideCardImageWrapper}>
                        {originalFigurineUrl ? (
                          <Image
                            source={{ uri: originalFigurineUrl }}
                            style={styles.sideCardImage}
                            contentFit="cover"
                            cachePolicy="disk"
                          />
                        ) : (
                          <View style={styles.sideCardPlaceholder}>
                            <Icon name="person" size={32} color={theme.colors.text.tertiary} />
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.sideCard}>
                      <Text style={styles.sideCardLevel}>Level 1</Text>
                      <Text style={styles.sideCardXp}>0 XP</Text>
                    </View>
                  </View>

                  <View style={styles.twoColumnSide}>
                    <View style={styles.sideHeader}>
                      <Text style={styles.sideHeaderLabel}>Now</Text>
                      <View style={styles.sideCardImageWrapper}>
                        {figurineUrl ? (
                          <Image
                            source={{ uri: figurineUrl }}
                            style={styles.sideCardImage}
                            contentFit="cover"
                            cachePolicy="disk"
                          />
                        ) : (
                          <View style={styles.sideCardPlaceholder}>
                            <Icon name="person" size={32} color={theme.colors.text.tertiary} />
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.sideCard}>
                      <Text style={styles.sideCardLevel}>Level {currentOverallStats.level}</Text>
                      <Text style={styles.sideCardXp}>{currentOverallStats.xp.toLocaleString()} XP</Text>
                    </View>
                  </View>
                </View>

                {loading ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Loading skills...</Text>
                  </View>
                ) : (
                  <View style={styles.skillsList}>
                    {beforeAfterData.map(renderBeforeAfterSkillRow)}
                  </View>
                )}
              </>
            )}

            {/* Dream You Tab UI */}
            {selectedTab === 'end2025' && (
              <>
                <View style={styles.twoContainerRow}>
                  <View style={styles.twoColumnSide}>
                    <View style={styles.sideHeader}>
                      <Text style={styles.sideHeaderLabel}>Day 1</Text>
                      <View style={styles.sideCardImageWrapper}>
                        {originalFigurineUrl ? (
                          <Image
                            source={{ uri: originalFigurineUrl }}
                            style={styles.sideCardImage}
                            contentFit="cover"
                            cachePolicy="disk"
                          />
                        ) : (
                          <View style={styles.sideCardPlaceholder}>
                            <Icon name="person" size={32} color={theme.colors.text.tertiary} />
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.sideCard}>
                      <Text style={styles.sideCardLevel}>Level 1</Text>
                      <Text style={styles.sideCardXp}>0 XP</Text>
                    </View>
                  </View>

                  <View style={styles.twoColumnSide}>
                    <View style={styles.sideHeader}>
                      <Text style={styles.sideHeaderLabel}>Dream You</Text>
                      <View style={styles.sideCardImageWrapper}>
                        {figurineUrl ? (
                          <Image
                            source={{ uri: figurineUrl }}
                            style={styles.sideCardImage}
                            contentFit="cover"
                            cachePolicy="disk"
                          />
                        ) : (
                          <View style={styles.sideCardPlaceholder}>
                            <Icon name="person" size={32} color={theme.colors.text.tertiary} />
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.sideCard}>
                      <Text style={styles.sideCardLevel}>Level {currentOverallStats.level}</Text>
                      <Text style={styles.sideCardXp}>{currentOverallStats.xp.toLocaleString()} XP</Text>
                    </View>
                  </View>
                </View>

                {loading ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Loading skills...</Text>
                  </View>
                ) : (
                  <View style={styles.skillsList}>
                    {projectedData.map(renderProjectedSkillRow)}
                  </View>
                )}
              </>
            )}
            
            {/* Unlocked Skills List (if any skills with 0 XP are not shown above) */}
            {/* You could optionally show grayed out skills here */}
            
          </ScrollView>
        </SafeAreaView>
      </View>

      <EvolutionSheet
        visible={showEvolutionSheet}
        evolutionLevel={evolutionLevelToShow}
        figurineUrl={evolvedFigurineUrl || ''}
        onClose={() => {
          setShowEvolutionSheet(false);
          setEvolvedFigurineUrl(null);
          setEvolutionLevelToShow(0);
        }}
      />
    </Modal>
  );
};

const createStyles = (theme: Theme, isDark?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 1,
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
  
  // Profile / Overall (new layout)
  profileCard: {
    width: '100%',
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.xl,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    overflow: 'visible',
  },
  profileFigurineWrap: {
    position: 'absolute',
    left: '50%',
    zIndex: 2,
  },
  profileCardInner: {
    width: '100%',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  levelBadgeRow: {
    width: '100%',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  levelBadgePill: {
    backgroundColor: theme.colors.background.pressed,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  levelBadgePillLevel2: {
    backgroundColor: theme.colors.success[700],
    borderColor: theme.colors.success[800],
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  levelBadgePillProjected: {
    backgroundColor: theme.colors.success[700],
    borderColor: theme.colors.success[800],
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  levelBadgePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  levelBadgePillTextLevel2: {
    color: theme.colors.text.inverse,
    fontSize: 26,
  },
  levelBadgePillTextProjected: {
    color: theme.colors.text.inverse,
    fontSize: 22,
  },
  totalXpText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  profileProgressWrap: {
    width: '100%',
    gap: theme.spacing.md,
  },
  figurineImage: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 0,
  },
  nextLevelText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
  nextLevelXpBold: {
    fontWeight: '700',
  },
  evolveButtonContainer: {
    width: '100%',
    marginTop: theme.spacing.md,
  },

  // Skills list
  skillsList: {
    gap: 10,
  },
  skillRow: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 0,
  },
  skillRowEmpty: {
    opacity: 0.65,
  },
  skillHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: 10,
  },
  skillHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  skillIconContainer: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.inverse,
    flex: 1,
  },
  skillNameEmpty: {
    color: theme.colors.text.inverse,
    opacity: 0.5,
  },
  skillHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelUpIcon: {
    marginRight: 2,
  },
  skillLevelText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
  skillLevelTextEmpty: {
    color: theme.colors.text.inverse,
    opacity: 0.5,
  },
  skillProgressWrap: {
    width: '100%',
    gap: theme.spacing.md,
  },
  skillBarBg: {
    height: 8,
    backgroundColor: theme.colors.background.pressed,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  skillBarFill: {
    height: '100%',
    backgroundColor: theme.colors.grey[600],
    borderRadius: 4,
  },
  skillXpText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    textAlign: 'right',
  },
  skillXpTextEmpty: {
    color: theme.colors.text.tertiary,
  },
  
  // Before/After specific styles
  beforeAfterLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  beforeLevel: {
    opacity: 0.6,
    color: theme.colors.text.inverse,
  },
  beforeAfterArrow: {
    fontSize: 14,
    color: theme.colors.text.inverse,
    opacity: 0.7,
    marginHorizontal: 2,
  },
  beforeAfterXpContainer: {
    marginTop: 8,
  },
  beforeAfterXpText: {
    fontSize: 12,
    color: theme.colors.text.inverse,
    opacity: 0.7,
  },
  
  // Projected row style
  projectedRow: {
    opacity: 0.9,
  },

  // Two columns: title + image above (outside white), white card below with level + XP
  twoContainerRow: {
    width: '100%',
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  twoColumnSide: {
    flex: 1,
    gap: theme.spacing.sm,
    alignItems: 'stretch',
  },
  sideHeader: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sideHeaderLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text.inverse,
    textAlign: 'center',
  },
  sideCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  sideCardImageWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.disabled.inactive,
  },
  sideCardImage: {
    width: '100%',
    height: '100%',
  },
  sideCardPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.disabled.inactive,
  },
  sideCardLevel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  sideCardXp: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text.secondary,
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
