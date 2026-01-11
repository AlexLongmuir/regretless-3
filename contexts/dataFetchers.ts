/**
 * contexts/dataFetchers.ts
 * 
 * This file contains all the data fetching functions that interact with the Supabase backend.
 * Each function is responsible for fetching specific types of data and returning it in the
 * format expected by the DataContext.
 * 
 * Key responsibilities:
 * - Fetch dreams (basic and with stats)
 * - Fetch today's action occurrences
 * - Fetch progress data and photos
 * - Fetch detailed dream information
 * - Handle user authentication for all queries
 * - Process and transform raw database data
 * 
 * All functions return undefined on error, allowing the DataContext to handle failures gracefully.
 * Each function includes comprehensive logging for debugging and monitoring.
 */

import { supabaseClient } from '../lib/supabaseClient';
import { now } from './dataCache';
import type { 
  DreamsSummaryPayload, 
  DreamsWithStatsPayload, 
  TodayPayload, 
  DreamDetailPayload, 
  ProgressPayload 
} from './dataCache';

/**
 * DREAMS FETCHERS
 * 
 * Functions for fetching dream-related data from the database.
 */

// Fetch basic dreams list (without computed stats)
export const fetchDreamsSummary = async (): Promise<DreamsSummaryPayload | undefined> => {
  console.log('fetchDreamsSummary: Starting database query');
  
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    console.error('fetchDreamsSummary: No authenticated user:', userError);
    return undefined;
  }
  
  console.log('fetchDreamsSummary: User authenticated:', user.id);
  
  const { data, error } = await supabaseClient
    .from('dreams')
    .select('*')
    .is('archived_at', null)
    .not('activated_at', 'is', null)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  
  console.log('fetchDreamsSummary: Database response:', { 
    dataLength: data?.length || 0, 
    error: error?.message || 'none',
    hasData: !!data 
  });
  
  if (error) {
    console.error('Error fetching dreams summary:', error);
    return undefined;
  }
  
  return { dreams: data, fetchedAt: now() };
};

// Fetch dreams with computed statistics (streaks, counts, etc.)
export const fetchDreamsWithStats = async (): Promise<DreamsWithStatsPayload | undefined> => {
  console.log('fetchDreamsWithStats: Starting fetch...');
  try {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('fetchDreamsWithStats: No authenticated user:', userError);
      return undefined;
    }
    
    console.log('fetchDreamsWithStats: User authenticated:', user.id);
    
    // Get all activated dreams
    const { data: dreams, error: dreamsError } = await supabaseClient
      .from('dreams')
      .select('*')
      .is('archived_at', null)
      .not('activated_at', 'is', null)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (dreamsError) {
      console.error('Error fetching dreams:', dreamsError);
      return undefined;
    }

    // For each dream, get stats
    const dreamsWithStats = await Promise.all(
      (dreams || []).map(async (dream) => {
        // Get overdue count
        const { data: overdueData } = await supabaseClient
          .from('v_overdue_counts')
          .select('overdue_count')
          .eq('dream_id', dream.id)
          .single();

        // Get current streak using the function (note: parameter order is p_user_id, p_dream_id)
        const { data: streakData, error: streakError } = await supabaseClient
          .rpc('current_streak', { 
            p_user_id: dream.user_id,
            p_dream_id: dream.id
          });

        if (streakError) {
          console.error(`Error getting streak for dream ${dream.id}:`, streakError);
        } else {
          console.log(`Dream ${dream.title} streak:`, streakData);
        }

        // Get area and action counts
        const { data: areasData } = await supabaseClient
          .from('areas')
          .select('id')
          .eq('dream_id', dream.id)
          .is('deleted_at', null);

        const { data: actionsData } = await supabaseClient
          .from('actions')
          .select('id')
          .eq('dream_id', dream.id)
          .is('deleted_at', null)
          .eq('is_active', true);

        // Get today's completed count
        const todayStr = new Date().toISOString().slice(0, 10);
        const { data: todayData } = await supabaseClient
          .from('action_occurrences')
          .select('id')
          .eq('dream_id', dream.id)
          .eq('completed_at::date', todayStr);

        // Get total completed actions count (actions where ALL occurrences are completed)
        // First, get all action IDs for this dream
        const actionIds = actionsData?.map(a => a.id) || [];
        
        let completedActionsCount = 0;
        
        if (actionIds.length > 0) {
          // For each action, check if all its occurrences are completed
          // An action is considered complete only if ALL its occurrences have completed_at set
          const completedActions = await Promise.all(
            actionIds.map(async (actionId) => {
              // Get all occurrences for this action
              const { data: allOccurrences } = await supabaseClient
                .from('action_occurrences')
                .select('id, completed_at')
                .eq('action_id', actionId);
              
              // If no occurrences exist, the action is not complete
              if (!allOccurrences || allOccurrences.length === 0) {
                return false;
              }
              
              // Check if all occurrences are completed
              const allCompleted = allOccurrences.every(occ => occ.completed_at !== null);
              return allCompleted;
            })
          );
          
          completedActionsCount = completedActions.filter(Boolean).length;
        }

        return {
          ...dream,
          overdue_count: overdueData?.overdue_count || 0,
          current_streak: streakData || 0,
          total_areas: areasData?.length || 0,
          total_actions: actionsData?.length || 0,
          completed_today: todayData?.length || 0,
          completed_total: completedActionsCount,
        };
      })
    );

    return { dreams: dreamsWithStats, fetchedAt: now() };
  } catch (error) {
    console.error('Error fetching dreams with stats:', error);
    return undefined;
  }
};

/**
 * TODAY FETCHER
 * 
 * Function for fetching action occurrences for a specific date.
 */

// Fetch today's action occurrences (or any specified date)
export const fetchToday = async (date?: Date): Promise<TodayPayload | undefined> => {
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().slice(0, 10);
  
  const { data, error } = await supabaseClient
    .from('v_action_occurrence_status')
    .select(`
      *,
      actions!inner(
        title,
        est_minutes,
        difficulty,
        repeat_every_days,
        slice_count_target,
        acceptance_criteria,
        area_id,
        areas!inner(
          title,
          icon,
          dream_id,
          dreams!inner(
            title,
            image_url
          )
        )
      )
    `)
    .eq('due_on', dateStr)
    .order('due_on', { ascending: true })
    .limit(500);
    
  if (error) {
    console.error('Error fetching today occurrences:', error);
    return undefined;
  }
  
  return { occurrences: data, fetchedAt: now() };
};

/**
 * PROGRESS FETCHER
 * 
 * Function for fetching comprehensive progress data including weekly stats,
 * history statistics, streak calculations, and progress photos.
 */

// Fetch comprehensive progress data with stats and photos
export const fetchProgress = async (): Promise<ProgressPayload | undefined> => {
  try {
    console.log('Fetching progress data...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('No authenticated user for progress fetch:', userError);
      return undefined;
    }
    console.log('Progress fetch for user:', user.id);
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    
    const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);
    const endOfWeekStr = endOfWeek.toISOString().slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);

    console.log('Date ranges:', { startOfWeekStr, endOfWeekStr, todayStr });

    // Get this week's occurrences
    const { data: weekOccurrences, error: weekError } = await supabaseClient
      .from('v_action_occurrence_status')
      .select('*')
      .gte('due_on', startOfWeekStr)
      .lte('due_on', endOfWeekStr)
      .eq('user_id', user.id);

    if (weekError) {
      console.error('Error fetching week occurrences:', weekError);
    } else {
      console.log('Week occurrences:', weekOccurrences?.length || 0);
    }

    // Get all completed occurrences
    const { data: allCompleted, error: completedError } = await supabaseClient
      .from('v_action_occurrence_status')
      .select('completed_at')
      .not('completed_at', 'is', null)
      .eq('user_id', user.id);

    if (completedError) {
      console.error('Error fetching completed occurrences:', completedError);
    } else {
      console.log('All completed occurrences:', allCompleted?.length || 0);
    }

    // Get all occurrences (not just completed) for historical overdue calculations
    const { data: allOccurrences, error: allOccurrencesError } = await supabaseClient
      .from('v_action_occurrence_status')
      .select('*')
      .eq('user_id', user.id);

    if (allOccurrencesError) {
      console.error('Error fetching all occurrences:', allOccurrencesError);
    } else {
      console.log('All occurrences:', allOccurrences?.length || 0);
    }

    // Get progress photos (artifacts)
    const { data: artifacts, error: artifactsError } = await supabaseClient
      .from('action_artifacts')
      .select(`
        id, 
        storage_path, 
        created_at,
        action_occurrences!inner(
          user_id,
          action_id,
          dream_id,
          area_id,
          actions!inner(
            areas!inner(
              dreams!inner(
                archived_at
              )
            )
          )
        )
      `)
      .not('storage_path', 'is', null)
      .eq('action_occurrences.user_id', user.id)
      .is('action_occurrences.actions.areas.dreams.archived_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (artifactsError) {
      console.error('Error fetching artifacts:', artifactsError);
    } else {
      console.log('Artifacts found:', artifacts?.length || 0);
    }

    // Generate signed URLs for artifacts
    const artifactsWithUrls = await Promise.all(
      (artifacts || []).map(async (artifact) => {
        const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
          .from('artifacts')
          .createSignedUrl(artifact.storage_path, 3600); // 1 hour expiry

        return {
          ...artifact,
          signed_url: signedUrlError ? null : signedUrlData?.signedUrl
        };
      })
    );

    // Debug logging for artifacts structure
    console.log('Artifacts structure debug:', {
      totalArtifacts: artifactsWithUrls.length,
      sampleArtifact: artifactsWithUrls[0] ? {
        id: artifactsWithUrls[0].id,
        action_occurrences: artifactsWithUrls[0].action_occurrences,
        extracted_dream_id: (artifactsWithUrls[0].action_occurrences as any)?.dream_id
      } : null
    });

    // Calculate weekly progress based on COMPLETED dates (not due dates)
    // This matches how the streak is calculated - using allCompleted instead of weekOccurrences
    const activeDays = new Set<string>();
    
    // Get all completions that happened this week (regardless of when they were due)
    const completedThisWeek = allCompleted?.filter(o => {
      const completedDate = new Date(o.completed_at!);
      const completedDateStr = completedDate.toISOString().slice(0, 10);
      return completedDateStr >= startOfWeekStr && completedDateStr <= endOfWeekStr;
    }) || [];
    
    completedThisWeek.forEach(o => {
      const date = new Date(o.completed_at!);
      activeDays.add(date.toISOString().slice(0, 10));
    });

    // Generate weekly progress array
    const weeklyProgress: {
      monday: 'active' | 'current' | 'missed' | 'future';
      tuesday: 'active' | 'current' | 'missed' | 'future';
      wednesday: 'active' | 'current' | 'missed' | 'future';
      thursday: 'active' | 'current' | 'missed' | 'future';
      friday: 'active' | 'current' | 'missed' | 'future';
      saturday: 'active' | 'current' | 'missed' | 'future';
      sunday: 'active' | 'current' | 'missed' | 'future';
    } = {
      monday: 'future',
      tuesday: 'future',
      wednesday: 'future',
      thursday: 'future',
      friday: 'future',
      saturday: 'future',
      sunday: 'future',
    };

    // Mark active days
    activeDays.forEach(dateStr => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek] as keyof typeof weeklyProgress;
      weeklyProgress[dayName] = 'active';
    });

    // Mark current day (only if it's not already active)
    const currentDayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()] as keyof typeof weeklyProgress;
    if (weeklyProgress[currentDayName] === 'future') {
      weeklyProgress[currentDayName] = 'current';
    }
    // If current day is already active, keep it as active (don't override)

    // Mark missed days (past days that weren't completed)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      const dayName = dayNames[dayDate.getDay()] as keyof typeof weeklyProgress;
      
      // If the day is in the past and not active, mark it as missed
      if (dayDate < today && weeklyProgress[dayName] === 'future') {
        weeklyProgress[dayName] = 'missed';
      }
    }

    // Calculate this week stats
    const actionsPlanned = weekOccurrences?.length || 0;
    const actionsDone = completedThisWeek.length;
    const actionsOverdue = weekOccurrences?.filter(o => o.is_overdue).length || 0;

    // Calculate history stats for different time periods
    const calculateStatsForPeriod = (startDate: Date, endDate?: Date) => {
      // Filter completed actions for actionsComplete and activeDays
      const filtered = allCompleted?.filter(o => {
        const completedDate = new Date(o.completed_at!);
        const isAfterStart = completedDate >= startDate;
        const isBeforeEnd = !endDate || completedDate <= endDate;
        return isAfterStart && isBeforeEnd;
      }) || [];
      
      const uniqueActiveDays = new Set<string>();
      filtered.forEach(o => {
        const date = new Date(o.completed_at!);
        uniqueActiveDays.add(date.toISOString().slice(0, 10));
      });
      
      // Calculate overdue actions for this period
      // Count occurrences that are overdue and have due_on within the period
      const overdueCount = allOccurrences?.filter(o => {
        if (!o.is_overdue) return false;
        const dueDate = new Date(o.due_on);
        const isAfterStart = dueDate >= startDate;
        const isBeforeEnd = !endDate || dueDate <= endDate;
        return isAfterStart && isBeforeEnd;
      }).length || 0;
      
      return {
        actionsComplete: filtered.length,
        activeDays: uniqueActiveDays.size,
        actionsOverdue: overdueCount,
      };
    };

    // Calculate overall streak across all dreams
    const calculateOverallStreak = () => {
      if (!allCompleted || allCompleted.length === 0) return 0;
      
      const completionDates = new Set<string>();
      allCompleted.forEach(o => {
        const date = new Date(o.completed_at!);
        completionDates.add(date.toISOString().slice(0, 10));
      });
      
      // Find the most recent completion date
      const sortedDates = Array.from(completionDates).sort().reverse();
      if (sortedDates.length === 0) return 0;
      
      let streak = 0;
      const today = new Date().toISOString().slice(0, 10);
      const mostRecentCompletion = sortedDates[0];
      
      // Start counting from the most recent completion date (not necessarily today)
      let currentDate = new Date(mostRecentCompletion);
      
      // Count consecutive days backwards from the most recent completion
      for (let i = 0; i < 365; i++) {
        const dateStr = currentDate.toISOString().slice(0, 10);
        if (completionDates.has(dateStr)) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
      
      console.log('Overall streak calculation:', { 
        streak, 
        mostRecentCompletion, 
        today, 
        totalCompletionDays: sortedDates.length,
        includesToday: completionDates.has(today)
      });
      return streak;
    };

    const nowDate = new Date();
    const startOfWeekForHistory = new Date(nowDate);
    startOfWeekForHistory.setDate(nowDate.getDate() - nowDate.getDay() + 1);
    
    const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    const startOfYear = new Date(nowDate.getFullYear(), 0, 1);

    const weekStats = calculateStatsForPeriod(startOfWeekForHistory);
    const monthStats = calculateStatsForPeriod(startOfMonth);
    const yearStats = calculateStatsForPeriod(startOfYear);
    const allTimeStats = calculateStatsForPeriod(new Date(0));

    const overallStreak = calculateOverallStreak();

    const result = {
      weeklyProgress,
      thisWeekStats: {
        actionsPlanned,
        actionsDone,
        actionsOverdue,
      },
      historyStats: {
        week: weekStats,
        month: monthStats,
        year: yearStats,
        allTime: allTimeStats,
      },
      overallStreak,
      progressPhotos: artifactsWithUrls
        .filter(a => a.signed_url)
        .map(a => ({
          id: a.id,
          uri: a.signed_url!,
          timestamp: new Date(a.created_at),
          dream_id: (a.action_occurrences as any)?.dream_id || '',
        })),
      fetchedAt: now(),
    };

    console.log('Progress data result:', {
      actionsPlanned,
      actionsDone,
      actionsOverdue,
      weekStats,
      monthStats,
      yearStats,
      allTimeStats,
      progressPhotosCount: result.progressPhotos.length,
    });

    return result;
  } catch (error) {
    console.error('Error fetching progress data:', error);
    // Return default structure instead of undefined
    return {
      weeklyProgress: {
        monday: 'future' as const,
        tuesday: 'future' as const,
        wednesday: 'future' as const,
        thursday: 'future' as const,
        friday: 'future' as const,
        saturday: 'future' as const,
        sunday: 'future' as const,
      },
      thisWeekStats: {
        actionsPlanned: 0,
        actionsDone: 0,
        actionsOverdue: 0,
      },
      historyStats: {
        week: { actionsComplete: 0, activeDays: 0, actionsOverdue: 0 },
        month: { actionsComplete: 0, activeDays: 0, actionsOverdue: 0 },
        year: { actionsComplete: 0, activeDays: 0, actionsOverdue: 0 },
        allTime: { actionsComplete: 0, activeDays: 0, actionsOverdue: 0 },
      },
      overallStreak: 0,
      progressPhotos: [],
      fetchedAt: now(),
    };
  }
};

/**
 * DREAM DETAIL FETCHER
 * 
 * Function for fetching complete dream details including areas, actions, and occurrences.
 */

// Fetch complete dream details with all related data
export const fetchDreamDetail = async (dreamId: string): Promise<DreamDetailPayload | undefined> => {
  const [dreamRes, areasRes, actionsRes, occRes] = await Promise.all([
    supabaseClient.from('dreams').select('*').eq('id', dreamId).single(),
    supabaseClient.from('areas').select('*').eq('dream_id', dreamId).is('deleted_at', null).order('position', { ascending: true }),
    supabaseClient.from('actions').select('*').eq('dream_id', dreamId).is('deleted_at', null).order('position', { ascending: true }),
    supabaseClient.from('v_action_occurrence_status').select('*').eq('dream_id', dreamId).order('due_on', { ascending: true }).limit(200),
  ]);
  
  if (dreamRes.error || areasRes.error || actionsRes.error || occRes.error) {
    console.error('Error fetching dream detail:', { 
      dreamRes: dreamRes.error, 
      areasRes: areasRes.error, 
      actionsRes: actionsRes.error, 
      occRes: occRes.error 
    });
    return undefined;
  }
  
  return {
    dream: dreamRes.data,
    areas: areasRes.data ?? [],
    actions: actionsRes.data ?? [],
    occurrences: occRes.data ?? [],
    fetchedAt: now(),
  };
};
