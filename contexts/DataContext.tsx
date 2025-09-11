// contexts/DataContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseClient } from '../lib/supabaseClient';
import { deleteDream as deleteDreamAPI, archiveDream as archiveDreamAPI, unarchiveDream as unarchiveDreamAPI, deferOccurrence as deferOccurrenceAPI } from '../frontend-services/backend-bridge';
import type { 
  Dream, 
  Area, 
  Action, 
  ActionOccurrence, 
  ActionOccurrenceStatus,
  TodayAction,
  DreamWithStats
} from '../backend/database/types';

// --- Cache payload types
type DreamsSummaryPayload = { dreams: Dream[]; fetchedAt: number };
type DreamsWithStatsPayload = { dreams: DreamWithStats[]; fetchedAt: number };
type TodayPayload = { occurrences: ActionOccurrenceStatus[]; fetchedAt: number };
type DreamDetailPayload = { 
  dream: Dream | null; 
  areas: Area[]; 
  actions: Action[]; 
  occurrences: ActionOccurrence[]; 
  fetchedAt: number 
};
type ProgressPayload = {
  weeklyProgress: {
    monday: 'active' | 'current' | 'inactive';
    tuesday: 'active' | 'current' | 'inactive';
    wednesday: 'active' | 'current' | 'inactive';
    thursday: 'active' | 'current' | 'inactive';
    friday: 'active' | 'current' | 'inactive';
    saturday: 'active' | 'current' | 'inactive';
    sunday: 'active' | 'current' | 'inactive';
  };
  thisWeekStats: {
    actionsPlanned: number;
    actionsDone: number;
    actionsOverdue: number;
  };
  historyStats: {
    week: {
      actionsComplete: number;
      activeDays: number;
      actionsOverdue: number;
    };
    month: {
      actionsComplete: number;
      activeDays: number;
      actionsOverdue: number;
    };
    year: {
      actionsComplete: number;
      activeDays: number;
      actionsOverdue: number;
    };
    allTime: {
      actionsComplete: number;
      activeDays: number;
      actionsOverdue: number;
    };
  };
  overallStreak: number;
  progressPhotos: Array<{
    id: string;
    uri: string;
    timestamp?: Date;
  }>;
  fetchedAt: number;
};

type State = {
  dreamsSummary?: DreamsSummaryPayload;
  dreamsWithStats?: DreamsWithStatsPayload;
  today?: TodayPayload;
  progress?: ProgressPayload;
  dreamDetail: Record<string, DreamDetailPayload | undefined>;
};

type Ctx = {
  state: State;
  // getters (trigger background fetch if stale)
  getDreamsSummary: (opts?: { force?: boolean }) => Promise<void>;
  getDreamsWithStats: (opts?: { force?: boolean }) => Promise<void>;
  getToday: (opts?: { force?: boolean }) => Promise<void>;
  getProgress: (opts?: { force?: boolean }) => Promise<void>;
  getDreamDetail: (dreamId: string, opts?: { force?: boolean }) => Promise<void>;
  // optimistic writes
  completeOccurrence: (occurrenceId: string) => Promise<void>;
  deferOccurrence: (occurrenceId: string, newDueDate?: string) => Promise<void>;
  deleteDream: (dreamId: string) => Promise<void>;
  archiveDream: (dreamId: string) => Promise<void>;
  unarchiveDream: (dreamId: string) => Promise<void>;
  updateAction: (actionId: string, updates: { title?: string; est_minutes?: number; difficulty?: string; repeat_every_days?: number; slice_count_target?: number; acceptance_criteria?: string[] }) => Promise<void>;
  deleteActionOccurrence: (occurrenceId: string) => Promise<void>;
  // helpers
  isStale: (fetchedAt?: number, ttlMs?: number) => boolean;
  lastSyncedLabel: (fetchedAt?: number) => string;
};

const DataContext = createContext<Ctx | null>(null);

const TODAY_TTL = 60_000;      // 1 min
const SUMMARY_TTL = 5 * 60_000; // 5 min
const DETAIL_TTL = 5 * 60_000;  // 5 min

const now = () => Date.now();
const fmtTime = (ts?: number) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const CACHE_KEYS = {
  summary: 'cache:dreamsSummary',
  dreamsWithStats: 'cache:dreamsWithStats',
  today: 'cache:today',
  progress: 'cache:progress',
  detail: (id: string) => `cache:dreamDetail:${id}`,
};

export const DataProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<State>({ dreamDetail: {} });
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const isStale = useCallback((fetchedAt?: number, ttlMs = 60_000) => !fetchedAt || (now() - fetchedAt) > ttlMs, []);
  const lastSyncedLabel = useCallback((fetchedAt?: number) => (fetchedAt ? `Last synced ${fmtTime(fetchedAt)}` : 'Never synced'), []);

  // --- Persistence helpers
  const loadJSON = async <T,>(key: string): Promise<T | undefined> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch { return undefined; }
  };
  const saveJSON = async (key: string, value: unknown) => {
    try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  };

  // --- Fetchers (Supabase)
  const fetchDreamsSummary = useCallback(async (): Promise<DreamsSummaryPayload | undefined> => {
    const { data, error } = await supabaseClient
      .from('dreams')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching dreams summary:', error);
      return undefined;
    }
    return { dreams: data as Dream[], fetchedAt: now() };
  }, []);

  const fetchDreamsWithStats = useCallback(async (): Promise<DreamsWithStatsPayload | undefined> => {
    console.log('fetchDreamsWithStats: Starting fetch...');
    try {
      // First get all dreams
      const { data: dreams, error: dreamsError } = await supabaseClient
        .from('dreams')
        .select('*')
        .is('archived_at', null)
        .order('created_at', { ascending: true });

      if (dreamsError) {
        console.error('Error fetching dreams:', dreamsError);
        return undefined;
      }

      // For each dream, get stats
      const dreamsWithStats: DreamWithStats[] = await Promise.all(
        (dreams as Dream[]).map(async (dream) => {
          // Get overdue count
          const { data: overdueData } = await supabaseClient
            .from('v_overdue_counts')
            .select('overdue_count')
            .eq('dream_id', dream.id)
            .single();

          // Get current streak using the function
          const { data: streakData, error: streakError } = await supabaseClient
            .rpc('current_streak', { 
              p_dream: dream.id,
              p_user: dream.user_id
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

          return {
            ...dream,
            overdue_count: overdueData?.overdue_count || 0,
            current_streak: streakData || 0,
            total_areas: areasData?.length || 0,
            total_actions: actionsData?.length || 0,
            completed_today: todayData?.length || 0,
          };
        })
      );

      return { dreams: dreamsWithStats, fetchedAt: now() };
    } catch (error) {
      console.error('Error fetching dreams with stats:', error);
      return undefined;
    }
  }, []);

  const fetchToday = useCallback(async (): Promise<TodayPayload | undefined> => {
    const todayStr = new Date().toISOString().slice(0, 10); // UTC date; OK for MVP
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
              title
            )
          )
        )
      `)
      .eq('due_on', todayStr)
      .order('due_on', { ascending: true })
      .limit(500);
    if (error) {
      console.error('Error fetching today occurrences:', error);
      return undefined;
    }
    return { occurrences: data as ActionOccurrenceStatus[], fetchedAt: now() };
  }, []);

  const fetchProgress = useCallback(async (): Promise<ProgressPayload | undefined> => {
    try {
      console.log('Fetching progress data...');
      // Get current user
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
        .from('action_occurrences')
        .select('*')
        .gte('due_on', startOfWeekStr)
        .lte('due_on', endOfWeekStr)
        .eq('user_id', user.id);

      if (weekError) {
        console.error('Error fetching week occurrences:', weekError);
      } else {
        console.log('Week occurrences:', weekOccurrences?.length || 0);
      }

      // Get completed occurrences for different time periods
      const nowDate = new Date();
      
      // Calculate date ranges
      const startOfWeekForHistory = new Date(nowDate);
      startOfWeekForHistory.setDate(nowDate.getDate() - nowDate.getDay() + 1); // Monday
      
      const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
      const startOfYear = new Date(nowDate.getFullYear(), 0, 1);
      
      // Get all completed occurrences
      const { data: allCompleted, error: completedError } = await supabaseClient
        .from('action_occurrences')
        .select('completed_at')
        .not('completed_at', 'is', null)
        .eq('user_id', user.id);

      if (completedError) {
        console.error('Error fetching completed occurrences:', completedError);
      } else {
        console.log('All completed occurrences:', allCompleted?.length || 0);
      }
      
      // Get overdue occurrences for different periods
      const { data: allOverdue, error: overdueError } = await supabaseClient
        .from('v_overdue_counts')
        .select('overdue_count');

      if (overdueError) {
        console.error('Error fetching overdue counts:', overdueError);
      } else {
        console.log('Overdue counts:', allOverdue?.length || 0);
      }

      // Get progress photos (artifacts) - join through action_occurrences to filter by user
      const { data: artifacts, error: artifactsError } = await supabaseClient
        .from('action_artifacts')
        .select(`
          id, 
          storage_path, 
          created_at,
          action_occurrences!inner(
            user_id
          )
        `)
        .not('storage_path', 'is', null)
        .eq('action_occurrences.user_id', user.id)
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

      // Calculate weekly progress (simplified - active days this week)
      const activeDays = new Set<string>();
      const completedThisWeek = weekOccurrences?.filter(o => o.completed_at) || [];
      completedThisWeek.forEach(o => {
        const date = new Date(o.completed_at!);
        activeDays.add(date.toISOString().slice(0, 10));
      });

      // Generate weekly progress array
      const weeklyProgress: {
        monday: 'active' | 'current' | 'inactive';
        tuesday: 'active' | 'current' | 'inactive';
        wednesday: 'active' | 'current' | 'inactive';
        thursday: 'active' | 'current' | 'inactive';
        friday: 'active' | 'current' | 'inactive';
        saturday: 'active' | 'current' | 'inactive';
        sunday: 'active' | 'current' | 'inactive';
      } = {
        monday: 'inactive',
        tuesday: 'inactive',
        wednesday: 'inactive',
        thursday: 'inactive',
        friday: 'inactive',
        saturday: 'inactive',
        sunday: 'inactive',
      };

      // Mark active days
      activeDays.forEach(dateStr => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek] as keyof typeof weeklyProgress;
        weeklyProgress[dayName] = 'active';
      });

      // Mark current day
      const currentDayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()] as keyof typeof weeklyProgress;
      if (weeklyProgress[currentDayName] === 'inactive') {
        weeklyProgress[currentDayName] = 'current';
      }

      // Calculate this week stats
      const actionsPlanned = weekOccurrences?.length || 0;
      const actionsDone = completedThisWeek.length;
      const actionsOverdue = weekOccurrences?.filter(o => 
        !o.completed_at && new Date(o.due_on) < today
      ).length || 0;

      // Calculate history stats for different time periods
      const calculateStatsForPeriod = (startDate: Date, endDate?: Date) => {
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
        
        return {
          actionsComplete: filtered.length,
          activeDays: uniqueActiveDays.size,
          actionsOverdue: 0, // Could be calculated from overdue view for specific periods
        };
      };

      // Calculate overall streak across all dreams
      const calculateOverallStreak = () => {
        if (!allCompleted || allCompleted.length === 0) return 0;
        
        // Get all unique completion dates, sorted
        const completionDates = new Set<string>();
        allCompleted.forEach(o => {
          const date = new Date(o.completed_at!);
          completionDates.add(date.toISOString().slice(0, 10));
        });
        
        const sortedDates = Array.from(completionDates).sort().reverse(); // Most recent first
        let streak = 0;
        const today = new Date();
        let currentDate = new Date(today);
        
        // Check consecutive days starting from today
        for (let i = 0; i < 365; i++) { // Max 1 year streak
          const dateStr = currentDate.toISOString().slice(0, 10);
          if (completionDates.has(dateStr)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }
        
        console.log('Overall streak calculation:', { streak, totalCompletionDays: sortedDates.length });
        return streak;
      };

      const weekStats = calculateStatsForPeriod(startOfWeekForHistory);
      const monthStats = calculateStatsForPeriod(startOfMonth);
      const yearStats = calculateStatsForPeriod(startOfYear);
      const allTimeStats = calculateStatsForPeriod(new Date(0)); // All time

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
          .filter(a => a.signed_url) // Only include artifacts with valid URLs
          .map(a => ({
            id: a.id,
            uri: a.signed_url!,
            timestamp: new Date(a.created_at),
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
      // Return a default structure instead of undefined to prevent the page from breaking
      return {
        weeklyProgress: {
          monday: 'inactive' as const,
          tuesday: 'inactive' as const,
          wednesday: 'inactive' as const,
          thursday: 'inactive' as const,
          friday: 'inactive' as const,
          saturday: 'inactive' as const,
          sunday: 'inactive' as const,
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
  }, []);

  const fetchDreamDetail = useCallback(async (dreamId: string): Promise<DreamDetailPayload | undefined> => {
    const [dreamRes, areasRes, actionsRes, occRes] = await Promise.all([
      supabaseClient.from('dreams').select('*').eq('id', dreamId).single(),
      supabaseClient.from('areas').select('*').eq('dream_id', dreamId).is('deleted_at', null).order('position', { ascending: true }),
      supabaseClient.from('actions').select('*').eq('dream_id', dreamId).is('deleted_at', null).order('position', { ascending: true }),
      supabaseClient.from('action_occurrences').select('*').eq('dream_id', dreamId).order('due_on', { ascending: true }).limit(200),
    ]);
    
    if (dreamRes.error || areasRes.error || actionsRes.error || occRes.error) {
      console.error('Error fetching dream detail:', { dreamRes: dreamRes.error, areasRes: areasRes.error, actionsRes: actionsRes.error, occRes: occRes.error });
      return undefined;
    }
    
    return {
      dream: dreamRes.data as Dream,
      areas: (areasRes.data ?? []) as Area[],
      actions: (actionsRes.data ?? []) as Action[],
      occurrences: (occRes.data ?? []) as ActionOccurrence[],
      fetchedAt: now(),
    };
  }, []);

  // --- Public getters (with TTL + persistence)
  const getDreamsSummary: Ctx['getDreamsSummary'] = useCallback(async ({ force } = {}) => {
    if (!force && !isStale(state.dreamsSummary?.fetchedAt, SUMMARY_TTL)) return;
    const payload = await fetchDreamsSummary();
    if (payload) {
      setState(s => ({ ...s, dreamsSummary: payload }));
      saveJSON(CACHE_KEYS.summary, payload);
    }
  }, [fetchDreamsSummary, isStale, state.dreamsSummary?.fetchedAt]);

  const getDreamsWithStats: Ctx['getDreamsWithStats'] = useCallback(async ({ force } = {}) => {
    console.log('getDreamsWithStats called:', { force, fetchedAt: state.dreamsWithStats?.fetchedAt, isStale: isStale(state.dreamsWithStats?.fetchedAt, SUMMARY_TTL) });
    if (!force && !isStale(state.dreamsWithStats?.fetchedAt, SUMMARY_TTL)) {
      console.log('getDreamsWithStats: Using cached data');
      return;
    }
    console.log('getDreamsWithStats: Fetching fresh data');
    const payload = await fetchDreamsWithStats();
    if (payload) {
      setState(s => ({ ...s, dreamsWithStats: payload }));
      saveJSON(CACHE_KEYS.dreamsWithStats, payload);
    }
  }, [fetchDreamsWithStats, isStale, state.dreamsWithStats?.fetchedAt]);

  const getToday: Ctx['getToday'] = useCallback(async ({ force } = {}) => {
    if (!force && !isStale(state.today?.fetchedAt, TODAY_TTL)) return;
    const payload = await fetchToday();
    if (payload) {
      setState(s => ({ ...s, today: payload }));
      saveJSON(CACHE_KEYS.today, payload);
    }
  }, [fetchToday, isStale, state.today?.fetchedAt]);

  const getProgress: Ctx['getProgress'] = useCallback(async ({ force } = {}) => {
    console.log('getProgress called with force:', force, 'isStale:', isStale(state.progress?.fetchedAt, SUMMARY_TTL));
    if (!force && !isStale(state.progress?.fetchedAt, SUMMARY_TTL)) return;
    const payload = await fetchProgress();
    console.log('getProgress payload:', payload ? 'success' : 'failed');
    if (payload) {
      setState(s => ({ ...s, progress: payload }));
      saveJSON(CACHE_KEYS.progress, payload);
    }
  }, [fetchProgress, isStale, state.progress?.fetchedAt]);

  const getDreamDetail: Ctx['getDreamDetail'] = useCallback(async (dreamId: string, { force } = {}) => {
    const cached = state.dreamDetail[dreamId];
    if (!force && !isStale(cached?.fetchedAt, DETAIL_TTL)) return;
    const payload = await fetchDreamDetail(dreamId);
    if (payload) {
      setState(s => ({ ...s, dreamDetail: { ...s.dreamDetail, [dreamId]: payload } }));
      saveJSON(CACHE_KEYS.detail(dreamId), payload);
    }
  }, [fetchDreamDetail, isStale, state.dreamDetail]);

  // --- Optimistic writes
  const completeOccurrence: Ctx['completeOccurrence'] = useCallback(async (occurrenceId: string) => {
    // Optimistic remove from Today + mark complete in any open dreamDetail
    setState(s => {
      const next: State = { ...s, dreamDetail: { ...s.dreamDetail } };
      if (s.today) {
        next.today = { 
          ...s.today, 
          occurrences: s.today.occurrences.filter(o => o.id !== occurrenceId) 
        };
      }
      for (const k of Object.keys(next.dreamDetail)) {
        const dd = next.dreamDetail[k]!;
        next.dreamDetail[k] = { 
          ...dd, 
          occurrences: dd.occurrences.map(o => 
            o.id === occurrenceId 
              ? { ...o, completed_at: new Date().toISOString() } 
              : o
          ) 
        };
      }
      // persist Today cache
      if (next.today) AsyncStorage.setItem(CACHE_KEYS.today, JSON.stringify(next.today));
      return next;
    });

    const { error } = await supabaseClient
      .from('action_occurrences')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', occurrenceId);
      
    if (error) {
      console.error('Error completing occurrence:', error);
      // On failure, force revalidate to correct optimistic state
      await Promise.all([getToday({ force: true }), getDreamsSummary({ force: true })]);
    } else {
      // Light revalidate summaries
      getDreamsSummary();
    }
  }, [getDreamsSummary, getToday]);

  const deferOccurrence: Ctx['deferOccurrence'] = useCallback(async (occurrenceId: string, newDueDate?: string) => {
    // Get auth token
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Calculate new due date (+1 day from current due date or provided date)
    const currentDate = newDueDate ? new Date(newDueDate) : new Date();
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const newDateStr = tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    // Optimistic: remove from Today (since due_on +1) and update dream detail
    setState(s => {
      const next: State = { ...s, dreamDetail: { ...s.dreamDetail } };
      if (s.today) {
        next.today = { 
          ...s.today, 
          occurrences: s.today.occurrences.filter(o => o.id !== occurrenceId) 
        };
      }
      // Update occurrence in dream detail caches
      for (const k of Object.keys(next.dreamDetail)) {
        const dd = next.dreamDetail[k]!;
        next.dreamDetail[k] = { 
          ...dd, 
          occurrences: dd.occurrences.map(o => 
            o.id === occurrenceId 
              ? { ...o, due_on: newDateStr } 
              : o
          ) 
        };
      }
      if (next.today) AsyncStorage.setItem(CACHE_KEYS.today, JSON.stringify(next.today));
      return next;
    });

    // Call the API to defer the occurrence
    try {
      await deferOccurrenceAPI(occurrenceId, newDateStr, session.access_token);
      getDreamsSummary(); // overdue/streak may change
    } catch (error) {
      console.error('Error deferring occurrence:', error);
      // On failure, force revalidate to correct optimistic state
      await Promise.all([getToday({ force: true }), getDreamsSummary({ force: true })]);
      throw error;
    }
  }, [getDreamsSummary, getToday]);

  const deleteDream: Ctx['deleteDream'] = useCallback(async (dreamId: string) => {
    // Get auth token
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Call the API to delete the dream
    await deleteDreamAPI(dreamId, session.access_token);

    // Optimistically remove from all caches
    setState(s => {
      const next: State = { 
        ...s, 
        dreamDetail: { ...s.dreamDetail },
        dreamsSummary: s.dreamsSummary ? {
          ...s.dreamsSummary,
          dreams: s.dreamsSummary.dreams.filter(d => d.id !== dreamId)
        } : undefined,
        dreamsWithStats: s.dreamsWithStats ? {
          ...s.dreamsWithStats,
          dreams: s.dreamsWithStats.dreams.filter(d => d.id !== dreamId)
        } : undefined
      };
      
      // Remove from dream detail cache
      delete next.dreamDetail[dreamId];
      
      // Persist updated caches
      if (next.dreamsSummary) {
        AsyncStorage.setItem(CACHE_KEYS.summary, JSON.stringify(next.dreamsSummary));
      }
      if (next.dreamsWithStats) {
        AsyncStorage.setItem(CACHE_KEYS.dreamsWithStats, JSON.stringify(next.dreamsWithStats));
      }
      AsyncStorage.removeItem(CACHE_KEYS.detail(dreamId));
      
      return next;
    });
  }, []);

  const archiveDream: Ctx['archiveDream'] = useCallback(async (dreamId: string) => {
    // Get auth token
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Call the API to archive the dream
    await archiveDreamAPI(dreamId, session.access_token);

    // Optimistically update the dream in caches
    setState(s => {
      const next: State = { 
        ...s, 
        dreamDetail: { ...s.dreamDetail },
        dreamsSummary: s.dreamsSummary ? {
          ...s.dreamsSummary,
          dreams: s.dreamsSummary.dreams.map(d => 
            d.id === dreamId ? { ...d, archived_at: new Date().toISOString() } : d
          )
        } : undefined,
        dreamsWithStats: s.dreamsWithStats ? {
          ...s.dreamsWithStats,
          dreams: s.dreamsWithStats.dreams.map(d => 
            d.id === dreamId ? { ...d, archived_at: new Date().toISOString() } : d
          )
        } : undefined
      };
      
      // Update dream detail cache if it exists
      if (next.dreamDetail[dreamId]) {
        next.dreamDetail[dreamId] = {
          ...next.dreamDetail[dreamId]!,
          dream: next.dreamDetail[dreamId]!.dream ? {
            ...next.dreamDetail[dreamId]!.dream!,
            archived_at: new Date().toISOString()
          } : null
        };
      }
      
      // Persist updated caches
      if (next.dreamsSummary) {
        AsyncStorage.setItem(CACHE_KEYS.summary, JSON.stringify(next.dreamsSummary));
      }
      if (next.dreamsWithStats) {
        AsyncStorage.setItem(CACHE_KEYS.dreamsWithStats, JSON.stringify(next.dreamsWithStats));
      }
      if (next.dreamDetail[dreamId]) {
        AsyncStorage.setItem(CACHE_KEYS.detail(dreamId), JSON.stringify(next.dreamDetail[dreamId]));
      }
      
      return next;
    });
  }, []);

  const unarchiveDream: Ctx['unarchiveDream'] = useCallback(async (dreamId: string) => {
    // Get auth token
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Call the API to unarchive the dream
    await unarchiveDreamAPI(dreamId, session.access_token);

    // Optimistically update the dream in caches
    setState(s => {
      const next: State = { 
        ...s, 
        dreamDetail: { ...s.dreamDetail },
        dreamsSummary: s.dreamsSummary ? {
          ...s.dreamsSummary,
          dreams: s.dreamsSummary.dreams.map(d => 
            d.id === dreamId ? { ...d, archived_at: undefined } : d
          )
        } : undefined,
        dreamsWithStats: s.dreamsWithStats ? {
          ...s.dreamsWithStats,
          dreams: s.dreamsWithStats.dreams.map(d => 
            d.id === dreamId ? { ...d, archived_at: undefined } : d
          )
        } : undefined
      };
      
      // Update dream detail cache if it exists
      if (next.dreamDetail[dreamId]) {
        next.dreamDetail[dreamId] = {
          ...next.dreamDetail[dreamId]!,
          dream: next.dreamDetail[dreamId]!.dream ? {
            ...next.dreamDetail[dreamId]!.dream!,
            archived_at: undefined
          } : null
        };
      }
      
      // Persist updated caches
      if (next.dreamsSummary) {
        AsyncStorage.setItem(CACHE_KEYS.summary, JSON.stringify(next.dreamsSummary));
      }
      if (next.dreamsWithStats) {
        AsyncStorage.setItem(CACHE_KEYS.dreamsWithStats, JSON.stringify(next.dreamsWithStats));
      }
      if (next.dreamDetail[dreamId]) {
        AsyncStorage.setItem(CACHE_KEYS.detail(dreamId), JSON.stringify(next.dreamDetail[dreamId]));
      }
      
      return next;
    });
  }, []);

  const updateAction: Ctx['updateAction'] = useCallback(async (actionId: string, updates: { title?: string; est_minutes?: number; difficulty?: string; repeat_every_days?: number; slice_count_target?: number; acceptance_criteria?: string[] }) => {
    // Optimistically update action in all relevant caches
    setState(s => {
      const next: State = { ...s, dreamDetail: { ...s.dreamDetail } };
      
      // Update in dream detail caches
      for (const k of Object.keys(next.dreamDetail)) {
        const dd = next.dreamDetail[k]!;
        next.dreamDetail[k] = { 
          ...dd, 
          actions: dd.actions.map(a => 
            a.id === actionId 
              ? { ...a, ...updates } as Action
              : a
          ) 
        };
      }
      
      // Update in today's occurrences (if the action is referenced there)
      if (next.today) {
        next.today = {
          ...next.today,
          occurrences: next.today.occurrences.map(occ => {
            if (occ.action_id === actionId) {
              return {
                ...occ,
                actions: {
                  ...(occ as any).actions,
                  ...updates
                }
              } as any;
            }
            return occ;
          })
        };
      }
      
      // Persist updated caches
      if (next.today) {
        AsyncStorage.setItem(CACHE_KEYS.today, JSON.stringify(next.today));
      }
      for (const k of Object.keys(next.dreamDetail)) {
        AsyncStorage.setItem(CACHE_KEYS.detail(k), JSON.stringify(next.dreamDetail[k]));
      }
      
      return next;
    });
  }, []);

  const deleteActionOccurrence: Ctx['deleteActionOccurrence'] = useCallback(async (occurrenceId: string) => {
    // Optimistically remove from Today and any open dreamDetail
    setState(s => {
      const next: State = { ...s, dreamDetail: { ...s.dreamDetail } };
      if (s.today) {
        next.today = { 
          ...s.today, 
          occurrences: s.today.occurrences.filter(o => o.id !== occurrenceId) 
        };
      }
      for (const k of Object.keys(next.dreamDetail)) {
        const dd = next.dreamDetail[k]!;
        next.dreamDetail[k] = { 
          ...dd, 
          occurrences: dd.occurrences.filter(o => o.id !== occurrenceId) 
        };
      }
      // persist Today cache
      if (next.today) AsyncStorage.setItem(CACHE_KEYS.today, JSON.stringify(next.today));
      return next;
    });
  }, []);

  // --- Hydrate on mount
  useEffect(() => {
    (async () => {
      const [summary, dreamsWithStats, today, progress] = await Promise.all([
        loadJSON<DreamsSummaryPayload>(CACHE_KEYS.summary),
        loadJSON<DreamsWithStatsPayload>(CACHE_KEYS.dreamsWithStats),
        loadJSON<TodayPayload>(CACHE_KEYS.today),
        loadJSON<ProgressPayload>(CACHE_KEYS.progress),
      ]);
      setState(s => ({ 
        ...s, 
        dreamsSummary: summary, 
        dreamsWithStats: dreamsWithStats,
        today: today ?? s.today,
        progress: progress ?? s.progress
      }));
      // kick background refresh
      getDreamsSummary();
      getDreamsWithStats();
      getToday();
      getProgress();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Revalidate on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        getToday();
        getDreamsSummary();
        getDreamsWithStats();
        getProgress();
        // Revalidate the currently open dream detail if any:
        // (optional) detect current route and if it's DreamDetail, call getDreamDetail(id)
      }
    });
    return () => sub.remove();
  }, [getToday, getDreamsSummary, getDreamsWithStats, getProgress]);

  const value: Ctx = useMemo(() => ({
    state,
    getDreamsSummary,
    getDreamsWithStats,
    getToday,
    getProgress,
    getDreamDetail,
    completeOccurrence,
    deferOccurrence,
    deleteDream,
    archiveDream,
    unarchiveDream,
    updateAction,
    deleteActionOccurrence,
    isStale,
    lastSyncedLabel,
  }), [state, getDreamsSummary, getDreamsWithStats, getToday, getProgress, getDreamDetail, completeOccurrence, deferOccurrence, deleteDream, archiveDream, unarchiveDream, updateAction, deleteActionOccurrence, isStale, lastSyncedLabel]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
